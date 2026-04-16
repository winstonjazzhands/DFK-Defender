
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { normalizeAddress } from '../_shared/wallet-session.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-token',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

function createAdmin() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

function weekKeyFromDate(input = new Date()) {
  const date = new Date(input.getTime());
  const utcDay = date.getUTCDay();
  const diffToMonday = (utcDay + 6) % 7;
  date.setUTCDate(date.getUTCDate() - diffToMonday);
  date.setUTCHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
}



function isMissingWeeklyClaimsTableError(error: unknown) {
  const code = String((error as { code?: unknown } | null)?.code || '');
  const message = String((error as { message?: unknown } | null)?.message || '').toLowerCase();
  return code === 'PGRST205' || (message.includes('weekly_bounty_claims') && message.includes('could not find the table'));
}

function nextWeekIso(weekKey: string) {
  const date = new Date(`${weekKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 7);
  return date.toISOString();
}



function seededRandom(seed: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return function next() {
    h += h << 13; h ^= h >>> 7;
    h += h << 3; h ^= h >>> 17;
    h += h << 5;
    return (h >>> 0) / 4294967296;
  };
}


function formatRewardValue(value: number) {
  return (Number(value || 0) || 0).toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
}

type BountyDifficultyKey = 'heavy' | 'medium' | 'low';
type BountyDifficultyMeta = { label: string; selectionWeight: number; rewardAvax: number; rewardJewel: number };
const BOUNTY_DIFFICULTY: Record<BountyDifficultyKey, BountyDifficultyMeta> = {
  heavy: { label: 'Heavy', selectionWeight: 0.9, rewardAvax: 0.03, rewardJewel: 35 },
  medium: { label: 'Medium', selectionWeight: 1.08, rewardAvax: 0.02, rewardJewel: 24 },
  low: { label: 'Light', selectionWeight: 1.2, rewardAvax: 0.008, rewardJewel: 10 },
};

type BountyDef = {
  id: string;
  title: string;
  detail: string;
  metric: string;
  metricLabel: string;
  goal: number;
  category: string;
  categoryLabel: string;
  difficulty: BountyDifficultyKey;
  difficultyLabel?: string;
  selectionWeight?: number;
  rewardAvax?: number;
  rewardJewel?: number;
  rewardAvaxText?: string;
  rewardJewelText?: string;
  rewardPairText?: string;
  reward?: string;
  rewardText?: string;
  selectable?: boolean;
  claimLimit?: number;
  isMultiWave?: boolean;
};

function buildBounty(entry: BountyDef): BountyDef {
  const difficulty = BOUNTY_DIFFICULTY[entry.difficulty] || BOUNTY_DIFFICULTY.medium;
  const rewardAvax = Number(difficulty.rewardAvax || 0) || 0;
  const rewardJewel = Math.max(0, Number(difficulty.rewardJewel || 0) || 0);
  const rewardAvaxText = `${formatRewardValue(rewardAvax)} AVAX`;
  const rewardJewelText = `${formatRewardValue(rewardJewel)} JEWEL`;
  return {
    ...entry,
    goal: Math.max(1, Math.round(Number(entry.goal || 0) || 0)),
    difficultyLabel: difficulty.label,
    selectionWeight: Number(entry.selectionWeight || difficulty.selectionWeight || 1) || 1,
    rewardAvax,
    rewardJewel,
    rewardAvaxText,
    rewardJewelText,
    rewardPairText: `${rewardAvaxText} or ${rewardJewelText}`,
    reward: `${rewardAvaxText} or ${rewardJewelText}`,
    rewardText: `${rewardAvaxText} or ${rewardJewelText}`,
    claimLimit: Math.max(1, Number(entry.claimLimit || 3) || 3),
    isMultiWave: !!entry.isMultiWave,
  };
}

function pickWeightedBounty(pool: BountyDef[], rng: () => number) {
  const entries = Array.isArray(pool) ? pool.filter(Boolean) : [];
  if (!entries.length) return null;
  const totalWeight = entries.reduce((sum, entry) => sum + Math.max(0.01, Number(entry.selectionWeight || 1) || 1), 0);
  let roll = rng() * totalWeight;
  for (const entry of entries) {
    roll -= Math.max(0.01, Number(entry.selectionWeight || 1) || 1);
    if (roll <= 0) return entry;
  }
  return entries[entries.length - 1] || null;
}

const BOUNTY_POOL: BountyDef[] = [
    buildBounty({ id: 'defeat_25000_enemies', title: 'Defeat 25,000 enemies', detail: 'Defeat 25,000 enemies this week.', metric: 'killsTotal', metricLabel: 'Enemies defeated', category: 'combat', categoryLabel: 'Combat / Kill-Based', goal: 25000, difficulty: 'low' }),
    buildBounty({ id: 'defeat_10000_with_heroes', title: 'Defeat 10,000 enemies with heroes', detail: 'Defeat 10,000 enemies with hero attacks and hero damage.', metric: 'heroKills', metricLabel: 'Hero kills', category: 'combat', categoryLabel: 'Combat / Kill-Based', goal: 10000, difficulty: 'low' }),
    buildBounty({ id: 'defeat_5000_with_abilities', title: 'Defeat 5,000 enemies using abilities', detail: 'Finish 5,000 enemies with hero and champion abilities.', metric: 'abilityKills', metricLabel: 'Ability kills', category: 'combat', categoryLabel: 'Combat / Kill-Based', goal: 5000, difficulty: 'low' }),
    buildBounty({ id: 'defeat_1000_near_statue', title: 'Defeat 1,000 enemies near the statue', detail: 'Defeat 1,000 enemies near the statue this week.', metric: 'killsNearStatue', metricLabel: 'Statue-zone kills', category: 'combat', categoryLabel: 'Combat / Kill-Based', goal: 1000, difficulty: 'low' }),
    buildBounty({ id: 'hero_damage_5m', title: 'Deal 5,000,000 total damage with heroes', detail: 'Deal 5,000,000 total damage with heroes this week.', metric: 'heroDamage', metricLabel: 'Hero damage', category: 'hero', categoryLabel: 'Hero Usage / Performance', goal: 5000000, difficulty: 'low' }),
    buildBounty({ id: 'champion_3000_kills', title: 'Kill 3,000 enemies with champion units', detail: 'Let champion units finish 3,000 enemies.', metric: 'championKills', metricLabel: 'Champion kills', category: 'hero', categoryLabel: 'Hero Usage / Performance', goal: 3000, difficulty: 'low' }),
    buildBounty({ id: 'place_500_barriers', title: 'Place 500 barriers', detail: 'Place 500 barriers this week.', metric: 'barriersPlaced', metricLabel: 'Barriers placed', category: 'strategy', categoryLabel: 'Defense / Strategy', goal: 500, difficulty: 'low' }),
    buildBounty({ id: 'complete_200_multiwave', title: 'Complete 200 waves during multi-wave (2+)', detail: 'Complete 200 waves while 2+ live waves are active.', metric: 'wavesMulti2', metricLabel: '2+ wave clears', category: 'progression', categoryLabel: 'Wave / Progression', goal: 200, difficulty: 'low', isMultiWave: true, selectionWeight: 1.45 }),
    buildBounty({ id: 'trigger_350_multiwave_bonus', title: 'Trigger multi-wave bonus 350 times', detail: 'Trigger the multi-wave bonus 350 times this week.', metric: 'multiWaveBonusTriggers', metricLabel: 'Bonus triggers', category: 'progression', categoryLabel: 'Wave / Progression', goal: 350, difficulty: 'low', isMultiWave: true, selectionWeight: 1.5 }),
    buildBounty({ id: 'defeat_4000_multiwave', title: 'Defeat 4,000 enemies during multi-wave bonus', detail: 'Defeat 4,000 enemies while 2+ live waves are active.', metric: 'killsMultiWave', metricLabel: 'Multi-wave kills', category: 'combat', categoryLabel: 'Combat / Kill-Based', goal: 4000, difficulty: 'low', isMultiWave: true, selectionWeight: 1.35 }),
    buildBounty({ id: 'complete_200_threewave', title: 'Complete 200 waves during 3-wave pressure', detail: 'Complete 200 waves while three live waves are active.', metric: 'wavesMulti3', metricLabel: '3-wave clears', category: 'progression', categoryLabel: 'Wave / Progression', goal: 200, difficulty: 'low', isMultiWave: true, selectionWeight: 1.35 }),
    buildBounty({ id: 'warrior_250_waves', title: 'Win 250 waves with a warrior deployed', detail: 'Clear 250 waves while a warrior is deployed.', metric: 'wavesWithWarrior', metricLabel: 'Waves with warrior', category: 'hero', categoryLabel: 'Hero Usage / Performance', goal: 250, difficulty: 'low' }),
    buildBounty({ id: 'spellbow_250_waves', title: 'Win 250 waves with a spellbow deployed', detail: 'Clear 250 waves while a spellbow is deployed.', metric: 'wavesWithSpellbow', metricLabel: 'Waves with spellbow', category: 'hero', categoryLabel: 'Hero Usage / Performance', goal: 250, difficulty: 'low' }),
    buildBounty({ id: 'sage_250_waves', title: 'Win 250 waves with a sage deployed', detail: 'Clear 250 waves while a sage is deployed.', metric: 'wavesWithSage', metricLabel: 'Waves with sage', category: 'hero', categoryLabel: 'Hero Usage / Performance', goal: 250, difficulty: 'low' }),

    buildBounty({ id: 'defeat_5000_elite', title: 'Defeat 5,000 elite enemies', detail: 'Defeat 5,000 elite enemies this week.', metric: 'killsElite', metricLabel: 'Elite enemies defeated', category: 'combat', categoryLabel: 'Combat / Kill-Based', goal: 5000, difficulty: 'medium' }),
    buildBounty({ id: 'defeat_10000_multiwave', title: 'Defeat 10,000 enemies during multi-wave bonus', detail: 'Defeat 10,000 enemies while 2+ live waves are active.', metric: 'killsMultiWave', metricLabel: 'Multi-wave kills', category: 'combat', categoryLabel: 'Combat / Kill-Based', goal: 10000, difficulty: 'medium', isMultiWave: true, selectionWeight: 1.25 }),
    buildBounty({ id: 'deploy_heroes_400', title: 'Deploy heroes 400 times', detail: 'Deploy heroes 400 times this week.', metric: 'heroesDeployed', metricLabel: 'Hero deployments', category: 'hero', categoryLabel: 'Hero Usage / Performance', goal: 400, difficulty: 'medium' }),
    buildBounty({ id: 'support_heal_150k', title: 'Heal 150,000 total HP with support heroes', detail: 'Restore 150,000 total HP with support heroes.', metric: 'supportHealing', metricLabel: 'Support healing', category: 'hero', categoryLabel: 'Hero Usage / Performance', goal: 150000, difficulty: 'medium' }),
    buildBounty({ id: 'manual_trigger_1400_abilities', title: 'Manually trigger hero abilities 1,400 times', detail: 'Manually trigger 1,400 hero abilities this week.', metric: 'manualHeroAbilityTriggers', metricLabel: 'Manual abilities triggered', category: 'hero', categoryLabel: 'Hero Usage / Performance', goal: 1400, difficulty: 'medium' }),
    buildBounty({ id: 'hero_alive_300_waves', title: 'Keep a hero alive for 300 waves total', detail: 'Stack up 300 hero-alive wave counts.', metric: 'heroAliveWaves', metricLabel: 'Hero-alive waves', category: 'hero', categoryLabel: 'Hero Usage / Performance', goal: 300, difficulty: 'medium' }),
    buildBounty({ id: 'complete_550_past_20', title: 'Complete 550 waves past wave 20', detail: 'Finish 550 waves numbered 21 or higher.', metric: 'wavesPast20', metricLabel: 'Waves beyond 20', category: 'progression', categoryLabel: 'Wave / Progression', goal: 550, difficulty: 'medium' }),
    buildBounty({ id: 'complete_350_threewave', title: 'Complete 350 waves during 3-wave pressure', detail: 'Complete 350 waves with three live waves.', metric: 'wavesMulti3', metricLabel: '3-wave clears', category: 'progression', categoryLabel: 'Wave / Progression', goal: 350, difficulty: 'medium', isMultiWave: true, selectionWeight: 1.2 }),
    buildBounty({ id: 'complete_750_multiwave', title: 'Complete 750 waves during multi-wave (2+)', detail: 'Complete 750 waves while 2+ live waves are active.', metric: 'wavesMulti2', metricLabel: '2+ wave clears', category: 'progression', categoryLabel: 'Wave / Progression', goal: 750, difficulty: 'medium', isMultiWave: true, selectionWeight: 1.25 }),
    buildBounty({ id: 'defeat_4500_threewave', title: 'Defeat 4,500 enemies during 3-wave pressure', detail: 'Defeat 4,500 enemies while three live waves are active.', metric: 'killsMulti3', metricLabel: '3-wave kills', category: 'combat', categoryLabel: 'Combat / Kill-Based', goal: 4500, difficulty: 'medium', isMultiWave: true, selectionWeight: 1.2 }),
    buildBounty({ id: 'trigger_1500_multiwave_bonus', title: 'Trigger multi-wave bonus 1,500 times', detail: 'Trigger the multi-wave bonus 1,500 times this week.', metric: 'multiWaveBonusTriggers', metricLabel: 'Bonus triggers', category: 'progression', categoryLabel: 'Wave / Progression', goal: 1500, difficulty: 'medium', isMultiWave: true, selectionWeight: 1.3 }),
    buildBounty({ id: 'spend_200k_gold', title: 'Spend 200,000 gold', detail: 'Spend 200,000 gold this week.', metric: 'goldSpent', metricLabel: 'Gold spent', category: 'economy', categoryLabel: 'Economy / Activity', goal: 200000, difficulty: 'medium' }),
    buildBounty({ id: 'earn_300k_gold', title: 'Earn 300,000 gold', detail: 'Earn 300,000 gold this week.', metric: 'goldEarned', metricLabel: 'Gold earned', category: 'economy', categoryLabel: 'Economy / Activity', goal: 300000, difficulty: 'medium' }),
    buildBounty({ id: 'hire_100_heroes', title: 'Hire 100 heroes', detail: 'Hire 100 heroes this week.', metric: 'heroesHired', metricLabel: 'Heroes hired', category: 'economy', categoryLabel: 'Economy / Activity', goal: 100, difficulty: 'medium' }),
    buildBounty({ id: 'open_150_relic_choices', title: 'Open 150 relic choices', detail: 'Open 150 relic choice windows this week.', metric: 'relicChoicesOpened', metricLabel: 'Relic choices opened', category: 'economy', categoryLabel: 'Economy / Activity', goal: 150, difficulty: 'medium' }),
  buildBounty({ id: 'defeat_75_bosses', title: 'Defeat 75 boss enemies', detail: 'Defeat 75 boss enemies this week.', metric: 'killsBoss', metricLabel: 'Bosses defeated', category: 'combat', categoryLabel: 'Combat / Kill-Based', goal: 75, difficulty: 'heavy' }),
  buildBounty({ id: 'complete_150_past_30', title: 'Complete 150 waves past wave 30', detail: 'Finish 150 waves numbered 31 or higher.', metric: 'wavesPast30', metricLabel: 'Waves beyond 30', category: 'progression', categoryLabel: 'Wave / Progression', goal: 150, difficulty: 'heavy' }),
  buildBounty({ id: 'complete_1100_waves', title: 'Complete 1,100 waves', detail: 'Finish 1,100 waves this week.', metric: 'wavesCompleted', metricLabel: 'Waves completed', category: 'progression', categoryLabel: 'Wave / Progression', goal: 1100, difficulty: 'heavy' }),
  buildBounty({ id: 'start_1100_waves', title: 'Start 1,100 waves', detail: 'Start 1,100 waves this week.', metric: 'wavesStarted', metricLabel: 'Waves started', category: 'progression', categoryLabel: 'Wave / Progression', goal: 1100, difficulty: 'heavy' }),
  buildBounty({ id: 'trigger_300_multiwave_bonus', title: 'Trigger multi-wave bonus 300 times', detail: 'Trigger the multi-wave bonus 300 times this week.', metric: 'multiWaveBonusTriggers', metricLabel: 'Bonus triggers', category: 'progression', categoryLabel: 'Wave / Progression', goal: 300, difficulty: 'heavy', isMultiWave: true, selectionWeight: 1.2 }),
];

function pickWeeklyBountyTierEntries(pool: BountyDef[], count: number, rng: () => number, usedIds: Set<string>, options: { requireMultiWave?: boolean } = {}) {
  const chosen: BountyDef[] = [];
  const requiredMultiWave = !!options.requireMultiWave;
  const pickOne = (candidates: BountyDef[]) => {
    const available = (Array.isArray(candidates) ? candidates : []).filter((entry) => entry && !usedIds.has(entry.id));
    if (!available.length) return null;
    const previousCategory = chosen.length ? String(chosen[chosen.length - 1].category || '') : '';
    const withoutRepeat = previousCategory ? available.filter((entry) => String(entry.category || '') !== previousCategory) : available;
    return pickWeightedBounty(withoutRepeat.length ? withoutRepeat : available, rng);
  };
  if (requiredMultiWave) {
    const multiWavePick = pickOne((Array.isArray(pool) ? pool : []).filter((entry) => entry && entry.isMultiWave));
    if (multiWavePick) {
      chosen.push(multiWavePick);
      usedIds.add(multiWavePick.id);
    }
  }
  while (chosen.length < count) {
    const picked = pickOne(pool);
    if (!picked) break;
    chosen.push(picked);
    usedIds.add(picked.id);
  }
  return chosen;
}

function pickWeeklyBounties(weekKey: string) {
  const rng = seededRandom(`weekly-bounty:${weekKey}`);
  const usedIds = new Set<string>();
  const lightPool = BOUNTY_POOL.filter((entry) => entry.difficulty === 'low');
  const mediumPool = BOUNTY_POOL.filter((entry) => entry.difficulty === 'medium');
  const heavyPool = BOUNTY_POOL.filter((entry) => entry.difficulty === 'heavy');
  return [
    ...pickWeeklyBountyTierEntries(lightPool, 3, rng, usedIds, { requireMultiWave: true }),
    ...pickWeeklyBountyTierEntries(mediumPool, 3, rng, usedIds, { requireMultiWave: true }),
    ...pickWeeklyBountyTierEntries(heavyPool, 1, rng, usedIds),
  ].slice(0, 7);
}



type WeeklyTrackedRunRow = {
  id?: string | number | null;
  wave_reached?: number | null;
  completed_at?: string | null;
  created_at?: string | null;
  run_started_at?: string | null;
  chain_id?: number | null;
};

function isMissingColumnError(error: unknown) {
  const code = String((error as { code?: unknown } | null)?.code || '');
  const message = String((error as { message?: unknown } | null)?.message || '').toLowerCase();
  return code === '42703' || (message.includes('column') && message.includes('does not exist'));
}

function sanitizeInt(value: unknown) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.floor(num));
}

function isoTimeValue(value: unknown) {
  const text = String(value || '').trim();
  if (!text) return 0;
  const ms = new Date(text).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

async function listWeeklyRunsForWallet(admin: ReturnType<typeof createAdmin>, walletAddress: string, weekKey: string) {
  const startIso = `${weekKey}T00:00:00.000Z`;
  const endDate = new Date(startIso);
  endDate.setUTCDate(endDate.getUTCDate() + 7);
  const endIso = endDate.toISOString();

  const selectVariants = [
    'id, wave_reached, completed_at, created_at, run_started_at, chain_id',
    'id, wave_reached, completed_at, created_at, chain_id',
    'id, wave_reached, completed_at, chain_id',
    'id, wave_reached, completed_at',
    'id, wave_reached',
  ];

  for (const columns of selectVariants) {
    const { data, error } = await admin
      .from('runs')
      .select(columns)
      .eq('wallet_address', walletAddress)
      .gte('completed_at', startIso)
      .lt('completed_at', endIso)
      .order('completed_at', { ascending: true });
    if (!error) {
      return Array.isArray(data) ? data as WeeklyTrackedRunRow[] : [];
    }
    if (!isMissingColumnError(error)) throw error;
  }

  return [];
}

function buildTrackedRunsForViewer(
  viewerRuns: WeeklyTrackedRunRow[],
  claimRows: Array<Record<string, unknown>>,
  viewerWalletAddress: string,
  activeById: Map<string, BountyDef>,
) {
  const normalizedViewer = normalizeAddress(viewerWalletAddress);
  if (!normalizedViewer) return [];

  const runs = (Array.isArray(viewerRuns) ? viewerRuns : [])
    .map((row, index) => ({
      id: String(row.id || '').trim() || `run-${index + 1}`,
      runNumber: index + 1,
      bestWave: sanitizeInt(row.wave_reached),
      completedAt: String(row.completed_at || '').trim() || null,
      createdAt: String(row.created_at || '').trim() || null,
      runStartedAt: String(row.run_started_at || '').trim() || null,
      chainId: sanitizeInt(row.chain_id) || null,
      used: false,
      claimedBountyId: '',
      claimedBountyTitle: '',
      _sortTime: Math.max(
        isoTimeValue(row.completed_at),
        isoTimeValue(row.created_at),
        isoTimeValue(row.run_started_at),
      ),
    }))
    .filter((row) => row.bestWave > 0)
    .sort((a, b) => {
      if (a._sortTime !== b._sortTime) return a._sortTime - b._sortTime;
      if (a.bestWave !== b.bestWave) return a.bestWave - b.bestWave;
      return String(a.id).localeCompare(String(b.id));
    });

  const viewerClaims = (Array.isArray(claimRows) ? claimRows : [])
    .filter((row) => normalizeAddress(String(row.wallet_address || '')) === normalizedViewer)
    .sort((a, b) => {
      const aSlot = sanitizeInt(a.claim_slot);
      const bSlot = sanitizeInt(b.claim_slot);
      if (aSlot !== bSlot) return aSlot - bSlot;
      return isoTimeValue(a.claimed_at) - isoTimeValue(b.claimed_at);
    });

  let nextUnusedIndex = 0;
  for (const claim of viewerClaims) {
    while (nextUnusedIndex < runs.length && runs[nextUnusedIndex].used) nextUnusedIndex += 1;
    if (nextUnusedIndex >= runs.length) break;
    const bountyId = String(claim.bounty_id || '').trim();
    const bounty = activeById.get(bountyId) || null;
    runs[nextUnusedIndex].used = true;
    runs[nextUnusedIndex].claimedBountyId = bountyId;
    runs[nextUnusedIndex].claimedBountyTitle = bounty?.title || bountyId || 'Bounty claim';
    nextUnusedIndex += 1;
  }

  return runs.map(({ _sortTime, ...row }) => row);
}


Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200, headers: corsHeaders });

  const weekKey = weekKeyFromDate(new Date());
  const active = pickWeeklyBounties(weekKey);
  const emptyEntries = active.map((entry) => ({
    id: entry.id,
    title: entry.title,
    detail: entry.detail,
    metric: entry.metric,
    metricLabel: entry.metricLabel,
    goal: entry.goal,
    category: entry.category,
    categoryLabel: entry.categoryLabel,
    reward: entry.rewardPairText || entry.reward || '0.0005 AVAX or 5 JEWEL',
    rewardText: entry.rewardPairText || entry.rewardText || entry.reward || '0.0005 AVAX or 5 JEWEL',
    rewardPairText: entry.rewardPairText || entry.reward || '0.0005 AVAX or 5 JEWEL',
    rewardAvax: entry.rewardAvax || 0,
    rewardJewel: entry.rewardJewel || 0,
    rewardAvaxText: entry.rewardAvaxText || `${formatRewardValue(Number(entry.rewardAvax || 0) || 0)} AVAX`,
    rewardJewelText: entry.rewardJewelText || `${formatRewardValue(Number(entry.rewardJewel || 0) || 0)} JEWEL`,
    difficulty: entry.difficulty,
    difficultyLabel: entry.difficultyLabel,
    claimLimit: 3,
    claimCount: 0,
    claimants: [],
    viewerHasClaimed: false,
    status: 'open',
  }));

  try {
    const admin = createAdmin();
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const url = new URL(req.url);
    const walletAddress = normalizeAddress((body && typeof body === 'object' && 'walletAddress' in body ? body.walletAddress : null) || url.searchParams.get('walletAddress') || '');
    const activeIds = active.map((entry) => entry.id);
    const activeById = new Map(active.map((entry) => [entry.id, entry] as const));

    let claimRows: Array<Record<string, unknown>> = [];
    try {
      const { data, error } = await admin
        .from('weekly_bounty_claims')
        .select('bounty_id, wallet_address, claimant_name, claimed_at, claim_slot')
        .eq('week_key', weekKey)
        .in('bounty_id', activeIds)
        .order('claim_slot', { ascending: true });
      if (!error && Array.isArray(data)) {
        claimRows = data as Array<Record<string, unknown>>;
      } else if (error) {
        if (isMissingWeeklyClaimsTableError(error)) {
          const sourceRefs = activeIds.map((id) => `weekly_bounty:${weekKey}:${id}`);
          const { data: fallbackRows, error: fallbackError } = await admin
            .from('reward_claim_requests')
            .select('source_ref, wallet_address, player_name_snapshot, requested_at')
            .in('source_ref', sourceRefs)
            .order('requested_at', { ascending: true });
          if (!fallbackError && Array.isArray(fallbackRows)) {
            const slotByBounty = new Map<string, number>();
            claimRows = fallbackRows.map((row) => {
              const sourceRef = String(row.source_ref || '');
              const bountyId = sourceRef.split(':').slice(2).join(':');
              const nextSlot = (slotByBounty.get(bountyId) || 0) + 1;
              slotByBounty.set(bountyId, nextSlot);
              return {
                bounty_id: bountyId,
                wallet_address: row.wallet_address,
                claimant_name: row.player_name_snapshot,
                claimed_at: row.requested_at,
                claim_slot: nextSlot,
              };
            });
          } else if (fallbackError) {
            console.error('bounty-board fallback claim lookup failed:', fallbackError);
          }
        } else {
          console.error('bounty-board claim lookup failed:', error);
        }
      }
    } catch (claimLookupError) {
      console.error('bounty-board claim lookup threw:', claimLookupError);
    }

    const byId = new Map<string, Array<Record<string, unknown>>>();
    for (const row of claimRows) {
      const id = String(row.bounty_id || '');
      if (!byId.has(id)) byId.set(id, []);
      byId.get(id)!.push(row);
    }

    const entries = active.map((entry) => {
      const claims = byId.get(entry.id) || [];
      const claimants = claims.map((row) => String(row.claimant_name || row.wallet_address || '').trim()).filter(Boolean);
      const viewerHasClaimed = walletAddress ? claims.some((row) => normalizeAddress(String(row.wallet_address || '')) === walletAddress) : false;
      return {
        id: entry.id,
        title: entry.title,
        detail: entry.detail,
        metric: entry.metric,
        metricLabel: entry.metricLabel,
        goal: entry.goal,
        category: entry.category,
        categoryLabel: entry.categoryLabel,
        reward: entry.rewardPairText || entry.reward || '0.0005 AVAX or 5 JEWEL',
        rewardText: entry.rewardPairText || entry.rewardText || entry.reward || '0.0005 AVAX or 5 JEWEL',
        rewardPairText: entry.rewardPairText || entry.reward || '0.0005 AVAX or 5 JEWEL',
        rewardAvax: entry.rewardAvax || 0,
        rewardJewel: entry.rewardJewel || 0,
        rewardAvaxText: entry.rewardAvaxText || `${formatRewardValue(Number(entry.rewardAvax || 0) || 0)} AVAX`,
        rewardJewelText: entry.rewardJewelText || `${formatRewardValue(Number(entry.rewardJewel || 0) || 0)} JEWEL`,
        difficulty: entry.difficulty,
        difficultyLabel: entry.difficultyLabel,
        claimLimit: 3,
        claimCount: claims.length,
        claimants,
        viewerHasClaimed,
        status: claims.length >= 3 ? 'claimed' : 'open',
      };
    });

    let runs: Array<Record<string, unknown>> = [];
    try {
      if (walletAddress) {
        const viewerRuns = await listWeeklyRunsForWallet(admin, walletAddress, weekKey);
        runs = buildTrackedRunsForViewer(viewerRuns, claimRows, walletAddress, activeById);
      }
    } catch (runError) {
      console.error('bounty-board tracked runs lookup failed:', runError);
    }

    return json({
      ok: true,
      currentTime: new Date().toISOString(),
      nextRevealAt: nextWeekIso(weekKey),
      weekKey,
      entries,
      runs,
    });
  } catch (error) {
    console.error('bounty-board fatal error:', error);
    return json({
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to load bounty board.',
      currentTime: new Date().toISOString(),
      nextRevealAt: nextWeekIso(weekKey),
      weekKey,
      entries: emptyEntries,
      runs: [],
    }, 200);
  }
});
