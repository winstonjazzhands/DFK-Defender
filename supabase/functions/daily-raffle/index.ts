import { createClient } from 'jsr:@supabase/supabase-js@2';
import { tryAutoPayRewardClaim, isAutoRewardPayoutConfigured } from '../_shared/reward-payout.ts';
import { DFK_CHAIN_ID, AVAX_CHAIN_ID } from '../_shared/env.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}

function serializeError(error: unknown) {
  if (error instanceof Error) return { message: error.message, stack: error.stack };
  if (error && typeof error === 'object') {
    try {
      return JSON.parse(JSON.stringify(error));
    } catch (_jsonError) {
      return { value: String(error) };
    }
  }
  return { value: String(error) };
}


function isMissingColumnError(error: unknown) {
  const text = JSON.stringify(error || {}).toLowerCase();
  return text.includes('column') && (text.includes('does not exist') || text.includes('could not find'));
}

function createAdmin() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

type RaffleConfig = {
  raffleType: 'dfk' | 'avax';
  chainId: number;
  rewardAmountText: string;
  rewardCurrency: 'JEWEL' | 'AVAX';
  claimType: string;
  sourceRefPrefix: string;
  cronSecretEnv: string;
};

type DrawSlot = 'morning' | 'midday';

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

function utcDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfUtcDay(value: string | Date) {
  const date = typeof value === 'string' ? new Date(`${value}T00:00:00.000Z`) : value;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

function addUtcDays(date: Date, days: number) {
  return new Date(date.getTime() + (days * 86400000));
}

function addUtcHours(date: Date, hours: number) {
  return new Date(date.getTime() + (hours * 3600000));
}

function getDrawSlot(value: string | null | undefined): DrawSlot {
  return String(value || '').trim().toLowerCase() === 'midday' ? 'midday' : 'morning';
}

function getDrawLabel(drawSlot: DrawSlot) {
  return drawSlot === 'midday' ? '12:00 Winner' : '23:59 Winner';
}

function getDrawWindow(raffleDay: string, drawSlot: DrawSlot) {
  const drawBoundary = startOfUtcDay(raffleDay);
  if (drawSlot === 'midday') {
    return {
      windowStart: drawBoundary,
      windowEnd: addUtcHours(drawBoundary, 12),
    };
  }
  const endOfDayDraw = new Date(Date.UTC(drawBoundary.getUTCFullYear(), drawBoundary.getUTCMonth(), drawBoundary.getUTCDate(), 23, 59, 0, 0));
  return {
    windowStart: addUtcHours(drawBoundary, 12),
    windowEnd: endOfDayDraw,
  };
}

function getDefaultSettlementTarget(now: Date) {
  const todayStart = startOfUtcDay(now);
  if (now.getUTCHours() > 23 || (now.getUTCHours() === 23 && now.getUTCMinutes() >= 59)) {
    return { raffleDay: utcDateOnly(todayStart), drawSlot: 'morning' as DrawSlot };
  }
  return { raffleDay: utcDateOnly(todayStart), drawSlot: 'midday' as DrawSlot };
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

async function resolvePlayerDisplayName(admin: ReturnType<typeof createAdmin>, wallet: unknown, fallbackName: unknown = '') {
  const existingName = cleanName(fallbackName);
  const walletAddress = normalizeAddress(wallet);
  if (!walletAddress) return existingName;

  const nameFromRecord = (record: Record<string, unknown> | null | undefined) => {
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
        for (const operator of ['eq', 'ilike'] as const) {
          try {
            let query = admin.from(lookup.table).select(columns);
            query = operator === 'eq'
              ? query.eq(walletColumn, walletAddress)
              : query.ilike(walletColumn, walletAddress);
            if (lookup.orderColumn && columns.includes(lookup.orderColumn)) {
              query = query.order(lookup.orderColumn, { ascending: false });
            }
            const { data, error } = await query.limit(1).maybeSingle();
            if (!error && data) {
              const resolved = nameFromRecord(data as Record<string, unknown>);
              if (resolved) return resolved;
            }
          } catch (_error) {}
        }
      }
    }
  }

  return existingName || walletAddress;
}

async function fetchLatestWinner(admin: ReturnType<typeof createAdmin>, raffleType: 'dfk' | 'avax', drawSlot?: DrawSlot | null) {
  let query = admin
    .from('daily_raffle_results')
    .select('raffle_day, raffle_type, draw_slot, winner_wallet, winner_name, qualifier_count, payout_status, payout_tx_hash, claim_id, settled_at')
    .eq('raffle_type', raffleType);
  if (drawSlot) query = query.eq('draw_slot', drawSlot);
  const { data, error } = await query
    .order('settled_at', { ascending: false, nullsFirst: false })
    .order('raffle_day', { ascending: false })
    .order('draw_slot', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    if (String((error as { message?: string } | null)?.message || '').toLowerCase().includes('does not exist')) return null;
    throw error;
  }
  if (!data) return null;
  return {
    ...data,
    winner_name: await resolvePlayerDisplayName(admin, data.winner_wallet, data.winner_name),
  };
}


function withDrawSlot(row: Record<string, unknown> | null, drawSlot: DrawSlot) {
  return row ? { ...row, draw_slot: String(row.draw_slot || drawSlot) } : null;
}

function filterCurrentDayRaffleWinner(row: Record<string, unknown> | null, drawSlot: DrawSlot) {
  if (!row) return null;
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const midday = new Date(todayStart.getTime() + 12 * 60 * 60 * 1000);
  const endday = new Date(Date.UTC(todayStart.getUTCFullYear(), todayStart.getUTCMonth(), todayStart.getUTCDate(), 23, 59, 0, 0));
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  if (drawSlot === 'midday' && now < midday) return null;
  if (drawSlot === 'morning' && now < endday) return null;

  const settledRaw = String(row.settled_at || '').trim();
  const settledAt = settledRaw ? new Date(settledRaw) : null;
  if (settledAt && Number.isFinite(settledAt.getTime())) {
    if (drawSlot === 'midday') return settledAt >= midday && settledAt < endday ? row : null;
    return settledAt >= endday && settledAt < tomorrowStart ? row : null;
  }

  const raffleDay = String(row.raffle_day || '').slice(0, 10);
  const today = todayStart.toISOString().slice(0, 10);
  const yesterday = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  if (drawSlot === 'morning') {
    return now >= endday && raffleDay === today ? row : null;
  }
  return raffleDay === today ? row : null;
}


async function fetchCurrentWinnerForUtcDay(admin: ReturnType<typeof createAdmin>, raffleType: 'dfk' | 'avax', drawSlot: DrawSlot) {
  const now = new Date();
  if (drawSlot === 'midday' && now.getUTCHours() < 12) return null;
  if (drawSlot === 'morning' && (now.getUTCHours() < 23 || (now.getUTCHours() === 23 && now.getUTCMinutes() < 59))) return null;
  const today = utcDateOnly(startOfUtcDay(now));
  const selectVariants = [
    'raffle_day, raffle_type, draw_slot, winner_wallet, winner_name, qualifier_count, payout_status, payout_tx_hash, claim_id, settled_at',
    'raffle_day, raffle_type, draw_slot, winner_wallet, winner_name, qualifier_count, payout_status, settled_at',
    'raffle_day, raffle_type, draw_slot, winner_wallet, winner_name, payout_status, settled_at',
    'raffle_day, raffle_type, draw_slot, winner_wallet, winner_name, settled_at',
    'raffle_day, raffle_type, draw_slot, winner_wallet, settled_at',
    'raffle_day, raffle_type, draw_slot, winner_wallet',
    'raffle_day, winner_wallet, winner_name',
    'raffle_day, winner_wallet',
  ];
  let allowTypeFilter = true;
  for (const columns of selectVariants) {
    const includeSlot = columns.includes('draw_slot');
    const slotAttempts = includeSlot ? [drawSlot, null] : [null];
    for (const slotAttempt of slotAttempts) {
      let query = admin.from('daily_raffle_results').select(columns).eq('raffle_day', today);
      if (allowTypeFilter && columns.includes('raffle_type')) query = query.eq('raffle_type', raffleType);
      if (slotAttempt && includeSlot) query = query.eq('draw_slot', slotAttempt);
      if (columns.includes('settled_at')) query = query.order('settled_at', { ascending: false, nullsFirst: false });
      if (includeSlot) query = query.order('draw_slot', { ascending: drawSlot === 'morning' });
      const { data, error } = await query.limit(1).maybeSingle();
      if (!error) {
        if (!data) continue;
        if (drawSlot === 'midday' && String((data as Record<string, unknown>).draw_slot || '').toLowerCase() !== 'midday') continue;
        return {
          ...(data as Record<string, unknown>),
          draw_slot: String((data as Record<string, unknown>).draw_slot || drawSlot),
          winner_name: await resolvePlayerDisplayName(admin, (data as Record<string, unknown>).winner_wallet, (data as Record<string, unknown>).winner_name),
        };
      }
      if (String((error as { message?: string } | null)?.message || '').toLowerCase().includes('does not exist')) return null;
      if (isMissingColumnError(error)) {
        const errorText = JSON.stringify(error).toLowerCase();
        if (errorText.includes('raffle_type')) allowTypeFilter = false;
        break;
      }
      throw error;
    }
  }
  return null;
}

function buildRaffleClaimInsert(config: RaffleConfig, raffleDay: string, drawSlot: DrawSlot, winnerWallet: string, winnerName: string, winnerRunId: string | null) {
  const drawLabel = getDrawLabel(drawSlot);
  return {
    request_key: `${config.sourceRefPrefix}:${raffleDay}:${drawSlot}:${winnerWallet}`,
    wallet_address: winnerWallet,
    claim_type: config.claimType,
    status: 'approved',
    player_name_snapshot: winnerName || winnerWallet,
    amount_text: `${config.rewardAmountText} ${config.rewardCurrency}`,
    amount_value: Number(config.rewardAmountText || 0),
    reward_currency: config.rewardCurrency,
    reason_text: `${config.raffleType.toUpperCase()} ${drawLabel} for ${raffleDay} UTC.`,
    source_ref: `${config.sourceRefPrefix}:${raffleDay}:${drawSlot}`,
    run_id: winnerRunId || null,
    claim_day: raffleDay,
    requested_at: new Date().toISOString(),
    approved_at: new Date().toISOString(),
    resolved_at: new Date().toISOString(),
    resolved_by_wallet: 'treasury:auto',
    admin_note: `Auto-generated ${config.raffleType.toUpperCase()} ${drawLabel} payout for ${raffleDay} UTC.`,
  } as Record<string, unknown>;
}

async function upsertRaffleClaim(admin: ReturnType<typeof createAdmin>, claimInsert: Record<string, unknown>) {
  const claimUpsertAttempts = [
    { label: 'full', payload: claimInsert },
    {
      label: 'without_run_id',
      payload: Object.fromEntries(Object.entries(claimInsert).filter(([key]) => key !== 'run_id')),
    },
    {
      label: 'without_claim_day',
      payload: Object.fromEntries(Object.entries(claimInsert).filter(([key]) => key !== 'claim_day')),
    },
    {
      label: 'without_run_id_or_claim_day',
      payload: Object.fromEntries(Object.entries(claimInsert).filter(([key]) => key !== 'run_id' && key !== 'claim_day')),
    },
  ];

  let claimRow: Record<string, unknown> | null = null;
  let lastClaimError: unknown = null;
  for (const attempt of claimUpsertAttempts) {
    const { data, error } = await admin
      .from('reward_claim_requests')
      .upsert(attempt.payload, { onConflict: 'request_key' })
      .select('id, wallet_address, status, amount_value, reward_currency, amount_text, admin_note, approved_at, resolved_at, resolved_by_wallet, tx_hash, paid_at, failure_reason')
      .single();
    if (!error && data) {
      claimRow = data as Record<string, unknown>;
      if (attempt.label !== 'full') console.warn(`daily-raffle claim upsert fallback succeeded: ${attempt.label}`);
      break;
    }
    lastClaimError = { attempt: attempt.label, error: serializeError(error) };
    console.error('daily-raffle claim upsert failed:', JSON.stringify(lastClaimError, null, 2));
  }
  if (!claimRow) throw lastClaimError || new Error('Failed to create raffle claim row.');
  return claimRow;
}

async function finalizeRaffleResult(
  admin: ReturnType<typeof createAdmin>,
  config: RaffleConfig,
  raffleDay: string,
  drawSlot: DrawSlot,
  raffleRow: Record<string, unknown>,
  winnerWallet: string,
  winnerName: string,
  winnerRunId: string | null,
) {
  if (!winnerWallet) return raffleRow;

  const claimInsert = buildRaffleClaimInsert(config, raffleDay, drawSlot, winnerWallet, winnerName, winnerRunId);
  const claimRow = await upsertRaffleClaim(admin, claimInsert);

  let payoutStatus = String(raffleRow?.payout_status || '').trim().toLowerCase() || 'approved';
  let payoutTxHash = String(raffleRow?.payout_tx_hash || claimRow?.tx_hash || '').trim() || null;

  if (payoutStatus !== 'paid' || !payoutTxHash) {
    if (isAutoRewardPayoutConfigured()) {
      const payout = await tryAutoPayRewardClaim(admin as never, claimRow as never);
      payoutStatus = payout && payout.paid ? 'paid' : (payoutStatus === 'paid' ? 'paid' : 'approved');
      payoutTxHash = payout && payout.txHash ? String(payout.txHash) : payoutTxHash;
    } else {
      payoutStatus = payoutStatus === 'paid' ? 'paid' : 'approved';
    }
  }

  const { data: finalRow, error: finalError } = await admin
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
    .eq('draw_slot', drawSlot)
    .select('*')
    .single();
  if (finalError) throw finalError;
  return finalRow;
}

async function settleRaffleForDay(admin: ReturnType<typeof createAdmin>, config: RaffleConfig, raffleDay: string, drawSlot: DrawSlot) {
  const { data: existing, error: existingError } = await admin
    .from('daily_raffle_results')
    .select('*')
    .eq('raffle_day', raffleDay)
    .eq('raffle_type', config.raffleType)
    .eq('draw_slot', drawSlot)
    .maybeSingle();
  if (existingError) {
    if (!String((existingError as { message?: string } | null)?.message || '').toLowerCase().includes('does not exist')) throw existingError;
  }
  if (existing) {
    const existingWinnerWallet = normalizeAddress(existing.winner_wallet);
    const existingClaimId = String(existing.claim_id || '').trim();
    const existingPayoutStatus = String(existing.payout_status || '').trim().toLowerCase();
    const existingTxHash = String(existing.payout_tx_hash || '').trim();
    if (!existingWinnerWallet || existingPayoutStatus === 'no_qualifiers') return existing;
    if (existingClaimId && existingPayoutStatus === 'paid' && existingTxHash) return existing;
    throw new Error(`Existing ${config.raffleType.toUpperCase()} daily raffle row for ${raffleDay} is incomplete. Delete that day's row and rerun instead of reusing the same winner.`);
  }

  const { windowStart, windowEnd } = getDrawWindow(raffleDay, drawSlot);
  const { data: runRows, error: runError } = await admin
    .from('runs')
    .select('id, wallet_address, wave_reached, completed_at, display_name_snapshot, chain_id')
    .gte('completed_at', windowStart.toISOString())
    .lt('completed_at', windowEnd.toISOString())
    .gte('wave_reached', 30)
    .eq('chain_id', config.chainId)
    .order('completed_at', { ascending: false });
  if (runError) throw runError;

  const qualifierByWallet = new Map<string, Record<string, unknown>>();
  for (const row of runRows || []) {
    const wallet = normalizeAddress(row.wallet_address);
    if (!wallet || qualifierByWallet.has(wallet)) continue;
    qualifierByWallet.set(wallet, row as Record<string, unknown>);
  }

  const qualifiers = Array.from(qualifierByWallet.values());
  const qualifierWallets = qualifiers.map((row) => normalizeAddress(row.wallet_address)).filter(Boolean);
  const winnerPick = await pickWinner(qualifierWallets, `${config.raffleType}:${raffleDay}:${drawSlot}`);
  let winnerWallet = winnerPick ? winnerPick.wallet : null;
  const winnerRun = winnerWallet ? qualifierByWallet.get(winnerWallet) : null;
  let winnerName = cleanName(winnerRun?.display_name_snapshot);

  if (winnerWallet && !winnerName) {
    const { data: player } = await admin
      .from('players')
      .select('vanity_name, display_name')
      .eq('wallet_address', winnerWallet)
      .maybeSingle();
    winnerName = cleanName(player?.vanity_name || player?.display_name || winnerWallet);
  }

  const baseInsert = {
    raffle_day: raffleDay,
    raffle_type: config.raffleType,
    draw_slot: drawSlot,
    raffle_chain_id: config.chainId,
    window_start: windowStart.toISOString(),
    window_end: windowEnd.toISOString(),
    qualifier_count: qualifiers.length,
    winner_wallet: winnerWallet,
    winner_name: winnerName || null,
    winning_run_id: winnerRun?.id || null,
    reward_amount: Number(config.rewardAmountText || 0),
    reward_currency: config.rewardCurrency,
    payout_status: winnerWallet ? 'pending' : 'no_qualifiers',
    settled_at: new Date().toISOString(),
  } as Record<string, unknown>;

  const { data: inserted, error: insertError } = await admin
    .from('daily_raffle_results')
    .insert(baseInsert)
    .select('*')
    .single();
  if (insertError) throw insertError;

  if (!winnerWallet) return inserted;
  return await finalizeRaffleResult(admin, config, raffleDay, drawSlot, inserted as Record<string, unknown>, winnerWallet, winnerName || winnerWallet, String(winnerRun?.id || '').trim() || null);
}


Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200, headers: corsHeaders });
  try {
    const admin = createAdmin();
    const now = new Date();
    const todayStart = startOfUtcDay(now);
    const url = new URL(req.url);
    const requestedDay = String(url.searchParams.get('raffleDay') || '').trim();
    const requestedDrawSlot = getDrawSlot(url.searchParams.get('drawSlot'));
    const config = getRaffleConfig(url.searchParams.get('raffleType'));
    const cronSecret = String(Deno.env.get(config.cronSecretEnv) || Deno.env.get('DAILY_RAFFLE_CRON_SECRET') || '').trim();
    const providedCronSecret = String(req.headers.get('x-cron-secret') || '').trim();
    const allowSettle = req.method === 'POST' || !cronSecret || providedCronSecret === cronSecret;

    const settled: Array<Record<string, unknown>> = [];
    const settleOne = async (raffleDay: string, drawSlot: DrawSlot) => {
      const row = await settleRaffleForDay(admin, config, raffleDay, drawSlot);
      if (row && typeof row === 'object') settled.push(row as Record<string, unknown>);
      return row;
    };

    if (allowSettle) {
      if (requestedDay) {
        await settleOne(requestedDay, requestedDrawSlot);
      } else {
        const target = getDefaultSettlementTarget(now);
        await settleOne(target.raffleDay, target.drawSlot);
      }
    }

    const latestAnyWinner = await fetchLatestWinner(admin, config.raffleType, null);
    const latestMorningWinner = await fetchCurrentWinnerForUtcDay(admin, config.raffleType, 'morning')
      || filterCurrentDayRaffleWinner(await fetchLatestWinner(admin, config.raffleType, 'morning'), 'morning')
      || withDrawSlot(filterCurrentDayRaffleWinner(latestAnyWinner, 'morning'), 'morning');
    const latestMiddayWinner = await fetchCurrentWinnerForUtcDay(admin, config.raffleType, 'midday')
      || filterCurrentDayRaffleWinner(await fetchLatestWinner(admin, config.raffleType, 'midday'), 'midday');
    const currentDayStartIso = todayStart.toISOString();
    const middayIso = addUtcHours(todayStart, 12).toISOString();
    const endDayIso = new Date(Date.UTC(todayStart.getUTCFullYear(), todayStart.getUTCMonth(), todayStart.getUTCDate(), 23, 59, 0, 0)).toISOString();
    const nextDayIso = addUtcDays(todayStart, 1).toISOString();
    const [{ data: morningQualifiers, error: morningQualifierError }, { data: middayQualifiers, error: middayQualifierError }] = await Promise.all([
      admin
        .from('runs')
        .select('wallet_address')
        .gte('completed_at', currentDayStartIso)
        .lt('completed_at', middayIso)
        .gte('wave_reached', 30)
        .eq('chain_id', config.chainId),
      admin
        .from('runs')
        .select('wallet_address')
        .gte('completed_at', middayIso)
        .lt('completed_at', endDayIso)
        .gte('wave_reached', 30)
        .eq('chain_id', config.chainId),
    ]);
    const qualifierError = morningQualifierError || middayQualifierError;
    if (qualifierError) throw qualifierError;
    const morningQualifierWallets = Array.from(new Set((morningQualifiers || []).map((row) => normalizeAddress(row.wallet_address)).filter(Boolean))).sort();
    const middayQualifierWallets = Array.from(new Set((middayQualifiers || []).map((row) => normalizeAddress(row.wallet_address)).filter(Boolean))).sort();

    return json({
      ok: true,
      settled_raffle: settled.length ? settled[settled.length - 1] : null,
      settled_raffles: settled,
      latest_winner: latestMiddayWinner || latestMorningWinner,
      latest_winners: {
        morning: latestMorningWinner,
        midday: latestMiddayWinner,
      },
      raffle_type: config.raffleType,
      current_windows: {
        midday: {
          raffle_day: utcDateOnly(todayStart),
          draw_slot: 'midday',
          label: getDrawLabel('midday'),
          qualifier_count: morningQualifierWallets.length,
          threshold_wave: 30,
          chain_id: config.chainId,
          reward_currency: config.rewardCurrency,
          reward_amount: Number(config.rewardAmountText || 0),
          window_start: currentDayStartIso,
          window_end: middayIso,
        },
        morning: {
          raffle_day: utcDateOnly(todayStart),
          draw_slot: 'morning',
          label: getDrawLabel('morning'),
          qualifier_count: middayQualifierWallets.length,
          threshold_wave: 30,
          chain_id: config.chainId,
          reward_currency: config.rewardCurrency,
          reward_amount: Number(config.rewardAmountText || 0),
          window_start: middayIso,
          window_end: endDayIso,
        },
      },
      automation_note: 'Schedule this function twice daily at 12:00 UTC and 23:59 UTC.',
    });
  } catch (error) {
    const detail = serializeError(error);
    console.error('daily-raffle failure:', JSON.stringify(detail, null, 2));
    return json(
      {
        error: error instanceof Error ? error.message : 'Failed to process daily raffle.',
        detail,
      },
      500,
    );
  }
});
