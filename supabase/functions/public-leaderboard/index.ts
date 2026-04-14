import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, cache-control',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

type PlayerRow = Record<string, unknown>;
type RunRow = Record<string, unknown>;
type BurnRow = Record<string, unknown>;

type RangeWindow = {
  label: string;
  start: string;
  end: string;
};


async function fetchPaginatedRows(admin: SupabaseClient, table: string, columns: string) {
  const pageSize = 1000;
  const rows: Record<string, unknown>[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await admin
      .from(table)
      .select(columns)
      .range(from, from + pageSize - 1);
    if (error) return { rows: [], error };
    const batch = Array.isArray(data) ? data as Record<string, unknown>[] : [];
    rows.push(...batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }
  return { rows, error: null as unknown };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({ ok: true }, 200);
  if (req.method !== 'GET' && req.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, 405);
  }

  try {
    const admin = createAdmin();
    const url = new URL(req.url);
    const rangeSelection = resolveRequestedRange(url);
    const players = await fetchPlayers(admin);
    const [runs, lifetimeRuns, burnRows, lifetimeBurnRows] = await Promise.all([
      fetchRunsForRange(admin, rangeSelection.selectedRange),
      fetchAllRuns(admin),
      fetchBurnRowsForRange(admin, rangeSelection.selectedRange),
      fetchAllBurnRows(admin),
    ]);
    const usedMap = buildUsedWalletHeroesMap(runs);
    const burnSummary = buildBurnSummary(burnRows, runs);
    const rows = buildLeaderboardRows(players, runs, usedMap, burnSummary.byWallet);
    const lifetimeBurnSummary = buildBurnSummary(lifetimeBurnRows, lifetimeRuns);
    const lifetimeUsedMap = buildUsedWalletHeroesMap(lifetimeRuns);
    const lifetimeRows = buildLeaderboardRows(players, lifetimeRuns, lifetimeUsedMap, lifetimeBurnSummary.byWallet);

    if (burnSummary.topBurner) {
      const matchedRow = rows.find((row) => normalizeAddress(row.wallet_address) === burnSummary.topBurner?.wallet_address);
      if (matchedRow) burnSummary.topBurner.display_name = String(matchedRow.display_name || burnSummary.topBurner.wallet_address);
    }
    if (lifetimeBurnSummary.topBurner) {
      const matchedLifetimeRow = lifetimeRows.find((row) => normalizeAddress(row.wallet_address) === lifetimeBurnSummary.topBurner?.wallet_address);
      if (matchedLifetimeRow) lifetimeBurnSummary.topBurner.display_name = String(matchedLifetimeRow.display_name || lifetimeBurnSummary.topBurner.wallet_address);
    }

    return json({
      rows,
      global_dfk_gold_burned: burnSummary.total,
      top_burner: burnSummary.topBurner ? {
        wallet_address: burnSummary.topBurner.wallet_address,
        wallet: burnSummary.topBurner.wallet_address,
        display_name: burnSummary.topBurner.display_name,
        player_name: burnSummary.topBurner.display_name,
        dfk_gold_burned: burnSummary.topBurner.total,
      } : null,
      lifetime: {
        total_runs: lifetimeRuns.length,
        tracked_runs_total: lifetimeRuns.length,
        runs_count: lifetimeRuns.length,
        run_count: lifetimeRuns.length,
        global_dfk_gold_burned: lifetimeBurnSummary.total,
        global_burned_total: lifetimeBurnSummary.total,
        top_burner: lifetimeBurnSummary.topBurner ? {
          wallet_address: lifetimeBurnSummary.topBurner.wallet_address,
          wallet: lifetimeBurnSummary.topBurner.wallet_address,
          display_name: lifetimeBurnSummary.topBurner.display_name,
          player_name: lifetimeBurnSummary.topBurner.display_name,
          dfk_gold_burned: lifetimeBurnSummary.topBurner.total,
        } : null,
      },
      lifetime_total_runs: lifetimeRuns.length,
      lifetimeTrackedRuns: lifetimeRuns.length,
      lifetime_run_count: lifetimeRuns.length,
      lifetime_runs_count: lifetimeRuns.length,
      lifetime_global_dfk_gold_burned: lifetimeBurnSummary.total,
      lifetimeDfkGoldBurned: lifetimeBurnSummary.total,
      lifetime_burned_total: lifetimeBurnSummary.total,
      lifetime_top_burner: lifetimeBurnSummary.topBurner ? {
        wallet_address: lifetimeBurnSummary.topBurner.wallet_address,
        wallet: lifetimeBurnSummary.topBurner.wallet_address,
        display_name: lifetimeBurnSummary.topBurner.display_name,
        player_name: lifetimeBurnSummary.topBurner.display_name,
        dfk_gold_burned: lifetimeBurnSummary.topBurner.total,
        total: lifetimeBurnSummary.topBurner.total,
      } : null,
      meta: {
        preset: rangeSelection.preset,
        selected_range: rangeSelection.selectedRange,
        current_week: rangeSelection.currentWeek,
        last_week: rangeSelection.lastWeek,
      },
    }, 200);
  } catch (error) {
    console.error('public-leaderboard failed', normalizeError(error));
    return json({ error: normalizeError(error).message || 'Leaderboard load failed.' }, 500);
  }
});

function buildLeaderboardRows(players: PlayerRow[], runs: RunRow[], usedMap: Map<string, boolean>, burnByWallet: Map<string, number>) {
  const playerByWallet = new Map<string, PlayerRow>();
  for (const player of players || []) {
    const wallet = normalizeAddress(player.wallet_address);
    if (wallet) playerByWallet.set(wallet, player);
  }

  const aggregates = new Map<string, {
    wallet_address: string;
    best_wave: number;
    runs: number;
    total_waves_cleared: number;
    used_wallet_heroes: boolean;
    last_run_at: string | null;
    updated_at: string | null;
  }>();

  for (const row of runs || []) {
    const wallet = normalizeAddress(row.wallet_address);
    if (!wallet) continue;
    const completedAt = parseTimestamp(row.completed_at ?? row.created_at ?? row.run_started_at ?? null);
    const current = aggregates.get(wallet) || {
      wallet_address: wallet,
      best_wave: 0,
      runs: 0,
      total_waves_cleared: 0,
      used_wallet_heroes: false,
      last_run_at: null,
      updated_at: null,
    };
    current.best_wave = Math.max(current.best_wave, sanitizeInt(row.wave_reached));
    current.runs += 1;
    current.total_waves_cleared += sanitizeInt(row.waves_cleared);
    current.used_wallet_heroes = current.used_wallet_heroes || Boolean(usedMap.get(wallet));
    if (completedAt) {
      const iso = completedAt.toISOString();
      if (!current.last_run_at || iso > current.last_run_at) current.last_run_at = iso;
      if (!current.updated_at || iso > current.updated_at) current.updated_at = iso;
    }
    aggregates.set(wallet, current);
  }

  return Array.from(aggregates.values()).map((aggregate) => {
    const player = playerByWallet.get(aggregate.wallet_address) || {};
    return {
      wallet_address: aggregate.wallet_address,
      wallet: aggregate.wallet_address,
      vanity_name: player.vanity_name || null,
      display_name: player.vanity_name || player.display_name || aggregate.wallet_address || 'Unknown Player',
      player_name: player.vanity_name || player.display_name || aggregate.wallet_address || 'Unknown Player',
      used_wallet_heroes: Boolean(player.used_wallet_heroes) || aggregate.used_wallet_heroes,
      best_wave: aggregate.best_wave,
      total_runs: aggregate.runs,
      runs: aggregate.runs,
      total_waves_cleared: aggregate.total_waves_cleared,
      last_run_at: aggregate.last_run_at,
      updated_at: aggregate.updated_at,
      dfk_gold_burned: Number((burnByWallet.get(aggregate.wallet_address) || 0).toFixed(3)),
    };
  }).sort((a, b) => {
    return sanitizeInt(b.best_wave) - sanitizeInt(a.best_wave)
      || sanitizeInt(b.total_waves_cleared) - sanitizeInt(a.total_waves_cleared)
      || sanitizeInt(b.runs) - sanitizeInt(a.runs)
      || String(b.updated_at || '').localeCompare(String(a.updated_at || ''))
      || String(a.wallet_address || '').localeCompare(String(b.wallet_address || ''));
  });
}

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

async function fetchAllRuns(admin: SupabaseClient) {
  const selectVariants = [
    'wallet_address, stats_json, heroes_json, wave_reached, waves_cleared, completed_at, created_at, run_started_at',
    'wallet_address, stats_json, wave_reached, waves_cleared, completed_at, created_at, run_started_at',
    'wallet_address, heroes_json, wave_reached, waves_cleared, completed_at, created_at, run_started_at',
    'wallet_address, wave_reached, waves_cleared, completed_at, created_at, run_started_at',
  ];

  let lastError: unknown = null;
  for (const columns of selectVariants) {
    const result = await fetchPaginatedRows(admin, 'runs', columns);
    if (!result.error) return result.rows as RunRow[];
    lastError = result.error;
    if (isMissingColumnError(result.error)) continue;
    throw result.error;
  }
  throw lastError || new Error('Runs query failed.');
}

async function fetchRunsForRange(admin: SupabaseClient, range: RangeWindow) {
  const selectVariants = [
    'wallet_address, stats_json, heroes_json, wave_reached, waves_cleared, completed_at, created_at, run_started_at',
    'wallet_address, stats_json, wave_reached, waves_cleared, completed_at, created_at, run_started_at',
    'wallet_address, heroes_json, wave_reached, waves_cleared, completed_at, created_at, run_started_at',
    'wallet_address, wave_reached, waves_cleared, completed_at, created_at, run_started_at',
  ];

  let lastError: unknown = null;
  for (const columns of selectVariants) {
    const { data, error } = await admin
      .from('runs')
      .select(columns)
      .gte('completed_at', range.start)
      .lt('completed_at', nextUtcDay(range.end));
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

function buildBurnSummary(burnRows: BurnRow[], runs: RunRow[]) {
  const byWallet = new Map<string, number>();
  let total = 0;

  if (Array.isArray(burnRows) && burnRows.length) {
    for (const row of burnRows) {
      const wallet = normalizeAddress(row.wallet_address ?? row.wallet ?? row.address ?? '');
      const amount = sanitizeNumber(row.burn_amount ?? row.amount ?? 0);
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

async function fetchAllBurnRows(admin: SupabaseClient) {
  const selectVariants = [
    'wallet_address, burn_amount, confirmed_at',
    'wallet_address, amount, confirmed_at',
    'wallet_address, tx_hash, burn_amount, confirmed_at',
    'wallet_address, tx_hash, amount, confirmed_at',
    'wallet_address, tx_hash, burn_amount, amount, confirmed_at',
  ];

  for (const columns of selectVariants) {
    const result = await fetchPaginatedRows(admin, 'dfk_gold_burns', columns);
    if (!result.error) return result.rows as BurnRow[];
    if (isMissingColumnError(result.error) || isMissingRelationError(result.error)) continue;
    throw result.error;
  }

  return [];
}

async function fetchBurnRowsForRange(admin: SupabaseClient, range: RangeWindow) {
  const selectVariants = [
    'wallet_address, burn_amount, confirmed_at',
    'wallet_address, amount, confirmed_at',
    'wallet_address, tx_hash, burn_amount, confirmed_at',
    'wallet_address, tx_hash, amount, confirmed_at',
    'wallet_address, tx_hash, burn_amount, amount, confirmed_at',
  ];

  for (const columns of selectVariants) {
    const { data, error } = await admin
      .from('dfk_gold_burns')
      .select(columns)
      .gte('confirmed_at', range.start)
      .lt('confirmed_at', nextUtcDay(range.end));
    if (!error) return (Array.isArray(data) ? data : []) as BurnRow[];
    if (isMissingColumnError(error) || isMissingRelationError(error)) continue;
    throw error;
  }

  return [];
}

function resolveRequestedRange(url: URL) {
  const currentWeek = getUtcWeekRange(0);
  const lastWeek = getUtcWeekRange(-1);
  const presetParam = String(url.searchParams.get('preset') || '').trim().toLowerCase();
  const modeParam = String(url.searchParams.get('mode') || '').trim().toLowerCase();
  const startParam = normalizeDateOnly(url.searchParams.get('start'));
  const endParam = normalizeDateOnly(url.searchParams.get('end'));

  let selectedRange = currentWeek;
  let preset = 'current_week';

  if ((presetParam === 'last_week' || modeParam === 'last_week')) {
    selectedRange = lastWeek;
    preset = 'last_week';
  } else if (startParam && endParam) {
    const startDate = parseDateOnly(startParam);
    const endDate = parseDateOnly(endParam);
    if (!startDate || !endDate || startDate.getTime() > endDate.getTime()) {
      throw new Error('Invalid leaderboard date range.');
    }
    selectedRange = {
      label: 'Custom Range',
      start: startParam,
      end: endParam,
    };
    preset = 'custom';
  }

  return { preset, selectedRange, currentWeek, lastWeek };
}

function getUtcWeekRange(weekOffset: number): RangeWindow {
  const now = new Date();
  const utcDay = now.getUTCDay();
  const daysSinceMonday = (utcDay + 6) % 7;
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysSinceMonday + (weekOffset * 7), 0, 0, 0, 0));
  const sunday = new Date(monday.getTime() + (6 * 24 * 60 * 60 * 1000));
  return {
    label: weekOffset === 0 ? 'This Week' : 'Last Week',
    start: formatDateOnly(monday),
    end: formatDateOnly(sunday),
  };
}

function normalizeDateOnly(value: string | null) {
  const text = String(value || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : '';
}

function parseDateOnly(value: string) {
  const normalized = normalizeDateOnly(value);
  if (!normalized) return null;
  const parsed = new Date(`${normalized}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function nextUtcDay(dateOnly: string) {
  const parsed = parseDateOnly(dateOnly);
  if (!parsed) return dateOnly;
  const next = new Date(parsed.getTime() + (24 * 60 * 60 * 1000));
  return next.toISOString();
}

function parseTimestamp(value: unknown) {
  const text = String(value || '').trim();
  if (!text) return null;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
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

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack };
  }
  return { message: String(error || 'Unknown error') };
}

function createAdmin() {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceRole) throw new Error('Missing Supabase environment configuration.');
  return createClient(url, serviceRole, { auth: { persistSession: false } });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
