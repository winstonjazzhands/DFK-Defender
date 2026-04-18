import { createClient } from 'jsr:@supabase/supabase-js@2';
import { loadValidWalletSession, normalizeAddress } from '../_shared/wallet-session.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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


function sumWei(rows: Array<{ expected_amount_wei?: string | number | null; amount_wei?: string | number | null; paid_amount_wei?: string | number | null }>) {
  return rows.reduce((total, row) => total + BigInt(String((row && (row.amount_wei ?? row.paid_amount_wei ?? row.expected_amount_wei)) || '0')), 0n).toString();
}

function sumWeiBy(rows: Array<{ expected_amount_wei?: string | number | null; amount_wei?: string | number | null; paid_amount_wei?: string | number | null }>, predicate: (row: any) => boolean) {
  return rows.reduce((total, row) => predicate(row) ? total + BigInt(String((row && (row.amount_wei ?? row.paid_amount_wei ?? row.expected_amount_wei)) || '0')) : total, 0n).toString();
}

function normalizeCurrency(value: unknown) {
  return String(value || '').trim().toUpperCase();
}

function normalizeStatus(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function isCompletedRewardLike(row: { status?: unknown; paid_at?: unknown; payout_status?: unknown; tx_hash?: unknown; payout_tx_hash?: unknown }) {
  return normalizeStatus(row.status) === 'paid'
    || normalizeStatus(row.payout_status) === 'paid'
    || !!String(row.paid_at || '').trim()
    || !!String(row.tx_hash || row.payout_tx_hash || '').trim();
}

function normalizeDecimalString(value: unknown) {
  const text = String(value ?? '').trim();
  if (!text) return '0';
  const cleaned = text.replace(/,/g, '');
  if (!/^[-+]?\d+(?:\.\d+)?$/.test(cleaned)) return '0';
  return cleaned.replace(/^\+/, '');
}

function addPositiveDecimalStrings(a: unknown, b: unknown) {
  const [aWholeRaw, aFracRaw = ''] = normalizeDecimalString(a).split('.');
  const [bWholeRaw, bFracRaw = ''] = normalizeDecimalString(b).split('.');
  const fracLen = Math.max(aFracRaw.length, bFracRaw.length);
  const aWhole = aWholeRaw || '0';
  const bWhole = bWholeRaw || '0';
  const aFrac = aFracRaw.padEnd(fracLen, '0');
  const bFrac = bFracRaw.padEnd(fracLen, '0');
  const scale = fracLen > 0 ? (10n ** BigInt(fracLen)) : 1n;
  const left = BigInt(aWhole) * scale + BigInt(aFrac || '0');
  const right = BigInt(bWhole) * scale + BigInt(bFrac || '0');
  const total = left + right;
  const whole = total / scale;
  const frac = fracLen > 0 ? (total % scale).toString().padStart(fracLen, '0').replace(/0+$/, '') : '';
  return `${whole.toString()}${frac ? `.${frac}` : ''}`;
}

function sumRewardAmounts(rows: Array<{ amount_value?: string | number | null; amount_text?: string | null; reward_currency?: string | null }>, currency: 'JEWEL' | 'AVAX') {
  let total = '0';
  for (const row of rows) {
    const rowCurrency = String(row?.reward_currency || '').trim().toUpperCase();
    if (rowCurrency !== currency) continue;
    const amountValue = row?.amount_value;
    if (amountValue != null && String(amountValue).trim()) {
      total = addPositiveDecimalStrings(total, amountValue);
      continue;
    }
    const match = String(row?.amount_text || '').replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
    if (match?.[1]) total = addPositiveDecimalStrings(total, match[1]);
  }
  return total;
}

function isMissingRelationError(error: unknown, relationName: string) {
  const code = String((error as { code?: string } | null)?.code || '').trim();
  const message = String((error as { message?: string } | null)?.message || '').toLowerCase();
  return code === 'PGRST205' || (message.includes('relation') && message.includes(relationName.toLowerCase()) && message.includes('does not exist'));
}

function logNonMissingError(label: string, error: unknown, relationName: string) {
  if (!error || isMissingRelationError(error, relationName)) return;
  console.error(label, error);
}


async function fetchPaginatedBurnRows(admin: ReturnType<typeof createAdmin>) {
  const pageSize = 1000;
  const rows: Array<{ burn_amount?: number | string | null; amount?: number | string | null; confirmed_at?: string | null }> = [];
  let from = 0;
  while (true) {
    const { data, error } = await admin
      .from('dfk_gold_burns')
      .select('burn_amount, amount, confirmed_at')
      .range(from, from + pageSize - 1);
    if (error) {
      if (isMissingRelationError(error, 'dfk_gold_burns')) return rows;
      throw error;
    }
    const batch = Array.isArray(data) ? data : [];
    rows.push(...batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200, headers: corsHeaders });
  try {
    const admin = createAdmin();
    const body = await req.json().catch(() => ({}));
    const sessionResult = await loadValidWalletSession(admin, req, corsHeaders);
    if ('response' in sessionResult) return sessionResult.response;
    const session = sessionResult.session;
    const walletAddress = normalizeAddress(body.walletAddress || session.wallet_address);
    const treasuryAddress = normalizeAddress(Deno.env.get('DFK_AVAX_TREASURY_ADDRESS') || '0xab45288409900be5ef23c19726a30c28268495ad');
    const privateAdminWallets = (Deno.env.get('DFK_PRIVATE_ADMIN_WALLETS') || `${treasuryAddress},0x971bdacd04ef40141ddb6ba175d4f76665103c81`)
      .split(',')
      .map((value) => normalizeAddress(value))
      .filter(Boolean);
    if (!walletAddress) return json({ error: 'walletAddress is required.' }, 400);
    if (walletAddress !== normalizeAddress(session.wallet_address)) return json({ error: 'Wallet mismatch.' }, 401);
    if (!privateAdminWallets.includes(walletAddress)) return json({ error: 'Treasury access only.' }, 403);

    const [
      { data: sessionRows, error: sessionError },
      { data: legacyAvaxRows, error: legacyAvaxError },
      { data: tokenRows, error: tokenError },
      { data: tokenSessionRows, error: tokenSessionError },
      burnRows,
      { count: lifetimeTrackedRunsCount, error: runCountError },
      { data: latestRaffleWinner, error: latestRaffleWinnerError },
      { data: latestAvaxRaffleWinner, error: latestAvaxRaffleWinnerError },
      { data: rewardClaimRows, error: rewardClaimRowsError },
      { data: raffleRows, error: raffleRowsError },
    ] = await Promise.all([
      admin.from('crypto_payment_sessions').select('*').eq('status', 'confirmed'),
      admin.from('avax_payment_verifications').select('*'),
      admin.from('dfk_token_payments').select('*'),
      admin.from('dfk_token_payment_sessions').select('*').eq('status', 'verified'),
      fetchPaginatedBurnRows(admin),
      admin.from('runs').select('id', { count: 'exact', head: true }),
      admin.from('daily_raffle_results').select('raffle_day, raffle_type, winner_wallet, winner_name, qualifier_count, payout_status, payout_tx_hash').eq('raffle_type', 'dfk').order('raffle_day', { ascending: false }).limit(1).maybeSingle(),
      admin.from('daily_raffle_results').select('raffle_day, raffle_type, winner_wallet, winner_name, qualifier_count, payout_status, payout_tx_hash').eq('raffle_type', 'avax').order('raffle_day', { ascending: false }).limit(1).maybeSingle(),
      admin.from('reward_claim_requests').select('id, reward_currency, amount_value, amount_text, status, paid_at, tx_hash'),
      admin.from('daily_raffle_results').select('claim_id, reward_currency, reward_amount, payout_status, payout_tx_hash'),
    ]);

    logNonMissingError('avax-treasury-summary sessionRows query failed', sessionError, 'crypto_payment_sessions');
    logNonMissingError('avax-treasury-summary legacy AVAX rows query failed', legacyAvaxError, 'avax_payment_verifications');
    logNonMissingError('avax-treasury-summary tokenRows query failed', tokenError, 'dfk_token_payments');
    logNonMissingError('avax-treasury-summary token session rows query failed', tokenSessionError, 'dfk_token_payment_sessions');
    logNonMissingError('avax-treasury-summary runs count query failed', runCountError, 'runs');
    logNonMissingError('avax-treasury-summary latest raffle winner query failed', latestRaffleWinnerError, 'daily_raffle_results');
    logNonMissingError('avax-treasury-summary latest AVAX raffle winner query failed', latestAvaxRaffleWinnerError, 'daily_raffle_results');
    logNonMissingError('avax-treasury-summary reward claims query failed', rewardClaimRowsError, 'reward_claim_requests');
    logNonMissingError('avax-treasury-summary raffle rows query failed', raffleRowsError, 'daily_raffle_results');

    const primarySessionRows = Array.isArray(sessionRows) ? sessionRows : [];
    const fallbackLegacyAvaxRows = Array.isArray(legacyAvaxRows) ? legacyAvaxRows : [];
    const safeSessionRows = primarySessionRows.length
      ? primarySessionRows
      : fallbackLegacyAvaxRows.map((row) => ({
          ...row,
          status: 'confirmed',
          confirmed_at: row.verified_at || row.confirmed_at || row.created_at || null,
          amount_wei: row.paid_amount_wei || row.expected_amount_wei || row.amount_wei || '0',
        }));
    const primaryTokenRows = Array.isArray(tokenRows) ? tokenRows : [];
    const rawTokenSessionRows = Array.isArray(tokenSessionRows) ? tokenSessionRows : [];
    const verifiedTokenSessions = rawTokenSessionRows.filter((row: any) => {
      const status = String(row?.status || '').trim().toLowerCase();
      return status === 'verified' || status === 'confirmed' || !!String(row?.verified_at || '').trim() || !!String(row?.tx_hash || '').trim();
    });
    const paidTokenHashes = new Set(primaryTokenRows.map((row: any) => String(row?.tx_hash || '').trim().toLowerCase()).filter(Boolean));
    const paidTokenSessionIds = new Set(primaryTokenRows.map((row: any) => String(row?.payment_session_id || '').trim()).filter(Boolean));
    const safeTokenRows = primaryTokenRows.concat(verifiedTokenSessions
      .filter((row: any) => {
        const txHash = String(row?.tx_hash || '').trim().toLowerCase();
        const sessionId = String(row?.id || '').trim();
        if (txHash && paidTokenHashes.has(txHash)) return false;
        if (sessionId && paidTokenSessionIds.has(sessionId)) return false;
        return true;
      })
      .map((row: any) => ({
        ...row,
        kind: row.kind,
        payment_asset: row.payment_asset || 'native_jewel',
        payment_session_id: row.id,
        paid_amount_wei: row.paid_amount_wei || row.expected_amount_wei || row.amount_wei || '0',
        verified_at: row.verified_at || row.confirmed_at || row.created_at || null,
        confirmed_at: row.verified_at || row.confirmed_at || row.created_at || null,
      })));
    const safeRewardClaimRows = Array.isArray(rewardClaimRows) ? rewardClaimRows : [];
    const safeRaffleRows = Array.isArray(raffleRows) ? raffleRows : [];
    const today = new Date().toISOString().slice(0, 10);
    const confirmed = []
      .concat(safeSessionRows.map((row: any) => ({
        kind: row.kind,
        currency: 'AVAX',
        amount_wei: row.paid_amount_wei || row.expected_amount_wei || row.amount_wei || '0',
        confirmed_at: row.verified_at || row.confirmed_at,
      })))
      .concat(safeTokenRows.map((row: any) => ({
        kind: row.kind,
        currency: 'JEWEL',
        amount_wei: row.paid_amount_wei || row.expected_amount_wei || row.amount_wei || '0',
        confirmed_at: row.verified_at || row.confirmed_at,
      })));
    const todayRows = confirmed.filter((row) => String(row.confirmed_at || '').slice(0, 10) === today);
    const entryRows = confirmed.filter((row) => String(row.kind || '') === 'entry_fee');
    const goldRows = confirmed.filter((row) => {
      const kind = String(row.kind || '').trim();
      return kind === 'gold_swap' || kind === 'jewel_gold_swap';
    });
    const heroRows = confirmed.filter((row) => {
      const kind = String(row.kind || '').trim();
      return kind === 'hero_hire' || kind === 'milestone_hero_hire' || kind === 'jewel_extra_hero' || kind === 'jewel_milestone_hero_hire';
    });
    const burnEntries = Array.isArray(burnRows) ? burnRows : [];
    const lifetimeAvaxInWei = sumWei(safeSessionRows);
    const lifetimeJewelInWei = sumWei(safeTokenRows);

    const completedRewardClaims = safeRewardClaimRows.filter((row: any) => isCompletedRewardLike(row));
    const completedClaimIds = new Set(completedRewardClaims.map((row: any) => String(row?.id || '').trim()).filter(Boolean));
    const unclaimedCompletedRaffles = safeRaffleRows.filter((row: any) => {
      if (!isCompletedRewardLike(row)) return false;
      const claimId = String(row?.claim_id || '').trim();
      return !claimId || !completedClaimIds.has(claimId);
    }).map((row: any) => ({
      reward_currency: row.reward_currency,
      amount_value: row.reward_amount,
      amount_text: row.reward_amount == null ? null : String(row.reward_amount),
    }));
    const completedOutgoingRows = completedRewardClaims.concat(unclaimedCompletedRaffles);
    const lifetimeAvaxOut = sumRewardAmounts(completedOutgoingRows, 'AVAX');
    const lifetimeJewelOut = sumRewardAmounts(completedOutgoingRows, 'JEWEL');
    const todayBurnRows = burnEntries.filter((row) => String(row.confirmed_at || '').slice(0, 10) === today);
    const lifetimeTrackedRuns = Math.max(0, Number((runCountError && !isMissingRelationError(runCountError, 'runs')) ? 0 : (lifetimeTrackedRunsCount || 0)));
    const lifetimeBurnedGold = burnEntries.reduce((total, row) => total + (Number((row && (row.burn_amount ?? row.amount)) || 0) || 0), 0);
    const todayBurnedGold = todayBurnRows.reduce((total, row) => total + (Number((row && (row.burn_amount ?? row.amount)) || 0) || 0), 0);

    return json({
      ok: true,
      walletAddress,
      treasuryAddress,
      confirmedCount: confirmed.length,
      todayConfirmedCount: todayRows.length,
      totalConfirmedWei: sumWei(confirmed),
      lifetimeAvaxInWei,
      lifetimeJewelInWei,
      lifetimeAvaxOut,
      lifetimeJewelOut,
      todayConfirmedWei: sumWei(todayRows),
      entryFeeWei: sumWei(entryRows),
      entryFeeAvaxWei: sumWeiBy(entryRows, (row) => row.currency === 'AVAX'),
      entryFeeJewelWei: sumWeiBy(entryRows, (row) => row.currency === 'JEWEL'),
      goldSwapWei: sumWei(goldRows),
      goldSwapAvaxWei: sumWeiBy(goldRows, (row) => row.currency === 'AVAX'),
      goldSwapJewelWei: sumWeiBy(goldRows, (row) => row.currency === 'JEWEL'),
      heroHireWei: sumWei(heroRows),
      heroHireAvaxWei: sumWeiBy(heroRows, (row) => row.currency === 'AVAX'),
      heroHireJewelWei: sumWeiBy(heroRows, (row) => row.currency === 'JEWEL'),
      entryFeeCount: entryRows.length,
      entryFeeAvaxCount: entryRows.filter((row) => row.currency === 'AVAX').length,
      entryFeeJewelCount: entryRows.filter((row) => row.currency === 'JEWEL').length,
      goldSwapCount: goldRows.length,
      goldSwapAvaxCount: goldRows.filter((row) => row.currency === 'AVAX').length,
      goldSwapJewelCount: goldRows.filter((row) => row.currency === 'JEWEL').length,
      heroHireCount: heroRows.length,
      heroHireAvaxCount: heroRows.filter((row) => row.currency === 'AVAX').length,
      heroHireJewelCount: heroRows.filter((row) => row.currency === 'JEWEL').length,
      lifetimeTrackedRuns,
      lifetimeBurnedGold,
      todayBurnedGold,
      burnedGoldCount: burnEntries.length,
      todayBurnedGoldCount: todayBurnRows.length,
      latestRaffleWinner: latestRaffleWinner && !isMissingRelationError(latestRaffleWinnerError, 'daily_raffle_results') ? latestRaffleWinner : null,
      latestAvaxRaffleWinner: latestAvaxRaffleWinner && !isMissingRelationError(latestAvaxRaffleWinnerError, 'daily_raffle_results') ? latestAvaxRaffleWinner : null,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ error: error instanceof Error ? error.message : 'Could not load treasury summary.' }, 500);
  }
});
