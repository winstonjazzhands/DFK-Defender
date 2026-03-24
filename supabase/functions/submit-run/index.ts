import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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
    const walletAddress = String(body.walletAddress || '').trim().toLowerCase();
    if (walletAddress !== session.wallet_address) return json({ error: 'Wallet mismatch.' }, 401);
    const clientRunId = String(body.clientRunId || '').trim();
    if (!clientRunId) return json({ error: 'clientRunId is required.' }, 400);

    const displayName = typeof body.displayName === 'string' && body.displayName.trim() ? body.displayName.trim().slice(0, 64) : null;
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

    const { error: runError } = await admin.from('runs').insert({
      wallet_address: walletAddress,
      client_run_id: clientRunId,
      display_name_snapshot: displayName,
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

    const { data: existingPlayer } = await admin
      .from('players')
      .select('best_wave, total_runs, total_waves_cleared')
      .eq('wallet_address', walletAddress)
      .single();

    const { error: playerError } = await admin.from('players').upsert({
      wallet_address: walletAddress,
      display_name: displayName,
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
