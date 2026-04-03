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

async function loadPlayer(admin: ReturnType<typeof createAdmin>, walletAddress: string) {
  const fullSelect = 'wallet_address, paid_games_remaining, free_games_remaining, free_games_last_reset, total_paid_games_purchased';
  const minimalSelect = 'wallet_address';

  const primary = await admin
    .from('players')
    .select(fullSelect)
    .eq('wallet_address', walletAddress)
    .maybeSingle();

  if (!primary.error && primary.data) {
    return {
      ...primary.data,
      paid_games_remaining: Number((primary.data as { paid_games_remaining?: number }).paid_games_remaining || 0),
      free_games_remaining: Number((primary.data as { free_games_remaining?: number }).free_games_remaining || 5),
      free_games_last_reset: (primary.data as { free_games_last_reset?: string | null }).free_games_last_reset || todayUtcDate(),
      total_paid_games_purchased: Number((primary.data as { total_paid_games_purchased?: number }).total_paid_games_purchased || 0),
      schemaWarning: null,
    };
  }

  if (primary.error && !isAnyMissingColumnsError(primary.error, ['paid_games_remaining', 'free_games_remaining', 'free_games_last_reset', 'total_paid_games_purchased'])) {
    throw primary.error;
  }

  const fallback = await admin
    .from('players')
    .select(minimalSelect)
    .eq('wallet_address', walletAddress)
    .maybeSingle();

  if (fallback.error) throw fallback.error;

  return {
    wallet_address: walletAddress,
    paid_games_remaining: 0,
    free_games_remaining: 5,
    free_games_last_reset: todayUtcDate(),
    total_paid_games_purchased: 0,
    schemaWarning: 'players table is missing AVAX game-credit columns; apply schema.sql migration and redeploy AVAX functions.',
    playerExists: !!fallback.data,
  };
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

  const existingPlayer = await loadPlayer(admin, walletAddress);

  if (existingPlayer.schemaWarning && !existingPlayer.playerExists) {
    const fallbackInsert = await admin.from('players').insert({
      wallet_address: walletAddress,
    });
    if (fallbackInsert.error) throw fallbackInsert.error;
    return await loadPlayer(admin, walletAddress);
  }

  if (!existingPlayer.playerExists) {
    const insertWithCredits = await admin.from('players').insert({
      wallet_address: walletAddress,
      free_games_remaining: 5,
      free_games_last_reset: today,
    });

    if (insertWithCredits.error && isAnyMissingColumnsError(insertWithCredits.error, ['free_games_remaining', 'free_games_last_reset'])) {
      const fallbackInsert = await admin.from('players').insert({
        wallet_address: walletAddress,
      });
      if (fallbackInsert.error) throw fallbackInsert.error;
    } else if (insertWithCredits.error) {
      throw insertWithCredits.error;
    }

    return await loadPlayer(admin, walletAddress);
  }

  if (existingPlayer.schemaWarning) return existingPlayer;

  const lastReset = String(existingPlayer.free_games_last_reset || '');
  if (lastReset !== today) {
    const { error: refreshError } = await admin
      .from('players')
      .update({
        free_games_remaining: 5,
        free_games_last_reset: today,
      })
      .eq('wallet_address', walletAddress);

    if (refreshError) throw refreshError || new Error('Could not refresh daily games.');
    return await loadPlayer(admin, walletAddress);
  }

  return existingPlayer;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200, headers: corsHeaders });
  try {
    const admin = createAdmin();
    const session = await requireSession(req, admin);
    const body = await req.json().catch(() => ({}));
    const walletAddress = normalizeAddress(body.walletAddress || session.wallet_address);
    if (!walletAddress) return json({ error: 'walletAddress is required.' }, 400);
    if (walletAddress !== session.wallet_address) return json({ error: 'Wallet mismatch.' }, 401);

    const player = await ensureFreshCredits(admin, walletAddress);
    const freeGamesRemaining = Math.max(0, Number(player.free_games_remaining || 0));
    const paidGamesRemaining = Math.max(0, Number(player.paid_games_remaining || 0));

    return json({
      ok: true,
      walletAddress,
      freeGamesRemaining,
      paidGamesRemaining,
      totalGamesRemaining: freeGamesRemaining + paidGamesRemaining,
      freeGamesLastReset: player.free_games_last_reset,
      nextFreeResetAt: nextUtcResetIso(),
      totalPaidGamesPurchased: Math.max(0, Number(player.total_paid_games_purchased || 0)),
      schemaWarning: player.schemaWarning || null,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ error: error instanceof Error ? error.message : 'Could not load run balance.' }, 500);
  }
});
