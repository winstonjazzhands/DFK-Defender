import { createClient } from 'jsr:@supabase/supabase-js@2';
import { loadValidWalletSession, normalizeAddress } from '../_shared/wallet-session.ts';

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



function cleanVanityName(value: unknown) {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return null;
  if (!/^[a-zA-Z0-9 _\-]{2,32}$/.test(raw)) {
    throw new Error('Vanity name must be 2-32 letters, numbers, spaces, - or _.');
  }
  return raw;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200, headers: corsHeaders });
  try {
    const admin = createAdmin();
    const sessionResult = await loadValidWalletSession(admin, req, corsHeaders, { validateContext: true });
    if ('response' in sessionResult) return sessionResult.response;
    const session = sessionResult.session;

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
