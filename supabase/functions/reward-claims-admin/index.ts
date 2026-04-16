
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { loadValidWalletSession, normalizeAddress } from '../_shared/wallet-session.ts';
import { isAutoRewardPayoutConfigured, tryAutoPayRewardClaim } from '../_shared/reward-payout.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}


function createAdmin() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}



function formatWhen(iso: string | null | undefined) {
  const value = String(iso || '').trim();
  if (!value) return '';
  try {
    const date = new Date(value);
    return `${date.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
  } catch {
    return value;
  }
}


function isCompletedWithdrawal(row: Record<string, unknown>) {
  const status = String(row.status || '').trim().toLowerCase();
  const paidAt = String(row.paid_at || '').trim();
  const txHash = String(row.tx_hash || '').trim();
  return status === 'paid' || !!paidAt || !!txHash;
}


function isMissingRelationError(error: unknown, relationName: string) {
  const code = String((error as { code?: string } | null)?.code || '').trim();
  const message = String((error as { message?: string } | null)?.message || '').toLowerCase();
  return code === 'PGRST205' || (message.includes('relation') && message.includes(relationName.toLowerCase()) && message.includes('does not exist'));
}

function isMissingColumnError(error: unknown, columnName: string) {
  const code = String((error as { code?: string } | null)?.code || '').trim();
  const message = String((error as { message?: string } | null)?.message || '').toLowerCase();
  return code === '42703' || (message.includes('column') && message.includes(columnName.toLowerCase()) && message.includes('does not exist'));
}

async function safeTableSelect<T>(
  promise: Promise<{ data: T[] | null; error: { code?: string; message?: string } | null }>,
  relationName: string,
  options: { allowMissingColumns?: string[] } = {},
) {
  const { data, error } = await promise;
  if (error) {
    if (isMissingRelationError(error, relationName)) return [] as T[];
    const missingColumns = Array.isArray(options.allowMissingColumns) ? options.allowMissingColumns : [];
    if (missingColumns.some((columnName) => isMissingColumnError(error, columnName))) return [] as T[];
    throw error;
  }
  return Array.isArray(data) ? data : [];
}

function firstNonEmptyString(...values: unknown[]) {
  for (const value of values) {
    const text = String(value || '').trim();
    if (text) return text;
  }
  return '';
}

function getRowEventTime(row: Record<string, unknown> | null | undefined) {
  return firstNonEmptyString(
    row?.verified_at,
    row?.confirmed_at,
    row?.paid_at,
    row?.updated_at,
    row?.created_at,
    row?.requested_at,
  );
}

function sortRowsByEventTimeDesc<T extends Record<string, unknown>>(rows: T[]) {
  return [...rows].sort((a, b) => {
    const aMs = new Date(getRowEventTime(a)).getTime();
    const bMs = new Date(getRowEventTime(b)).getTime();
    const safeA = Number.isFinite(aMs) ? aMs : 0;
    const safeB = Number.isFinite(bMs) ? bMs : 0;
    return safeB - safeA;
  });
}

async function safeSectionRows<T>(label: string, relationName: string, loader: () => Promise<T[]>) {
  try {
    const rows = await loader();
    return { rows, warning: null as string | null };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || `${label} unavailable.`);
    console.error(`[reward-claims-admin] ${label} failed`, error);
    return { rows: [] as T[], warning: `${label}: ${message}` };
  }
}

async function listClaims(admin: ReturnType<typeof createAdmin>, limit: number, timeframe = 'all') {
  const [claimSection, whitelistSection, burnSection, tokenSection, sessionSection] = await Promise.all([
    safeSectionRows<any>('reward claims', 'reward_claim_requests', () => safeTableSelect<any>(admin.from('reward_claim_requests').select('*').order('requested_at', { ascending: false }).limit(limit), 'reward_claim_requests')),
    safeSectionRows<any>('reward whitelist', 'reward_claim_whitelist', () => safeTableSelect<any>(admin.from('reward_claim_whitelist').select('*'), 'reward_claim_whitelist')),
    safeSectionRows<any>('gold burns', 'dfk_gold_burns', () => safeTableSelect<any>(
      admin.from('dfk_gold_burns').select('wallet_address, burn_amount, amount, confirmed_at').order('confirmed_at', { ascending: false }).limit(5000),
      'dfk_gold_burns',
    )),
    safeSectionRows<any>('token payments', 'dfk_token_payments', async () => {
      const rows = await safeTableSelect<any>(
        admin.from('dfk_token_payments').select('*').limit(5000),
        'dfk_token_payments',
        { allowMissingColumns: ['verified_at', 'confirmed_at', 'updated_at', 'created_at'] },
      );
      return sortRowsByEventTimeDesc(rows);
    }),
    safeSectionRows<any>('crypto payment sessions', 'crypto_payment_sessions', async () => {
      const rows = await safeTableSelect<any>(
        admin.from('crypto_payment_sessions').select('*').eq('status', 'confirmed').limit(5000),
        'crypto_payment_sessions',
        { allowMissingColumns: ['verified_at', 'confirmed_at', 'updated_at', 'created_at'] },
      );
      return sortRowsByEventTimeDesc(rows);
    }),
  ]);
  const rows = claimSection.rows;
  const whitelistRows = whitelistSection.rows;
  const burnRows = burnSection.rows;
  const tokenRows = tokenSection.rows;
  const sessionPaymentRows = sessionSection.rows;
  const sectionWarnings = [claimSection.warning, whitelistSection.warning, burnSection.warning, tokenSection.warning, sessionSection.warning].filter(Boolean) as string[];

  const allRows = rows || [];
  const completedRows = allRows.filter((row) => isCompletedWithdrawal(row));
  const pendingRows = allRows.filter((row) => {
    const status = String(row.status || '').trim().toLowerCase();
    if (isCompletedWithdrawal(row)) return false;
    return status !== 'rejected';
  });
  const pendingCount = pendingRows.length;
  const completedCount = completedRows.length;
  const pendingTotalsByCurrency = pendingRows.reduce((acc, row) => {
    const currency = String(row.reward_currency || '').trim().toUpperCase() || 'OTHER';
    const amount = Number(row.amount_value || 0) || 0;
    if (!acc[currency]) acc[currency] = 0;
    acc[currency] += amount;
    return acc;
  }, {} as Record<string, number>);

  const whitelistMap: Record<string, { isActive: boolean; autoDaily: boolean; autoBounty: boolean; maxClaimAmount?: number | null; dailyCap?: number | null; notes: string; updatedAt?: string | null }> = {};
  for (const row of (whitelistRows || [])) {
    whitelistMap[normalizeAddress(row.wallet_address)] = {
      isActive: !!row.is_active,
      autoDaily: !!row.auto_daily,
      autoBounty: !!row.auto_bounty,
      maxClaimAmount: row.max_claim_amount == null ? null : Number(row.max_claim_amount),
      dailyCap: row.daily_cap == null ? null : Number(row.daily_cap),
      notes: String(row.notes || '').trim(),
      updatedAt: row.updated_at || null,
    };
  }

  const walletNameMap = new Map<string, string>();
  for (const row of (rows || [])) {
    const walletKey = normalizeAddress(row.wallet_address);
    const playerName = String(row.player_name_snapshot || '').trim();
    if (walletKey && playerName && !walletNameMap.has(walletKey)) walletNameMap.set(walletKey, playerName);
  }


  const now = new Date();
  const startOfUtcDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const startOfUtcWeek = new Date(startOfUtcDay);
  startOfUtcWeek.setUTCDate(startOfUtcWeek.getUTCDate() - ((startOfUtcWeek.getUTCDay() + 6) % 7));
  const startOfLastUtcWeek = new Date(startOfUtcWeek);
  startOfLastUtcWeek.setUTCDate(startOfLastUtcWeek.getUTCDate() - 7);
  const endOfLastUtcWeek = new Date(startOfUtcWeek);

  function inSelectedTimeframe(value: string | null | undefined) {
    const iso = String(value || '').trim();
    if (!iso) return false;
    const ms = new Date(iso).getTime();
    if (!Number.isFinite(ms)) return false;
    if (timeframe === 'today') return ms >= startOfUtcDay.getTime();
    if (timeframe === 'this_week') return ms >= startOfUtcWeek.getTime();
    if (timeframe === 'last_week') return ms >= startOfLastUtcWeek.getTime() && ms < endOfLastUtcWeek.getTime();
    return true;
  }

  const mapClaimItem = (row: any) => {
    const whitelist = whitelistMap[normalizeAddress(row.wallet_address)] || null;
    const effectiveStatus = isCompletedWithdrawal(row) ? 'paid' : String(row.status || 'pending').trim().toLowerCase();
    return {
      id: row.id,
      walletAddress: row.wallet_address,
      claimType: row.claim_type,
      claimTypeLabel: row.claim_type === 'daily_quest' ? 'Daily reward' : (row.claim_type === 'bounty' ? 'Bounty' : 'Reward'),
      status: effectiveStatus,
      rawStatus: row.status,
      playerName: row.player_name_snapshot || row.wallet_address,
      amountText: row.amount_text,
      amountValue: row.amount_value,
      rewardCurrency: row.reward_currency,
      reason: row.reason_text || row.source_ref || '',
      sourceRef: row.source_ref || '',
      claimDay: row.claim_day || null,
      requestedAt: row.requested_at,
      requestedAtLabel: formatWhen(row.requested_at),
      approvedAt: row.approved_at || null,
      approvedAtLabel: formatWhen(row.approved_at),
      paidAt: row.paid_at || null,
      paidAtLabel: formatWhen(row.paid_at),
      resolvedAt: row.resolved_at || null,
      resolvedAtLabel: formatWhen(row.resolved_at),
      adminNote: row.admin_note || '',
      txHash: row.tx_hash || '',
      failureReason: row.failure_reason || '',
      resolvedByWallet: row.resolved_by_wallet || '',
      whitelist,
    };
  };

  const spendByWallet = new Map<string, {
    walletAddress: string;
    playerName: string;
    dfkGoldBurned: number;
    jewelSpentWei: bigint;
    jewelSpendCount: number;
    dfkGoldBurnCount: number;
    lastActivityAt: string | null;
  }>();
  const ensureSpendWallet = (walletAddress: string | null | undefined, fallbackName = '') => {
    const normalized = normalizeAddress(walletAddress);
    if (!normalized) return null;
    let row = spendByWallet.get(normalized);
    if (!row) {
      row = {
        walletAddress: normalized,
        playerName: walletNameMap.get(normalized) || String(fallbackName || '').trim() || normalized,
        dfkGoldBurned: 0,
        jewelSpentWei: 0n,
        jewelSpendCount: 0,
        dfkGoldBurnCount: 0,
        lastActivityAt: null,
      };
      spendByWallet.set(normalized, row);
    } else if ((!row.playerName || row.playerName === normalized) && fallbackName) {
      row.playerName = String(fallbackName).trim();
    }
    return row;
  };

  for (const row of (burnRows || [])) {
    const confirmedAt = String(row.confirmed_at || '').trim() || null;
    if (!inSelectedTimeframe(confirmedAt)) continue;
    const entry = ensureSpendWallet(row.wallet_address);
    if (!entry) continue;
    const burnAmount = Number(row.burn_amount ?? row.amount ?? 0) || 0;
    entry.dfkGoldBurned += burnAmount;
    entry.dfkGoldBurnCount += 1;
    if (confirmedAt && (!entry.lastActivityAt || confirmedAt > entry.lastActivityAt)) entry.lastActivityAt = confirmedAt;
  }

  const spendKinds = new Set([
    'gold_swap',
    'hero_hire',
    'milestone_hero_hire',
    'jewel_gold_swap',
    'jewel_extra_hero',
    'jewel_milestone_hero_hire',
  ]);

  const mergedTokenRows = []
    .concat(Array.isArray(tokenRows) ? tokenRows : [])
    .concat(Array.isArray(sessionPaymentRows) ? sessionPaymentRows.map((row) => ({
      wallet_address: row.wallet_address,
      paid_amount_wei: row.paid_amount_wei || row.expected_amount_wei,
      payment_asset: row.payment_asset,
      kind: row.kind,
      verified_at: getRowEventTime(row) || null,
      confirmed_at: firstNonEmptyString(row.confirmed_at) || null,
      metadata: row.metadata,
    })) : []);

  for (const row of mergedTokenRows) {
    const kind = String(row.kind || '').trim();
    if (!spendKinds.has(kind)) continue;
    const activityAt = getRowEventTime(row) || null;
    if (!inSelectedTimeframe(activityAt)) continue;
    const parsedMetadata = typeof row.metadata === 'string'
      ? (() => { try { return JSON.parse(row.metadata); } catch { return {}; } })()
      : (row.metadata && typeof row.metadata === 'object' ? row.metadata : {});
    const entry = ensureSpendWallet(row.wallet_address, String((parsedMetadata && (parsedMetadata.playerName || parsedMetadata.player_name)) || '').trim());
    if (!entry) continue;
    entry.jewelSpentWei += BigInt(String(row.paid_amount_wei || '0'));
    entry.jewelSpendCount += 1;
    if (activityAt && (!entry.lastActivityAt || activityAt > entry.lastActivityAt)) entry.lastActivityAt = activityAt;
  }

  const lifetimeBurnRows = Array.isArray(burnRows) ? burnRows : [];
  const lifetimeTokenRows = mergedTokenRows;
  let lifetimeGoldBurned = 0;
  let lifetimeJewelSpentWei = 0n;
  for (const row of lifetimeBurnRows) {
    lifetimeGoldBurned += Number(row.burn_amount ?? row.amount ?? 0) || 0;
  }
  for (const row of lifetimeTokenRows) {
    const kind = String(row.kind || '').trim();
    if (!spendKinds.has(kind)) continue;
    lifetimeJewelSpentWei += BigInt(String(row.paid_amount_wei || '0'));
  }

  const spendItems = Array.from(spendByWallet.values())
    .filter((row) => row.dfkGoldBurned > 0 || row.jewelSpentWei > 0n)
    .map((row) => ({
      walletAddress: row.walletAddress,
      playerName: row.playerName,
      dfkGoldBurned: Number(row.dfkGoldBurned.toFixed(3)),
      jewelSpentWei: row.jewelSpentWei.toString(),
      jewelSpentText: row.jewelSpentWei.toString(),
      jewelSpendCount: row.jewelSpendCount,
      dfkGoldBurnCount: row.dfkGoldBurnCount,
      lastActivityAt: row.lastActivityAt,
      lastActivityAtLabel: formatWhen(row.lastActivityAt),
    }))
    .sort((a, b) => {
      const aScore = Number(a.dfkGoldBurned || 0) + Number(BigInt(a.jewelSpentWei || '0') / 1000000000000000n);
      const bScore = Number(b.dfkGoldBurned || 0) + Number(BigInt(b.jewelSpentWei || '0') / 1000000000000000n);
      return bScore - aScore;
    })
    .slice(0, 200);

  const whitelistItems = Object.entries(whitelistMap).map(([walletAddress, row]) => ({
    walletAddress,
    isActive: !!row.isActive,
    autoDaily: !!row.autoDaily,
    autoBounty: !!row.autoBounty,
    maxClaimAmount: row.maxClaimAmount ?? null,
    dailyCap: row.dailyCap ?? null,
    notes: row.notes || '',
    updatedAt: row.updatedAt || null,
  })).sort((a, b) => a.walletAddress.localeCompare(b.walletAddress));

  const schemaWarning = sectionWarnings.length ? sectionWarnings.join(' | ') : null;
  return {
    ok: true,
    pendingCount,
    completedCount,
    pendingTotalsByCurrency,
    items: (rows || []).map(mapClaimItem),
    pendingItems: pendingRows.map(mapClaimItem),
    completedItems: completedRows.map(mapClaimItem),
    whitelistItems,
    spendItems,
    spendTimeframe: timeframe,
    lifetimeGoldBurned,
    lifetimeJewelSpentWei: lifetimeJewelSpentWei.toString(),
    schemaWarning,
    sectionWarnings,
  };
}

async function updateClaimStatus(admin: ReturnType<typeof createAdmin>, adminWallet: string, body: Record<string, unknown>) {
  const claimId = String(body.claimId || '').trim();
  const rawStatus = String(body.status || '').trim().toLowerCase();
  const nextStatus = rawStatus === 'approve' ? 'approved' : (rawStatus === 'reject' ? 'rejected' : rawStatus);
  const adminNote = String(body.adminNote || '').trim();
  const txHash = String(body.txHash || '').trim();
  const failureReason = String(body.failureReason || '').trim();
  if (!claimId) throw new Error('claimId is required.');
  if (!['approved', 'rejected', 'paid', 'pending'].includes(nextStatus)) throw new Error('Invalid status.');

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    status: nextStatus,
    resolved_at: now,
    resolved_by_wallet: adminWallet,
    admin_note: adminNote || null,
    tx_hash: txHash || null,
    failure_reason: failureReason || null,
  };
  if (nextStatus === 'approved') patch.approved_at = now;
  if (nextStatus === 'paid') {
    patch.approved_at = now;
    patch.paid_at = now;
  }
  if (nextStatus === 'pending') {
    patch.resolved_at = null;
    patch.resolved_by_wallet = null;
    patch.approved_at = null;
    patch.paid_at = null;
    patch.tx_hash = null;
    patch.failure_reason = null;
  }

  const { error } = await admin.from('reward_claim_requests').update(patch).eq('id', claimId);
  if (error) throw error;
  return { ok: true, claimId, status: nextStatus };
}

async function approveAndPayClaim(admin: ReturnType<typeof createAdmin>, adminWallet: string, body: Record<string, unknown>) {
  const claimId = String(body.claimId || '').trim();
  const adminNote = String(body.adminNote || '').trim();
  if (!claimId) throw new Error('claimId is required.');

  const { data: claim, error } = await admin
    .from('reward_claim_requests')
    .select('id, wallet_address, status, amount_value, reward_currency, amount_text, admin_note, approved_at, resolved_at, resolved_by_wallet, tx_hash, paid_at, failure_reason')
    .eq('id', claimId)
    .maybeSingle();
  if (error) throw error;
  if (!claim) throw new Error('Claim not found.');

  const now = new Date().toISOString();
  const currentStatus = String(claim.status || '').trim().toLowerCase();
  if (String(claim.paid_at || '').trim() || String(claim.tx_hash || '').trim() || currentStatus === 'paid') {
    return { ok: true, claimId, status: 'paid', txHash: String(claim.tx_hash || '').trim() || null, message: 'Claim already paid.' };
  }

  const note = adminNote ? String([String(claim.admin_note || '').trim(), adminNote].filter(Boolean).join(' ')).trim() : String(claim.admin_note || '').trim();
  if (currentStatus !== 'approved') {
    const { error: approveError } = await admin
      .from('reward_claim_requests')
      .update({
        status: 'approved',
        approved_at: claim.approved_at || now,
        resolved_at: now,
        resolved_by_wallet: adminWallet,
        admin_note: note || null,
        failure_reason: null,
      })
      .eq('id', claimId);
    if (approveError) throw approveError;
    claim.status = 'approved';
    claim.approved_at = claim.approved_at || now;
    claim.resolved_at = now;
    claim.resolved_by_wallet = adminWallet;
    claim.admin_note = note || null;
    claim.failure_reason = null;
  } else if (adminNote) {
    const { error: noteError } = await admin
      .from('reward_claim_requests')
      .update({
        admin_note: note || null,
        resolved_at: now,
        resolved_by_wallet: adminWallet,
      })
      .eq('id', claimId);
    if (noteError) throw noteError;
    claim.admin_note = note || null;
    claim.resolved_at = now;
    claim.resolved_by_wallet = adminWallet;
  }

  if (!isAutoRewardPayoutConfigured()) {
    return { ok: true, claimId, status: 'approved', txHash: null, message: 'Claim approved. Set TREASURY_PRIVATE_KEY in Supabase secrets to enable one-click treasury payout.' };
  }

  const payout = await tryAutoPayRewardClaim(admin, {
    id: claim.id,
    wallet_address: claim.wallet_address,
    status: 'approved',
    amount_value: claim.amount_value,
    reward_currency: claim.reward_currency,
    amount_text: claim.amount_text,
    admin_note: claim.admin_note,
    approved_at: claim.approved_at,
    resolved_at: claim.resolved_at,
    resolved_by_wallet: claim.resolved_by_wallet,
    tx_hash: claim.tx_hash,
    paid_at: claim.paid_at,
    failure_reason: claim.failure_reason,
  });

  return {
    ok: true,
    claimId,
    status: payout.paid ? 'paid' : 'approved',
    txHash: payout.txHash || null,
    rewardCurrency: String(claim.reward_currency || '').trim().toUpperCase() || null,
    message: payout.message,
  };
}

async function upsertWhitelist(admin: ReturnType<typeof createAdmin>, body: Record<string, unknown>) {
  const walletAddress = normalizeAddress(String(body.targetWallet || body.walletAddress || ''));
  if (!walletAddress) throw new Error('targetWallet is required.');
  const payload = {
    wallet_address: walletAddress,
    is_active: body.isActive !== false,
    auto_daily: !!body.autoDaily,
    auto_bounty: !!body.autoBounty,
    max_claim_amount: body.maxClaimAmount == null || body.maxClaimAmount === '' ? null : Number(body.maxClaimAmount),
    daily_cap: body.dailyCap == null || body.dailyCap === '' ? null : Number(body.dailyCap),
    notes: String(body.notes || '').trim() || null,
  };
  const { error } = await admin.from('reward_claim_whitelist').upsert(payload, { onConflict: 'wallet_address' });
  if (error) throw error;
  return { ok: true, walletAddress };
}

async function deleteWhitelist(admin: ReturnType<typeof createAdmin>, body: Record<string, unknown>) {
  const walletAddress = normalizeAddress(String(body.targetWallet || body.walletAddress || ''));
  if (!walletAddress) throw new Error('targetWallet is required.');
  const { error } = await admin.from('reward_claim_whitelist').delete().eq('wallet_address', walletAddress);
  if (error) throw error;
  return { ok: true, walletAddress };
}

async function listWhitelist(admin: ReturnType<typeof createAdmin>) {
  const { data, error } = await admin
    .from('reward_claim_whitelist')
    .select('wallet_address, is_active, auto_daily, auto_bounty, max_claim_amount, daily_cap, notes, created_at, updated_at')
    .order('wallet_address', { ascending: true });
  if (error) throw error;
  return { ok: true, items: (data || []).map((row) => ({
    walletAddress: row.wallet_address,
    isActive: !!row.is_active,
    autoDaily: !!row.auto_daily,
    autoBounty: !!row.auto_bounty,
    maxClaimAmount: row.max_claim_amount,
    dailyCap: row.daily_cap,
    notes: row.notes || '',
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  })) };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200, headers: corsHeaders });
  try {
    const admin = createAdmin();
    const body = await req.json().catch(() => ({}));
    const sessionResult = await loadValidWalletSession(admin, req, corsHeaders);
    if ('response' in sessionResult) return sessionResult.response;
    const session = sessionResult.session;
    const walletAddress = normalizeAddress(body.walletAddress as string || session.wallet_address);
    const adminWallet = normalizeAddress(Deno.env.get('DFK_REWARD_ADMIN_WALLET') || Deno.env.get('DFK_AVAX_TREASURY_ADDRESS') || '0xab45288409900be5ef23c19726a30c28268495ad');
    const privateAdminWallets = (Deno.env.get('DFK_PRIVATE_ADMIN_WALLETS') || `${adminWallet},0x971bdacd04ef40141ddb6ba175d4f76665103c81`)
      .split(',')
      .map((value) => normalizeAddress(value))
      .filter(Boolean);
    if (!walletAddress || walletAddress !== normalizeAddress(session.wallet_address)) return json({ error: 'Wallet mismatch.' }, 401);
    if (!privateAdminWallets.includes(walletAddress)) return json({ error: 'Unauthorized.' }, 403);

    const action = String(body.action || 'list').trim().toLowerCase();
    if (action === 'update_status') {
      return json(await updateClaimStatus(admin, walletAddress, body as Record<string, unknown>));
    }
    if (action === 'approve_and_pay') {
      return json(await approveAndPayClaim(admin, walletAddress, body as Record<string, unknown>));
    }
    if (action === 'whitelist_upsert') {
      return json(await upsertWhitelist(admin, body as Record<string, unknown>));
    }
    if (action === 'whitelist_list') {
      return json(await listWhitelist(admin));
    }
    if (action === 'whitelist_delete') {
      return json(await deleteWhitelist(admin, body as Record<string, unknown>));
    }

    const limit = Math.max(1, Math.min(100, Number(body.limit || 25) || 25));
    const timeframe = String(body.timeframe || 'all').trim().toLowerCase();
    return json(await listClaims(admin, limit, timeframe));
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ error: error instanceof Error ? error.message : 'Failed to load reward claims.' }, 500);
  }
});
