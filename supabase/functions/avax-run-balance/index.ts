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


function isMissingRelationError(error: unknown, relationName: string) {
  const code = String((error as { code?: string } | null)?.code || '').trim();
  const message = errorMessage(error).toLowerCase();
  return code === 'PGRST205' || (message.includes('relation') && message.includes(relationName.toLowerCase()) && message.includes('does not exist'));
}

async function loadPlayer(admin: ReturnType<typeof createAdmin>, walletAddress: string) {
  const fullSelect = 'wallet_address, paid_games_remaining, free_games_remaining, free_games_last_reset, total_paid_games_purchased';
  const minimalSelect = 'wallet_address';

  const primary = await admin
    .from('players')
    .select(fullSelect)
    .eq('wallet_address', walletAddress)
    .limit(1)
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
    if (isMissingRelationError(primary.error, 'players')) {
      return {
        wallet_address: walletAddress,
        paid_games_remaining: 0,
        free_games_remaining: 5,
        free_games_last_reset: todayUtcDate(),
        total_paid_games_purchased: 0,
        schemaWarning: 'players table is missing; apply the schema migration and redeploy AVAX functions.',
        playerExists: false,
      };
    }
    throw primary.error;
  }

  const fallback = await admin
    .from('players')
    .select(minimalSelect)
    .eq('wallet_address', walletAddress)
    .limit(1)
    .maybeSingle();

  if (fallback.error) {
    if (isMissingRelationError(fallback.error, 'players')) {
      return {
        wallet_address: walletAddress,
        paid_games_remaining: 0,
        free_games_remaining: 5,
        free_games_last_reset: todayUtcDate(),
        total_paid_games_purchased: 0,
        schemaWarning: 'players table is missing; apply the schema migration and redeploy AVAX functions.',
        playerExists: false,
      };
    }
    throw fallback.error;
  }

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


async function ensureFreshCredits(admin: ReturnType<typeof createAdmin>, walletAddress: string) {
  const today = todayUtcDate();

  const existingPlayer = await loadPlayer(admin, walletAddress);

  if (existingPlayer.schemaWarning && !existingPlayer.playerExists) {
    const fallbackInsert = await admin.from('players').insert({
      wallet_address: walletAddress,
    });
    if (fallbackInsert.error) {
      return existingPlayer;
    }
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
      if (fallbackInsert.error) {
        return existingPlayer;
      }
    } else if (insertWithCredits.error) {
      return existingPlayer;
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

    if (refreshError) return existingPlayer;
    return await loadPlayer(admin, walletAddress);
  }

  return existingPlayer;
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
