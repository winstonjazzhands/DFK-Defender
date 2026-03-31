import { createClient } from 'jsr:@supabase/supabase-js@2';
import { Contract, JsonRpcProvider } from 'npm:ethers@6';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const DFK_CHAIN_RPC_URL = Deno.env.get('DFK_CHAIN_RPC_URL') || 'https://subnets.avax.network/defi-kingdoms/dfk-chain/rpc';
const DFK_PROFILES_ADDRESS = '0xC4cD8C09D1A90b21Be417be91A81603B03993E81';
const PROFILES_ABI = [
  'function addressToProfile(address) view returns (address owner, string name, uint64 created, uint256 nftId, uint256 collectionId, string picUri)',
  'function getProfile(address) view returns ((address owner, string name, uint64 created, uint256 nftId, uint256 collectionId, string picUri))',
  'function getProfileByAddress(address) view returns (uint256 _id, address _owner, string _name, uint64 _created, uint8 _picId, uint256 _heroId, uint256 _points)',
];

function normalizeAddress(address: string | null | undefined) {
  return String(address || '').trim().toLowerCase();
}

function cleanName(value: unknown) {
  const name = typeof value === 'string' ? value.trim() : '';
  return name || null;
}

async function resolveChainDisplayName(address: string) {
  const provider = new JsonRpcProvider(DFK_CHAIN_RPC_URL, 53935, { staticNetwork: true });
  const contract = new Contract(DFK_PROFILES_ADDRESS, PROFILES_ABI, provider);
  const normalized = normalizeAddress(address);

  const attempts = [
    async () => {
      const result = await contract.addressToProfile(normalized);
      const owner = normalizeAddress(result?.owner);
      const name = cleanName(result?.name);
      return owner === normalized && name ? name : null;
    },
    async () => {
      const result = await contract.getProfile(normalized);
      const owner = normalizeAddress(result?.owner);
      const name = cleanName(result?.name);
      return owner === normalized && name ? name : null;
    },
    async () => {
      const result = await contract.getProfileByAddress(normalized);
      const owner = normalizeAddress(result?._owner);
      const name = cleanName(result?._name);
      return owner === normalized && name ? name : null;
    },
  ];

  for (const attempt of attempts) {
    try {
      const name = await attempt();
      if (name) return name;
    } catch (_error) {
      // continue
    }
  }
  return null;
}


Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200, headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization') || '';
    const fallbackHeader = req.headers.get('x-session-token') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim() || String(fallbackHeader).trim();
    if (!token) return json({ error: 'Session token required.' }, 401);

    const admin = createAdmin();
    const { data: session, error: sessionError } = await admin
      .from('wallet_sessions')
      .select('session_token, wallet_address, expires_at, revoked_at')
      .eq('session_token', token)
      .single();
    if (sessionError || !session) return json({ error: 'Session not found.' }, 401);
    if (session.revoked_at) return json({ error: 'Session revoked.' }, 401);
    if (Date.now() >= new Date(session.expires_at).getTime()) return json({ error: 'Session expired.' }, 401);

    const body = await req.json();
    const walletAddress = normalizeAddress(body.walletAddress as string);
    if (walletAddress !== session.wallet_address) return json({ error: 'Wallet mismatch.' }, 401);
    const clientRunId = String(body.clientRunId || '').trim();
    if (!clientRunId) return json({ error: 'clientRunId is required.' }, 400);

    const requestedDisplayName = typeof body.displayName === 'string' && body.displayName.trim() ? body.displayName.trim().slice(0, 64) : null;
    const waveReached = sanitizeInt(body.waveReached);
    const wavesCleared = sanitizeInt(body.wavesCleared);
    const portalHpLeft = sanitizeInt(body.portalHpLeft);
    const goldOnHand = sanitizeInt(body.goldOnHand);
    const premiumJewels = sanitizeInt(body.premiumJewels);
    const gameVersion = String(body.gameVersion || 'unknown').slice(0, 80);
    const mode = String(body.mode || 'easy').slice(0, 30);
    const result = String(body.result || 'loss').slice(0, 30);
    const heroes = Array.isArray(body.heroes) ? body.heroes : [];
    const stats = body.stats && typeof body.stats === 'object' ? body.stats : {};
    const completedAt = body.completedAt ? new Date(body.completedAt).toISOString() : new Date().toISOString();
    const runStartedAt = body.runStartedAt ? new Date(body.runStartedAt).toISOString() : null;

    const { data: existingPlayer } = await admin
      .from('players')
      .select('display_name, vanity_name, best_wave, total_runs, total_waves_cleared')
      .eq('wallet_address', walletAddress)
      .maybeSingle();

    const chainDisplayName = requestedDisplayName ? null : await resolveChainDisplayName(walletAddress);
    const resolvedDisplayName = cleanName(existingPlayer?.vanity_name) || cleanName(existingPlayer?.display_name) || requestedDisplayName || chainDisplayName || null;

    const { error: runError } = await admin.from('runs').insert({
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
    if (runError) {
      if (String(runError.message || '').toLowerCase().includes('duplicate key')) {
        return json({ ok: true, duplicate: true }, 200);
      }
      throw runError;
    }

    const { error: playerError } = await admin.from('players').upsert({
      wallet_address: walletAddress,
      display_name: resolvedDisplayName,
      best_wave: Math.max(waveReached, Number(existingPlayer?.best_wave || 0)),
      total_runs: Number(existingPlayer?.total_runs || 0) + 1,
      total_waves_cleared: Number(existingPlayer?.total_waves_cleared || 0) + wavesCleared,
      last_run_at: completedAt,
    }, { onConflict: 'wallet_address' });
    if (playerError) throw playerError;

    await admin.from('wallet_sessions').update({ last_seen_at: new Date().toISOString() }).eq('session_token', token);

    return json({ ok: true }, 200);
  } catch (error) {
    return json({ error: error.message || 'Run submission failed.' }, 500);
  }
});

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
