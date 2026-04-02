import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, cache-control',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

type PlayerRow = Record<string, unknown>;
type RunRow = Record<string, unknown>;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({ ok: true }, 200);
  if (req.method !== 'GET' && req.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, 405);
  }

  try {
    const admin = createAdmin();
    const players = await fetchPlayers(admin);
    const runs = await fetchRunUsage(admin);
    const usedMap = buildUsedWalletHeroesMap(runs);
    const burnRows = await fetchBurnRows(admin);
    const burnSummary = buildBurnSummary(burnRows, runs);
    const globalDfkGoldBurned = burnSummary.total;

    const rows = players.map((player) => ({
      wallet_address: player.wallet_address || '',
      wallet: player.wallet_address || '',
      vanity_name: player.vanity_name || null,
      display_name: player.vanity_name || player.display_name || player.wallet_address || 'Unknown Player',
      player_name: player.vanity_name || player.display_name || player.wallet_address || 'Unknown Player',
      used_wallet_heroes: Boolean(player.used_wallet_heroes) || Boolean(usedMap.get(normalizeAddress(player.wallet_address))),
      best_wave: sanitizeInt(player.best_wave),
      total_runs: sanitizeInt(player.total_runs),
      runs: sanitizeInt(player.total_runs),
      total_waves_cleared: sanitizeInt(player.total_waves_cleared),
      last_run_at: player.last_run_at || null,
      updated_at: player.updated_at || null,
      dfk_gold_burned: Number((burnSummary.byWallet.get(normalizeAddress(player.wallet_address)) || 0).toFixed(3)),
    })).sort((a, b) => {
      return sanitizeInt(b.best_wave) - sanitizeInt(a.best_wave)
        || sanitizeInt(b.total_waves_cleared) - sanitizeInt(a.total_waves_cleared)
        || String(b.updated_at || '').localeCompare(String(a.updated_at || ''))
        || String(a.wallet_address || '').localeCompare(String(b.wallet_address || ''));
    });

    if (burnSummary.topBurner) {
      const matchedRow = rows.find((row) => normalizeAddress(row.wallet_address) === burnSummary.topBurner.wallet_address);
      if (matchedRow) burnSummary.topBurner.display_name = String(matchedRow.display_name || burnSummary.topBurner.wallet_address);
    }

    return json({
      rows,
      global_dfk_gold_burned: globalDfkGoldBurned,
      top_burner: burnSummary.topBurner ? {
        wallet_address: burnSummary.topBurner.wallet_address,
        wallet: burnSummary.topBurner.wallet_address,
        display_name: burnSummary.topBurner.display_name,
        player_name: burnSummary.topBurner.display_name,
        dfk_gold_burned: burnSummary.topBurner.total,
      } : null,
    }, 200);
  } catch (error) {
    console.error('public-leaderboard failed', normalizeError(error));
    return json({ error: normalizeError(error).message || 'Leaderboard load failed.' }, 500);
  }
});

async function fetchPlayers(admin: SupabaseClient) {
  const selectVariants = [
    'wallet_address, vanity_name, display_name, used_wallet_heroes, best_wave, total_runs, total_waves_cleared, last_run_at, updated_at',
    'wallet_address, vanity_name, display_name, best_wave, total_runs, total_waves_cleared, last_run_at, updated_at',
    'wallet_address, display_name, best_wave, total_runs, total_waves_cleared, last_run_at, updated_at',
    'wallet_address, display_name, best_wave, total_runs, total_waves_cleared',
  ];

  let lastError: unknown = null;
  for (const columns of selectVariants) {
    const { data, error } = await admin.from('players').select(columns);
    if (!error) return (Array.isArray(data) ? data : []) as PlayerRow[];
    lastError = error;
    if (isMissingColumnError(error)) continue;
    throw error;
  }
  throw lastError || new Error('Players query failed.');
}

async function fetchRunUsage(admin: SupabaseClient) {
  const selectVariants = [
    'wallet_address, stats_json, heroes_json',
    'wallet_address, stats_json',
    'wallet_address, heroes_json',
    'wallet_address',
  ];

  let lastError: unknown = null;
  for (const columns of selectVariants) {
    const { data, error } = await admin.from('runs').select(columns);
    if (!error) return (Array.isArray(data) ? data : []) as RunRow[];
    lastError = error;
    if (isMissingColumnError(error)) continue;
    throw error;
  }
  throw lastError || new Error('Runs query failed.');
}

function buildUsedWalletHeroesMap(rows: RunRow[]) {
  const map = new Map<string, boolean>();
  for (const row of rows || []) {
    const wallet = normalizeAddress(row.wallet_address);
    if (!wallet) continue;
    if (map.get(wallet)) continue;

    const stats = row.stats_json && typeof row.stats_json === 'object' ? row.stats_json as Record<string, unknown> : {};
    const statsUsed = Boolean(stats.usedWalletHeroes)
      || Boolean(stats.used_wallet_heroes)
      || sanitizeInt(stats.usedWalletHeroCount) > 0
      || sanitizeInt(stats.used_wallet_hero_count) > 0;

    const heroes = Array.isArray(row.heroes_json) ? row.heroes_json as Array<Record<string, unknown>> : [];
    const heroesUsed = heroes.some((hero) => {
      const entry = hero as Record<string, unknown>;
      return Boolean(entry.usedWalletHero)
        || Boolean(entry.used_wallet_hero)
        || sanitizeInt(entry.walletHeroCount) > 0
        || sanitizeInt(entry.wallet_hero_count) > 0
        || Boolean(entry.walletHeroId)
        || Boolean(entry.wallet_hero_id);
    });

    if (statsUsed || heroesUsed) map.set(wallet, true);
  }
  return map;
}

function buildBurnSummary(burnRows: Array<Record<string, unknown>>, runs: RunRow[]) {
  const byWallet = new Map<string, number>();
  let total = 0;

  if (Array.isArray(burnRows) && burnRows.length) {
    for (const row of burnRows) {
      const burn = row as Record<string, unknown>;
      const wallet = normalizeAddress(burn.wallet_address ?? burn.wallet ?? burn.address ?? '');
      const amount = sanitizeNumber(burn.burn_amount ?? burn.amount ?? 0);
      if (amount <= 0) continue;
      total += amount;
      if (wallet) byWallet.set(wallet, sanitizeNumber((byWallet.get(wallet) || 0) + amount));
    }
  } else {
    for (const row of runs || []) {
      const wallet = normalizeAddress(row.wallet_address);
      if (!wallet) continue;
      const stats = row.stats_json && typeof row.stats_json === 'object' ? row.stats_json as Record<string, unknown> : {};
      const amount = sanitizeNumber(stats.dfkGoldBurnedTotal ?? stats.dfk_gold_burned_total ?? stats.burnedGoldTotal ?? 0);
      if (amount <= 0) continue;
      total += amount;
      byWallet.set(wallet, sanitizeNumber((byWallet.get(wallet) || 0) + amount));
    }
  }

  let topBurner: { wallet_address: string; display_name: string; total: number } | null = null;
  for (const [wallet, amount] of byWallet.entries()) {
    const roundedAmount = Number(amount.toFixed(3));
    if (!topBurner || roundedAmount > topBurner.total || (roundedAmount === topBurner.total && wallet.localeCompare(topBurner.wallet_address) < 0)) {
      topBurner = { wallet_address: wallet, display_name: wallet, total: roundedAmount };
    }
  }

  return { byWallet, total: Number(total.toFixed(3)), topBurner };
}

async function fetchBurnRows(admin: SupabaseClient) {
  const selectVariants = [
    'wallet_address, burn_amount',
    'wallet_address, amount',
    'wallet_address, tx_hash, burn_amount',
    'wallet_address, tx_hash, amount',
    'wallet_address, tx_hash, burn_amount, amount',
    'burn_amount',
    'amount',
    'tx_hash, burn_amount',
    'tx_hash, amount',
    'tx_hash, burn_amount, amount',
  ];

  for (const columns of selectVariants) {
    const { data, error } = await admin.from('dfk_gold_burns').select(columns);
    if (!error) return (Array.isArray(data) ? data : []) as Array<Record<string, unknown>>;
    if (isMissingColumnError(error) || isMissingRelationError(error)) continue;
    throw error;
  }

  return [];
}

function normalizeAddress(address: unknown) {
  return String(address || '').trim().toLowerCase();
}

function sanitizeInt(value: unknown) {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.round(parsed);
}

function sanitizeNumber(value: unknown) {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

function isMissingColumnError(error: unknown) {
  const message = String((error && typeof error === 'object' && 'message' in error ? (error as { message?: unknown }).message : '') || '').toLowerCase();
  return message.includes('column') && (message.includes('does not exist') || message.includes('not found in schema cache'));
}

function isMissingRelationError(error: unknown) {
  const message = String((error && typeof error === 'object' && 'message' in error ? (error as { message?: unknown }).message : '') || '').toLowerCase();
  return message.includes('relation') && message.includes('does not exist');
}

function createAdmin() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

function normalizeError(error: unknown) {
  if (error && typeof error === 'object') {
    const row = error as Record<string, unknown>;
    return {
      message: String(row.message || 'Leaderboard load failed.'),
      code: row.code ?? null,
      details: row.details ?? null,
      hint: row.hint ?? null,
      name: row.name ?? null,
    };
  }
  return { message: String(error || 'Leaderboard load failed.'), code: null, details: null, hint: null, name: null };
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
