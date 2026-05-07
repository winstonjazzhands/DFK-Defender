import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const NONCE_TTL_MS = 10 * 60 * 1000;

Deno.serve(async (req) => {
  const requestId = makeRequestId('nonce');
  if (req.method === 'OPTIONS') return json({ ok: true, requestId }, 200);

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed.', code: 'method_not_allowed', requestId }, 405);
  }

  try {
    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch (_error) {
      body = {};
    }

    const normalized = String(body.address || body.walletAddress || '').trim().toLowerCase();
    if (!/^0x[a-f0-9]{40}$/.test(normalized)) {
      return json({ error: 'Valid wallet address required.', code: 'invalid_wallet_address', requestId }, 400);
    }

    const expiresAt = new Date(Date.now() + NONCE_TTL_MS).toISOString();
    const nonce = await createSignedNonce(normalized, expiresAt);
    const message = buildLoginMessage(nonce, normalized);

    // Best-effort DB write for compatibility/observability only. Auth no longer depends on this table.
    try {
      const admin = createAdmin();
      const now = new Date().toISOString();
      const insertAttempts: Array<Record<string, unknown>> = [
        { wallet_address: normalized, nonce, expires_at: expiresAt, used_at: null, created_at: now },
        { wallet_address: normalized, nonce, expires_at: expiresAt, used_at: null },
        { wallet_address: normalized, nonce, expires_at: expiresAt, created_at: now },
        { wallet_address: normalized, nonce, expires_at: expiresAt },
      ];

      let wrote = false;
      for (const payload of insertAttempts) {
        const { error } = await admin
          .from('wallet_auth_nonces')
          .upsert(payload, { onConflict: 'wallet_address' });
        if (!error) {
          wrote = true;
          break;
        }
        if (!isMissingColumnError(error) && !isConflictTargetError(error)) break;
      }

      if (!wrote) {
        for (const payload of insertAttempts) {
          try { await admin.from('wallet_auth_nonces').delete().eq('wallet_address', normalized); } catch (_error) {}
          const { error } = await admin.from('wallet_auth_nonces').insert(payload);
          if (!error) {
            wrote = true;
            break;
          }
          if (!isMissingColumnError(error)) break;
        }
      }

      console.log(JSON.stringify({
        event: wrote ? 'wallet-auth-nonce db_saved' : 'wallet-auth-nonce stateless_only',
        requestId,
        wallet: normalized,
      }));
    } catch (error) {
      console.warn(JSON.stringify({
        event: 'wallet-auth-nonce db_optional_failed',
        requestId,
        wallet: normalized,
        ...normalizeError(error),
      }));
    }

    return json({ nonce, expiresAt, message, requestId, stateless: true }, 200);
  } catch (error) {
    const normalizedError = normalizeError(error);
    console.error(JSON.stringify({
      event: 'wallet-auth-nonce crashed',
      requestId,
      ...normalizedError,
    }));
    return json({
      error: 'Nonce request failed.',
      code: 'nonce_request_failed',
      details: normalizedError.message,
      requestId,
    }, 500);
  }
});

async function createSignedNonce(walletAddress: string, expiresAt: string) {
  const random = crypto.randomUUID().replace(/-/g, '');
  const payload = `${walletAddress}.${Date.parse(expiresAt)}.${random}`;
  const signature = await hmacHex(payload);
  return `v2.${b64url(payload)}.${signature}`;
}

async function hmacHex(payload: string) {
  const secret = Deno.env.get('WALLET_AUTH_NONCE_SECRET')
    || Deno.env.get('RUN_SUBMIT_CHALLENGE_SECRET')
    || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    || '';
  if (!secret) throw new Error('Missing nonce signing secret.');
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function b64url(value: string) {
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function buildLoginMessage(nonce: string, walletAddress: string) {
  return [
    'DFK Defender Run Tracking',
    '',
    'Sign this message to enable secure tracked run submission.',
    `Wallet: ${walletAddress}`,
    `Nonce: ${nonce}`,
  ].join('\n');
}

function createAdmin() {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceRole) throw new Error('Missing Supabase environment configuration.');
  return createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
}

function isMissingColumnError(error: unknown) {
  const message = String((error && typeof error === 'object' && 'message' in error ? (error as { message?: unknown }).message : '') || '').toLowerCase();
  return message.includes('column') && (message.includes('does not exist') || message.includes('not found in schema cache'));
}

function isConflictTargetError(error: unknown) {
  const message = String((error && typeof error === 'object' && 'message' in error ? (error as { message?: unknown }).message : '') || '').toLowerCase();
  return message.includes('there is no unique or exclusion constraint') || message.includes('on conflict');
}

function normalizeError(error: unknown) {
  if (error instanceof Error) return { name: error.name, message: error.message, stack: error.stack };
  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    return {
      name: typeof record.name === 'string' ? record.name : null,
      message: typeof record.message === 'string' ? record.message : safeSerialize(error),
      code: record.code ?? null,
      details: record.details ?? null,
      hint: record.hint ?? null,
      raw: safeSerialize(error),
    };
  }
  return { message: String(error || 'Unknown error'), raw: error ?? null };
}

function safeSerialize(value: unknown) {
  try { return JSON.stringify(value); } catch { return String(value); }
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function makeRequestId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
