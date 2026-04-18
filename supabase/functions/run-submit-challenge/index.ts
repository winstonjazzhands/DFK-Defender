import { createClient } from 'jsr:@supabase/supabase-js@2';
import { extractSessionToken, loadValidWalletSession, normalizeAddress } from '../_shared/wallet-session.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-token, cache-control',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const RUN_SUBMIT_CHALLENGE_SECRET = Deno.env.get('RUN_SUBMIT_CHALLENGE_SECRET') || '';
const CHALLENGE_TTL_MS = Math.max(60_000, Number(Deno.env.get('DFK_SECURE_RUN_SIGNATURE_TTL_MS') || 10 * 60_000));

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200, headers: corsHeaders });

  try {
    if (!RUN_SUBMIT_CHALLENGE_SECRET) {
      return json({ error: 'Secure run submission is not configured on the server.', code: 'secure_submission_not_configured' }, 500);
    }

    const token = extractSessionToken(req);
    if (!token || /^sb_(publishable|anon)_/i.test(token)) {
      return json({ error: 'Valid session token required.', code: 'missing_session_token' }, 401);
    }

    const admin = createAdmin();
    const sessionResult = await loadValidWalletSession(admin, req, corsHeaders, { validateContext: true });
    if ('response' in sessionResult) return sessionResult.response;
    const session = sessionResult.session;

    const body = await req.json().catch(() => null) as Record<string, unknown> | null;
    if (!body || typeof body !== 'object') {
      return json({ error: 'Invalid request body.', code: 'invalid_body' }, 400);
    }

    const walletAddress = normalizeAddress(body.walletAddress as string);
    const clientRunId = normalizeClientRunId(body.clientRunId);
    const payloadHash = String(body.payloadHash || '').trim();
    const completedAt = safeIsoDate(body.completedAt) || new Date().toISOString();
    const waveReached = sanitizeInt(body.waveReached);
    const gameVersion = typeof body.gameVersion === 'string' ? body.gameVersion.trim().slice(0, 80) : 'unknown';

    if (!walletAddress) return json({ error: 'walletAddress is required.', code: 'wallet_required' }, 400);
    if (walletAddress !== normalizeAddress(session.wallet_address)) return json({ error: 'Wallet mismatch.', code: 'wallet_mismatch' }, 401);
    if (!/^[a-z0-9][a-z0-9_-]{7,127}$/i.test(clientRunId)) return json({ error: 'Invalid clientRunId.', code: 'invalid_client_run_id' }, 400);
    if (!/^[A-Za-z0-9_-]{20,}$/i.test(payloadHash)) return json({ error: 'Invalid payloadHash.', code: 'invalid_payload_hash' }, 400);
    if (!Number.isInteger(waveReached) || waveReached < 0) return json({ error: 'Invalid waveReached.', code: 'invalid_wave_reached' }, 400);

    const issuedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS).toISOString();
    const challengeId = typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `runchall_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    const origin = String(req.headers.get('origin') || '').trim() || null;
    const challengePayload = {
      type: 'dfk_secure_run_submit',
      walletAddress,
      clientRunId,
      waveReached,
      completedAt,
      payloadHash,
      gameVersion,
      challengeId,
      issuedAt,
      expiresAt,
      origin,
    };
    const challengeToken = await signChallengeToken(challengePayload, RUN_SUBMIT_CHALLENGE_SECRET);
    const message = buildSecureRunSubmitMessage({
      origin,
      walletAddress,
      clientRunId,
      waveReached,
      completedAt,
      payloadHash,
      challengeId,
      expiresAt,
    });

    return json({ ok: true, challengeId, challengeToken, expiresAt, message }, 200);
  } catch (error) {
    const message = error && typeof error === 'object' && 'message' in error ? String((error as { message?: unknown }).message || 'Secure challenge failed.') : 'Secure challenge failed.';
    return json({ error: message, code: 'secure_challenge_failed' }, 500);
  }
});

function buildSecureRunSubmitMessage(input: {
  origin: string | null;
  walletAddress: string;
  clientRunId: string;
  waveReached: number;
  completedAt: string;
  payloadHash: string;
  challengeId: string;
  expiresAt: string;
}) {
  const origin = String(input.origin || 'DFK Defender').trim();
  const host = origin.replace(/^https?:\/\//i, '').replace(/\/$/, '') || 'DFK Defender';
  return [
    `${host} wants you to securely submit this high-value DFK Defender run:`,
    input.walletAddress,
    '',
    `Run ID: ${input.clientRunId}`,
    `Wave Reached: ${input.waveReached}`,
    `Completed At: ${input.completedAt}`,
    `Payload Hash: ${input.payloadHash}`,
    `Challenge ID: ${input.challengeId}`,
    `Expires At: ${input.expiresAt}`,
    '',
    'Sign to authorize secure submission of this saved run.',
    'No blockchain transaction will be sent.',
    '',
    `URI: ${origin}`,
    'Version: 1',
  ].join('\n');
}


function normalizeClientRunId(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function safeIsoDate(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function sanitizeInt(value: unknown) {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.round(parsed);
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function signChallengeToken(payload: Record<string, unknown>, secret: string) {
  const encodedPayload = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(encodedPayload));
  return `${encodedPayload}.${bytesToBase64Url(new Uint8Array(signature))}`;
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
