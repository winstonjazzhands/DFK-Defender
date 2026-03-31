import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-token, cache-control',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function createAdmin() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Missing Supabase admin env.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function normalizeAddress(address: string | null | undefined) {
  return String(address || '').trim().toLowerCase();
}

function cleanVanityName(value: unknown) {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return null;
  if (!/^[a-zA-Z0-9 _\-]{2,32}$/.test(raw)) {
    throw new Error('Vanity name must be 2-32 letters, numbers, spaces, - or _.');
  }
  return raw;
}

async function requireSession(admin: ReturnType<typeof createAdmin>, token: string) {
  const { data, error } = await admin
    .from('wallet_sessions')
    .select('session_token, wallet_address, expires_at, revoked_at')
    .eq('session_token', token)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.revoked_at) return null;
  if (Date.now() >= new Date(data.expires_at).getTime()) return null;
  return data;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200, headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization') || '';
    const sessionHeader = req.headers.get('x-session-token') || '';
    const token = String(sessionHeader).trim() || (auth.startsWith('Bearer ') ? auth.slice(7).trim() : '');
    if (!token) return json({ error: 'Missing authorization header.' }, 401);

    const admin = createAdmin();
    const session = await requireSession(admin, token);
    if (!session) return json({ error: 'Invalid or expired session.' }, 401);

    const body = await req.json().catch(() => ({}));
    const vanityName = cleanVanityName(body.vanityName);

    if (vanityName) {
      const { data: existing } = await admin
        .from('players')
        .select('wallet_address, vanity_name')
        .ilike('vanity_name', vanityName)
        .maybeSingle();
      if (existing && normalizeAddress(existing.wallet_address) != normalizeAddress(session.wallet_address)) {
        return json({ error: 'That vanity name is already taken.' }, 409);
      }
    }

    const walletAddress = normalizeAddress(session.wallet_address);

    const { data: existingPlayer, error: existingPlayerError } = await admin
      .from('players')
      .select('wallet_address, display_name, best_wave, total_runs, total_waves_cleared, last_run_at')
      .eq('wallet_address', walletAddress)
      .maybeSingle();
    if (existingPlayerError) throw existingPlayerError;

    const { data: savedPlayer, error } = await admin
      .from('players')
      .upsert({
        wallet_address: walletAddress,
        display_name: existingPlayer?.display_name || null,
        vanity_name: vanityName,
        best_wave: Number(existingPlayer?.best_wave || 0),
        total_runs: Number(existingPlayer?.total_runs || 0),
        total_waves_cleared: Number(existingPlayer?.total_waves_cleared || 0),
        last_run_at: existingPlayer?.last_run_at || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'wallet_address' })
      .select('wallet_address, vanity_name')
      .single();
    if (error) throw error;

    if (!savedPlayer || normalizeAddress(savedPlayer.wallet_address) !== walletAddress) {
      throw new Error('Vanity name save did not persist to the expected player row.');
    }

    return json({ ok: true, vanityName: savedPlayer.vanity_name || null, walletAddress });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Failed to save vanity name.' }, 500);
  }
});
