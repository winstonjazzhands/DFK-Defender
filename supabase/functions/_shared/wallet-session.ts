import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

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

function json(payload: unknown, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

function isUuidLike(value: unknown) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '').trim());
}

export function normalizeAddress(address: string | null | undefined) {
  return String(address || '').trim().toLowerCase();
}

export function extractSessionToken(req: Request) {
  const authHeader = String(req.headers.get('authorization') || req.headers.get('Authorization') || '').trim();
  const xSessionHeader = String(req.headers.get('x-session-token') || '').trim();
  const authToken = authHeader.replace(/^Bearer\s+/i, '').trim();

  const isAnonLike = (value: string) => /^sb_(publishable|anon)_/i.test(String(value || '').trim());
  const isJwtLike = (value: string) => {
    const parts = String(value || '').trim().split('.');
    return parts.length === 3 && parts.every(Boolean);
  };
  const isValidWalletSessionToken = (value: string) => {
    const token = String(value || '').trim();
    return !!token && !isAnonLike(token) && !isJwtLike(token) && isUuidLike(token);
  };

  // Wallet session auth must come from x-session-token first. Authorization can be the
  // Supabase anon/API JWT in some environments, and that must never be treated as a run session.
  if (isValidWalletSessionToken(xSessionHeader)) return xSessionHeader;
  if (isValidWalletSessionToken(authToken)) return authToken;

  // Never return an invalid/JWT token. Returning it causes Postgres UUID casts to throw
  // session_lookup_failed instead of producing a clean refresh/missing-session response.
  return '';
}

export async function validateSessionContext(req: Request, session: Record<string, unknown>, corsHeaders: Record<string, string>) {
  const expectedOrigin = normalizeOrigin(String(session.session_origin || ''));
  if (expectedOrigin) {
    const actualOrigin = requestOrigin(req);
    if (!actualOrigin || actualOrigin !== expectedOrigin) {
      return json({ error: 'Session origin mismatch.', code: 'session_origin_mismatch' }, 401, corsHeaders);
    }
  }

  const expectedUserAgentHash = String(session.user_agent_hash || '').trim();
  if (expectedUserAgentHash) {
    const actualUserAgent = String(req.headers.get('user-agent') || '').trim();
    if (!actualUserAgent) {
      return json({ error: 'User agent missing for session.', code: 'missing_user_agent' }, 401, corsHeaders);
    }
    const actualHash = await sha256Hex(actualUserAgent);
    if (actualHash !== expectedUserAgentHash) {
      return json({ error: 'Session device mismatch.', code: 'session_device_mismatch' }, 401, corsHeaders);
    }
  }

  return null;
}

export async function loadValidWalletSession(
  admin: SupabaseClient,
  req: Request,
  corsHeaders: Record<string, string>,
  options: { validateContext?: boolean } = {},
) {
  const token = extractSessionToken(req);
  if (!token || /^sb_(publishable|anon)_/i.test(token)) {
    return { response: json({ error: 'Valid session token required.', code: 'missing_session_token' }, 401, corsHeaders) };
  }

  if (!isUuidLike(token)) {
    const tokenText = String(token || '').trim();
    return {
      response: json({
        error: 'Run tracking session refresh required.',
        code: 'session_refresh_required',
        originalCode: 'invalid_session_token_format',
        tokenLooksJwt: tokenText.split('.').length === 3,
        tokenLength: tokenText.length,
      }, 401, corsHeaders),
    };
  }

  const selectVariants = [
    'session_token, wallet_address, expires_at, revoked_at, session_origin, user_agent_hash',
    'session_token, wallet_address, expires_at, revoked_at, session_origin',
    'session_token, wallet_address, expires_at, revoked_at',
    'session_token, wallet_address, expires_at',
    'session_token, wallet_address',
  ];

  let lastError: unknown = null;
  for (const columns of selectVariants) {
    const { data: session, error } = await admin
      .from('wallet_sessions')
      .select(columns)
      .eq('session_token', token)
      .maybeSingle();

    if (error) {
      const message = String((error as { message?: unknown } | null)?.message || '').toLowerCase();
      lastError = error;
      if (message.includes('column') && message.includes('does not exist')) continue;
      if (message.includes('invalid input syntax for type uuid')) {
        return {
          response: json({
            error: 'Run tracking session refresh required.',
            code: 'session_refresh_required',
            originalCode: 'session_lookup_failed',
            details: String((error as { message?: unknown } | null)?.message || ''),
          }, 401, corsHeaders),
        };
      }
      return {
        response: json({ error: 'Session lookup failed.', code: 'session_lookup_failed', details: String((error as { message?: unknown } | null)?.message || '') }, 500, corsHeaders),
      };
    }

    if (!session) {
      return { response: json({ error: 'Session not found.', code: 'session_not_found' }, 401, corsHeaders) };
    }

    const row = session as Record<string, unknown>;
    if (row.revoked_at) {
      return { response: json({ error: 'Session revoked.', code: 'session_revoked' }, 401, corsHeaders) };
    }

    if (options.validateContext) {
      const contextError = await validateSessionContext(req, row, corsHeaders);
      if (contextError) return { response: contextError };
    }

    const expiresAt = String(row.expires_at || '').trim();
    if (expiresAt && Date.now() >= new Date(expiresAt).getTime()) {
      return { response: json({ error: 'Session expired.', code: 'session_expired' }, 401, corsHeaders) };
    }

    return {
      token,
      session: {
        session_token: String(row.session_token || token),
        wallet_address: normalizeAddress(String(row.wallet_address || '')),
        expires_at: expiresAt || null,
        revoked_at: row.revoked_at || null,
        session_origin: String(row.session_origin || ''),
        user_agent_hash: String(row.user_agent_hash || ''),
      },
    };
  }

  return { response: json({ error: 'Session lookup failed.', code: 'session_lookup_failed', details: String((lastError as { message?: unknown } | null)?.message || '') }, 500, corsHeaders) };
}
