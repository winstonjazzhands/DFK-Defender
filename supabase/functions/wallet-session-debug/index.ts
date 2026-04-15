import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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

async function currentUserAgentHash(req: Request) {
  const ua = String(req.headers.get('user-agent') || '').trim();
  if (!ua) return '';
  return await sha256Hex(ua);
}

function maskAddress(address: string | null | undefined) {
  const value = normalizeAddress(address);
  return value ? `${value.slice(0, 6)}…${value.slice(-4)}` : null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200, headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization') || '';
    const fallbackHeader = req.headers.get('x-session-token') || '';
    const bearerToken = authHeader.replace(/^Bearer\s+/i, '').trim();
    const token = bearerToken || String(fallbackHeader).trim();
    const tokenSource = bearerToken ? 'authorization' : (fallbackHeader ? 'x-session-token' : 'none');
    const body = await req.json().catch(() => ({}));
    const requestedWallet = normalizeAddress(body.walletAddress || '');
    const admin = createAdmin();
    const actualOrigin = requestOrigin(req);
    const actualUserAgentHash = await currentUserAgentHash(req);

    if (!token) {
      return json({
        ok: false,
        code: 'missing_session_token',
        auth: {
          tokenPresent: false,
          tokenSource,
          requestedWallet: maskAddress(requestedWallet),
        },
        checks: {
          sessionFound: false,
          revoked: false,
          expired: false,
          originBound: false,
          originMatches: false,
          userAgentBound: false,
          userAgentMatches: false,
          walletMatchesRequest: !requestedWallet,
        },
      }, 200);
    }

    const { data: session, error } = await admin
      .from('wallet_sessions')
      .select('wallet_address, expires_at, revoked_at, session_origin, user_agent_hash, last_seen_at')
      .eq('session_token', token)
      .maybeSingle();

    if (error) {
      return json({ ok: false, code: 'session_lookup_error', error: error.message || 'Session lookup failed.' }, 200);
    }

    if (!session) {
      return json({
        ok: false,
        code: 'session_not_found',
        auth: {
          tokenPresent: true,
          tokenSource,
          requestedWallet: maskAddress(requestedWallet),
        },
        checks: {
          sessionFound: false,
          revoked: false,
          expired: false,
          originBound: false,
          originMatches: false,
          userAgentBound: false,
          userAgentMatches: false,
          walletMatchesRequest: !requestedWallet,
        },
      }, 200);
    }

    const expectedOrigin = normalizeOrigin(String(session.session_origin || ''));
    const expectedUserAgentHash = String(session.user_agent_hash || '').trim();
    const expired = Date.now() >= new Date(String(session.expires_at || '')).getTime();
    const revoked = !!session.revoked_at;
    const walletMatchesRequest = !requestedWallet || normalizeAddress(session.wallet_address) === requestedWallet;

    return json({
      ok: !expired && !revoked,
      code: revoked ? 'session_revoked' : (expired ? 'session_expired' : 'session_valid'),
      auth: {
        tokenPresent: true,
        tokenSource,
        requestedWallet: maskAddress(requestedWallet),
      },
      session: {
        walletAddress: maskAddress(session.wallet_address),
        expiresAt: session.expires_at,
        revokedAt: session.revoked_at,
        lastSeenAt: session.last_seen_at || null,
      },
      checks: {
        sessionFound: true,
        revoked,
        expired,
        originBound: !!expectedOrigin,
        originMatches: !expectedOrigin || actualOrigin === expectedOrigin,
        userAgentBound: !!expectedUserAgentHash,
        userAgentMatches: !expectedUserAgentHash || actualUserAgentHash === expectedUserAgentHash,
        walletMatchesRequest,
      },
      context: {
        requestOrigin: actualOrigin || null,
      },
    }, 200);
  } catch (error) {
    return json({ ok: false, code: 'debug_failed', error: error instanceof Error ? error.message : 'Session debug failed.' }, 500);
  }
});
