import { createClient } from 'jsr:@supabase/supabase-js@2';
import { Contract, JsonRpcProvider, verifyMessage } from 'npm:ethers@6';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const DFK_CHAIN_RPC_URL = Deno.env.get('DFK_CHAIN_RPC_URL') || 'https://subnets.avax.network/defi-kingdoms/dfk-chain/rpc';
const DFK_PROFILES_ADDRESS = '0xC4cD8C09D1A90b21Be417be91A81603B03993E81';
const PROFILES_ABI = [
  'function getNames(address[] _addresses) view returns (string[])',
    'function addressToProfile(address) view returns (address owner, string name, uint64 created, uint256 nftId, uint256 collectionId, string picUri)',
  'function getProfile(address _profileAddress) view returns ((address owner, string name, uint64 created, uint256 nftId, uint256 collectionId, string picUri))',
  'function getProfileByAddress(address _profileAddress) view returns (uint256 _id, address _owner, string _name, uint64 _created, uint8 _picId, uint256 _heroId, uint256 _points)',
];

function normalizeAddress(address: string | null | undefined) {
  return String(address || '').trim().toLowerCase();
}

function cleanName(value: unknown) {
  const name = typeof value === 'string' ? value.trim() : '';
  return name || null;
}

async function verifySignedNonce(nonce: string, expectedWallet: string) {
  if (!nonce.startsWith('v2.')) return { ok: false, reason: 'not_stateless_nonce' };
  const parts = nonce.split('.');
  if (parts.length !== 3) return { ok: false, reason: 'bad_nonce_parts' };

  const payload = b64urlDecode(parts[1]);
  const signature = parts[2];
  const expectedSignature = await hmacHex(payload);
  if (!timingSafeEqualHex(signature, expectedSignature)) return { ok: false, reason: 'bad_nonce_signature' };

  const [wallet, expiresAtMsText] = payload.split('.');
  if (normalizeAddress(wallet) !== expectedWallet) return { ok: false, reason: 'wallet_mismatch' };
  const expiresAtMs = Number(expiresAtMsText || 0);
  if (!Number.isFinite(expiresAtMs) || Date.now() >= expiresAtMs) return { ok: false, reason: 'nonce_expired' };
  return { ok: true, reason: 'ok' };
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

function b64urlDecode(value: string) {
  const padded = `${value}${'='.repeat((4 - (value.length % 4)) % 4)}`;
  return atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
}

function timingSafeEqualHex(a: string, b: string) {
  const left = String(a || '').toLowerCase();
  const right = String(b || '').toLowerCase();
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return diff === 0;
}

function isMissingColumnError(error: unknown) {
  const message = String((error && typeof error === 'object' && 'message' in error ? (error as { message?: unknown }).message : '') || '').toLowerCase();
  return message.includes('column') && (message.includes('does not exist') || message.includes('not found in schema cache'));
}

function getErrorMessage(error: unknown) {
  if (!error || typeof error !== 'object') return '';
  const source = error as {
    message?: unknown;
    shortMessage?: unknown;
    reason?: unknown;
    data?: { message?: unknown };
    error?: { message?: unknown };
    info?: { error?: { message?: unknown } };
  };
  const message = [
    source.message,
    source.shortMessage,
    source.reason,
    source.data?.message,
    source.error?.message,
    source.info?.error?.message,
  ].find((value) => typeof value === 'string' && value.trim());
  return typeof message === 'string' ? message.trim() : '';
}

function isNoProfileLookupMiss(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();
  return message.includes('no profile found') || message.includes('profile not found');
}

async function resolveChainDisplayName(address: string) {
  const provider = new JsonRpcProvider(DFK_CHAIN_RPC_URL, 53935, { staticNetwork: true });
  const contract = new Contract(DFK_PROFILES_ADDRESS, PROFILES_ABI, provider);
  const normalized = normalizeAddress(address);

  const attempts = [
    async () => {
      const result = await contract.getNames([normalized]);
      const first = Array.isArray(result) ? result[0] : null;
      const name = cleanName(first);
      return name ? name : null;
    },
    async () => {
      const result = await contract.addressToProfile(normalized);
      const owner = normalizeAddress(result?.owner);
      const name = cleanName(result?.name);
      return owner === normalized && name ? name : null;
    },
    async () => {
      const result = await contract.getProfile(normalized);
      const owner = normalizeAddress(result?.owner);
      const name = cleanName(result?.name);
      return owner === normalized && name ? name : null;
    },
    async () => {
      const result = await contract.getProfileByAddress(normalized);
      const owner = normalizeAddress(result?._owner);
      const name = cleanName(result?._name);
      return owner === normalized && name ? name : null;
    },
  ];

  for (const attempt of attempts) {
    try {
      const name = await attempt();
      if (name) return name;
    } catch (error) {
      if (isNoProfileLookupMiss(error)) return null;
      // continue
    }
  }
  return null;
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

function extractMessageOrigin(message: string) {
  const match = String(message || '').match(/^URI:\s*(\S+)$/im);
  return normalizeOrigin(match ? match[1] : '');
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200, headers: corsHeaders });
  try {
    const { address, message, signature, displayName } = await req.json();
    const normalized = normalizeAddress(address);
    if (!/^0x[a-f0-9]{40}$/.test(normalized)) return json({ error: 'Valid wallet address required.' }, 400);
    if (!message || !signature) return json({ error: 'Message and signature are required.' }, 400);
    const recovered = verifyMessage(String(message), String(signature)).toLowerCase();
    if (recovered !== normalized) return json({ error: 'Signature does not match wallet.' }, 401);

    const nonceMatch = String(message).match(/Nonce:\s*([A-Za-z0-9._-]+)/i);
    const nonce = nonceMatch ? nonceMatch[1] : '';
    if (!nonce) return json({ error: 'Nonce missing from signed message.' }, 400);

    const admin = createAdmin();
    const statelessNonceCheck = await verifySignedNonce(nonce, normalized);
    if (!statelessNonceCheck.ok) {
      const { data: nonceRow, error: nonceError } = await admin
        .from('wallet_auth_nonces')
        .select('wallet_address, nonce, expires_at, used_at')
        .eq('wallet_address', normalized)
        .single();
      if (nonceError || !nonceRow) return json({ error: 'Nonce not found.', code: 'nonce_not_found', statelessReason: statelessNonceCheck.reason }, 404);
      if (nonceRow.used_at) return json({ error: 'Nonce already used.', code: 'nonce_already_used' }, 409);
      if (nonceRow.nonce !== nonce) return json({ error: 'Nonce mismatch.', code: 'nonce_mismatch' }, 401);
      if (Date.now() >= new Date(nonceRow.expires_at).getTime()) return json({ error: 'Nonce expired.', code: 'nonce_expired' }, 401);
    }

    const signedOrigin = extractMessageOrigin(String(message));
    const headerOrigin = requestOrigin(req);
    if (signedOrigin && headerOrigin && signedOrigin !== headerOrigin) {
      return json({ error: 'Origin mismatch.' }, 401);
    }
    const sessionOrigin = signedOrigin || headerOrigin || null;
    const userAgentHash = await currentUserAgentHash(req) || null;

    const requestedDisplayName = typeof displayName === 'string' && displayName.trim() ? displayName.trim().slice(0, 64) : null;
    let existingPlayer: { display_name?: unknown; vanity_name?: unknown } | null = null;
    try {
      const { data, error } = await admin
        .from('players')
        .select('display_name, vanity_name')
        .eq('wallet_address', normalized)
        .maybeSingle();
      if (!error && data) existingPlayer = data;
    } catch (_error) {
      // Player lookup is optional. Authentication must not fail because profile enrichment is down.
    }
    const chainDisplayName = null; // Do not block wallet auth on DFK profile RPC lookup.
    const resolvedDisplayName = cleanName(existingPlayer?.vanity_name) || cleanName(existingPlayer?.display_name) || requestedDisplayName || chainDisplayName || null;

    try {
      const { error: playerError } = await admin.from('players').upsert({
        wallet_address: normalized,
        display_name: resolvedDisplayName,
        last_run_at: null,
      }, { onConflict: 'wallet_address' });
      if (playerError && !isMissingColumnError(playerError)) console.warn(JSON.stringify({ event: 'wallet-auth-verify player upsert skipped', error: playerError.message || String(playerError) }));
    } catch (playerError) {
      console.warn(JSON.stringify({ event: 'wallet-auth-verify player upsert failed', error: playerError instanceof Error ? playerError.message : String(playerError) }));
    }

    try {
      if (!statelessNonceCheck.ok) {
        await admin.from('wallet_auth_nonces').update({ used_at: new Date().toISOString() }).eq('wallet_address', normalized);
      } else {
        await admin.from('wallet_auth_nonces').delete().eq('wallet_address', normalized);
      }
    } catch (_error) {
      // Nonce cleanup is optional.
    }
    try {
      // Replace any old active/stale row for this wallet. Some deployments enforce one session per wallet.
      await admin.from('wallet_sessions').delete().eq('wallet_address', normalized);
    } catch (_error) {
      // Session cleanup is optional; insert/upsert below still attempts to recover.
    }

    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();
    const sessionToken = crypto.randomUUID();

    const nowIso = new Date().toISOString();
    const sessionInsertAttempts: Array<Record<string, unknown>> = [
      {
        session_token: sessionToken,
        wallet_address: normalized,
        expires_at: expiresAt,
        revoked_at: null,
        created_at: nowIso,
        last_seen_at: nowIso,
        session_origin: sessionOrigin,
        user_agent_hash: userAgentHash,
      },
      {
        session_token: sessionToken,
        wallet_address: normalized,
        expires_at: expiresAt,
        revoked_at: null,
        created_at: nowIso,
        last_seen_at: nowIso,
        session_origin: sessionOrigin,
      },
      {
        session_token: sessionToken,
        wallet_address: normalized,
        expires_at: expiresAt,
        created_at: nowIso,
        last_seen_at: nowIso,
      },
      {
        session_token: sessionToken,
        wallet_address: normalized,
        expires_at: expiresAt,
        created_at: nowIso,
      },
      {
        session_token: sessionToken,
        wallet_address: normalized,
        expires_at: expiresAt,
      },
    ];

    let sessionRow: Record<string, unknown> | null = null;
    let lastSessionError: unknown = null;
    for (const payload of sessionInsertAttempts) {
      const insertResult = await admin
        .from('wallet_sessions')
        .insert(payload)
        .select('session_token, expires_at')
        .single();
      if (!insertResult.error && insertResult.data) {
        sessionRow = insertResult.data as Record<string, unknown>;
        break;
      }
      lastSessionError = insertResult.error;

      // If the deployment enforces a unique wallet row, try replacing it by wallet address.
      const message = String((insertResult.error as { message?: unknown } | null)?.message || '').toLowerCase();
      if (message.includes('duplicate') || message.includes('unique') || message.includes('conflict')) {
        const upsertResult = await admin
          .from('wallet_sessions')
          .upsert(payload, { onConflict: 'wallet_address' })
          .select('session_token, expires_at')
          .single();
        if (!upsertResult.error && upsertResult.data) {
          sessionRow = upsertResult.data as Record<string, unknown>;
          break;
        }
        lastSessionError = upsertResult.error;
      }

      if (!isMissingColumnError(insertResult.error)) break;
    }
    if (!sessionRow) {
      const details = normalizeError(lastSessionError);
      return json({
        error: 'Session creation failed.',
        code: 'session_creation_failed',
        details: details.message,
        raw: details,
      }, 500);
    }

    const savedSessionToken = String(sessionRow.session_token || sessionToken).trim();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(savedSessionToken)) {
      throw new Error('Wallet session creation returned an invalid session token.');
    }

    return json({
      sessionToken: savedSessionToken,
      session_token: savedSessionToken,
      sessionId: savedSessionToken,
      session_id: savedSessionToken,
      expiresAt: sessionRow.expires_at,
      expires_at: sessionRow.expires_at,
      displayName: resolvedDisplayName,
    }, 200);
  } catch (error) {
    const normalized = normalizeError(error);
    console.error(JSON.stringify({ event: 'wallet-auth-verify failed', ...normalized }));
    return json({
      error: 'Verification failed.',
      code: 'verification_failed',
      details: normalized.message,
      raw: normalized,
    }, 500);
  }
});

function normalizeError(error: unknown) {
  if (error instanceof Error) return { name: error.name, message: error.message, stack: error.stack };
  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    return {
      name: typeof record.name === 'string' ? record.name : null,
      message: typeof record.message === 'string' ? record.message : (() => { try { return JSON.stringify(error); } catch { return String(error); } })(),
      code: record.code ?? null,
      details: record.details ?? null,
      hint: record.hint ?? null,
      raw: (() => { try { return JSON.stringify(error); } catch { return String(error); } })(),
    };
  }
  return { message: String(error || 'Unknown error'), raw: error ?? null };
}

function createAdmin() {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceRole) throw new Error('Missing Supabase environment configuration.');
  return createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
