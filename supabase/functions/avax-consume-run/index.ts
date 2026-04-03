import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function normalizeAddress(address: string | null | undefined) {
  return String(address || '').trim().toLowerCase();
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

function todayUtcDate() {
  return new Date().toISOString().slice(0, 10);
}

function errorMessage(error: unknown) {
  return String((error as { message?: string } | null)?.message || error || '');
}

function isMissingColumnError(error: unknown, columnName: string) {
  const message = errorMessage(error).toLowerCase();
  return message.includes('column') && message.includes(columnName.toLowerCase()) && message.includes('does not exist');
}

function isAnyMissingColumnsError(error: unknown, columnNames: string[]) {
  return columnNames.some((columnName) => isMissingColumnError(error, columnName));
}

function nextUtcResetIso() {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0));
  return next.toISOString();
}

async function requireSession(req: Request, admin: ReturnType<typeof createAdmin>) {
  const authHeader = req.headers.get('Authorization') || '';
  const fallbackHeader = req.headers.get('x-session-token') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim() || String(fallbackHeader).trim();
  if (!token) throw new Response(JSON.stringify({ error: 'Session token required.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  const { data: session, error } = await admin
    .from('wallet_sessions')
    .select('session_token, wallet_address, expires_at, revoked_at')
    .eq('session_token', token)
    .single();

  if (error || !session) throw new Response(JSON.stringify({ error: 'Session not found.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  if (session.revoked_at) throw new Response(JSON.stringify({ error: 'Session revoked.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  if (Date.now() >= new Date(session.expires_at).getTime()) throw new Response(JSON.stringify({ error: 'Session expired.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  return session;
}

async function ensureFreshCredits(admin: ReturnType<typeof createAdmin>, walletAddress: string) {
  const today = todayUtcDate();

  let playerResponse = await admin
    .from('players')
    .select('wallet_address, paid_games_remaining, free_games_remaining, free_games_last_reset')
    .eq('wallet_address', walletAddress)
    .maybeSingle();

  if (playerResponse.error && isAnyMissingColumnsError(playerResponse.error, ['paid_games_remaining', 'free_games_remaining', 'free_games_last_reset'])) {
    throw new Error('players table is missing AVAX game-credit columns; run the schema.sql migration, then redeploy avax-consume-run and avax-run-balance.');
  }
  if (playerResponse.error) throw playerResponse.error;

  if (!playerResponse.data) {
    const insertWithCredits = await admin.from('players').insert({
      wallet_address: walletAddress,
      paid_games_remaining: 0,
      free_games_remaining: 5,
      free_games_last_reset: today,
    });

    if (insertWithCredits.error && isAnyMissingColumnsError(insertWithCredits.error, ['paid_games_remaining', 'free_games_remaining', 'free_games_last_reset'])) {
      throw new Error('players table is missing AVAX game-credit columns; run the schema.sql migration, then redeploy avax-consume-run and avax-run-balance.');
    }
    if (insertWithCredits.error) throw insertWithCredits.error;

    playerResponse = await admin
      .from('players')
      .select('wallet_address, paid_games_remaining, free_games_remaining, free_games_last_reset')
      .eq('wallet_address', walletAddress)
      .single();

    if (playerResponse.error && isAnyMissingColumnsError(playerResponse.error, ['paid_games_remaining', 'free_games_remaining', 'free_games_last_reset'])) {
      throw new Error('players table is missing AVAX game-credit columns; run the schema.sql migration, then redeploy avax-consume-run and avax-run-balance.');
    }
    if (playerResponse.error || !playerResponse.data) throw playerResponse.error || new Error('Player record not found.');
  }

  const player = playerResponse.data;
  const lastReset = String(player.free_games_last_reset || '');
  if (lastReset !== today) {
    const { data: refreshed, error: refreshError } = await admin
      .from('players')
      .update({
        free_games_remaining: 5,
        free_games_last_reset: today,
      })
      .eq('wallet_address', walletAddress)
      .select('wallet_address, paid_games_remaining, free_games_remaining, free_games_last_reset')
      .single();

    if (refreshError && isAnyMissingColumnsError(refreshError, ['paid_games_remaining', 'free_games_remaining', 'free_games_last_reset'])) {
      throw new Error('players table is missing AVAX game-credit columns; run the schema.sql migration, then redeploy avax-consume-run and avax-run-balance.');
    }
    if (refreshError || !refreshed) throw refreshError || new Error('Could not refresh daily games.');
    return refreshed;
  }

  return player;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200, headers: corsHeaders });
  try {
    const admin = createAdmin();
    const session = await requireSession(req, admin);
    const body = await req.json().catch(() => ({}));
    const walletAddress = normalizeAddress(body.walletAddress || session.wallet_address);
    const clientRunId = typeof body.clientRunId === 'string' ? body.clientRunId.trim().slice(0, 128) : null;
    if (!walletAddress) return json({ error: 'walletAddress is required.' }, 400);
    if (walletAddress !== session.wallet_address) return json({ error: 'Wallet mismatch.' }, 401);

    const player = await ensureFreshCredits(admin, walletAddress);
    const freeGamesRemaining = Math.max(0, Number(player.free_games_remaining || 0));
    const paidGamesRemaining = Math.max(0, Number(player.paid_games_remaining || 0));

    let updatePayload: Record<string, unknown> | null = null;
    let consumedFrom = '';

    if (freeGamesRemaining > 0) {
      updatePayload = { free_games_remaining: freeGamesRemaining - 1 };
      consumedFrom = 'free';
    } else if (paidGamesRemaining > 0) {
      updatePayload = { paid_games_remaining: paidGamesRemaining - 1 };
      consumedFrom = 'paid';
    } else {
      return json({
        ok: false,
        error: 'No games remaining.',
        code: 'NO_GAMES_REMAINING',
        freeGamesRemaining,
        paidGamesRemaining,
        totalGamesRemaining: 0,
        nextFreeResetAt: nextUtcResetIso(),
      }, 409);
    }

    const { data: updated, error: updateError } = await admin
      .from('players')
      .update(updatePayload)
      .eq('wallet_address', walletAddress)
      .select('wallet_address, paid_games_remaining, free_games_remaining')
      .single();

    if (updateError && isAnyMissingColumnsError(updateError, ['paid_games_remaining', 'free_games_remaining'])) {
      throw new Error('players table is missing AVAX game-credit columns; run the schema.sql migration, then redeploy avax-consume-run and avax-run-balance.');
    }
    if (updateError || !updated) throw updateError || new Error('Could not consume game.');

    return json({
      ok: true,
      walletAddress,
      clientRunId,
      consumedFrom,
      freeGamesRemaining: Math.max(0, Number(updated.free_games_remaining || 0)),
      paidGamesRemaining: Math.max(0, Number(updated.paid_games_remaining || 0)),
      totalGamesRemaining: Math.max(0, Number(updated.free_games_remaining || 0)) + Math.max(0, Number(updated.paid_games_remaining || 0)),
      nextFreeResetAt: nextUtcResetIso(),
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ error: error instanceof Error ? error.message : 'Could not consume game.' }, 500);
  }
});
