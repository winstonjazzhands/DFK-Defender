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


function normalizeOrigin(value: string | null | undefined) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    return new URL(raw).origin.toLowerCase();
  } catch (_error) {
    return '';
  }
}

function requestOrigin(req: Request) {
  return normalizeOrigin(req.headers.get('origin') || req.headers.get('referer') || '');
}

async function sha256Hex(value: string) {
  const data = new TextEncoder().encode(String(value || ''));
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function validateSessionContext(req: Request, session: Record<string, unknown>) {
  const expectedOrigin = normalizeOrigin(String(session.session_origin || ''));
  if (expectedOrigin) {
    const actualOrigin = requestOrigin(req);
    if (!actualOrigin || actualOrigin !== expectedOrigin) {
      return json({ error: 'Session origin mismatch.', code: 'session_origin_mismatch' }, 401);
    }
  }

  const expectedUserAgentHash = String(session.user_agent_hash || '').trim();
  if (expectedUserAgentHash) {
    const actualUserAgent = String(req.headers.get('user-agent') || '').trim();
    if (!actualUserAgent) {
      return json({ error: 'User agent missing for session.', code: 'missing_user_agent' }, 401);
    }
    const actualHash = await sha256Hex(actualUserAgent);
    if (actualHash !== expectedUserAgentHash) {
      return json({ error: 'Session device mismatch.', code: 'session_device_mismatch' }, 401);
    }
  }

  return null;
}

function cleanVanityName(value: unknown) {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return null;
  if (!/^[a-zA-Z0-9 _\-]{2,32}$/.test(raw)) {
    throw new Error('Vanity name must be 2-32 letters, numbers, spaces, - or _.');
  }
  return raw;
}

async function requireSession(admin: ReturnType<typeof createAdmin>, token: string, req: Request) {
  const { data, error } = await admin
    .from('wallet_sessions')
    .select('session_token, wallet_address, expires_at, revoked_at, session_origin, user_agent_hash')
    .eq('session_token', token)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.revoked_at) return { data: null, response: null };
  if (Date.now() >= new Date(data.expires_at).getTime()) return { data: null, response: null };
  const contextError = await validateSessionContext(req, data as Record<string, unknown>);
  if (contextError) return { data: null, response: contextError };
  return { data, response: null };
}


Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200, headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization') || '';
    const sessionHeader = req.headers.get('x-session-token') || '';
    const token = String(sessionHeader).trim() || (auth.startsWith('Bearer ') ? auth.slice(7).trim() : '');
    if (!token) return json({ error: 'Missing authorization header.' }, 401);

    const admin = createAdmin();
    const sessionResult = await requireSession(admin, token, req);
    if (sessionResult.response) return sessionResult.response;
    const session = sessionResult.data;
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
