import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200, headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization') || '';
    const fallbackHeader = req.headers.get('x-session-token') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim() || String(fallbackHeader).trim();
    if (!token) return json({ error: 'Session token required.' }, 401);

    const body = await req.json().catch(() => ({}));
    const walletAddress = String(body.walletAddress || '').trim().toLowerCase();
    if (!/^0x[a-f0-9]{40}$/.test(walletAddress)) return json({ error: 'Valid wallet address required.' }, 400);

    const admin = createAdmin();
    const { data: session, error: sessionError } = await admin
      .from('wallet_sessions')
      .select('session_token, wallet_address, expires_at, revoked_at')
      .eq('session_token', token)
      .single();
    if (sessionError || !session) return json({ error: 'Session not found.' }, 401);
    if (session.wallet_address !== walletAddress) return json({ error: 'Wallet mismatch.' }, 401);
    if (session.revoked_at) return json({ ok: true, alreadyRevoked: true }, 200);

    const revokedAt = new Date().toISOString();
    const { error: revokeError } = await admin
      .from('wallet_sessions')
      .update({ revoked_at: revokedAt, last_seen_at: revokedAt })
      .eq('session_token', token)
      .eq('wallet_address', walletAddress)
      .is('revoked_at', null);
    if (revokeError) throw revokeError;

    return json({ ok: true, revokedAt }, 200);
  } catch (error) {
    return json({ error: error.message || 'Session revoke failed.' }, 500);
  }
});

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
