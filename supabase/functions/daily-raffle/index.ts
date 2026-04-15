import { createClient } from 'jsr:@supabase/supabase-js@2';
import { tryAutoPayRewardClaim, isAutoRewardPayoutConfigured } from '../_shared/reward-payout.ts';

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

function createAdmin() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
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

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function firstEightHexToInt(hex: string) {
  return Number.parseInt(String(hex || '').slice(0, 8) || '0', 16) || 0;
}

async function pickWinner(wallets: string[], raffleDay: string) {
  if (!wallets.length) return null;
  const sorted = wallets.slice().sort((a, b) => a.localeCompare(b));
  const seed = await sha256Hex(`${raffleDay}:${sorted.join(',')}`);
  const index = firstEightHexToInt(seed) % sorted.length;
  return { wallet: sorted[index], seed };
}

async function fetchLatestWinner(admin: ReturnType<typeof createAdmin>) {
  const { data, error } = await admin
    .from('daily_raffle_results')
    .select('raffle_day, winner_wallet, winner_name, qualifier_count, payout_status, payout_tx_hash, claim_id, settled_at')
    .order('raffle_day', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    if (String((error as { message?: string } | null)?.message || '').toLowerCase().includes('does not exist')) return null;
    throw error;
  }
  return data || null;
}

function buildRaffleClaimInsert(raffleDay: string, winnerWallet: string, winnerName: string, winnerRunId: string | null) {
  return {
    request_key: `daily_raffle:${raffleDay}:${winnerWallet}`,
    wallet_address: winnerWallet,
    claim_type: 'daily_raffle',
    status: 'approved',
    player_name_snapshot: winnerName || winnerWallet,
    amount_text: '20 JEWEL',
    amount_value: 20,
    reward_currency: 'JEWEL',
    reason_text: `Daily raffle winner for ${raffleDay} UTC.`,
    source_ref: `daily_raffle:${raffleDay}`,
    run_id: winnerRunId || null,
    claim_day: raffleDay,
    requested_at: new Date().toISOString(),
    approved_at: new Date().toISOString(),
    resolved_at: new Date().toISOString(),
    resolved_by_wallet: 'treasury:auto',
    admin_note: `Auto-generated daily raffle payout for ${raffleDay} UTC.`,
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
  raffleDay: string,
  raffleRow: Record<string, unknown>,
  winnerWallet: string,
  winnerName: string,
  winnerRunId: string | null,
) {
  if (!winnerWallet) return raffleRow;

  const claimInsert = buildRaffleClaimInsert(raffleDay, winnerWallet, winnerName, winnerRunId);
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
    .select('*')
    .single();
  if (finalError) throw finalError;
  return finalRow;
}

async function settleRaffleForDay(admin: ReturnType<typeof createAdmin>, raffleDay: string) {
  const { data: existing, error: existingError } = await admin
    .from('daily_raffle_results')
    .select('*')
    .eq('raffle_day', raffleDay)
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

    let winnerName = cleanName(existing.winner_name);
    if (!winnerName) {
      const { data: player } = await admin
        .from('players')
        .select('vanity_name, display_name')
        .eq('wallet_address', existingWinnerWallet)
        .maybeSingle();
      winnerName = cleanName(player?.vanity_name || player?.display_name || existingWinnerWallet);
    }

    const winnerRunId = String(existing.winning_run_id || '').trim() || null;
    console.warn(`daily-raffle self-heal: resuming incomplete settlement for ${raffleDay}`);
    return await finalizeRaffleResult(admin, raffleDay, existing as Record<string, unknown>, existingWinnerWallet, winnerName || existingWinnerWallet, winnerRunId);
  }

  const windowStart = startOfUtcDay(raffleDay);
  const windowEnd = addUtcDays(windowStart, 1);
  const { data: runRows, error: runError } = await admin
    .from('runs')
    .select('id, wallet_address, wave_reached, completed_at, display_name_snapshot')
    .gte('completed_at', windowStart.toISOString())
    .lt('completed_at', windowEnd.toISOString())
    .gte('wave_reached', 30)
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
  const winnerPick = await pickWinner(qualifierWallets, raffleDay);
  const winnerWallet = winnerPick ? winnerPick.wallet : null;
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
    window_start: windowStart.toISOString(),
    window_end: windowEnd.toISOString(),
    qualifier_count: qualifiers.length,
    winner_wallet: winnerWallet,
    winner_name: winnerName || null,
    winning_run_id: winnerRun?.id || null,
    reward_amount: 20,
    reward_currency: 'JEWEL',
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
  return await finalizeRaffleResult(admin, raffleDay, inserted as Record<string, unknown>, winnerWallet, winnerName || winnerWallet, String(winnerRun?.id || '').trim() || null);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200, headers: corsHeaders });
  try {
    const admin = createAdmin();
    const now = new Date();
    const todayStart = startOfUtcDay(now);
    const previousDay = utcDateOnly(addUtcDays(todayStart, -1));
    const url = new URL(req.url);
    const requestedDay = String(url.searchParams.get('raffleDay') || '').trim();
    const cronSecret = String(Deno.env.get('DAILY_RAFFLE_CRON_SECRET') || '').trim();
    const providedCronSecret = String(req.headers.get('x-cron-secret') || '').trim();
    const allowSettle = req.method === 'POST' || !cronSecret || providedCronSecret === cronSecret;

    let settled = null;
    if (allowSettle) settled = await settleRaffleForDay(admin, requestedDay || previousDay);

    const latestWinner = await fetchLatestWinner(admin);
    const currentDayStartIso = todayStart.toISOString();
    const nextDayIso = addUtcDays(todayStart, 1).toISOString();
    const { data: todayQualifiers, error: qualifierError } = await admin
      .from('runs')
      .select('wallet_address')
      .gte('completed_at', currentDayStartIso)
      .lt('completed_at', nextDayIso)
      .gte('wave_reached', 30);
    if (qualifierError) throw qualifierError;
    const qualifierWallets = Array.from(new Set((todayQualifiers || []).map((row) => normalizeAddress(row.wallet_address)).filter(Boolean))).sort();

    return json({
      ok: true,
      settled_raffle: settled,
      latest_winner: latestWinner,
      current_window: {
        raffle_day: utcDateOnly(todayStart),
        qualifier_count: qualifierWallets.length,
        threshold_wave: 30,
        window_start: currentDayStartIso,
        window_end: nextDayIso,
      },
      automation_note: 'For exact midnight UTC settlement with no site traffic, schedule this function daily after 00:00 UTC.',
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
