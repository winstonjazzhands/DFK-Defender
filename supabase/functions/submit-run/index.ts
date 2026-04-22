import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { extractSessionToken, loadValidWalletSession, normalizeAddress, validateSessionContext } from '../_shared/wallet-session.ts';
import { Contract, JsonRpcProvider, verifyMessage } from 'npm:ethers@6';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-token, cache-control',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};


const DFK_CHAIN_RPC_URL = Deno.env.get('DFK_CHAIN_RPC_URL') || 'https://subnets.avax.network/defi-kingdoms/dfk-chain/rpc';
const DFK_PROFILES_ADDRESS = '0xC4cD8C09D1A90b21Be417be91A81603B03993E81';
const RUN_SUBMIT_CHALLENGE_SECRET = Deno.env.get('RUN_SUBMIT_CHALLENGE_SECRET') || '';
const SECURE_RUN_WAVE_THRESHOLD = Number(Deno.env.get('DFK_SECURE_RUN_SIGNATURE_WAVE_THRESHOLD') || 30);

const PROFILES_ABI = [
  'function getNames(address[] _addresses) view returns (string[])',
  'function addressToProfile(address) view returns (address owner, string name, uint64 created, uint256 nftId, uint256 collectionId, string picUri)',
  'function getProfile(address _profileAddress) view returns ((address owner, string name, uint64 created, uint256 nftId, uint256 collectionId, string picUri))',
  'function getProfileByAddress(address _profileAddress) view returns (uint256 _id, address _owner, string _name, uint64 _created, uint8 _picId, uint256 _heroId, uint256 _points)',
];


function shouldRefreshChainName(existingPlayer: { display_name?: string | null; vanity_name?: string | null } | null | undefined, walletAddress: string) {
  const vanity = cleanName(existingPlayer?.vanity_name);
  if (vanity) return false;
  const display = cleanName(existingPlayer?.display_name);
  if (!display) return true;
  return normalizeAddress(display) === normalizeAddress(walletAddress);
}

async function resolveChainDisplayName(address: string) {
  const provider = new JsonRpcProvider(DFK_CHAIN_RPC_URL, 53935, { staticNetwork: true });
  const contract = new Contract(DFK_PROFILES_ADDRESS, PROFILES_ABI, provider);
  const normalized = normalizeAddress(address);

  const attempts = [
    async () => {
      const result = await contract.getNames([normalized]);
      const first = Array.isArray(result) ? result[0] : null;
      const name = cleanName(first);
      return name || null;
    },
    async () => {
      const result = await contract.addressToProfile(normalized);
      const owner = normalizeAddress(result?.owner);
      const name = cleanName(result?.name);
      return owner === normalized && name ? name : null;
    },
    async () => {
      const result = await contract.getProfile(normalized);
      const owner = normalizeAddress(result?.owner);
      const name = cleanName(result?.name);
      return owner === normalized && name ? name : null;
    },
    async () => {
      const result = await contract.getProfileByAddress(normalized);
      const owner = normalizeAddress(result?._owner);
      const name = cleanName(result?._name);
      return owner === normalized && name ? name : null;
    },
  ];

  for (const attempt of attempts) {
    try {
      const name = await attempt();
      if (name) return name;
    } catch (error) {
      if (isNoProfileLookupMiss(error)) return null;
      // continue
    }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200, headers: corsHeaders });

  const requestId = makeRequestId('submitrun');

  try {
    const token = extractSessionToken(req);
    if (!token || /^sb_(publishable|anon)_/i.test(token)) {
      console.warn('submit-run missing session token', { requestId, tokenFingerprint: fingerprintToken(token) });
      return json({ error: 'Valid session token required.', code: 'missing_session_token' }, 401);
    }

    const admin = createAdmin();
    const sessionResult = await loadValidWalletSession(admin, req, corsHeaders, { validateContext: true });
    if ('response' in sessionResult) {
      console.warn('submit-run session rejected', { requestId, tokenFingerprint: fingerprintToken(token) });
      return sessionResult.response;
    }
    const session = sessionResult.session;

    const body = await safeReadJson(req);
    if (!body || typeof body !== 'object') {
      return json({ error: 'Invalid request body.', code: 'invalid_body' }, 400);
    }

    const bodyRow = body as Record<string, unknown>;
    const walletAddress = normalizeAddress(bodyRow.walletAddress as string);
    console.log('submit-run request', {
      requestId,
      walletAddress: summarizeAddress(walletAddress),
      clientRunId: String(bodyRow.clientRunId || '').trim() || null,
      chainId: bodyRow.chainId ?? null,
      mode: bodyRow.mode ?? null,
      result: bodyRow.result ?? null,
      waveReached: bodyRow.waveReached ?? null,
      wavesCleared: bodyRow.wavesCleared ?? null,
      tokenFingerprint: fingerprintToken(token),
    });
    if (!walletAddress) return json({ error: 'walletAddress is required.', code: 'wallet_required' }, 400);
    if (walletAddress !== normalizeAddress(session.wallet_address)) {
      return json({ error: 'Wallet mismatch.', code: 'wallet_mismatch' }, 401);
    }

    const clientRunId = normalizeClientRunId(bodyRow.clientRunId);
    if (!clientRunId) {
      return json({ error: 'clientRunId is required.', code: 'client_run_id_required' }, 400);
    }

    const requestedDisplayName = cleanName(bodyRow.displayName);
    const waveReached = sanitizeInt(bodyRow.waveReached);
    const wavesCleared = sanitizeInt(bodyRow.wavesCleared);
    const portalHpLeft = sanitizeInt(bodyRow.portalHpLeft);
    const goldOnHand = sanitizeInt(bodyRow.goldOnHand);
    const premiumJewels = sanitizeInt(bodyRow.premiumJewels);
    const gameVersion = sliceText(bodyRow.gameVersion, 80, 'unknown');
    const mode = sliceText(bodyRow.mode, 30, 'easy');
    const result = sliceText(bodyRow.result, 30, 'loss');
    const heroes = Array.isArray(bodyRow.heroes) ? (bodyRow.heroes as unknown[]) : [];
    const stats = bodyRow.stats && typeof bodyRow.stats === 'object' ? (bodyRow.stats as Record<string, unknown>) : {};
    const replayData = bodyRow.replayData && typeof bodyRow.replayData === 'object' ? (bodyRow.replayData as Record<string, unknown>) : null;
    const completedAt = safeIsoDate(bodyRow.completedAt) || new Date().toISOString();
    const runStartedAt = safeIsoDate(bodyRow.runStartedAt);
    const chainId = sanitizeChainId(bodyRow.chainId ?? ((bodyRow.paymentSummary && typeof bodyRow.paymentSummary === 'object') ? (bodyRow.paymentSummary as Record<string, unknown>).chainId : null));
    const usedWalletHeroes = Boolean(
      stats.usedWalletHeroes ||
      heroes.some((hero) => {
        const row = hero as Record<string, unknown>;
        return Boolean(row.usedWalletHero || Number(row.walletHeroCount || 0) > 0);
      })
    );

    const hardenedStats = hardenRunStats({
      waveReached,
      wavesCleared,
      portalHpLeft,
      goldOnHand,
      result,
      heroes,
      stats,
    });

    const validationError = validateRunSubmission({
      clientRunId,
      waveReached,
      wavesCleared,
      portalHpLeft,
      goldOnHand,
      premiumJewels,
      gameVersion,
      mode,
      result,
      heroes,
      stats: hardenedStats,
      completedAt,
      runStartedAt,
      chainId,
      usedWalletHeroes,
    });
    if (validationError) {
      return json({ error: validationError.error, code: validationError.code, details: validationError.details }, 400);
    }

    if (Math.max(waveReached, wavesCleared) >= SECURE_RUN_WAVE_THRESHOLD) {
      const secureValidation = await validateSecureRunSubmission(bodyRow, {
        walletAddress,
        clientRunId,
        waveReached,
        wavesCleared,
        completedAt,
        runStartedAt,
        gameVersion,
        mode,
        result,
        chainId,
        portalHpLeft,
        goldOnHand,
        premiumJewels,
        heroes,
        stats: hardenedStats,
      });
      if (secureValidation) return secureValidation;
    }

    const rateLimit = await checkRunSubmissionRate(admin, walletAddress, completedAt);
    if (rateLimit) return rateLimit;

    const existingPlayer = await fetchExistingPlayer(admin, walletAddress);
    const chainDisplayName = shouldRefreshChainName(existingPlayer, walletAddress)
      ? await resolveChainDisplayName(walletAddress)
      : null;
    const resolvedDisplayName =
      cleanName(existingPlayer?.vanity_name) ||
      requestedDisplayName ||
      chainDisplayName ||
      cleanName(existingPlayer?.display_name) ||
      null;

    await ensurePlayerExists(admin, {
      wallet_address: walletAddress,
      display_name: resolvedDisplayName,
      last_run_at: completedAt,
      used_wallet_heroes: Boolean(existingPlayer?.used_wallet_heroes) || usedWalletHeroes,
    });

    const duplicate = await runAlreadyExists(admin, walletAddress, clientRunId);
    if (duplicate.exists) {
      const duplicateReplayShareId = normalizeReplayShareId(replayData);
      console.log('submit-run duplicate', { requestId, walletAddress: summarizeAddress(walletAddress), clientRunId, runId: duplicate.id || null });
      if (replayData && duplicate.id) {
        await attachReplayData(admin, duplicate.id, replayData, duplicateReplayShareId, requestId);
      }
      await syncPlayerSummaryFromRuns(admin, walletAddress, {
        displayName: resolvedDisplayName,
        lastRunAt: completedAt,
        usedWalletHeroes: Boolean(existingPlayer?.used_wallet_heroes) || usedWalletHeroes,
      });
      await touchWalletSession(admin, token);
      return json({ ok: true, duplicate: true, runId: duplicate.id || null, clientRunId, replayShareId: duplicateReplayShareId }, 200);
    }

    const replayShareId = normalizeReplayShareId(replayData);
    const insertResult = await insertRun(admin, {
      wallet_address: walletAddress,
      client_run_id: clientRunId,
      display_name_snapshot: resolvedDisplayName,
      game_version: gameVersion,
      mode,
      result,
      wave_reached: waveReached,
      waves_cleared: wavesCleared,
      portal_hp_left: portalHpLeft,
      gold_on_hand: goldOnHand,
      premium_jewels: premiumJewels,
      heroes_json: heroes,
      stats_json: hardenedStats,
      run_started_at: runStartedAt,
      completed_at: completedAt,
      chain_id: chainId,
    });

    if (insertResult.duplicate) {
      console.log('submit-run duplicate-after-insert', { requestId, walletAddress: summarizeAddress(walletAddress), clientRunId, runId: insertResult.id || duplicate.id || null });
      if (replayData && (insertResult.id || duplicate.id)) {
        await attachReplayData(admin, insertResult.id || duplicate.id || null, replayData, replayShareId, requestId);
      }
      await touchWalletSession(admin, token);
      return json({ ok: true, duplicate: true, runId: insertResult.id || duplicate.id || null, clientRunId, replayShareId }, 200);
    }

    if (replayData && insertResult.id) {
      await attachReplayData(admin, insertResult.id, replayData, replayShareId, requestId);
    }

    await syncPlayerSummaryFromRuns(admin, walletAddress, {
      displayName: resolvedDisplayName,
      lastRunAt: completedAt,
      usedWalletHeroes: Boolean(existingPlayer?.used_wallet_heroes) || usedWalletHeroes,
    });

    await touchWalletSession(admin, token);
    console.log('submit-run success', { requestId, walletAddress: summarizeAddress(walletAddress), clientRunId, runId: insertResult.id || null });
    return json({ ok: true, runId: insertResult.id || null, clientRunId, replayShareId }, 200);
  } catch (error) {
    const details = normalizeError(error);
    console.error('submit-run fatal error', { requestId, ...details });
    return json({
      error: details.message || 'Run submission failed.',
      code: details.code,
      details: details.details,
      hint: details.hint,
      name: details.name,
    }, 500);
  }
});


async function safeReadJson(req: Request) {
  try {
    return await req.json();
  } catch (error) {
    console.error('submit-run invalid json body', normalizeError(error));
    return null;
  }
}


async function fetchExistingPlayer(admin: SupabaseClient, walletAddress: string) {
  const selectVariants = [
    'display_name, vanity_name, best_wave, total_runs, total_waves_cleared, used_wallet_heroes',
    'display_name, vanity_name, best_wave, total_runs, total_waves_cleared',
    'display_name, vanity_name, best_wave, total_runs',
    'display_name, vanity_name',
    'display_name',
  ];

  for (const columns of selectVariants) {
    const { data, error } = await admin.from('players').select(columns).eq('wallet_address', walletAddress).maybeSingle();
    if (!error) return data as Record<string, unknown> | null;
    if (!isMissingColumnError(error)) {
      console.error('submit-run existing player lookup failed', { columns, ...normalizeError(error) });
      throw error;
    }
  }

  return null;
}

async function ensurePlayerExists(admin: SupabaseClient, payload: Record<string, unknown>) {
  const variants = uniquePayloadVariants([
    payload,
    omitKeys(payload, ['used_wallet_heroes']),
    omitKeys(payload, ['used_wallet_heroes', 'last_run_at']),
    { wallet_address: payload.wallet_address, display_name: payload.display_name ?? null },
    { wallet_address: payload.wallet_address },
  ]);

  let lastError: unknown = null;
  for (const variant of variants) {
    try {
      await upsertPlayer(admin, variant);
      return;
    } catch (error) {
      lastError = error;
      console.error('submit-run ensurePlayerExists variant failed', { payloadKeys: Object.keys(variant), ...normalizeError(error) });
    }
  }

  throw lastError || new Error('Unable to ensure player exists.');
}

async function runAlreadyExists(admin: SupabaseClient, walletAddress: string, clientRunId: string) {
  const selectVariants = ['id, wallet_address', 'id'];

  for (const columns of selectVariants) {
    const { data, error } = await admin
      .from('runs')
      .select(columns)
      .eq('client_run_id', clientRunId)
      .maybeSingle();

    if (error) {
      if (isMissingColumnError(error)) continue;
      console.error('submit-run duplicate precheck failed (non-fatal)', { columns, ...normalizeError(error) });
      return { exists: false };
    }

    if (!data) return { exists: false, id: null as string | null };
    const row = data as Record<string, unknown>;
    const existingWallet = normalizeAddress(row.wallet_address as string);
    if (!existingWallet || existingWallet === walletAddress) return { exists: true, id: String(row.id || '').trim() || null };
    return { exists: false, id: null as string | null };
  }

  return { exists: false, id: null as string | null };
}


async function attachReplayData(
  admin: SupabaseClient,
  runId: string | null,
  replayData: Record<string, unknown>,
  replayShareId: string | null,
  requestId: string,
) {
  if (!runId || !replayData || typeof replayData !== 'object') return;

  const variants = uniquePayloadVariants([
    { replay_json: replayData, replay_share_id: replayShareId },
    { replay_json: replayData },
    replayShareId ? { replay_share_id: replayShareId } : {},
  ].filter((row) => Object.keys(row).length > 0));

  for (const variant of variants) {
    const { error } = await admin.from('runs').update(variant).eq('id', runId);
    if (!error) {
      console.log('submit-run replay attached', { requestId, runId, payloadKeys: Object.keys(variant) });
      return;
    }
    console.error('submit-run replay attach failed (non-fatal)', { requestId, runId, payloadKeys: Object.keys(variant), ...normalizeError(error) });
    if (!isMissingColumnError(error)) {
      return;
    }
  }
}

async function insertRun(admin: SupabaseClient, payload: Record<string, unknown>) {
  const variants = uniquePayloadVariants([
    payload,
    omitKeys(payload, ['run_started_at']),
    omitKeys(payload, ['premium_jewels', 'run_started_at']),
    omitKeys(payload, ['premium_jewels', 'run_started_at', 'display_name_snapshot']),
    omitKeys(payload, ['premium_jewels', 'run_started_at', 'display_name_snapshot', 'heroes_json', 'stats_json']),
    {
      wallet_address: payload.wallet_address,
      client_run_id: payload.client_run_id,
      game_version: payload.game_version,
      mode: payload.mode,
      result: payload.result,
      wave_reached: payload.wave_reached,
      waves_cleared: payload.waves_cleared,
      portal_hp_left: payload.portal_hp_left,
      gold_on_hand: payload.gold_on_hand,
      completed_at: payload.completed_at,
      chain_id: payload.chain_id,
    },
  ]);

  let lastError: unknown = null;
  for (const variant of variants) {
    const { data, error } = await admin.from('runs').insert(variant).select('id').maybeSingle();
    if (!error) return { duplicate: false, id: String((data as Record<string, unknown> | null)?.id || '').trim() || null };

    lastError = error;
    const message = String(error.message || '').toLowerCase();
    console.error('submit-run run insert failed', { payloadKeys: Object.keys(variant), ...normalizeError(error) });

    if (message.includes('duplicate key') || message.includes('already exists') || message.includes('unique constraint')) {
      const existing = await runAlreadyExists(admin, normalizeAddress(String(payload.wallet_address || '')), String(payload.client_run_id || ''));
      return { duplicate: true, id: existing.id || null };
    }
    if (!isMissingColumnError(error)) {
      throw error;
    }
  }

  throw lastError || new Error('Run insert failed.');
}


async function syncPlayerSummaryFromRuns(
  admin: SupabaseClient,
  walletAddress: string,
  options: { displayName?: string | null; lastRunAt?: string | null; usedWalletHeroes?: boolean } = {},
) {
  const aggregates = await computePlayerAggregates(admin, walletAddress);
  if ('response' in aggregates) {
    console.error('submit-run aggregate recompute failed (non-fatal)', aggregates.response.status);
    return;
  }

  const derivedUsedWalletHeroes = Boolean(options.usedWalletHeroes) || await computeUsedWalletHeroes(admin, walletAddress);
  const summaryPayload: Record<string, unknown> = {
    wallet_address: walletAddress,
    display_name: cleanName(options.displayName) || null,
    best_wave: aggregates.bestWave,
    total_runs: aggregates.totalRuns,
    total_waves_cleared: aggregates.totalWavesCleared,
    last_run_at: options.lastRunAt || new Date().toISOString(),
    used_wallet_heroes: derivedUsedWalletHeroes,
  };

  try {
    await upsertPlayer(admin, summaryPayload);
  } catch (error) {
    console.error('submit-run player aggregate upsert failed (non-fatal)', normalizeError(error));

    const minimalVariants = uniquePayloadVariants([
      {
        wallet_address: walletAddress,
        best_wave: aggregates.bestWave,
        total_runs: aggregates.totalRuns,
        total_waves_cleared: aggregates.totalWavesCleared,
      },
      {
        wallet_address: walletAddress,
        best_wave: aggregates.bestWave,
        total_runs: aggregates.totalRuns,
      },
      { wallet_address: walletAddress },
    ]);

    for (const variant of minimalVariants) {
      try {
        await upsertPlayer(admin, variant);
        return;
      } catch (innerError) {
        console.error('submit-run minimal player upsert failed (non-fatal)', { payloadKeys: Object.keys(variant), ...normalizeError(innerError) });
      }
    }
  }
}

async function computePlayerAggregates(admin: SupabaseClient, walletAddress: string) {
  const selectVariants = [
    'wave_reached, waves_cleared',
    'wave_reached',
  ];

  let lastError: unknown = null;
  for (const columns of selectVariants) {
    const { data, error } = await admin
      .from('runs')
      .select(columns)
      .eq('wallet_address', walletAddress);

    if (error) {
      lastError = error;
      if (isMissingColumnError(error)) continue;
      console.error('submit-run aggregate recompute failed', { columns, ...normalizeError(error) });
      return { response: json({ error: 'Aggregate recompute failed.', code: 'aggregate_recompute_failed', details: String((error as { message?: unknown }).message || '') }, 500) };
    }

    const rows = Array.isArray(data) ? data : [];
    let bestWave = 0;
    let totalWavesCleared = 0;
    for (const row of rows) {
      const run = row as Record<string, unknown>;
      bestWave = Math.max(bestWave, sanitizeInt(run.wave_reached));
      totalWavesCleared += sanitizeInt(run.waves_cleared);
    }

    return {
      bestWave,
      totalRuns: rows.length,
      totalWavesCleared,
    };
  }

  console.error('submit-run aggregate recompute exhausted variants', normalizeError(lastError));
  return { response: json({ error: 'Aggregate recompute failed.', code: 'aggregate_recompute_failed' }, 500) };
}


async function computeUsedWalletHeroes(admin: SupabaseClient, walletAddress: string) {
  const selectVariants = [
    'stats_json, heroes_json',
    'stats_json',
    'heroes_json',
  ];

  for (const columns of selectVariants) {
    const { data, error } = await admin
      .from('runs')
      .select(columns)
      .eq('wallet_address', walletAddress);

    if (error) {
      if (isMissingColumnError(error)) continue;
      console.error('submit-run nft usage recompute failed', { columns, ...normalizeError(error) });
      return false;
    }

    const rows = Array.isArray(data) ? data : [];
    for (const row of rows) {
      const run = row as Record<string, unknown>;
      const stats = run.stats_json && typeof run.stats_json === 'object' ? run.stats_json as Record<string, unknown> : {};
      if (
        Boolean(stats.usedWalletHeroes)
        || Boolean(stats.used_wallet_heroes)
        || Number(stats.usedWalletHeroCount || 0) > 0
        || Number(stats.used_wallet_hero_count || 0) > 0
      ) {
        return true;
      }
      const heroes = Array.isArray(run.heroes_json) ? run.heroes_json as Array<Record<string, unknown>> : [];
      if (heroes.some((hero) => {
        const entry = hero as Record<string, unknown>;
        return Boolean(entry.usedWalletHero)
          || Boolean(entry.used_wallet_hero)
          || Number(entry.walletHeroCount || 0) > 0
          || Number(entry.wallet_hero_count || 0) > 0
          || Boolean(entry.walletHeroId)
          || Boolean(entry.wallet_hero_id);
      })) {
        return true;
      }
    }

    return false;
  }

  return false;
}

async function upsertPlayer(admin: SupabaseClient, payload: Record<string, unknown>) {
  const variants = uniquePayloadVariants([
    payload,
    omitKeys(payload, ['used_wallet_heroes']),
    omitKeys(payload, ['used_wallet_heroes', 'last_run_at']),
    omitKeys(payload, ['used_wallet_heroes', 'last_run_at', 'total_waves_cleared']),
    omitKeys(payload, ['used_wallet_heroes', 'last_run_at', 'total_waves_cleared', 'best_wave', 'total_runs']),
    { wallet_address: payload.wallet_address, display_name: payload.display_name ?? null },
    { wallet_address: payload.wallet_address },
  ]);

  let lastError: unknown = null;
  for (const variant of variants) {
    const { error } = await admin.from('players').upsert(variant, { onConflict: 'wallet_address' });
    if (!error) return;
    lastError = error;
    console.error('submit-run player upsert failed', { payloadKeys: Object.keys(variant), ...normalizeError(error) });
    if (!isMissingColumnError(error)) throw error;
  }

  throw lastError || new Error('Player upsert failed.');
}

async function touchWalletSession(admin: SupabaseClient, token: string) {
  const variants = [
    { last_seen_at: new Date().toISOString() },
    {},
  ];

  for (const payload of variants) {
    const { error } = await admin
      .from('wallet_sessions')
      .update(payload)
      .eq('session_token', token);

    if (!error) return;
    if (isMissingColumnError(error)) continue;
    console.error('submit-run wallet session touch failed', normalizeError(error));
    return;
  }
}



function hardenRunStats(input: {
  waveReached: number;
  wavesCleared: number;
  portalHpLeft: number;
  goldOnHand: number;
  result: string;
  heroes: unknown[];
  stats: Record<string, unknown>;
}) {
  const source = input.stats && typeof input.stats === 'object' ? input.stats : {};
  const wavesStartedFloor = Math.max(input.waveReached, input.wavesCleared);
  const wavesCompletedCap = Math.max(0, input.wavesCleared);
  const wavesStartedCap = Math.max(wavesStartedFloor, wavesCompletedCap);
  const heroRows = Array.isArray(input.heroes) ? input.heroes : [];
  let aggregateHeroCount = 0;
  let aggregateSatelliteCount = 0;
  let aggregateWalletHeroCount = 0;
  let warriorCount = 0;
  let spellbowCount = 0;
  let sageCount = 0;

  for (const hero of heroRows) {
    const row = hero && typeof hero === 'object' ? hero as Record<string, unknown> : null;
    if (!row) continue;
    const type = sliceText(row.type, 40, '').toLowerCase();
    const count = sanitizeInt(row.count);
    aggregateHeroCount += count;
    aggregateSatelliteCount += Math.min(count, sanitizeInt(row.satellites));
    aggregateWalletHeroCount += Math.min(count, sanitizeInt(row.walletHeroCount));
    if (type === 'warrior') warriorCount += count;
    if (type === 'spellbow') spellbowCount += count;
    if (type === 'sage') sageCount += count;
  }

  const safeHeroCapacity = Math.max(aggregateHeroCount, 1) * Math.max(wavesCompletedCap, 1);
  const killsCap = Math.max(5000, wavesStartedCap * 1000 + 5000);
  const heroDamageCap = Math.max(1_000_000, wavesStartedCap * 1_000_000 + 5_000_000);
  const supportHealingCap = Math.max(250_000, safeHeroCapacity * 50_000);
  const goldSpendCap = Math.max(250_000, sanitizeInt(source.dfkGoldBurnedTotal || source.dfk_gold_burned_total) * 4 + wavesStartedCap * 50_000 + 250_000);
  const goldEarnedCap = Math.max(goldSpendCap, input.goldOnHand + goldSpendCap + wavesStartedCap * 25_000 + 250_000);
  const relicChoiceCap = Math.max(10, wavesStartedCap * 5 + 25);
  const upgradeCap = Math.max(25, wavesStartedCap * 10 + 50);
  const abilityTriggerCap = Math.max(100, wavesStartedCap * 100 + 500);
  const manualAbilityCap = Math.max(50, wavesStartedCap * 50 + 250);
  const bossCap = Math.min(killsCap, Math.max(10, wavesStartedCap * 5 + 25));

  const out: Record<string, unknown> = {
    towerCount: clampInt(source.towerCount, 0, 32, aggregateHeroCount),
    satelliteCount: clampInt(source.satelliteCount, 0, aggregateHeroCount, aggregateSatelliteCount),
    playerBarriersPlaced: clampInt(source.playerBarriersPlaced, 0, 2000),
    randomObstacles: clampInt(source.randomObstacles, 0, 2000),
    barrierRefits: clampInt(source.barrierRefits, 0, 2000),
    hireCount: clampInt(source.hireCount, 0, 32),
    crashed: Boolean(source.crashed),
    usedWalletHeroes: Boolean(source.usedWalletHeroes || source.used_wallet_heroes || aggregateWalletHeroCount > 0),
    usedWalletHeroCount: clampInt(source.usedWalletHeroCount || source.used_wallet_hero_count, 0, aggregateHeroCount, aggregateWalletHeroCount),
    dfkGoldBurnedTotal: clampInt(source.dfkGoldBurnedTotal || source.dfk_gold_burned_total, 0, 50_000_000),

    killsTotal: clampInt(source.killsTotal, 0, killsCap),
    killsElite: clampInt(source.killsElite, 0, killsCap),
    killsBoss: clampInt(source.killsBoss, 0, bossCap),
    heroKills: clampInt(source.heroKills, 0, killsCap),
    abilityKills: clampInt(source.abilityKills, 0, killsCap),
    killsSlowed: clampInt(source.killsSlowed, 0, killsCap),
    killsBurning: clampInt(source.killsBurning, 0, killsCap),
    killsStunned: clampInt(source.killsStunned, 0, killsCap),
    killsQuickSpawn: clampInt(source.killsQuickSpawn, 0, killsCap),
    killsNearPortal: clampInt(source.killsNearPortal, 0, killsCap),
    killsNearStatue: clampInt(source.killsNearStatue, 0, killsCap),
    killsMultiWave: clampInt(source.killsMultiWave, 0, killsCap),
    killsMulti3: clampInt(source.killsMulti3, 0, killsCap),
    killsPortalBelow75: clampInt(source.killsPortalBelow75, 0, killsCap),
    killsPortalBelow25: clampInt(source.killsPortalBelow25, 0, killsCap),
    critKills: clampInt(source.critKills, 0, killsCap),
    championKills: clampInt(source.championKills, 0, killsCap),

    heroesDeployed: clampInt(source.heroesDeployed, 0, Math.max(aggregateHeroCount + sanitizeInt(source.hireCount), sanitizeInt(source.hireCount), aggregateHeroCount)),
    wavesWithWarrior: clampInt(source.wavesWithWarrior, 0, warriorCount > 0 ? wavesCompletedCap : 0),
    wavesWithSpellbow: clampInt(source.wavesWithSpellbow, 0, spellbowCount > 0 ? wavesCompletedCap : 0),
    wavesWithSage: clampInt(source.wavesWithSage, 0, sageCount > 0 ? wavesCompletedCap : 0),
    heroDamage: clampInt(source.heroDamage, 0, heroDamageCap),
    supportHealing: clampInt(source.supportHealing, 0, supportHealingCap),
    heroAbilityTriggers: clampInt(source.heroAbilityTriggers, 0, abilityTriggerCap),
    manualHeroAbilityTriggers: clampInt(source.manualHeroAbilityTriggers, 0, manualAbilityCap),
    heroAliveWaves: clampInt(source.heroAliveWaves, 0, safeHeroCapacity),
    barriersPlaced: clampInt(source.barriersPlaced, 0, 2000, sanitizeInt(source.playerBarriersPlaced)),
    barrierBlocks: clampInt(source.barrierBlocks, 0, Math.max(5000, wavesStartedCap * 50 + 500)),
    barrierReroutes: clampInt(source.barrierReroutes, 0, Math.max(5000, wavesStartedCap * 50 + 500)),
    wavesAllBarriersPlaced: clampInt(source.wavesAllBarriersPlaced, 0, wavesCompletedCap),
    wavesZeroBarrierLoss: clampInt(source.wavesZeroBarrierLoss, 0, wavesCompletedCap),
    runsAllBarriersPlaced: clampInt(source.runsAllBarriersPlaced, 0, 1),
    portalMoves: clampInt(source.portalMoves, 0, Math.max(25, wavesStartedCap)),
    wavesAfterPortalMove: clampInt(source.wavesAfterPortalMove, 0, wavesCompletedCap),

    wavesStarted: clampInt(source.wavesStarted, 0, wavesStartedCap, wavesStartedFloor),
    wavesCompleted: clampInt(source.wavesCompleted, 0, wavesCompletedCap, wavesCompletedCap),
    wavesPast20: clampInt(source.wavesPast20, 0, Math.max(0, wavesCompletedCap - 20), Math.max(0, wavesCompletedCap - 20)),
    wavesPast30: clampInt(source.wavesPast30, 0, Math.max(0, wavesCompletedCap - 30), Math.max(0, wavesCompletedCap - 30)),
    wavesMulti2: clampInt(source.wavesMulti2, 0, wavesCompletedCap),
    wavesMulti3: clampInt(source.wavesMulti3, 0, wavesCompletedCap),
    multiWaveBonusTriggers: clampInt(source.multiWaveBonusTriggers, 0, wavesStartedCap),
    wavesFinishedNoRestart: clampInt(source.wavesFinishedNoRestart, 0, wavesCompletedCap),
    runsReach10: clampInt(source.runsReach10, 0, input.waveReached >= 10 ? 1 : 0, input.waveReached >= 10 ? 1 : 0),
    runsReach20: clampInt(source.runsReach20, 0, input.waveReached >= 20 ? 1 : 0, input.waveReached >= 20 ? 1 : 0),

    goldSpent: clampInt(source.goldSpent, 0, goldSpendCap),
    goldEarned: clampInt(source.goldEarned, 0, goldEarnedCap),
    heroesHired: clampInt(source.heroesHired, 0, Math.max(sanitizeInt(source.hireCount), 0)),
    upgrades: clampInt(source.upgrades, 0, upgradeCap),
    avaxSpent: clampInt(source.avaxSpent, 0, 1_000_000_000),
    dailyEliteQuestsCompleted: clampInt(source.dailyEliteQuestsCompleted, 0, 7),
    relicChoicesOpened: clampInt(source.relicChoicesOpened, 0, relicChoiceCap),
  };

  out.killsElite = Math.min(sanitizeInt(out.killsElite), sanitizeInt(out.killsTotal));
  out.killsBoss = Math.min(sanitizeInt(out.killsBoss), sanitizeInt(out.killsTotal));
  out.heroKills = Math.min(sanitizeInt(out.heroKills), sanitizeInt(out.killsTotal));
  out.abilityKills = Math.min(sanitizeInt(out.abilityKills), sanitizeInt(out.killsTotal));
  out.killsSlowed = Math.min(sanitizeInt(out.killsSlowed), sanitizeInt(out.killsTotal));
  out.killsBurning = Math.min(sanitizeInt(out.killsBurning), sanitizeInt(out.killsTotal));
  out.killsStunned = Math.min(sanitizeInt(out.killsStunned), sanitizeInt(out.killsTotal));
  out.killsQuickSpawn = Math.min(sanitizeInt(out.killsQuickSpawn), sanitizeInt(out.killsTotal));
  out.killsNearPortal = Math.min(sanitizeInt(out.killsNearPortal), sanitizeInt(out.killsTotal));
  out.killsNearStatue = Math.min(sanitizeInt(out.killsNearStatue), sanitizeInt(out.killsTotal));
  out.killsMultiWave = Math.min(sanitizeInt(out.killsMultiWave), sanitizeInt(out.killsTotal));
  out.killsMulti3 = Math.min(sanitizeInt(out.killsMulti3), sanitizeInt(out.killsMultiWave));
  out.killsPortalBelow75 = Math.min(sanitizeInt(out.killsPortalBelow75), sanitizeInt(out.killsTotal));
  out.killsPortalBelow25 = Math.min(sanitizeInt(out.killsPortalBelow25), sanitizeInt(out.killsTotal));
  out.critKills = Math.min(sanitizeInt(out.critKills), sanitizeInt(out.killsTotal));
  out.championKills = Math.min(sanitizeInt(out.championKills), sanitizeInt(out.killsTotal));
  out.manualHeroAbilityTriggers = Math.min(sanitizeInt(out.manualHeroAbilityTriggers), sanitizeInt(out.heroAbilityTriggers));
  out.wavesMulti2 = Math.min(sanitizeInt(out.wavesMulti2), sanitizeInt(out.wavesCompleted));
  out.wavesMulti3 = Math.min(sanitizeInt(out.wavesMulti3), sanitizeInt(out.wavesMulti2));
  out.multiWaveBonusTriggers = Math.min(sanitizeInt(out.multiWaveBonusTriggers), sanitizeInt(out.wavesStarted));
  out.goldSpent = Math.min(sanitizeInt(out.goldSpent), goldSpendCap);
  out.goldEarned = Math.min(sanitizeInt(out.goldEarned), goldEarnedCap);
  return out;
}

function clampInt(value: unknown, min: number, max: number, fallback?: number) {
  const parsed = Number(value);
  const base = Number.isFinite(parsed) ? Math.round(parsed) : Math.round(Number(fallback || 0));
  if (base < min) return min;
  if (base > max) return max;
  return base;
}


async function validateSecureRunSubmission(
  bodyRow: Record<string, unknown>,
  payload: {
    walletAddress: string;
    clientRunId: string;
    waveReached: number;
    wavesCleared: number;
    completedAt: string;
    runStartedAt: string | null;
    gameVersion: string;
    mode: string;
    result: string;
    chainId: number;
    portalHpLeft: number;
    goldOnHand: number;
    premiumJewels: number;
    heroes: unknown[];
    stats: Record<string, unknown>;
  },
) {
  if (!RUN_SUBMIT_CHALLENGE_SECRET) {
    return json({ error: 'Secure run submission is not configured on the server.', code: 'secure_submission_not_configured' }, 500);
  }

  const secureRow = bodyRow.secureSubmission && typeof bodyRow.secureSubmission === 'object'
    ? bodyRow.secureSubmission as Record<string, unknown>
    : null;
  if (!secureRow) {
    return json({ error: 'High-value runs require a fresh final signature.', code: 'secure_submission_required' }, 401);
  }

  const challengeToken = String(secureRow.challengeToken || '').trim();
  const signature = String(secureRow.signature || '').trim();
  const message = String(secureRow.message || '').trim();
  const payloadHash = String(secureRow.payloadHash || '').trim();
  if (!challengeToken || !signature || !message || !payloadHash) {
    return json({ error: 'Secure submission payload was incomplete.', code: 'secure_submission_incomplete' }, 401);
  }

  const expectedPayloadHash = await hashRunPayloadForSecureSubmission(payload);
  if (payloadHash !== expectedPayloadHash) {
    return json({ error: 'Secure submission payload hash mismatch.', code: 'secure_payload_hash_mismatch' }, 401);
  }

  const tokenPayload = await verifySignedChallengeToken(challengeToken, RUN_SUBMIT_CHALLENGE_SECRET);
  if (!tokenPayload) {
    return json({ error: 'Secure submission challenge was invalid.', code: 'secure_challenge_invalid' }, 401);
  }
  if (String(tokenPayload.type || '') != 'dfk_secure_run_submit') {
    return json({ error: 'Secure submission challenge type was invalid.', code: 'secure_challenge_invalid_type' }, 401);
  }
  if (normalizeAddress(tokenPayload.walletAddress) != payload.walletAddress) {
    return json({ error: 'Secure submission wallet mismatch.', code: 'secure_wallet_mismatch' }, 401);
  }
  if (normalizeClientRunId(tokenPayload.clientRunId) != payload.clientRunId) {
    return json({ error: 'Secure submission run mismatch.', code: 'secure_run_mismatch' }, 401);
  }
  if (String(tokenPayload.payloadHash || '') != expectedPayloadHash) {
    return json({ error: 'Secure submission challenge hash mismatch.', code: 'secure_challenge_hash_mismatch' }, 401);
  }
  if (Number(tokenPayload.waveReached || 0) != payload.waveReached) {
    return json({ error: 'Secure submission wave mismatch.', code: 'secure_challenge_wave_mismatch' }, 401);
  }
  if (String(tokenPayload.completedAt || '') != payload.completedAt) {
    return json({ error: 'Secure submission completion time mismatch.', code: 'secure_challenge_completed_at_mismatch' }, 401);
  }
  const expiresAt = Date.parse(String(tokenPayload.expiresAt || ''));
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    return json({ error: 'Secure submission challenge expired.', code: 'secure_challenge_expired' }, 401);
  }

  const origin = String(tokenPayload.origin || '').trim() || null;
  const expectedMessage = buildSecureRunSubmitMessage({
    origin,
    walletAddress: payload.walletAddress,
    clientRunId: payload.clientRunId,
    waveReached: payload.waveReached,
    completedAt: payload.completedAt,
    payloadHash: expectedPayloadHash,
    challengeId: String(tokenPayload.challengeId || ''),
    expiresAt: String(tokenPayload.expiresAt || ''),
  });
  if (message != expectedMessage) {
    return json({ error: 'Secure submission message mismatch.', code: 'secure_message_mismatch' }, 401);
  }

  let recoveredAddress = '';
  try {
    recoveredAddress = normalizeAddress(verifyMessage(message, signature));
  } catch (_error) {
    return json({ error: 'Secure submission signature could not be verified.', code: 'secure_signature_invalid' }, 401);
  }
  if (recoveredAddress != payload.walletAddress) {
    return json({ error: 'Secure submission signature wallet mismatch.', code: 'secure_signature_wallet_mismatch' }, 401);
  }

  return null;
}

function buildSecurePayloadForHash(payload: {
  walletAddress: string;
  clientRunId: string;
  runStartedAt: string | null;
  completedAt: string;
  gameVersion: string;
  mode: string;
  result: string;
  chainId: number;
  waveReached: number;
  wavesCleared: number;
  portalHpLeft: number;
  goldOnHand: number;
  premiumJewels: number;
  heroes: unknown[];
  stats: Record<string, unknown>;
}) {
  return canonicalize({
    walletAddress: payload.walletAddress,
    clientRunId: payload.clientRunId,
    runStartedAt: payload.runStartedAt,
    completedAt: payload.completedAt,
    gameVersion: payload.gameVersion,
    mode: payload.mode,
    result: payload.result,
    chainId: payload.chainId,
    waveReached: payload.waveReached,
    wavesCleared: payload.wavesCleared,
    portalHpLeft: payload.portalHpLeft,
    goldOnHand: payload.goldOnHand,
    premiumJewels: payload.premiumJewels,
    heroes: payload.heroes,
    stats: payload.stats,
  });
}

async function hashRunPayloadForSecureSubmission(payload: Parameters<typeof buildSecurePayloadForHash>[0]) {
  const text = JSON.stringify(buildSecurePayloadForHash(payload));
  return await sha256Base64Url(text);
}

function buildSecureRunSubmitMessage(input: {
  origin: string | null;
  walletAddress: string;
  clientRunId: string;
  waveReached: number;
  completedAt: string;
  payloadHash: string;
  challengeId: string;
  expiresAt: string;
}) {
  const origin = String(input.origin || 'DFK Defender').trim();
  const host = origin.replace(/^https?:\/\//i, '').replace(/\/$/, '') || 'DFK Defender';
  return [
    `${host} wants you to securely submit this high-value DFK Defender run:`,
    input.walletAddress,
    '',
    `Run ID: ${input.clientRunId}`,
    `Wave Reached: ${input.waveReached}`,
    `Completed At: ${input.completedAt}`,
    `Payload Hash: ${input.payloadHash}`,
    `Challenge ID: ${input.challengeId}`,
    `Expires At: ${input.expiresAt}`,
    '',
    'Sign to authorize secure submission of this saved run.',
    'No blockchain transaction will be sent.',
    '',
    `URI: ${origin}`,
    'Version: 1',
  ].join('\n');
}

function canonicalize(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value.map((entry) => canonicalize(entry));
  if (typeof value === 'object') {
    const row = value as Record<string, unknown>;
    return Object.keys(row).sort().reduce<Record<string, unknown>>((acc, key) => {
      if (row[key] === undefined) return acc;
      acc[key] = canonicalize(row[key]);
      return acc;
    }, {});
  }
  if (typeof value === 'number' && !Number.isFinite(value)) return null;
  return value;
}

async function sha256Base64Url(input: string) {
  const bytes = new TextEncoder().encode(String(input || ''));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return bytesToBase64Url(new Uint8Array(digest));
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value: string) {
  const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function signChallengeToken(payload: Record<string, unknown>, secret: string) {
  const encodedPayload = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(encodedPayload));
  return `${encodedPayload}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

async function verifySignedChallengeToken(token: string, secret: string) {
  const [payloadPart, signaturePart] = String(token || '').split('.');
  if (!payloadPart || !signaturePart) return null;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const valid = await crypto.subtle.verify('HMAC', key, base64UrlToBytes(signaturePart), new TextEncoder().encode(payloadPart));
  if (!valid) return null;
  const jsonText = new TextDecoder().decode(base64UrlToBytes(payloadPart));
  try {
    return JSON.parse(jsonText) as Record<string, unknown>;
  } catch (_error) {
    return null;
  }
}

function validateRunSubmission(input: {
  clientRunId: string;
  waveReached: number;
  wavesCleared: number;
  portalHpLeft: number;
  goldOnHand: number;
  premiumJewels: number;
  gameVersion: string;
  mode: string;
  result: string;
  heroes: unknown[];
  stats: Record<string, unknown>;
  completedAt: string;
  runStartedAt: string | null;
  chainId: number;
  usedWalletHeroes: boolean;
}) {
  const allowedModes = new Set(['easy', 'challenge']);
  const allowedResults = new Set(['loss', 'abandoned', 'closed', 'disconnected', 'win']);
  const nowMs = Date.now();
  const completedMs = Date.parse(input.completedAt);
  const startedMs = input.runStartedAt ? Date.parse(input.runStartedAt) : NaN;

  if (!/^[a-z0-9][a-z0-9_-]{7,127}$/i.test(input.clientRunId)) {
    return { error: 'Invalid clientRunId.', code: 'invalid_client_run_id', details: 'clientRunId must be 8-128 characters.' };
  }
  if (!allowedModes.has(input.mode)) {
    return { error: 'Invalid mode.', code: 'invalid_mode' };
  }
  if (!allowedResults.has(input.result)) {
    return { error: 'Invalid result.', code: 'invalid_result' };
  }
  if (!Number.isFinite(completedMs)) {
    return { error: 'Invalid completedAt.', code: 'invalid_completed_at' };
  }
  if (completedMs > nowMs + 5 * 60_000) {
    return { error: 'completedAt is too far in the future.', code: 'completed_at_future' };
  }
  if (input.runStartedAt) {
    if (!Number.isFinite(startedMs)) {
      return { error: 'Invalid runStartedAt.', code: 'invalid_run_started_at' };
    }
    if (startedMs > completedMs) {
      return { error: 'runStartedAt cannot be after completedAt.', code: 'run_time_inverted' };
    }
    const durationMs = completedMs - startedMs;
    if (durationMs > 24 * 60 * 60_000) {
      return { error: 'Run duration exceeds the maximum allowed tracked session length.', code: 'run_duration_too_long' };
    }
    const minDurationMs = input.wavesCleared <= 25
      ? 0
      : Math.max(0, (input.wavesCleared - 5) * 4_000);
    if (minDurationMs > 0 && durationMs + 60_000 < minDurationMs) {
      return {
        error: 'Run finished faster than allowed by leaderboard validation.',
        code: 'run_duration_too_short',
        details: `duration_ms=${durationMs}, min_required_ms=${minDurationMs}`,
      };
    }
  }
  if (!Number.isInteger(input.waveReached) || input.waveReached < 0 || input.waveReached > 25000) {
    return { error: 'Invalid waveReached.', code: 'invalid_wave_reached' };
  }
  if (!Number.isInteger(input.wavesCleared) || input.wavesCleared < 0 || input.wavesCleared > input.waveReached) {
    return { error: 'Invalid wavesCleared.', code: 'invalid_waves_cleared' };
  }
  if (!Number.isInteger(input.portalHpLeft) || input.portalHpLeft < 0 || input.portalHpLeft > 500000) {
    return { error: 'Invalid portalHpLeft.', code: 'invalid_portal_hp_left' };
  }
  if (!Number.isInteger(input.goldOnHand) || input.goldOnHand < 0 || input.goldOnHand > 50000000) {
    return { error: 'Invalid goldOnHand.', code: 'invalid_gold_on_hand' };
  }
  if (!Number.isInteger(input.premiumJewels) || input.premiumJewels < 0 || input.premiumJewels > 1000000) {
    return { error: 'Invalid premiumJewels.', code: 'invalid_premium_jewels' };
  }
  if (!Number.isInteger(input.chainId) || input.chainId <= 0) {
    return { error: 'Invalid chainId.', code: 'invalid_chain_id' };
  }
  if (input.gameVersion.length > 80 || !input.gameVersion) {
    return { error: 'Invalid gameVersion.', code: 'invalid_game_version' };
  }
  if (!Array.isArray(input.heroes) || input.heroes.length > 32) {
    return { error: 'Invalid heroes payload.', code: 'invalid_heroes_payload' };
  }

  let aggregateHeroCount = 0;
  let aggregateSatelliteCount = 0;
  let aggregateWalletHeroCount = 0;
  for (const hero of input.heroes) {
    const row = hero && typeof hero === 'object' ? hero as Record<string, unknown> : null;
    if (!row) return { error: 'Invalid hero row.', code: 'invalid_hero_row' };
    const type = sliceText(row.type, 40, '');
    const count = sanitizeInt(row.count);
    const highestLevel = sanitizeInt(row.highestLevel);
    const satellites = sanitizeInt(row.satellites);
    const walletHeroCount = sanitizeInt(row.walletHeroCount);
    if (!type) return { error: 'Hero type is required.', code: 'invalid_hero_type' };
    if (count < 0 || count > 32) return { error: 'Hero count is out of range.', code: 'invalid_hero_count' };
    if (highestLevel < 0 || highestLevel > Math.max(250, input.waveReached + 100)) {
      return { error: 'Hero level is out of range.', code: 'invalid_hero_level' };
    }
    if (satellites < 0 || satellites > count) {
      return { error: 'Satellite count is out of range.', code: 'invalid_satellite_count' };
    }
    if (walletHeroCount < 0 || walletHeroCount > count) {
      return { error: 'Wallet hero count is out of range.', code: 'invalid_wallet_hero_count' };
    }
    aggregateHeroCount += count;
    aggregateSatelliteCount += satellites;
    aggregateWalletHeroCount += walletHeroCount;
  }

  if (aggregateHeroCount > 32) {
    return { error: 'Total hero count is out of range.', code: 'invalid_total_hero_count' };
  }

  const towerCount = sanitizeInt(input.stats.towerCount);
  const satelliteCount = sanitizeInt(input.stats.satelliteCount);
  const hireCount = sanitizeInt(input.stats.hireCount);
  const barrierRefits = sanitizeInt(input.stats.barrierRefits);
  const playerBarriersPlaced = sanitizeInt(input.stats.playerBarriersPlaced);
  const usedWalletHeroCount = sanitizeInt(input.stats.usedWalletHeroCount || input.stats.used_wallet_hero_count);
  const dfkGoldBurnedTotal = sanitizeInt(input.stats.dfkGoldBurnedTotal);

  if (towerCount !== aggregateHeroCount) {
    return { error: 'towerCount does not match heroes payload.', code: 'tower_count_mismatch' };
  }
  if (satelliteCount !== aggregateSatelliteCount) {
    return { error: 'satelliteCount does not match heroes payload.', code: 'satellite_count_mismatch' };
  }
  if (input.usedWalletHeroes && aggregateWalletHeroCount <= 0 && usedWalletHeroCount <= 0) {
    return { error: 'Wallet hero usage flag does not match heroes payload.', code: 'wallet_hero_flag_mismatch' };
  }
  if (!input.usedWalletHeroes && (aggregateWalletHeroCount > 0 || usedWalletHeroCount > 0)) {
    return { error: 'Wallet hero counts were provided without a usage flag.', code: 'wallet_hero_count_mismatch' };
  }
  if (hireCount < 0 || hireCount > 32) {
    return { error: 'hireCount is out of range.', code: 'invalid_hire_count' };
  }
  if (barrierRefits < 0 || barrierRefits > 2000 || playerBarriersPlaced < 0 || playerBarriersPlaced > 2000) {
    return { error: 'Barrier stats are out of range.', code: 'invalid_barrier_stats' };
  }
  if (dfkGoldBurnedTotal < 0 || dfkGoldBurnedTotal > 50000000) {
    return { error: 'dfkGoldBurnedTotal is out of range.', code: 'invalid_dfk_gold_burned_total' };
  }

  const conservativeGoldCeiling = Math.max(500000, input.wavesCleared * 100000 + dfkGoldBurnedTotal * 4 + 1_000_000);
  if (input.goldOnHand > conservativeGoldCeiling) {
    return {
      error: 'goldOnHand exceeds the conservative leaderboard validation ceiling.',
      code: 'gold_on_hand_too_high',
      details: `gold_on_hand=${input.goldOnHand}, ceiling=${conservativeGoldCeiling}`,
    };
  }

  return null;
}

async function checkRunSubmissionRate(admin: SupabaseClient, walletAddress: string, completedAt: string) {
  const completedMs = Date.parse(completedAt);
  if (!Number.isFinite(completedMs)) return null;
  const since = new Date(completedMs - 10 * 60_000).toISOString();
  const until = new Date(completedMs + 5 * 60_000).toISOString();
  const { count, error } = await admin
    .from('runs')
    .select('id', { count: 'exact', head: true })
    .eq('wallet_address', walletAddress)
    .gte('completed_at', since)
    .lte('completed_at', until);

  if (error) {
    console.error('submit-run rate check failed (non-fatal)', normalizeError(error));
    return null;
  }
  if (Number(count || 0) >= 20) {
    return json({ error: 'Too many tracked runs submitted in a short period.', code: 'run_rate_limited' }, 429);
  }
  return null;
}

function uniquePayloadVariants(variants: Record<string, unknown>[]) {
  const seen = new Set<string>();
  const output: Record<string, unknown>[] = [];
  for (const variant of variants) {
    const key = JSON.stringify(Object.keys(variant).sort());
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(variant);
  }
  return output;
}


function cleanName(value: unknown) {
  const name = typeof value === 'string' ? value.trim() : '';
  return name || null;
}

function getErrorMessage(error: unknown) {
  if (!error || typeof error !== 'object') return '';
  const source = error as {
    message?: unknown;
    shortMessage?: unknown;
    reason?: unknown;
    data?: { message?: unknown };
    error?: { message?: unknown };
    info?: { error?: { message?: unknown } };
  };
  const message = [
    source.message,
    source.shortMessage,
    source.reason,
    source.data?.message,
    source.error?.message,
    source.info?.error?.message,
  ].find((value) => typeof value === 'string' && value.trim());
  return typeof message === 'string' ? message.trim() : '';
}

function isNoProfileLookupMiss(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();
  return message.includes('no profile found') || message.includes('profile not found');
}

function sliceText(value: unknown, limit: number, fallback = '') {
  const text = typeof value === 'string' ? value.trim() : '';
  return (text || fallback).slice(0, limit);
}

function omitKeys(payload: Record<string, unknown>, keys: string[]) {
  const copy = { ...payload };
  for (const key of keys) delete copy[key];
  return copy;
}

function isMissingColumnError(error: unknown) {
  const message = String((error && typeof error === 'object' && 'message' in error ? (error as { message?: unknown }).message : '') || '').toLowerCase();
  return message.includes('column') && (message.includes('does not exist') || message.includes('not found in schema cache'));
}

function normalizeError(error: unknown) {
  if (error && typeof error === 'object') {
    const row = error as Record<string, unknown>;
    return {
      message: String(row.message || 'Run submission failed.'),
      code: row.code ?? null,
      details: row.details ?? null,
      hint: row.hint ?? null,
      name: row.name ?? null,
    };
  }
  return { message: String(error || 'Run submission failed.'), code: null, details: null, hint: null, name: null };
}


function normalizeReplayShareId(replayData: Record<string, unknown> | null) {
  const raw = String((replayData && replayData.shareId) || '').trim().toLowerCase();
  const safe = raw.replace(/[^a-z0-9_-]+/g, '').slice(0, 64);
  return safe || null;
}

function normalizeClientRunId(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function safeIsoDate(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function sanitizeInt(value: unknown) {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.round(parsed);
}

function sanitizeChainId(value: unknown) {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed) || parsed <= 0) return 53935;
  return Math.round(parsed);
}

function createAdmin() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

function makeRequestId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function fingerprintToken(value: unknown) {
  const text = String(value || '').trim();
  if (!text) return null;
  return `${text.slice(0, 6)}…${text.slice(-4)}`;
}

function summarizeAddress(value: unknown) {
  const text = normalizeAddress(value);
  if (!text) return null;
  return `${text.slice(0, 6)}…${text.slice(-4)}`;
}
