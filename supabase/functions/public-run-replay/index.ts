
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-token, cache-control',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200, headers: corsHeaders });
  if (req.method !== 'GET') return json({ error: 'Method not allowed.' }, 405);
  try {
    const url = new URL(req.url);
    const shareId = String(url.searchParams.get('shareId') || '').trim().toLowerCase();
    if (!shareId) return json({ error: 'shareId is required.' }, 400);
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );
    const { data, error } = await supabase
      .from('runs')
      .select('replay_json, replay_share_id, game_version, completed_at, display_name_snapshot, wave_reached, wallet_address')
      .eq('replay_share_id', shareId)
      .maybeSingle();
    if (error) throw error;
    if (!data || !data.replay_json) return json({ error: 'Replay not found.' }, 404);
    const replay = typeof data.replay_json === 'object' && data.replay_json ? data.replay_json as Record<string, unknown> : {};
    return json({
      ok: true,
      replay: {
        ...replay,
        shareId: data.replay_share_id,
        gameVersion: replay.gameVersion || data.game_version || 'unknown',
        completedAt: replay.completedAt || data.completed_at,
        displayName: replay.displayName || data.display_name_snapshot || data.wallet_address,
        bestWave: replay.bestWave || data.wave_reached || 0,
      },
    }, 200);
  } catch (error) {
    console.error('public-run-replay failed', error);
    return json({ error: error instanceof Error ? error.message : 'Unknown error.' }, 500);
  }
});
