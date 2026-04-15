import { createClient } from 'jsr:@supabase/supabase-js@2';
import { loadValidWalletSession, normalizeAddress } from '../_shared/wallet-session.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};


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
      .maybeSingle();

    if (playerResponse.error && isAnyMissingColumnsError(playerResponse.error, ['paid_games_remaining', 'free_games_remaining', 'free_games_last_reset'])) {
      throw new Error('players table is missing AVAX game-credit columns; run the schema.sql migration, then redeploy avax-consume-run and avax-run-balance.');
    }
    if (playerResponse.error) throw playerResponse.error;
    if (!playerResponse.data) {
      return {
        wallet_address: walletAddress,
        paid_games_remaining: 0,
        free_games_remaining: 5,
        free_games_last_reset: today,
      };
    }
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
      .maybeSingle();

    if (refreshError && isAnyMissingColumnsError(refreshError, ['paid_games_remaining', 'free_games_remaining', 'free_games_last_reset'])) {
      throw new Error('players table is missing AVAX game-credit columns; run the schema.sql migration, then redeploy avax-consume-run and avax-run-balance.');
    }
    if (refreshError) throw refreshError;
    if (!refreshed) {
      return {
        wallet_address: walletAddress,
        paid_games_remaining: 0,
        free_games_remaining: 5,
        free_games_last_reset: today,
      };
    }
    return refreshed;
  }

  return player;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200, headers: corsHeaders });
  try {
    const admin = createAdmin();
    const sessionResult = await loadValidWalletSession(admin, req, corsHeaders);
    if ('response' in sessionResult) return sessionResult.response;
    const session = sessionResult.session;
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
      .maybeSingle();

    if (updateError && isAnyMissingColumnsError(updateError, ['paid_games_remaining', 'free_games_remaining'])) {
      throw new Error('players table is missing AVAX game-credit columns; run the schema.sql migration, then redeploy avax-consume-run and avax-run-balance.');
    }
    if (updateError) throw updateError;
    if (!updated) {
      return json({ error: 'Player credit row was not updated.', code: 'PLAYER_UPDATE_MISSING' }, 409);
    }

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
