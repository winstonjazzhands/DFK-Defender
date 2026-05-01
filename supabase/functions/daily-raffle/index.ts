import { createClient } from 'jsr:@supabase/supabase-js@2';
import { tryAutoPayRewardClaim, isAutoRewardPayoutConfigured } from '../_shared/reward-payout.ts';
import { DFK_CHAIN_ID, AVAX_CHAIN_ID } from '../_shared/env.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

type DrawSlot = '00';
type RaffleType = 'dfk' | 'avax';
type RaffleConfig = {
  raffleType: RaffleType;
  chainId: number;
  rewardAmountText: string;
  rewardCurrency: 'JEWEL' | 'AVAX';
  claimType: string;
  sourceRefPrefix: string;
  cronSecretEnv: string;
};

type RowLike = Record<string, unknown>;

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function serializeError(error: unknown) {
  if (error instanceof Error) return { message: error.message, stack: error.stack };
  if (error && typeof error === 'object') {
    try { return JSON.parse(JSON.stringify(error)); } catch (_error) { return { value: String(error) }; }
  }
  return { value: String(error) };
}

function createAdmin() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

function getRaffleConfig(raffleTypeRaw: string | null | undefined): RaffleConfig {
  const raffleType = String(raffleTypeRaw || '').trim().toLowerCase() === 'avax' ? 'avax' : 'dfk';
  if (raffleType === 'avax') {
    return {
      raffleType: 'avax',
      chainId: AVAX_CHAIN_ID,
      rewardAmountText: String(Deno.env.get('AVAX_DAILY_RAFFLE_AMOUNT') || '1').trim(),
      rewardCurrency: 'AVAX',
      claimType: 'daily_raffle_avax',
      sourceRefPrefix: 'daily_raffle_avax',
      cronSecretEnv: 'DAILY_RAFFLE_CRON_SECRET',
    };
  }
  return {
    raffleType: 'dfk',
    chainId: DFK_CHAIN_ID,
    rewardAmountText: '20',
    rewardCurrency: 'JEWEL',
    claimType: 'daily_raffle_dfk',
    sourceRefPrefix: 'daily_raffle_dfk',
    cronSecretEnv: 'DAILY_RAFFLE_CRON_SECRET',
  };
}

function startOfUtcDay(value: string | Date) {
  const date = typeof value === 'string' ? new Date(`${value}T00:00:00.000Z`) : value;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

function utcDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addUtcDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 86400000);
}

function getDrawSlot(_value?: string | null): DrawSlot {
  return '00';
}

function getDrawLabel(_slot: DrawSlot = '00') {
  return '00:00 UTC Winner';
}

function getDrawWindow(raffleDay: string) {
  const windowStart = startOfUtcDay(raffleDay);
  return { windowStart, windowEnd: addUtcDays(windowStart, 1) };
}

function normalizeAddress(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function cleanName(value: unknown) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text ? text.slice(0, 64) : '';
}

function sanitizeInt(value: unknown) {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.round(parsed);
}

function isMissingColumnError(error: unknown) {
  const text = JSON.stringify(error || {}).toLowerCase();
  return text.includes('column') && (text.includes('does not exist') || text.includes('could not find'));
}

async function pickWinner(wallets: string[], seed: string) {
  const cleaned = Array.from(new Set((wallets || []).map(normalizeAddress).filter(Boolean))).sort();
  if (!cleaned.length) return null;
  const encoded = new TextEncoder().encode(`${seed}:${cleaned.join('|')}`);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', encoded));
  let value = 0n;
  for (const byte of digest.slice(0, 8)) value = (value << 8n) + BigInt(byte);
  const index = Number(value % BigInt(cleaned.length));
  return { wallet: cleaned[index], index, qualifier_count: cleaned.length };
}

async function pickWinners(wallets: string[], seed: string, count = 2) {
  const remaining = Array.from(new Set((wallets || []).map(normalizeAddress).filter(Boolean))).sort();
  const winners: Array<{ wallet: string; index: number; qualifier_count: number; winner_index: number }> = [];
  for (let i = 1; i <= count && remaining.length > 0; i += 1) {
    const pick = await pickWinner(remaining, `${seed}:winner:${i}`);
    if (!pick) break;
    winners.push({ ...pick, qualifier_count: remaining.length + winners.length, winner_index: i });
    const removeAt = remaining.indexOf(pick.wallet);
    if (removeAt >= 0) remaining.splice(removeAt, 1);
  }
  return winners;
}

async function resolvePlayerDisplayName(admin: ReturnType<typeof createAdmin>, wallet: unknown, fallbackName: unknown = '') {
  const existingName = cleanName(fallbackName);
  const walletAddress = normalizeAddress(wallet);
  if (!walletAddress) return existingName;

  const nameFromRecord = (record: RowLike | null | undefined) => {
    if (!record) return '';
    return cleanName(record.vanity_name)
      || cleanName(record.display_name)
      || cleanName(record.player_name)
      || cleanName(record.name)
      || cleanName(record.display_name_snapshot)
      || cleanName(record.player_name_snapshot);
  };

  const lookups: Array<{ table: string; columns: string[]; walletColumns: string[]; orderColumn?: string }> = [
    { table: 'players', columns: ['vanity_name, display_name', 'display_name, player_name', 'display_name'], walletColumns: ['wallet_address', 'wallet'] },
    { table: 'player_profiles', columns: ['vanity_name, display_name', 'display_name, player_name', 'display_name'], walletColumns: ['wallet_address', 'wallet'] },
    { table: 'runs', columns: ['display_name_snapshot, completed_at', 'player_name_snapshot, completed_at'], walletColumns: ['wallet_address', 'wallet'], orderColumn: 'completed_at' },
  ];

  for (const lookup of lookups) {
    for (const columns of lookup.columns) {
      for (const walletColumn of lookup.walletColumns) {
        try {
          let query = admin.from(lookup.table).select(columns).eq(walletColumn, walletAddress);
          if (lookup.orderColumn && columns.includes(lookup.orderColumn)) query = query.order(lookup.orderColumn, { ascending: false });
          const { data, error } = await query.limit(1).maybeSingle();
          if (!error && data) {
            const resolved = nameFromRecord(data as RowLike);
            if (resolved) return resolved;
          }
        } catch (_error) {}
      }
    }
  }
  return existingName || walletAddress;
}

async function groupRaffleWinnerRows(admin: ReturnType<typeof createAdmin>, rows: RowLike[]) {
  const cleaned = (rows || []).filter((row) => row && typeof row === 'object');
  cleaned.sort((a, b) => (sanitizeInt(a.winner_index || 1) - sanitizeInt(b.winner_index || 1)) || String(a.winner_wallet || '').localeCompare(String(b.winner_wallet || '')));
  const mapped = [] as RowLike[];
  for (const row of cleaned) {
    mapped.push({
      ...row,
      draw_slot: '00',
      winner_index: sanitizeInt(row.winner_index || 1) || 1,
      winner_name: await resolvePlayerDisplayName(admin, row.winner_wallet, row.winner_name),
    });
  }
  const first = mapped[0] || null;
  if (!first) return null;
  return {
    ...first,
    draw_slot: '00',
    winner_index: undefined,
    winners: mapped.map((row) => ({
      raffle_day: row.raffle_day,
      raffle_type: row.raffle_type,
      draw_slot: '00',
      winner_index: sanitizeInt(row.winner_index || 1) || 1,
      winner_wallet: row.winner_wallet,
      winner_name: row.winner_name,
      qualifier_count: row.qualifier_count,
      payout_status: row.payout_status,
      payout_tx_hash: row.payout_tx_hash,
      claim_id: row.claim_id,
      settled_at: row.settled_at,
      reward_amount: row.reward_amount,
      reward_currency: row.reward_currency,
    })),
    winner_names: mapped.map((row) => row.winner_name).filter(Boolean),
    winner_wallets: mapped.map((row) => row.winner_wallet).filter(Boolean),
  };
}

async function fetchLatestWinner(admin: ReturnType<typeof createAdmin>, raffleType: RaffleType) {
  const { data: latestRows, error: latestError } = await admin
    .from('daily_raffle_results')
    .select('raffle_day')
    .eq('raffle_type', raffleType)
    .eq('draw_slot', '00')
    .order('raffle_day', { ascending: false })
    .limit(1);
  if (latestError) {
    if (isMissingColumnError(latestError) || String(latestError.message || '').toLowerCase().includes('does not exist')) return null;
    throw latestError;
  }
  const latestDay = Array.isArray(latestRows) && latestRows[0] ? String((latestRows[0] as RowLike).raffle_day || '').slice(0, 10) : '';
  if (!latestDay) return null;
  const { data, error } = await admin
    .from('daily_raffle_results')
    .select('raffle_day, raffle_type, draw_slot, winner_index, winner_wallet, winner_name, qualifier_count, payout_status, payout_tx_hash, claim_id, settled_at, reward_amount, reward_currency')
    .eq('raffle_day', latestDay)
    .eq('raffle_type', raffleType)
    .eq('draw_slot', '00')
    .order('winner_index', { ascending: true })
    .limit(2);
  if (error) throw error;
  return await groupRaffleWinnerRows(admin, Array.isArray(data) ? data as RowLike[] : []);
}

async function fetchCurrentWinnerForUtcDay(admin: ReturnType<typeof createAdmin>, raffleType: RaffleType) {
  const today = utcDateOnly(startOfUtcDay(new Date()));
  const { data, error } = await admin
    .from('daily_raffle_results')
    .select('raffle_day, raffle_type, draw_slot, winner_index, winner_wallet, winner_name, qualifier_count, payout_status, payout_tx_hash, claim_id, settled_at, reward_amount, reward_currency')
    .eq('raffle_day', today)
    .eq('raffle_type', raffleType)
    .eq('draw_slot', '00')
    .order('winner_index', { ascending: true })
    .limit(2);
  if (error) {
    if (isMissingColumnError(error) || String(error.message || '').toLowerCase().includes('does not exist')) return null;
    throw error;
  }
  return await groupRaffleWinnerRows(admin, Array.isArray(data) ? data as RowLike[] : []);
}

function buildRaffleClaimInsert(config: RaffleConfig, raffleDay: string, winnerIndex: number, winnerWallet: string, winnerName: string, winnerRunId: string | null) {
  const drawLabel = getDrawLabel('00');
  return {
    request_key: `${config.sourceRefPrefix}:${raffleDay}:00:${winnerIndex}:${winnerWallet}`,
    wallet_address: winnerWallet,
    claim_type: config.claimType,
    status: 'approved',
    player_name_snapshot: winnerName || winnerWallet,
    amount_text: `${config.rewardAmountText} ${config.rewardCurrency}`,
    amount_value: Number(config.rewardAmountText || 0),
    reward_currency: config.rewardCurrency,
    reason_text: `${config.raffleType.toUpperCase()} ${drawLabel} #${winnerIndex} for ${raffleDay} UTC.`,
    source_ref: `${config.sourceRefPrefix}:${raffleDay}:00:${winnerIndex}`,
    run_id: winnerRunId || null,
    claim_day: raffleDay,
    requested_at: new Date().toISOString(),
    approved_at: new Date().toISOString(),
    resolved_at: new Date().toISOString(),
    resolved_by_wallet: 'treasury:auto',
    admin_note: `Auto-generated ${config.raffleType.toUpperCase()} ${drawLabel} payout #${winnerIndex} for ${raffleDay} UTC.`,
  } as RowLike;
}

async function upsertRaffleClaim(admin: ReturnType<typeof createAdmin>, claimInsert: RowLike) {
  const attempts = [
    claimInsert,
    Object.fromEntries(Object.entries(claimInsert).filter(([key]) => key !== 'run_id')),
    Object.fromEntries(Object.entries(claimInsert).filter(([key]) => key !== 'claim_day')),
    Object.fromEntries(Object.entries(claimInsert).filter(([key]) => key !== 'run_id' && key !== 'claim_day')),
  ];
  let lastError: unknown = null;
  for (const payload of attempts) {
    const { data, error } = await admin
      .from('reward_claim_requests')
      .upsert(payload, { onConflict: 'request_key' })
      .select('id, wallet_address, status, amount_value, reward_currency, amount_text, admin_note, approved_at, resolved_at, resolved_by_wallet, tx_hash, paid_at, failure_reason')
      .single();
    if (!error && data) return data as RowLike;
    lastError = error;
    console.error('daily-raffle claim upsert failed:', JSON.stringify(serializeError(error), null, 2));
  }
  throw lastError || new Error('Failed to create raffle claim row.');
}

async function finalizeRaffleResult(admin: ReturnType<typeof createAdmin>, config: RaffleConfig, raffleDay: string, winnerIndex: number, raffleRow: RowLike, winnerWallet: string, winnerName: string, winnerRunId: string | null) {
  const claimRow = await upsertRaffleClaim(admin, buildRaffleClaimInsert(config, raffleDay, winnerIndex, winnerWallet, winnerName, winnerRunId));
  let payoutStatus = String(raffleRow.payout_status || '').trim().toLowerCase() || 'approved';
  let payoutTxHash = String(raffleRow.payout_tx_hash || claimRow.tx_hash || '').trim() || null;
  if (payoutStatus !== 'paid' || !payoutTxHash) {
    if (isAutoRewardPayoutConfigured()) {
      const payout = await tryAutoPayRewardClaim(admin as never, claimRow as never);
      payoutStatus = payout && payout.paid ? 'paid' : (payoutStatus === 'paid' ? 'paid' : 'approved');
      payoutTxHash = payout && payout.txHash ? String(payout.txHash) : payoutTxHash;
    } else {
      payoutStatus = payoutStatus === 'paid' ? 'paid' : 'approved';
    }
  }
  const { data: finalRow, error } = await admin
    .from('daily_raffle_results')
    .update({
      claim_id: claimRow.id,
      payout_status: payoutStatus,
      payout_tx_hash: payoutTxHash,
      winner_name: winnerName || raffleRow.winner_name || null,
      winner_wallet: winnerWallet,
      winning_run_id: winnerRunId || raffleRow.winning_run_id || null,
    })
    .eq('raffle_day', raffleDay)
    .eq('raffle_type', config.raffleType)
    .eq('draw_slot', '00')
    .eq('winner_index', winnerIndex)
    .select('*')
    .single();
  if (error) throw error;
  return finalRow as RowLike;
}

async function settleRaffleForDay(admin: ReturnType<typeof createAdmin>, config: RaffleConfig, raffleDay: string) {
  const { data: existingRows, error: existingError } = await admin
    .from('daily_raffle_results')
    .select('*')
    .eq('raffle_day', raffleDay)
    .eq('raffle_type', config.raffleType)
    .eq('draw_slot', '00')
    .order('winner_index', { ascending: true });
  if (existingError) {
    if (!String(existingError.message || '').toLowerCase().includes('does not exist')) throw existingError;
  }
  const existing = Array.isArray(existingRows) ? existingRows as RowLike[] : [];
  if (existing.length) {
    const completeRows = existing.filter((row) => {
      const wallet = normalizeAddress(row.winner_wallet);
      const status = String(row.payout_status || '').trim().toLowerCase();
      const claimId = String(row.claim_id || '').trim();
      const txHash = String(row.payout_tx_hash || '').trim();
      return !wallet || status === 'no_qualifiers' || (claimId && status === 'paid' && txHash);
    });
    if (completeRows.length === existing.length) return existing;
    throw new Error(`Existing ${config.raffleType.toUpperCase()} daily raffle rows for ${raffleDay} are incomplete. Delete that day's rows and rerun instead of reusing winners.`);
  }

  const { windowStart, windowEnd } = getDrawWindow(raffleDay);
  const { data: runRows, error: runError } = await admin
    .from('runs')
    .select('id, wallet_address, wave_reached, completed_at, display_name_snapshot, chain_id')
    .gte('completed_at', windowStart.toISOString())
    .lt('completed_at', windowEnd.toISOString())
    .gte('wave_reached', 30)
    .eq('chain_id', config.chainId)
    .order('completed_at', { ascending: false });
  if (runError) throw runError;

  const qualifierByWallet = new Map<string, RowLike>();
  for (const row of runRows || []) {
    const wallet = normalizeAddress(row.wallet_address);
    if (!wallet || qualifierByWallet.has(wallet)) continue;
    qualifierByWallet.set(wallet, row as RowLike);
  }

  const qualifiers = Array.from(qualifierByWallet.values());
  const picks = await pickWinners(qualifiers.map((row) => normalizeAddress(row.wallet_address)).filter(Boolean), `${config.raffleType}:${raffleDay}:00`, 2);
  if (!picks.length) {
    const noQualifier = {
      raffle_day: raffleDay,
      raffle_type: config.raffleType,
      draw_slot: '00',
      winner_index: 1,
      raffle_chain_id: config.chainId,
      window_start: windowStart.toISOString(),
      window_end: windowEnd.toISOString(),
      qualifier_count: qualifiers.length,
      winner_wallet: null,
      winner_name: null,
      winning_run_id: null,
      reward_amount: Number(config.rewardAmountText || 0),
      reward_currency: config.rewardCurrency,
      payout_status: 'no_qualifiers',
      settled_at: new Date().toISOString(),
    } as RowLike;
    const { data, error } = await admin.from('daily_raffle_results').insert(noQualifier).select('*').single();
    if (error) throw error;
    return [data as RowLike];
  }

  const finalized: RowLike[] = [];
  for (const pick of picks) {
    const winnerWallet = pick.wallet;
    const winnerRun = qualifierByWallet.get(winnerWallet) || null;
    let winnerName = cleanName(winnerRun?.display_name_snapshot);
    if (winnerWallet && !winnerName) {
      const { data: player } = await admin.from('players').select('vanity_name, display_name').eq('wallet_address', winnerWallet).maybeSingle();
      winnerName = cleanName(player?.vanity_name || player?.display_name || winnerWallet);
    }
    const row = {
      raffle_day: raffleDay,
      raffle_type: config.raffleType,
      draw_slot: '00',
      winner_index: pick.winner_index,
      raffle_chain_id: config.chainId,
      window_start: windowStart.toISOString(),
      window_end: windowEnd.toISOString(),
      qualifier_count: qualifiers.length,
      winner_wallet: winnerWallet,
      winner_name: winnerName || null,
      winning_run_id: winnerRun?.id || null,
      reward_amount: Number(config.rewardAmountText || 0),
      reward_currency: config.rewardCurrency,
      payout_status: 'pending',
      settled_at: new Date().toISOString(),
    } as RowLike;
    const { data: inserted, error } = await admin.from('daily_raffle_results').insert(row).select('*').single();
    if (error) throw error;
    finalized.push(await finalizeRaffleResult(admin, config, raffleDay, pick.winner_index, inserted as RowLike, winnerWallet, winnerName || winnerWallet, String(winnerRun?.id || '').trim() || null));
  }
  return finalized;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200, headers: corsHeaders });
  try {
    const admin = createAdmin();
    const now = new Date();
    const todayStart = startOfUtcDay(now);
    const url = new URL(req.url);
    let body: RowLike = {};
    if (req.method !== 'GET') {
      try { body = await req.json(); } catch (_error) { body = {}; }
    }
    const requestedDay = String(url.searchParams.get('raffleDay') || body.raffleDay || body.raffle_day || '').trim();
    const config = getRaffleConfig(url.searchParams.get('raffleType') || String(body.raffleType || body.raffle_type || ''));
    const cronSecret = String(Deno.env.get(config.cronSecretEnv) || Deno.env.get('DAILY_RAFFLE_CRON_SECRET') || '').trim();
    const providedCronSecret = String(req.headers.get('x-cron-secret') || '').trim();
    const allowSettle = req.method === 'POST' || !cronSecret || providedCronSecret === cronSecret;

    const settled: RowLike[] = [];
    if (allowSettle) {
      const targetDay = requestedDay || utcDateOnly(todayStart);
      const rows = await settleRaffleForDay(admin, config, targetDay);
      settled.push(...rows);
    }

    const latest00Winner = await fetchCurrentWinnerForUtcDay(admin, config.raffleType) || await fetchLatestWinner(admin, config.raffleType);
    const currentDayStartIso = todayStart.toISOString();
    const nextDayIso = addUtcDays(todayStart, 1).toISOString();
    const { data: qualifierRows, error: qualifierError } = await admin
      .from('runs')
      .select('wallet_address')
      .gte('completed_at', currentDayStartIso)
      .lt('completed_at', nextDayIso)
      .gte('wave_reached', 30)
      .eq('chain_id', config.chainId);
    if (qualifierError) throw qualifierError;
    const qualifierWallets = Array.from(new Set((qualifierRows || []).map((row) => normalizeAddress(row.wallet_address)).filter(Boolean))).sort();
    const settledGroup = settled.length ? await groupRaffleWinnerRows(admin, settled) : null;

    return json({
      ok: true,
      settled_raffle: settledGroup,
      settled_raffles: settled,
      latest_winner: latest00Winner,
      latest_winners: {
        '00': latest00Winner,
        morning: latest00Winner,
      },
      raffle_type: config.raffleType,
      current_windows: {
        '00': {
          raffle_day: utcDateOnly(todayStart),
          draw_slot: '00',
          label: getDrawLabel('00'),
          qualifier_count: qualifierWallets.length,
          winner_count: 2,
          threshold_wave: 30,
          chain_id: config.chainId,
          reward_currency: config.rewardCurrency,
          reward_amount: Number(config.rewardAmountText || 0),
          window_start: currentDayStartIso,
          window_end: nextDayIso,
        },
        morning: {
          raffle_day: utcDateOnly(todayStart),
          draw_slot: '00',
          label: getDrawLabel('00'),
          qualifier_count: qualifierWallets.length,
          winner_count: 2,
          threshold_wave: 30,
          chain_id: config.chainId,
          reward_currency: config.rewardCurrency,
          reward_amount: Number(config.rewardAmountText || 0),
          window_start: currentDayStartIso,
          window_end: nextDayIso,
        },
      },
      automation_note: 'Schedule this function once daily for the 00:00 UTC raffle. It pays 20 JEWEL each to up to two unique qualifying wallets.',
    });
  } catch (error) {
    const detail = serializeError(error);
    console.error('daily-raffle failure:', JSON.stringify(detail, null, 2));
    return json({ error: error instanceof Error ? error.message : 'Failed to process daily raffle.', detail }, 500);
  }
});
