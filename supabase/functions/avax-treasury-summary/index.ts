import { createClient } from 'jsr:@supabase/supabase-js@2';
import { loadValidWalletSession, normalizeAddress } from '../_shared/wallet-session.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type RowLike = Record<string, unknown>;

function createAdmin() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
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

function firstText(...values: unknown[]) {
  for (const value of values) {
    const text = String(value || '').trim();
    if (text) return text;
  }
  return '';
}

function normalizeStatus(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function normalizeKind(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function normalizeHash(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function normalizeCurrency(value: unknown) {
  return String(value || '').trim().toUpperCase();
}

function inferCurrency(row: Record<string, unknown>) {
  const explicit = normalizeCurrency(row.reward_currency ?? row.currency ?? row.payment_asset);
  if (explicit === 'AVAX' || explicit === 'JEWEL') return explicit;
  const text = [row.amount_text, row.claim_type, row.source_ref, row.reason_text, row.admin_note, row.raffle_type]
    .map((value) => String(value || '').toUpperCase())
    .join(' ');
  if (text.includes('AVAX')) return 'AVAX';
  if (text.includes('JEWEL')) return 'JEWEL';
  return '';
}

function getWeiLike(row: RowLike) {
  return BigInt(String(row.amount_wei ?? row.paid_amount_wei ?? row.expected_amount_wei ?? '0'));
}

function sumWei(rows: RowLike[]) {
  return rows.reduce((total, row) => total + getWeiLike(row), 0n).toString();
}

function sumWeiBy(rows: RowLike[], predicate: (row: RowLike) => boolean) {
  return rows.reduce((total, row) => predicate(row) ? total + getWeiLike(row) : total, 0n).toString();
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

function sumRewardAmounts(rows: Array<Record<string, unknown>>, currency: 'JEWEL' | 'AVAX') {
  let total = '0';
  for (const row of rows) {
    if (inferCurrency(row) !== currency) continue;
    if (row.amount_value != null && String(row.amount_value).trim()) {
      total = addPositiveDecimalStrings(total, row.amount_value);
      continue;
    }
    const match = String(row.amount_text || row.reward_amount || '').replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
    if (match?.[1]) total = addPositiveDecimalStrings(total, match[1]);
  }
  return total;
}

function isCompletedRewardLike(row: RowLike) {
  return normalizeStatus(row.status) === 'paid'
    || normalizeStatus(row.status) === 'approved'
    || normalizeStatus(row.payout_status) === 'paid'
    || normalizeStatus(row.payout_status) === 'approved'
    || !!String(row.paid_at || row.approved_at || row.settled_at || '').trim()
    || !!String(row.tx_hash || row.payout_tx_hash || '').trim();
}

function getKindBucket(kindValue: unknown) {
  const kind = normalizeKind(kindValue);
  if (['entry_fee', 'bundle', 'bundle_purchase', 'run_bundle', 'paid_bundle'].includes(kind)) return 'entry';
  if (['gold_swap', 'jewel_gold_swap'].includes(kind)) return 'gold';
  if (['hero_hire', 'extra_hero', 'milestone_hero_hire', 'jewel_extra_hero', 'jewel_milestone_hero_hire'].includes(kind)) return 'hero';
  return 'other';
}

async function fetchPaginatedRows(admin: ReturnType<typeof createAdmin>, relationName: string, columns: string, apply?: (query: any) => any) {
  const rows: any[] = [];
  const pageSize = 1000;
  let from = 0;
  while (true) {
    let query: any = admin.from(relationName).select(columns).range(from, from + pageSize - 1);
    if (apply) query = apply(query);
    const { data, error } = await query;
    if (error) {
      if (isMissingRelationError(error, relationName)) return rows;
      throw error;
    }
    const batch = Array.isArray(data) ? data : [];
    rows.push(...batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

async function fetchPaginatedBurnRows(admin: ReturnType<typeof createAdmin>) {
  return fetchPaginatedRows(admin, 'dfk_gold_burns', 'burn_amount, amount, confirmed_at');
}

function dedupeAvaxRows(currentRows: any[], legacyRows: any[]) {
  const out: any[] = [];
  const seen = new Set<string>();
  for (const row of currentRows || []) {
    const key = firstText(
      row?.id,
      normalizeHash(row?.payment_tx_hash),
      `${normalizeKind(row?.kind)}:${String(row?.confirmed_at || row?.created_at || '')}:${String(row?.expected_amount_wei || row?.paid_amount_wei || row?.amount_wei || '0')}`,
    );
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    out.push(row);
  }
  for (const row of legacyRows || []) {
    const normalized = {
      ...row,
      status: 'confirmed',
      confirmed_at: row?.verified_at || row?.confirmed_at || row?.created_at || null,
      amount_wei: row?.paid_amount_wei || row?.expected_amount_wei || row?.amount_wei || '0',
      payment_tx_hash: row?.payment_tx_hash || row?.tx_hash || null,
    };
    const key = firstText(
      normalizeHash(normalized.payment_tx_hash),
      `${normalizeKind(normalized.kind)}:${String(normalized.confirmed_at || '')}:${String(normalized.amount_wei || '0')}`,
    );
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    out.push(normalized);
  }
  return out;
}


function getTokenSessionAmountWei(row: RowLike) {
  return String(
    row?.paid_amount_wei
      ?? row?.expected_amount_wei
      ?? row?.amount_wei
      ?? ((row?.metadata as Record<string, unknown> | undefined)?.paid_amount_wei)
      ?? ((row?.metadata as Record<string, unknown> | undefined)?.expected_amount_wei)
      ?? '0',
  );
}

function isTokenSessionSubmittedLike(row: RowLike) {
  const status = normalizeStatus(row?.status);
  return status === 'submitted'
    || status === 'processing'
    || status === 'broadcasted'
    || status === 'broadcast'
    || status === 'sent'
    || status === 'pending';
}

function isCompletedTokenSessionLike(row: RowLike) {
  const status = normalizeStatus(row?.status);
  return status === 'verified'
    || status === 'confirmed'
    || status === 'paid'
    || status === 'completed'
    || status === 'approved'
    || !!String(row?.verified_at || row?.confirmed_at || '').trim()
    || !!String(row?.tx_hash || '').trim()
    || !!String(row?.block_number || '').trim();
}

function shouldCountTokenSessionLike(row: RowLike) {
  const amountWei = getTokenSessionAmountWei(row);
  if (!/^\d+$/.test(String(amountWei || '').trim())) return false;
  if (BigInt(String(amountWei || '0')) <= 0n) return false;
  if (isCompletedTokenSessionLike(row)) return true;
  const metadata = row?.metadata && typeof row.metadata === 'object' ? row.metadata as Record<string, unknown> : {};
  return isTokenSessionSubmittedLike(row)
    || !!String(row?.tx_hash || metadata?.txHash || metadata?.transactionHash || '').trim()
    || !!String(row?.block_number || metadata?.blockNumber || '').trim();
}

function mergeTokenRows(tokenRows: any[], tokenSessionRows: any[]) {
  const safeTokenRows = Array.isArray(tokenRows) ? tokenRows.slice() : [];
  const paidTokenHashes = new Set(safeTokenRows.map((row) => normalizeHash(row?.tx_hash)).filter(Boolean));
  const paidTokenSessionIds = new Set(safeTokenRows.map((row) => String(row?.payment_session_id || '').trim()).filter(Boolean));
  const countableTokenSessions = (Array.isArray(tokenSessionRows) ? tokenSessionRows : []).filter((row) => shouldCountTokenSessionLike(row));
  for (const row of countableTokenSessions) {
    const metadata = row?.metadata && typeof row.metadata === 'object' ? row.metadata as Record<string, unknown> : {};
    const txHash = normalizeHash(row?.tx_hash || metadata?.txHash || metadata?.transactionHash);
    const sessionId = String(row?.id || '').trim();
    if (txHash && paidTokenHashes.has(txHash)) continue;
    if (sessionId && paidTokenSessionIds.has(sessionId)) continue;
    safeTokenRows.push({
      ...row,
      tx_hash: row?.tx_hash || metadata?.txHash || metadata?.transactionHash || null,
      block_number: row?.block_number || metadata?.blockNumber || null,
      payment_asset: row?.payment_asset || 'native_jewel',
      payment_session_id: row?.id,
      paid_amount_wei: getTokenSessionAmountWei(row),
      verified_at: row?.verified_at || row?.confirmed_at || row?.created_at || null,
      confirmed_at: row?.verified_at || row?.confirmed_at || row?.created_at || null,
    });
  }
  return safeTokenRows;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200, headers: corsHeaders });
  try {
    const admin = createAdmin();
    const body = await req.json().catch(() => ({}));
    const sessionResult = await loadValidWalletSession(admin, req, corsHeaders);
    if ('response' in sessionResult) return sessionResult.response;
    const session = sessionResult.session;
    const walletAddress = normalizeAddress((body as RowLike).walletAddress || session.wallet_address);
    const treasuryAddress = normalizeAddress(Deno.env.get('DFK_AVAX_TREASURY_ADDRESS') || '0xab45288409900be5ef23c19726a30c28268495ad');
    const privateAdminWallets = (Deno.env.get('DFK_PRIVATE_ADMIN_WALLETS') || `${treasuryAddress},0x971bdacd04ef40141ddb6ba175d4f76665103c81`)
      .split(',')
      .map((value) => normalizeAddress(value))
      .filter(Boolean);

    if (!walletAddress) return json({ error: 'walletAddress is required.' }, 400);
    if (walletAddress !== normalizeAddress(session.wallet_address)) return json({ error: 'Wallet mismatch.' }, 401);
    if (!privateAdminWallets.includes(walletAddress)) return json({ error: 'Treasury access only.' }, 403);

    const [
      sessionRows,
      legacyAvaxRows,
      tokenRows,
      tokenSessionRows,
      rewardClaimRows,
      raffleRows,
      burnRows,
      { count: lifetimeTrackedRunsCount, error: runCountError },
      { data: latestRaffleWinner, error: latestRaffleWinnerError },
      { data: latestAvaxRaffleWinner, error: latestAvaxRaffleWinnerError },
      { data: dailyRaffleHistory, error: dailyRaffleHistoryError },
    ] = await Promise.all([
      fetchPaginatedRows(admin, 'crypto_payment_sessions', '*', (query) => query.eq('status', 'confirmed')),
      fetchPaginatedRows(admin, 'avax_payment_verifications', '*'),
      fetchPaginatedRows(admin, 'dfk_token_payments', '*'),
      fetchPaginatedRows(admin, 'dfk_token_payment_sessions', '*'),
      fetchPaginatedRows(admin, 'reward_claim_requests', '*'),
      fetchPaginatedRows(admin, 'daily_raffle_results', '*'),
      fetchPaginatedBurnRows(admin),
      admin.from('runs').select('id', { count: 'exact', head: true }),
      admin.from('daily_raffle_results').select('*').eq('raffle_type', 'dfk').order('raffle_day', { ascending: false }).limit(1).maybeSingle(),
      admin.from('daily_raffle_results').select('*').eq('raffle_type', 'avax').order('raffle_day', { ascending: false }).limit(1).maybeSingle(),
      admin.from('daily_raffle_results').select('*').order('raffle_day', { ascending: false }).limit(40),
    ]);

    logNonMissingError('avax-treasury-summary runs count query failed', runCountError, 'runs');
    logNonMissingError('avax-treasury-summary latest raffle winner query failed', latestRaffleWinnerError, 'daily_raffle_results');
    logNonMissingError('avax-treasury-summary latest AVAX raffle winner query failed', latestAvaxRaffleWinnerError, 'daily_raffle_results');
    logNonMissingError('avax-treasury-summary daily raffle history query failed', dailyRaffleHistoryError, 'daily_raffle_results');

    const safeSessionRows = dedupeAvaxRows(sessionRows || [], legacyAvaxRows || []);
    const safeTokenRows = mergeTokenRows(tokenRows || [], tokenSessionRows || []);
    const currentSessionRows = Array.isArray(sessionRows) ? sessionRows : [];
    const avaxInRows = safeSessionRows.length > 0 ? safeSessionRows : currentSessionRows;
    const safeRewardClaimRows = Array.isArray(rewardClaimRows) ? rewardClaimRows : [];
    const safeRaffleRows = Array.isArray(raffleRows) ? raffleRows : [];
    const safeBurnRows = Array.isArray(burnRows) ? burnRows : [];

    const confirmed = []
      .concat(safeSessionRows.map((row) => ({
        kind: row.kind,
        currency: 'AVAX',
        amount_wei: row.paid_amount_wei || row.expected_amount_wei || row.amount_wei || '0',
        confirmed_at: row.confirmed_at || row.verified_at || row.created_at || null,
      })))
      .concat(safeTokenRows.map((row) => ({
        kind: row.kind,
        currency: 'JEWEL',
        amount_wei: row.paid_amount_wei || row.expected_amount_wei || row.amount_wei || '0',
        confirmed_at: row.confirmed_at || row.verified_at || row.created_at || null,
      })));

    const today = new Date().toISOString().slice(0, 10);
    const todayRows = confirmed.filter((row) => String(row.confirmed_at || '').slice(0, 10) === today);
    const entryRows = confirmed.filter((row) => getKindBucket(row.kind) === 'entry');
    const goldRows = confirmed.filter((row) => getKindBucket(row.kind) === 'gold');
    const heroRows = confirmed.filter((row) => getKindBucket(row.kind) === 'hero');

    const completedRewardClaims = safeRewardClaimRows.filter((row) => isCompletedRewardLike(row));
    const completedClaimIds = new Set(completedRewardClaims.map((row) => String(row.id || '').trim()).filter(Boolean));
    const completedRaffleRows = safeRaffleRows
      .filter((row) => isCompletedRewardLike(row))
      .filter((row) => {
        const claimId = String(row.claim_id || '').trim();
        return !claimId || !completedClaimIds.has(claimId);
      })
      .map((row) => ({
        raffle_type: row.raffle_type,
        reward_currency: row.reward_currency,
        amount_value: row.reward_amount,
        amount_text: row.reward_amount == null ? null : String(row.reward_amount),
        payout_status: row.payout_status,
        payout_tx_hash: row.payout_tx_hash,
        settled_at: row.settled_at,
      }));
    const completedOutgoingRows = completedRewardClaims.concat(completedRaffleRows);

    const todayBurnRows = safeBurnRows.filter((row) => String(row.confirmed_at || '').slice(0, 10) === today);
    const lifetimeTrackedRuns = Math.max(0, Number((runCountError && !isMissingRelationError(runCountError, 'runs')) ? 0 : (lifetimeTrackedRunsCount || 0)));
    const lifetimeBurnedGold = safeBurnRows.reduce((total, row) => total + (Number(row.burn_amount ?? row.amount ?? 0) || 0), 0);
    const todayBurnedGold = todayBurnRows.reduce((total, row) => total + (Number(row.burn_amount ?? row.amount ?? 0) || 0), 0);

    return json({
      ok: true,
      walletAddress,
      treasuryAddress,
      confirmedCount: confirmed.length,
      todayConfirmedCount: todayRows.length,
      totalConfirmedWei: sumWei(confirmed),
      lifetimeAvaxInWei: sumWei(avaxInRows),
      lifetimeJewelInWei: sumWei(safeTokenRows),
      lifetimeAvaxOut: sumRewardAmounts(completedOutgoingRows, 'AVAX'),
      lifetimeJewelOut: sumRewardAmounts(completedOutgoingRows, 'JEWEL'),
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
      burnedGoldCount: safeBurnRows.length,
      todayBurnedGoldCount: todayBurnRows.length,
      latestRaffleWinner: latestRaffleWinner && !isMissingRelationError(latestRaffleWinnerError, 'daily_raffle_results') ? latestRaffleWinner : null,
      latestAvaxRaffleWinner: latestAvaxRaffleWinner && !isMissingRelationError(latestAvaxRaffleWinnerError, 'daily_raffle_results') ? latestAvaxRaffleWinner : null,
      dailyRaffleHistory: Array.isArray(dailyRaffleHistory) && !isMissingRelationError(dailyRaffleHistoryError, 'daily_raffle_results') ? dailyRaffleHistory : [],
      diagnostics: {
        currentAvaxRows: Array.isArray(sessionRows) ? sessionRows.length : 0,
        legacyAvaxRows: Array.isArray(legacyAvaxRows) ? legacyAvaxRows.length : 0,
        mergedAvaxRows: safeSessionRows.length,
        avaxInRowsUsed: avaxInRows.length,
        tokenRows: Array.isArray(tokenRows) ? tokenRows.length : 0,
        tokenSessionRows: Array.isArray(tokenSessionRows) ? tokenSessionRows.length : 0,
        mergedTokenRows: safeTokenRows.length,
        tokenRowsWithTxHash: (Array.isArray(tokenRows) ? tokenRows : []).filter((row) => !!String(row?.tx_hash || '').trim()).length,
        tokenSessionsCompletedLike: (Array.isArray(tokenSessionRows) ? tokenSessionRows : []).filter((row) => isCompletedTokenSessionLike(row)).length,
        tokenSessionsCountedLike: (Array.isArray(tokenSessionRows) ? tokenSessionRows : []).filter((row) => shouldCountTokenSessionLike(row)).length,
        tokenSessionsWithTxHash: (Array.isArray(tokenSessionRows) ? tokenSessionRows : []).filter((row) => !!String(row?.tx_hash || row?.metadata?.txHash || row?.metadata?.transactionHash || '').trim()).length,
        rewardClaimRows: safeRewardClaimRows.length,
        raffleRows: safeRaffleRows.length,
        burnRows: safeBurnRows.length,
      },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ error: error instanceof Error ? error.message : 'Could not load treasury summary.' }, 500);
  }
});
