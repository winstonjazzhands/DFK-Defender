import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-token, cache-control',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200, headers: corsHeaders });

  try {
    const token = getSessionToken(req);
    if (!token || /^sb_(publishable|anon)_/i.test(token)) {
      return json({ error: 'Valid session token required.', code: 'missing_session_token' }, 401);
    }

    const admin = createAdmin();
    const session = await loadValidSession(admin, token);
    if ('response' in session) return session.response;

    const body = await safeReadJson(req);
    if (!body || typeof body !== 'object') {
      return json({ error: 'Invalid request body.', code: 'invalid_body' }, 400);
    }

    const bodyRow = body as Record<string, unknown>;
    const walletAddress = normalizeAddress(bodyRow.walletAddress as string);
    if (!walletAddress) return json({ error: 'walletAddress is required.', code: 'wallet_required' }, 400);
    if (walletAddress !== normalizeAddress(session.wallet_address)) {
      return json({ error: 'Wallet mismatch.', code: 'wallet_mismatch' }, 401);
    }

    const clientRunId = String(bodyRow.clientRunId || '').trim();
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
    const completedAt = safeIsoDate(bodyRow.completedAt) || new Date().toISOString();
    const runStartedAt = safeIsoDate(bodyRow.runStartedAt);
    const usedWalletHeroes = Boolean(
      stats.usedWalletHeroes ||
      heroes.some((hero) => {
        const row = hero as Record<string, unknown>;
        return Boolean(row.usedWalletHero || Number(row.walletHeroCount || 0) > 0);
      })
    );

    const existingPlayer = await fetchExistingPlayer(admin, walletAddress);
    const resolvedDisplayName =
      cleanName(existingPlayer?.vanity_name) ||
      cleanName(existingPlayer?.display_name) ||
      requestedDisplayName ||
      null;

    await ensurePlayerExists(admin, {
      wallet_address: walletAddress,
      display_name: resolvedDisplayName,
      last_run_at: completedAt,
      used_wallet_heroes: Boolean(existingPlayer?.used_wallet_heroes) || usedWalletHeroes,
    });

    const duplicate = await runAlreadyExists(admin, walletAddress, clientRunId);
    if (duplicate.exists) {
      await syncPlayerSummaryFromRuns(admin, walletAddress, {
        displayName: resolvedDisplayName,
        lastRunAt: completedAt,
        usedWalletHeroes: Boolean(existingPlayer?.used_wallet_heroes) || usedWalletHeroes,
      });
      await touchWalletSession(admin, token);
      return json({ ok: true, duplicate: true }, 200);
    }

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
      stats_json: stats,
      run_started_at: runStartedAt,
      completed_at: completedAt,
    });

    if (insertResult.duplicate) {
      await touchWalletSession(admin, token);
      return json({ ok: true, duplicate: true }, 200);
    }

    await syncPlayerSummaryFromRuns(admin, walletAddress, {
      displayName: resolvedDisplayName,
      lastRunAt: completedAt,
      usedWalletHeroes: Boolean(existingPlayer?.used_wallet_heroes) || usedWalletHeroes,
    });

    await touchWalletSession(admin, token);
    return json({ ok: true }, 200);
  } catch (error) {
    const details = normalizeError(error);
    console.error('submit-run fatal error', details);
    return json({
      error: details.message || 'Run submission failed.',
      code: details.code,
      details: details.details,
      hint: details.hint,
      name: details.name,
    }, 500);
  }
});

function getSessionToken(req: Request) {
  const authHeader = req.headers.get('Authorization') || '';
  const fallbackHeader = req.headers.get('x-session-token') || '';
  const fallbackToken = String(fallbackHeader).trim();
  const authToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  return fallbackToken || authToken;
}

async function safeReadJson(req: Request) {
  try {
    return await req.json();
  } catch (error) {
    console.error('submit-run invalid json body', normalizeError(error));
    return null;
  }
}

async function loadValidSession(admin: SupabaseClient, token: string) {
  const selectVariants = [
    'session_token, wallet_address, expires_at, revoked_at',
    'session_token, wallet_address, expires_at',
    'session_token, wallet_address',
  ];

  let lastError: unknown = null;
  for (const columns of selectVariants) {
    const { data: session, error } = await admin
      .from('wallet_sessions')
      .select(columns)
      .eq('session_token', token)
      .maybeSingle();

    if (error) {
      lastError = error;
      if (isMissingColumnError(error)) continue;
      console.error('submit-run wallet session lookup failed', { columns, ...normalizeError(error) });
      return { response: json({ error: 'Session lookup failed.', code: 'session_lookup_failed', details: String((error as { message?: unknown }).message || '') }, 500) };
    }

    if (!session) return { response: json({ error: 'Session not found.', code: 'session_not_found' }, 401) };

    const row = session as Record<string, unknown>;
    if (row.revoked_at) return { response: json({ error: 'Session revoked.', code: 'session_revoked' }, 401) };

    const expiresAt = safeIsoDate(row.expires_at);
    if (expiresAt && Date.now() >= new Date(expiresAt).getTime()) {
      return { response: json({ error: 'Session expired.', code: 'session_expired' }, 401) };
    }

    return { wallet_address: normalizeAddress(row.wallet_address as string) };
  }

  console.error('submit-run wallet session lookup exhausted variants', normalizeError(lastError));
  return { response: json({ error: 'Session lookup failed.', code: 'session_lookup_failed' }, 500) };
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

    if (!data) return { exists: false };
    const row = data as Record<string, unknown>;
    const existingWallet = normalizeAddress(row.wallet_address as string);
    if (!existingWallet || existingWallet === walletAddress) return { exists: true };
    return { exists: false };
  }

  return { exists: false };
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
    },
  ]);

  let lastError: unknown = null;
  for (const variant of variants) {
    const { error } = await admin.from('runs').insert(variant);
    if (!error) return { duplicate: false };

    lastError = error;
    const message = String(error.message || '').toLowerCase();
    console.error('submit-run run insert failed', { payloadKeys: Object.keys(variant), ...normalizeError(error) });

    if (message.includes('duplicate key') || message.includes('already exists') || message.includes('unique constraint')) {
      return { duplicate: true };
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

  const summaryPayload: Record<string, unknown> = {
    wallet_address: walletAddress,
    display_name: cleanName(options.displayName) || null,
    best_wave: aggregates.bestWave,
    total_runs: aggregates.totalRuns,
    total_waves_cleared: aggregates.totalWavesCleared,
    last_run_at: options.lastRunAt || new Date().toISOString(),
    used_wallet_heroes: Boolean(options.usedWalletHeroes),
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

function normalizeAddress(address: string | null | undefined) {
  return String(address || '').trim().toLowerCase();
}

function cleanName(value: unknown) {
  const name = typeof value === 'string' ? value.trim() : '';
  return name || null;
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
