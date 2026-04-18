import { createClient } from 'jsr:@supabase/supabase-js@2';
import { loadValidWalletSession, normalizeAddress } from '../_shared/wallet-session.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const DEFAULT_TEST_RESET_WALLET = '0x971bdacd04ef40141ddb6ba175d4f76665103c81';

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

function getAllowedResetWallets() {
  const configured = String(Deno.env.get('BOUNTY_TEST_RESET_WALLET') || '').trim();
  const raw = configured || DEFAULT_TEST_RESET_WALLET;
  return raw.split(',').map((entry) => normalizeAddress(entry)).filter(Boolean);
}

function weekKeyFromDate(input = new Date()) {
  const date = new Date(input.getTime());
  const utcDay = date.getUTCDay();
  const diffToMonday = (utcDay + 6) % 7;
  date.setUTCDate(date.getUTCDate() - diffToMonday);
  date.setUTCHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
}

function nextWeekIso(weekKey: string) {
  const date = new Date(`${weekKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 7);
  return date.toISOString();
}

function isMissingWeeklyClaimsTableError(error: unknown) {
  const code = String((error as { code?: unknown } | null)?.code || '');
  const message = String((error as { message?: unknown } | null)?.message || '').toLowerCase();
  return code === 'PGRST205' || (message.includes('weekly_bounty_claims') && message.includes('could not find the table'));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200, headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  try {
    const admin = createAdmin();
    const loaded = await loadValidWalletSession(admin, req, corsHeaders, { validateContext: true });
    if (loaded.response) return loaded.response;

    const sessionWallet = normalizeAddress(loaded.session?.wallet_address || '');
    if (!sessionWallet) return json({ error: 'Wallet session is missing a wallet address.' }, 401);

    const allowedWallets = getAllowedResetWallets();
    if (!allowedWallets.includes(sessionWallet)) {
      return json({ error: 'This reset control is not enabled for this wallet.' }, 403);
    }

    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch (_error) {
      body = {};
    }

    const requestedWallet = normalizeAddress(String(body.walletAddress || body.wallet_address || sessionWallet || ''));
    const targetWallet = requestedWallet || sessionWallet;
    if (!targetWallet) {
      return json({ error: 'Missing wallet address to reset.' }, 400);
    }
    const weekKey = weekKeyFromDate(new Date());
    const weekStartIso = `${weekKey}T00:00:00.000Z`;
    const nextWeek = nextWeekIso(weekKey);

    const runIds = new Set<string>();
    const runQueryVariants = [
      admin.from('runs').select('id').eq('wallet_address', targetWallet).gte('created_at', weekStartIso),
      admin.from('runs').select('id').eq('wallet_address', targetWallet).gte('completed_at', weekStartIso),
      admin.from('runs').select('id').eq('wallet_address', targetWallet).gte('run_started_at', weekStartIso),
    ];
    for (const query of runQueryVariants) {
      const { data, error } = await query;
      if (error) throw error;
      for (const row of data || []) {
        if (row && row.id) runIds.add(String(row.id));
      }
    }

    let deletedRuns = 0;
    if (runIds.size > 0) {
      const runIdList = Array.from(runIds);
      const { error: deleteRunsError, count } = await admin
        .from('runs')
        .delete({ count: 'exact' })
        .in('id', runIdList);
      if (deleteRunsError) throw deleteRunsError;
      deletedRuns = Number(count || runIdList.length || 0);
    }

    const { error: deleteClaimsError, count: deletedClaimRequestsCount } = await admin
      .from('reward_claim_requests')
      .delete({ count: 'exact' })
      .eq('wallet_address', targetWallet)
      .eq('claim_type', 'bounty')
      .gte('claim_day', weekKey)
      .lt('claim_day', nextWeek.slice(0, 10));
    if (deleteClaimsError) throw deleteClaimsError;

    let deletedWeeklyClaimsCount = 0;
    try {
      const { error: deleteWeeklyClaimsError, count } = await admin
        .from('weekly_bounty_claims')
        .delete({ count: 'exact' })
        .eq('wallet_address', targetWallet)
        .eq('week_key', weekKey);
      if (deleteWeeklyClaimsError) {
        if (!isMissingWeeklyClaimsTableError(deleteWeeklyClaimsError)) throw deleteWeeklyClaimsError;
      } else {
        deletedWeeklyClaimsCount = Number(count || 0);
      }
    } catch (deleteWeeklyClaimsError) {
      if (!isMissingWeeklyClaimsTableError(deleteWeeklyClaimsError)) throw deleteWeeklyClaimsError;
    }

    return json({
      ok: true,
      walletAddress: targetWallet,
      weekKey,
      weekStartUtc: weekStartIso,
      deletedRuns,
      deletedClaimRequests: Number(deletedClaimRequestsCount || 0),
      deletedWeeklyClaims: Number(deletedWeeklyClaimsCount || 0),
      message: `Weekly bounty progress reset for ${targetWallet}. Removed ${deletedRuns} run${deletedRuns === 1 ? '' : 's'}, ${Number(deletedClaimRequestsCount || 0)} claim request${Number(deletedClaimRequestsCount || 0) === 1 ? '' : 's'}, and ${Number(deletedWeeklyClaimsCount || 0)} weekly claim slot${Number(deletedWeeklyClaimsCount || 0) === 1 ? '' : 's'}.`,
    });
  } catch (error) {
    console.error('bounty-reset-progress failed', error);
    return json({ error: error instanceof Error ? error.message : 'Failed to reset weekly bounty progress.' }, 500);
  }
});
