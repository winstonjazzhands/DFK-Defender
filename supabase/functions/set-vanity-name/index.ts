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

function normalizeError(error: unknown) {
  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    return {
      message: String(record.message || ''),
      code: String(record.code || ''),
      details: String(record.details || ''),
      hint: String(record.hint || ''),
    };
  }
  return { message: String(error || '') };
}

function isMissingColumnError(error: unknown, columnName?: string) {
  const info = normalizeError(error);
  const haystack = `${info.message} ${info.details} ${info.hint}`.toLowerCase();
  if (String(info.code || '') === 'PGRST204') {
    if (!columnName) return true;
    return haystack.includes(columnName.toLowerCase());
  }
  return haystack.includes('column') && (!columnName || haystack.includes(columnName.toLowerCase()));
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
  if (value == null) return null;
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return null;
  if (!/^[a-zA-Z0-9 _\-]{2,32}$/.test(raw)) {
    throw new Error('Vanity name must be 2-32 letters, numbers, spaces, - or _.');
  }
  return raw;
}

function extractVanityName(body: Record<string, unknown>) {
  if (!body || typeof body !== 'object') return null;
  const candidate = body.vanityName ?? body.vanity_name ?? body.name ?? null;
  return cleanVanityName(candidate);
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

async function ensurePlayerRow(admin: ReturnType<typeof createAdmin>, walletAddress: string) {
  const variants = [
    { wallet_address: walletAddress },
    { wallet_address: walletAddress, display_name: null },
  ];

  let lastError: unknown = null;
  for (const payload of variants) {
    const { error } = await admin.from('players').upsert(payload, { onConflict: 'wallet_address' });
    if (!error) return;
    lastError = error;
  }

  throw lastError || new Error('Unable to ensure player row exists.');
}

async function assertVanityColumn(admin: ReturnType<typeof createAdmin>) {
  const { error } = await admin.from('players').select('vanity_name').limit(1);
  if (!error) return;
  if (isMissingColumnError(error, 'vanity_name')) {
    throw new Error('Database missing players.vanity_name column. Run: npx supabase db push');
  }
  throw error;
}

async function ensureVanityNameAvailable(admin: ReturnType<typeof createAdmin>, vanityName: string, walletAddress: string) {
  const { data, error } = await admin
    .from('players')
    .select('wallet_address, vanity_name')
    .ilike('vanity_name', vanityName)
    .neq('wallet_address', walletAddress)
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isMissingColumnError(error, 'vanity_name')) {
      throw new Error('Database missing players.vanity_name column. Run: npx supabase db push');
    }
    throw error;
  }

  if (data) {
    return false;
  }

  return true;
}

async function saveVanityName(admin: ReturnType<typeof createAdmin>, walletAddress: string, vanityName: string | null) {
  const payloads = [
    { vanity_name: vanityName, updated_at: new Date().toISOString() },
    { vanity_name: vanityName },
  ];

  let lastError: unknown = null;
  for (const payload of payloads) {
    const { data, error } = await admin
      .from('players')
      .update(payload)
      .eq('wallet_address', walletAddress)
      .select('wallet_address, vanity_name')
      .maybeSingle();

    if (!error) {
      if (!data) throw new Error('Vanity name save did not persist to the expected player row.');
      return data;
    }

    if (isMissingColumnError(error, 'updated_at')) {
      lastError = error;
      continue;
    }

    if (isMissingColumnError(error, 'vanity_name')) {
      throw new Error('Database missing players.vanity_name column. Run: npx supabase db push');
    }

    lastError = error;
    break;
  }

  throw lastError || new Error('Failed to save vanity name.');
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
    const walletAddress = normalizeAddress(session.wallet_address);
    const vanityName = extractVanityName(body as Record<string, unknown>);

    await ensurePlayerRow(admin, walletAddress);
    await assertVanityColumn(admin);

    if (vanityName) {
      const available = await ensureVanityNameAvailable(admin, vanityName, walletAddress);
      if (!available) {
        return json({ error: 'That vanity name is already taken.' }, 409);
      }
    }

    const savedPlayer = await saveVanityName(admin, walletAddress, vanityName);
    if (normalizeAddress(savedPlayer.wallet_address) !== walletAddress) {
      throw new Error('Vanity name save did not persist to the expected player row.');
    }

    return json({ ok: true, vanityName: savedPlayer.vanity_name || null, walletAddress });
  } catch (error) {
    const info = normalizeError(error);
    const message = info.message || 'Failed to save vanity name.';
    console.error('[set-vanity-name] failed:', info);
    return json({ error: message }, 500);
  }
});
