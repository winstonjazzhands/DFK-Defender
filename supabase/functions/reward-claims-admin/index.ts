
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

function normalizeAddress(address: string | null | undefined) {
  return String(address || '').trim().toLowerCase();
}

function createAdmin() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}


async function requireAdminSession(req: Request, admin: ReturnType<typeof createAdmin>) {
  const authHeader = req.headers.get('Authorization') || '';
  const fallbackHeader = req.headers.get('x-session-token') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim() || String(fallbackHeader).trim();
  if (!token) throw new Response(JSON.stringify({ error: 'Session token required.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  const { data: session, error } = await admin
    .from('wallet_sessions')
    .select('session_token, wallet_address, expires_at, revoked_at')
    .eq('session_token', token)
    .single();

  if (error || !session) throw new Response(JSON.stringify({ error: 'Session not found.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  if (session.revoked_at) throw new Response(JSON.stringify({ error: 'Session revoked.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  if (Date.now() >= new Date(session.expires_at).getTime()) throw new Response(JSON.stringify({ error: 'Session expired.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  return session;
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


async function listClaims(admin: ReturnType<typeof createAdmin>, limit: number) {
  const { data: rows, error } = await admin
    .from('reward_claim_requests')
    .select('id, wallet_address, claim_type, status, player_name_snapshot, amount_text, amount_value, reward_currency, reason_text, source_ref, claim_day, requested_at, approved_at, paid_at, resolved_at, admin_note, tx_hash, failure_reason, resolved_by_wallet')
    .order('requested_at', { ascending: false })
    .limit(limit);
  if (error) throw error;

  const pendingRows = (rows || []).filter((row) => String(row.status || '').toLowerCase() === 'pending');
  const pendingCount = pendingRows.length;
  const pendingTotalsByCurrency = pendingRows.reduce((acc, row) => {
    const currency = String(row.reward_currency || '').trim().toUpperCase() || 'OTHER';
    const amount = Number(row.amount_value || 0) || 0;
    if (!acc[currency]) acc[currency] = 0;
    acc[currency] += amount;
    return acc;
  }, {} as Record<string, number>);

  const wallets = Array.from(new Set((rows || []).map((row) => normalizeAddress(row.wallet_address)).filter(Boolean)));
  const whitelistMap: Record<string, { isActive: boolean; autoDaily: boolean; autoBounty: boolean; notes: string }> = {};
  if (wallets.length) {
    const { data: whitelistRows, error: whitelistError } = await admin
      .from('reward_claim_whitelist')
      .select('wallet_address, is_active, auto_daily, auto_bounty, notes')
      .in('wallet_address', wallets);
    if (whitelistError) throw whitelistError;
    for (const row of (whitelistRows || [])) {
      whitelistMap[normalizeAddress(row.wallet_address)] = {
        isActive: !!row.is_active,
        autoDaily: !!row.auto_daily,
        autoBounty: !!row.auto_bounty,
        notes: String(row.notes || '').trim(),
      };
    }
  }

  const items = (rows || []).map((row) => {
    const whitelist = whitelistMap[normalizeAddress(row.wallet_address)] || null;
    return {
      id: row.id,
      walletAddress: row.wallet_address,
      claimType: row.claim_type,
      claimTypeLabel: row.claim_type === 'daily_quest' ? 'Daily reward' : (row.claim_type === 'bounty' ? 'Bounty' : 'Reward'),
      status: row.status,
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
  });

  return { ok: true, pendingCount, pendingTotalsByCurrency, items };
}

async function updateClaimStatus(admin: ReturnType<typeof createAdmin>, adminWallet: string, body: Record<string, unknown>) {
  const claimId = String(body.claimId || '').trim();
  const nextStatus = String(body.status || '').trim().toLowerCase();
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
    const session = await requireAdminSession(req, admin);
    const walletAddress = normalizeAddress(body.walletAddress as string || session.wallet_address);
    const adminWallet = normalizeAddress(Deno.env.get('DFK_REWARD_ADMIN_WALLET') || Deno.env.get('DFK_AVAX_TREASURY_ADDRESS') || '0x971bdacd04ef40141ddb6ba175d4f76665103c81');
    if (!walletAddress || walletAddress !== normalizeAddress(session.wallet_address)) return json({ error: 'Wallet mismatch.' }, 401);
    if (walletAddress !== adminWallet) return json({ error: 'Unauthorized.' }, 403);

    const action = String(body.action || 'list').trim().toLowerCase();
    if (action === 'update_status') {
      return json(await updateClaimStatus(admin, walletAddress, body as Record<string, unknown>));
    }
    if (action === 'whitelist_upsert') {
      return json(await upsertWhitelist(admin, body as Record<string, unknown>));
    }
    if (action === 'whitelist_list') {
      return json(await listWhitelist(admin));
    }

    const limit = Math.max(1, Math.min(100, Number(body.limit || 25) || 25));
    return json(await listClaims(admin, limit));
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ error: error instanceof Error ? error.message : 'Failed to load reward claims.' }, 500);
  }
});
