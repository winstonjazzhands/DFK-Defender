import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200, headers: corsHeaders });
  try {
    const { address } = await req.json();
    const normalized = String(address || '').trim().toLowerCase();
    if (!/^0x[a-f0-9]{40}$/.test(normalized)) {
      return json({ error: 'Valid wallet address required.' }, 400);
    }
    const nonce = crypto.randomUUID().replace(/-/g, '');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 10).toISOString();
    const admin = createAdmin();
    const { error } = await admin.from('wallet_auth_nonces').upsert({
      wallet_address: normalized,
      nonce,
      expires_at: expiresAt,
      used_at: null,
      created_at: new Date().toISOString(),
    });
    if (error) throw error;
    return json({ nonce, expiresAt }, 200);
  } catch (error) {
    return json({ error: error.message || 'Nonce request failed.' }, 500);
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
