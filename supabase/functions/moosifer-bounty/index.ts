import { createClient } from 'jsr:@supabase/supabase-js@2';
import { loadValidWalletSession, normalizeAddress } from '../_shared/wallet-session.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-token',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function createAdmin() {
  const url = Deno.env.get('SUPABASE_URL') || '';
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!url || !key) throw new Error('Supabase service role is not configured.');
  return createClient(url, key, { auth: { persistSession: false } });
}

function adminWallets() {
  const raw = [
    Deno.env.get('DFK_REWARD_ADMIN_WALLET') || '',
    Deno.env.get('DFK_AVAX_TREASURY_ADDRESS') || '',
    Deno.env.get('DFK_PRIVATE_ADMIN_WALLETS') || '',
  ].join(',');
  return raw.split(',').map((value) => normalizeAddress(value)).filter(Boolean);
}

function isAdminWallet(walletAddress: string) {
  const wallet = normalizeAddress(walletAddress);
  return wallet === '0x971bdacd04ef40141ddb6ba175d4f76665103c81';
}

async function ensurePlayer(admin: ReturnType<typeof createAdmin>, walletAddress: string) {
  const wallet = normalizeAddress(walletAddress);
  if (!wallet) return;
  await admin
    .from('players')
    .upsert({ wallet_address: wallet }, { onConflict: 'wallet_address', ignoreDuplicates: true });
}

async function ensureState(admin: ReturnType<typeof createAdmin>) {
  await admin
    .from('moosifer_bounty_state')
    .upsert({ id: true, reward_enabled: false, reward_amount: 500, reward_currency: 'JEWEL' }, { onConflict: 'id', ignoreDuplicates: true });
}

async function loadStatus(admin: ReturnType<typeof createAdmin>, walletAddress = '') {
  await ensureState(admin);
  const { data: stateRow, error: stateError } = await admin
    .from('moosifer_bounty_state')
    .select('reward_enabled, reward_amount, reward_currency, claimed_by_wallet, claimed_run_id, claimed_at')
    .eq('id', true)
    .maybeSingle();
  if (stateError) throw stateError;

  const { count, error: countError } = await admin
    .from('moosifer_defeats')
    .select('id', { count: 'exact', head: true });
  if (countError) throw countError;

  const rewardEnabled = !!stateRow?.reward_enabled;
  const claimed = !!stateRow?.claimed_at || !!stateRow?.claimed_by_wallet;
  const wallet = normalizeAddress(walletAddress);
  let playerDefeatedMoosifer = false;
  if (wallet) {
    const { data: defeatRow, error: defeatError } = await admin
      .from('moosifer_defeats')
      .select('id')
      .eq('wallet_address', wallet)
      .limit(1)
      .maybeSingle();
    if (defeatError) throw defeatError;
    playerDefeatedMoosifer = !!defeatRow;
  }

  return {
    ok: true,
    defeatedCount: Number(count || 0) || 0,
    rewardEnabled,
    rewardAmount: Number(stateRow?.reward_amount || 500) || 500,
    rewardCurrency: String(stateRow?.reward_currency || 'JEWEL'),
    claimed,
    claimedAt: stateRow?.claimed_at || null,
    alreadyClaimedByAnotherPlayer: claimed && (!wallet || normalizeAddress(String(stateRow?.claimed_by_wallet || '')) !== wallet),
    playerDefeatedMoosifer,
    claimAvailable: rewardEnabled && !claimed && playerDefeatedMoosifer,
  };
}

async function readBody(req: Request) {
  if (req.method === 'GET') return {};
  return await req.json().catch(() => ({}));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200, headers: corsHeaders });
  try {
    const admin = createAdmin();
    const body = await readBody(req) as Record<string, unknown>;
    const action = String(body.action || (req.method === 'GET' ? 'status' : '') || '').trim().toLowerCase();
    const requestedWallet = normalizeAddress(String(body.walletAddress || body.wallet_address || req.headers.get('x-wallet-address') || ''));

    if (req.method === 'GET' || action === 'status' || !action) {
      return json(await loadStatus(admin, requestedWallet));
    }

    if (action === 'defeated') {
      const runId = String(body.runId || body.clientRunId || '').trim();
      const waveReached = Math.max(0, Math.floor(Number(body.waveReached || 50) || 50));
      const sessionResult = await loadValidWalletSession(admin, req, corsHeaders, { validateContext: true });
      let walletAddress = requestedWallet;
      if (!sessionResult.response && sessionResult.session?.wallet_address) {
        walletAddress = normalizeAddress(sessionResult.session.wallet_address);
      }
      if (walletAddress) await ensurePlayer(admin, walletAddress);
      if (runId) {
        await admin
          .from('moosifer_defeats')
          .upsert({ run_id: runId, wallet_address: walletAddress || null, wave_reached: waveReached, source: 'client' }, { onConflict: 'run_id', ignoreDuplicates: true });
      } else {
        await admin
          .from('moosifer_defeats')
          .insert({ wallet_address: walletAddress || null, wave_reached: waveReached, source: 'client' });
      }
      return json(await loadStatus(admin, walletAddress));
    }

    if (action === 'admin_update') {
      const sessionResult = await loadValidWalletSession(admin, req, corsHeaders, { validateContext: true });
      if (sessionResult.response) return sessionResult.response;
      const sessionWallet = normalizeAddress(sessionResult.session?.wallet_address || '');
      if (!isAdminWallet(sessionWallet)) return json({ error: 'Admin wallet required.' }, 403);
      await ensureState(admin);
      const { error } = await admin
        .from('moosifer_bounty_state')
        .update({ reward_enabled: !!body.rewardEnabled })
        .eq('id', true);
      if (error) throw error;
      return json(await loadStatus(admin, requestedWallet || sessionWallet));
    }

    if (action === 'claim') {
      const sessionResult = await loadValidWalletSession(admin, req, corsHeaders, { validateContext: true });
      if (sessionResult.response) return sessionResult.response;
      const walletAddress = normalizeAddress(sessionResult.session?.wallet_address || '');
      if (!walletAddress || (requestedWallet && requestedWallet !== walletAddress)) return json({ error: 'Wallet mismatch.' }, 401);
      const runId = String(body.runId || body.clientRunId || '').trim();
      await ensurePlayer(admin, walletAddress);

      let defeatQuery = admin
        .from('moosifer_defeats')
        .select('id')
        .eq('wallet_address', walletAddress)
        .limit(1);
      if (runId) defeatQuery = defeatQuery.or(`run_id.eq.${runId},wallet_address.eq.${walletAddress}`);
      const { data: defeatRow, error: defeatError } = await defeatQuery.maybeSingle();
      if (defeatError) throw defeatError;
      if (!defeatRow) return json({ error: 'Moosifer defeat record required before claiming.' }, 403);

      const { data: claimedState, error: claimError } = await admin
        .from('moosifer_bounty_state')
        .update({ claimed_by_wallet: walletAddress, claimed_run_id: runId || null, claimed_at: new Date().toISOString() })
        .eq('id', true)
        .eq('reward_enabled', true)
        .is('claimed_at', null)
        .select('reward_amount, reward_currency, claimed_at')
        .maybeSingle();
      if (claimError) throw claimError;
      if (!claimedState) return json({ ...(await loadStatus(admin, walletAddress)), message: 'Already claimed by another player.' }, 409);

      const amount = Number(claimedState.reward_amount || 500) || 500;
      const currency = String(claimedState.reward_currency || 'JEWEL').toUpperCase();
      const requestKey = 'moosifer:first-defeat';
      await admin
        .from('reward_claim_requests')
        .upsert({
          request_key: requestKey,
          wallet_address: walletAddress,
          claim_type: 'moosifer_first_defeat',
          status: 'pending',
          amount_text: `${amount} ${currency}`,
          amount_value: amount,
          reward_currency: currency,
          reason_text: 'First player to defeat Moosifer.',
          source_ref: `moosifer:first-defeat${runId ? `:${runId}` : ''}`,
          claim_day: new Date().toISOString().slice(0, 10),
        }, { onConflict: 'request_key', ignoreDuplicates: true });
      return json({ ...(await loadStatus(admin, walletAddress)), message: `${amount} ${currency} claim recorded.` });
    }

    return json({ error: 'Unsupported Moosifer bounty action.' }, 400);
  } catch (error) {
    console.error('moosifer-bounty failure:', error);
    return json({ error: String((error as { message?: unknown })?.message || error || 'Moosifer bounty failed.') }, 500);
  }
});
