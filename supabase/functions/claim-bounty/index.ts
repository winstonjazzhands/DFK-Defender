
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { loadValidWalletSession, normalizeAddress } from '../_shared/wallet-session.ts';
import { isAutoRewardPayoutConfigured, tryAutoPayRewardClaim } from '../_shared/reward-payout.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-token, x-wallet-address',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

function makeRequestId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function fingerprintToken(value: unknown) {
  const text = String(value || '').trim();
  if (!text) return null;
  return `${text.slice(0, 6)}…${text.slice(-4)}`;
}

function summarizeAddress(value: unknown) {
  const text = normalizeAddress(value);
  if (!text) return null;
  return `${text.slice(0, 6)}…${text.slice(-4)}`;
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
    buildBounty({ id: 'trigger_3000_multiwave_bonus', title: 'Trigger multi-wave bonus 3,000 times', detail: 'Trigger the multi-wave bonus 3,000 times this week.', metric: 'multiWaveBonusTriggers', metricLabel: 'Bonus triggers', category: 'progression', categoryLabel: 'Wave / Progression', goal: 3000, difficulty: 'low', isMultiWave: true, selectionWeight: 1.5 }),
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
    buildBounty({ id: 'complete_350_threewave', title: 'Complete 350 waves during 3-wave pressure', detail: 'Complete 350 waves with three live waves.', metric: 'wavesMulti3', metricLabel: '3-wave clears', category: 'progression', categoryLabel: 'Wave / Progression', goal: 3000, difficulty: 'medium', isMultiWave: true, selectionWeight: 1.2 }),
    buildBounty({ id: 'complete_750_multiwave', title: 'Complete 750 waves during multi-wave (2+)', detail: 'Complete 750 waves while 2+ live waves are active.', metric: 'wavesMulti2', metricLabel: '2+ wave clears', category: 'progression', categoryLabel: 'Wave / Progression', goal: 750, difficulty: 'medium', isMultiWave: true, selectionWeight: 1.25 }),
    buildBounty({ id: 'defeat_4500_threewave', title: 'Defeat 4,500 enemies during 3-wave pressure', detail: 'Defeat 4,500 enemies while three live waves are active.', metric: 'killsMulti3', metricLabel: '3-wave kills', category: 'combat', categoryLabel: 'Combat / Kill-Based', goal: 4500, difficulty: 'medium', isMultiWave: true, selectionWeight: 1.2 }),
    buildBounty({ id: 'trigger_1500_multiwave_bonus', title: 'Trigger multi-wave bonus 1,500 times', detail: 'Trigger the multi-wave bonus 1,500 times this week.', metric: 'multiWaveBonusTriggers', metricLabel: 'Bonus triggers', category: 'progression', categoryLabel: 'Wave / Progression', goal: 1500, difficulty: 'medium', isMultiWave: true, selectionWeight: 1.3 }),
    buildBounty({ id: 'spend_200k_gold', title: 'Spend 200,000 gold', detail: 'Spend 200,000 gold this week.', metric: 'goldSpent', metricLabel: 'Gold spent', category: 'economy', categoryLabel: 'Economy / Activity', goal: 200000, difficulty: 'medium' }),
    buildBounty({ id: 'earn_300k_gold', title: 'Earn 300,000 gold', detail: 'Earn 300,000 gold this week.', metric: 'goldEarned', metricLabel: 'Gold earned', category: 'economy', categoryLabel: 'Economy / Activity', goal: 300000, difficulty: 'medium' }),
    buildBounty({ id: 'hire_10_heroes', title: 'Hire 10 heroes', detail: 'Hire 10 heroes this week.', metric: 'heroesHired', metricLabel: 'Heroes hired', category: 'economy', categoryLabel: 'Economy / Activity', goal: 10, difficulty: 'medium' }),
    buildBounty({ id: 'open_150_relic_choices', title: 'Open 150 relic choices', detail: 'Open 150 relic choice windows this week.', metric: 'relicChoicesOpened', metricLabel: 'Relic choices opened', category: 'economy', categoryLabel: 'Economy / Activity', goal: 150, difficulty: 'medium' }),
  buildBounty({ id: 'defeat_75_bosses', title: 'Defeat 75 boss enemies', detail: 'Defeat 75 boss enemies this week.', metric: 'killsBoss', metricLabel: 'Bosses defeated', category: 'combat', categoryLabel: 'Combat / Kill-Based', goal: 75, difficulty: 'heavy' }),
  buildBounty({ id: 'complete_150_past_30', title: 'Complete 150 waves past wave 30', detail: 'Finish 150 waves numbered 31 or higher.', metric: 'wavesPast30', metricLabel: 'Waves beyond 30', category: 'progression', categoryLabel: 'Wave / Progression', goal: 150, difficulty: 'heavy' }),
  buildBounty({ id: 'complete_1100_waves', title: 'Complete 1,100 waves', detail: 'Finish 1,100 waves this week.', metric: 'wavesCompleted', metricLabel: 'Waves completed', category: 'progression', categoryLabel: 'Wave / Progression', goal: 1100, difficulty: 'heavy' }),
  buildBounty({ id: 'start_1100_waves', title: 'Start 1,100 waves', detail: 'Start 1,100 waves this week.', metric: 'wavesStarted', metricLabel: 'Waves started', category: 'progression', categoryLabel: 'Wave / Progression', goal: 1100, difficulty: 'heavy' }),
  buildBounty({ id: 'trigger_300_multiwave_bonus', title: 'Trigger multi-wave bonus 300 times', detail: 'Trigger the multi-wave bonus 300 times this week.', metric: 'multiWaveBonusTriggers', metricLabel: 'Bonus triggers', category: 'progression', categoryLabel: 'Wave / Progression', goal: 300, difficulty: 'heavy', isMultiWave: true, selectionWeight: 1.2 }),
];

const TEST_BOUNTY_WALLET = normalizeAddress('0x971bDACd04EF40141ddb6bA175d4f76665103c81');

function formatRewardStrings(rewardAvax: number, rewardJewel: number) {
  const avaxText = rewardAvax > 0 ? `${formatRewardValue(rewardAvax)} AVAX` : '';
  const jewelText = rewardJewel > 0 ? `${formatRewardValue(rewardJewel)} JEWEL` : '';
  const rewardPairText = avaxText && jewelText
    ? `${avaxText} or ${jewelText}`
    : (jewelText || avaxText || 'No reward');
  return {
    rewardAvaxText: avaxText,
    rewardJewelText: jewelText,
    rewardPairText,
    reward: rewardPairText,
    rewardText: rewardPairText,
  };
}

function isTestBountyWallet(walletAddress: string | null | undefined) {
  return normalizeAddress(walletAddress || '') === TEST_BOUNTY_WALLET;
}

function buildPrivateTestBounties() {
  return [
    buildBounty({ id: 'test_kills_10x1', title: 'Test: Defeat 10 enemies', detail: 'Defeat 10 enemies this week.', metric: 'killsTotal', metricLabel: 'Enemies defeated', category: 'test', categoryLabel: 'Private Test Bounties', goal: 10, difficulty: 'low', rewardAvax: 0, rewardJewel: 0.5, claimLimit: 1, selectionWeight: 1 }),
    buildBounty({ id: 'test_kills_10x2', title: 'Test: Defeat 20 enemies', detail: 'Defeat 20 enemies this week.', metric: 'killsTotal', metricLabel: 'Enemies defeated', category: 'test', categoryLabel: 'Private Test Bounties', goal: 20, difficulty: 'low', rewardAvax: 0, rewardJewel: 0.5, claimLimit: 1, selectionWeight: 1 }),
    buildBounty({ id: 'test_kills_10x3', title: 'Test: Defeat 30 enemies', detail: 'Defeat 30 enemies this week.', metric: 'killsTotal', metricLabel: 'Enemies defeated', category: 'test', categoryLabel: 'Private Test Bounties', goal: 30, difficulty: 'low', rewardAvax: 0, rewardJewel: 0.5, claimLimit: 1, selectionWeight: 1 }),
    buildBounty({ id: 'test_kills_10x4', title: 'Test: Defeat 40 enemies', detail: 'Defeat 40 enemies this week.', metric: 'killsTotal', metricLabel: 'Enemies defeated', category: 'test', categoryLabel: 'Private Test Bounties', goal: 40, difficulty: 'low', rewardAvax: 0, rewardJewel: 0.5, claimLimit: 1, selectionWeight: 1 }),
    buildBounty({ id: 'test_kills_10x5', title: 'Test: Defeat 50 enemies', detail: 'Defeat 50 enemies this week.', metric: 'killsTotal', metricLabel: 'Enemies defeated', category: 'test', categoryLabel: 'Private Test Bounties', goal: 50, difficulty: 'low', rewardAvax: 0, rewardJewel: 0.5, claimLimit: 1, selectionWeight: 1 }),
    buildBounty({ id: 'test_hero_kills_10', title: 'Test: Defeat 10 enemies with heroes', detail: 'Defeat 10 enemies with hero damage this week.', metric: 'heroKills', metricLabel: 'Hero kills', category: 'test', categoryLabel: 'Private Test Bounties', goal: 10, difficulty: 'low', rewardAvax: 0, rewardJewel: 0.5, claimLimit: 1, selectionWeight: 1 }),
    buildBounty({ id: 'test_hero_kills_20', title: 'Test: Defeat 20 enemies with heroes', detail: 'Defeat 20 enemies with hero damage this week.', metric: 'heroKills', metricLabel: 'Hero kills', category: 'test', categoryLabel: 'Private Test Bounties', goal: 20, difficulty: 'low', rewardAvax: 0, rewardJewel: 0.5, claimLimit: 1, selectionWeight: 1 }),
    buildBounty({ id: 'test_ability_kills_10', title: 'Test: Defeat 10 enemies with abilities', detail: 'Finish 10 enemies with abilities this week.', metric: 'abilityKills', metricLabel: 'Ability kills', category: 'test', categoryLabel: 'Private Test Bounties', goal: 10, difficulty: 'low', rewardAvax: 0, rewardJewel: 0.5, claimLimit: 1, selectionWeight: 1 }),
    buildBounty({ id: 'test_ability_kills_20', title: 'Test: Defeat 20 enemies with abilities', detail: 'Finish 20 enemies with abilities this week.', metric: 'abilityKills', metricLabel: 'Ability kills', category: 'test', categoryLabel: 'Private Test Bounties', goal: 20, difficulty: 'low', rewardAvax: 0, rewardJewel: 0.5, claimLimit: 1, selectionWeight: 1 }),
    buildBounty({ id: 'test_elites_5', title: 'Test: Defeat 5 elite enemies', detail: 'Defeat 5 elite enemies this week.', metric: 'killsElite', metricLabel: 'Elite enemies defeated', category: 'test', categoryLabel: 'Private Test Bounties', goal: 5, difficulty: 'low', rewardAvax: 0, rewardJewel: 0.5, claimLimit: 1, selectionWeight: 1 }),
    buildBounty({ id: 'test_boss_1', title: 'Test: Defeat 1 boss enemy', detail: 'Defeat 1 boss enemy this week.', metric: 'killsBoss', metricLabel: 'Bosses defeated', category: 'test', categoryLabel: 'Private Test Bounties', goal: 1, difficulty: 'low', rewardAvax: 0, rewardJewel: 0.5, claimLimit: 1, selectionWeight: 1 }),
    buildBounty({ id: 'test_barriers_5', title: 'Test: Place 5 barriers', detail: 'Place 5 barriers this week.', metric: 'barriersPlaced', metricLabel: 'Barriers placed', category: 'test', categoryLabel: 'Private Test Bounties', goal: 5, difficulty: 'low', rewardAvax: 0, rewardJewel: 0.5, claimLimit: 1, selectionWeight: 1 }),
    buildBounty({ id: 'test_wave_1', title: 'Test: Complete 1 wave', detail: 'Complete 1 wave this week.', metric: 'wavesCompleted', metricLabel: 'Waves completed', category: 'test', categoryLabel: 'Private Test Bounties', goal: 1, difficulty: 'low', rewardAvax: 0, rewardJewel: 0.5, claimLimit: 1, selectionWeight: 1 }),
    buildBounty({ id: 'test_wave_3', title: 'Test: Complete 3 waves', detail: 'Complete 3 waves this week.', metric: 'wavesCompleted', metricLabel: 'Waves completed', category: 'test', categoryLabel: 'Private Test Bounties', goal: 3, difficulty: 'low', rewardAvax: 0, rewardJewel: 0.5, claimLimit: 1, selectionWeight: 1 }),
    buildBounty({ id: 'test_start_3', title: 'Test: Start 3 waves', detail: 'Start 3 waves this week.', metric: 'wavesStarted', metricLabel: 'Waves started', category: 'test', categoryLabel: 'Private Test Bounties', goal: 3, difficulty: 'low', rewardAvax: 0, rewardJewel: 0.5, claimLimit: 1, selectionWeight: 1 }),
    buildBounty({ id: 'test_hire_1', title: 'Test: Hire 1 hero', detail: 'Hire 1 hero this week.', metric: 'heroesHired', metricLabel: 'Heroes hired', category: 'test', categoryLabel: 'Private Test Bounties', goal: 1, difficulty: 'low', rewardAvax: 0, rewardJewel: 0.5, claimLimit: 1, selectionWeight: 1 }),
    buildBounty({ id: 'test_hire_2', title: 'Test: Hire 2 heroes', detail: 'Hire 2 heroes this week.', metric: 'heroesHired', metricLabel: 'Heroes hired', category: 'test', categoryLabel: 'Private Test Bounties', goal: 2, difficulty: 'low', rewardAvax: 0, rewardJewel: 0.5, claimLimit: 1, selectionWeight: 1 }),
    buildBounty({ id: 'test_relic_1', title: 'Test: Open 1 relic choice', detail: 'Open 1 relic choice window this week.', metric: 'relicChoicesOpened', metricLabel: 'Relic choices opened', category: 'test', categoryLabel: 'Private Test Bounties', goal: 1, difficulty: 'low', rewardAvax: 0, rewardJewel: 0.5, claimLimit: 1, selectionWeight: 1 }),
    buildBounty({ id: 'test_gold_1000', title: 'Test: Earn 1,000 gold', detail: 'Earn 1,000 gold this week.', metric: 'goldEarned', metricLabel: 'Gold earned', category: 'test', categoryLabel: 'Private Test Bounties', goal: 1000, difficulty: 'low', rewardAvax: 0, rewardJewel: 0.5, claimLimit: 1, selectionWeight: 1 }),
    buildBounty({ id: 'test_damage_1000', title: 'Test: Deal 1,000 hero damage', detail: 'Deal 1,000 total damage with heroes this week.', metric: 'heroDamage', metricLabel: 'Hero damage', category: 'test', categoryLabel: 'Private Test Bounties', goal: 1000, difficulty: 'low', rewardAvax: 0, rewardJewel: 0.5, claimLimit: 1, selectionWeight: 1 }),
  ].map((entry) => ({
    ...entry,
    rewardAvax: 0,
    rewardJewel: 0.5,
    ...formatRewardStrings(0, 0.5),
    claimLimit: 1,
  }));
}

function buildActiveBounties(weekKey: string, walletAddress: string | null | undefined) {
  const active = pickWeeklyBounties(weekKey);
  if (!isTestBountyWallet(walletAddress)) return active;
  return [...active, ...buildPrivateTestBounties()];
}


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



async function ensurePlayerRow(admin: ReturnType<typeof createAdmin>, walletAddress: string, claimedByName: string | null) {
  const normalizedWallet = normalizeAddress(walletAddress);
  if (!normalizedWallet) return;
  const safeName = cleanName(claimedByName);
  const { error } = await admin
    .from('players')
    .upsert({
      wallet_address: normalizedWallet,
      display_name: safeName,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'wallet_address' });
  if (error) throw error;
}

function cleanName(value: unknown) {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || null;
}


function sanitizeMetricNumber(value: unknown) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  if (num <= 0) return 0;
  return num;
}

type WeeklyRunSummary = {
  wave_reached?: number | null;
  waves_cleared?: number | null;
  stats_json?: Record<string, unknown> | null;
  completed_at?: string | null;
  created_at?: string | null;
  run_started_at?: string | null;
};

async function listWeeklyRunsForWallet(admin: ReturnType<typeof createAdmin>, walletAddress: string, weekKey: string) {
  const startIso = `${weekKey}T00:00:00.000Z`;
  const endDate = new Date(startIso);
  endDate.setUTCDate(endDate.getUTCDate() + 7);
  const endIso = endDate.toISOString();
  const startMs = Date.parse(startIso);
  const endMs = Date.parse(endIso);
  const selectVariants = [
    'wave_reached, waves_cleared, stats_json, completed_at, created_at, run_started_at',
    'wave_reached, waves_cleared, stats_json, completed_at, created_at',
    'wave_reached, waves_cleared, stats_json, completed_at',
    'wave_reached, waves_cleared, completed_at',
    'wave_reached, completed_at',
    'wave_reached',
  ];
  const timeFields = ['completed_at', 'created_at', 'run_started_at'] as const;
  const pageSize = 1000;
  const normalizedWallet = normalizeAddress(walletAddress);
  const walletFilters = Array.from(new Set([normalizedWallet, walletAddress, String(walletAddress || '').trim()].filter(Boolean)));

  async function fetchRows(columns: string, timeField: typeof timeFields[number], walletFilter: string, useExactMatch: boolean) {
    const rows: WeeklyRunSummary[] = [];
    let from = 0;
    while (true) {
      const to = from + pageSize - 1;
      let query = admin
        .from('runs')
        .select(columns);
      query = useExactMatch
        ? query.eq('wallet_address', walletFilter)
        : query.ilike('wallet_address', walletFilter);
      if (columns.includes(timeField)) {
        query = query.gte(timeField, startIso).lt(timeField, endIso).order(timeField, { ascending: true });
      }
      const { data, error } = await query.range(from, to);
      if (error) {
        if (!isMissingColumnError(error)) throw error;
        return null;
      }
      const batch = Array.isArray(data) ? data as WeeklyRunSummary[] : [];
      if (!columns.includes(timeField)) {
        rows.push(...batch.filter((row) => {
          const timeMs = Math.max(
            isoTimeValue(row.completed_at),
            isoTimeValue(row.created_at),
            isoTimeValue(row.run_started_at),
          );
          return timeMs >= startMs && timeMs < endMs;
        }));
      } else {
        rows.push(...batch);
      }
      if (batch.length < pageSize) break;
      from += pageSize;
    }
    return rows;
  }

  for (const timeField of timeFields) {
    for (const columns of selectVariants) {
      let hadMissingColumn = false;
      for (const walletFilter of walletFilters) {
        for (const useExactMatch of [true, false]) {
          const rows = await fetchRows(columns, timeField, walletFilter, useExactMatch);
          if (rows === null) {
            hadMissingColumn = true;
            break;
          }
          if (rows.length > 0) return rows;
        }
        if (hadMissingColumn) break;
      }
      if (!hadMissingColumn) {
        for (const walletFilter of walletFilters) {
          for (const useExactMatch of [true, false]) {
            const rows = await fetchRows('wave_reached, waves_cleared, stats_json, completed_at, created_at, run_started_at', 'completed_at', walletFilter, useExactMatch);
            if (rows && rows.length > 0) return rows;
          }
        }
        return [];
      }
    }
  }
  return [];
}

function computeWeeklyBountyMetricFromRuns(runs: WeeklyRunSummary[], metric: string) {
  const rows = Array.isArray(runs) ? runs : [];
  let total = 0;
  for (const row of rows) {
    const stats = row?.stats_json && typeof row.stats_json === 'object'
      ? row.stats_json as Record<string, unknown>
      : {};
    if (metric === 'runsReach20') {
      const waveReached = Number(row?.wave_reached || 0) || 0;
      if (waveReached >= 20) total += 1;
      continue;
    }
    if (metric === 'wavesCompleted') {
      const fromStats = sanitizeMetricNumber(stats.wavesCompleted);
      const fallback = sanitizeMetricNumber(row?.waves_cleared);
      total += Math.max(fromStats, fallback);
      continue;
    }
    if (metric === 'wavesStarted') {
      const fromStats = sanitizeMetricNumber(stats.wavesStarted);
      const fallback = sanitizeMetricNumber(row?.wave_reached);
      total += Math.max(fromStats, fallback);
      continue;
    }
    total += sanitizeMetricNumber(stats[metric]);
  }
  return total;
}

async function getWhitelistDecision(admin: ReturnType<typeof createAdmin>, walletAddress: string, numericAmount: number | null, claimDay: string) {
  const { data: rule, error: ruleError } = await admin
    .from('reward_claim_whitelist')
    .select('auto_bounty, is_active, max_claim_amount, daily_cap, notes')
    .eq('wallet_address', walletAddress)
    .maybeSingle();
  if (ruleError) {
    console.error('claim-bounty whitelist lookup failed:', ruleError);
    return { autoApprove: false, note: null as string | null };
  }
  if (!rule || !rule.is_active || !rule.auto_bounty) return { autoApprove: false, note: null as string | null };
  const amount = Number(numericAmount || 0) || 0;
  if (Number(rule.max_claim_amount || 0) > 0 && amount > Number(rule.max_claim_amount || 0)) return { autoApprove: false, note: 'Whitelist max claim amount prevented auto-approval.' };
  if (Number(rule.daily_cap || 0) > 0) {
    const { data: sameDayRows, error: sameDayError } = await admin
      .from('reward_claim_requests')
      .select('amount_value, status')
      .eq('wallet_address', walletAddress)
      .eq('claim_day', claimDay)
      .in('status', ['approved', 'paid']);
    if (sameDayError) {
      console.error('claim-bounty whitelist daily-cap lookup failed:', sameDayError);
      return { autoApprove: false, note: 'Whitelist lookup failed. Claim left pending for review.' };
    }
    const usedToday = (sameDayRows || []).reduce((sum, row) => sum + (Number(row.amount_value || 0) || 0), 0);
    if ((usedToday + amount) > Number(rule.daily_cap || 0)) return { autoApprove: false, note: 'Whitelist daily cap prevented auto-approval.' };
  }
  return { autoApprove: true, note: cleanName(rule.notes) || 'Auto-approved by whitelist rule.' };
}



function isMissingWeeklyClaimsTableError(error: unknown) {
  const code = String((error as { code?: unknown } | null)?.code || '');
  const message = String((error as { message?: unknown } | null)?.message || '').toLowerCase();
  return code === 'PGRST205' || (message.includes('weekly_bounty_claims') && message.includes('could not find the table'));
}

async function listWeeklyBountyClaimsCompat(admin: ReturnType<typeof createAdmin>, weekKey: string, bountyId: string) {
  const { data, error } = await admin
    .from('weekly_bounty_claims')
    .select('id, claim_slot, wallet_address, claimant_name, reward_claim_request_id')
    .eq('week_key', weekKey)
    .eq('bounty_id', bountyId)
    .order('claim_slot', { ascending: true });
  if (!error) return { rows: Array.isArray(data) ? data : [], mode: 'weekly_bounty_claims' as const };
  if (!isMissingWeeklyClaimsTableError(error)) throw error;

  const sourceRef = `weekly_bounty:${weekKey}:${bountyId}`;
  const { data: fallback, error: fallbackError } = await admin
    .from('reward_claim_requests')
    .select('id, wallet_address, player_name_snapshot, requested_at, status, reward_currency, amount_text')
    .eq('source_ref', sourceRef)
    .order('requested_at', { ascending: true });
  if (fallbackError) throw fallbackError;
  const rows = (Array.isArray(fallback) ? fallback : []).map((row, index) => ({
    id: row.id,
    claim_slot: index + 1,
    wallet_address: row.wallet_address,
    claimant_name: row.player_name_snapshot,
    reward_claim_request_id: row.id,
    requested_at: row.requested_at,
    status: row.status,
    reward_currency: row.reward_currency,
    amount_text: row.amount_text,
  }));
  return { rows, mode: 'reward_claim_requests' as const };
}

async function ensureWeeklyBountyClaimRow(admin: ReturnType<typeof createAdmin>, params: { weekKey: string; bountyId: string; walletAddress: string; claimedByName: string; rewardClaimRequestId: string | null; }) {
  const { weekKey, bountyId, walletAddress, claimedByName, rewardClaimRequestId } = params;
  try {
    const { data: existingRow } = await admin
      .from('weekly_bounty_claims')
      .select('id, claim_slot')
      .eq('week_key', weekKey)
      .eq('bounty_id', bountyId)
      .eq('wallet_address', walletAddress)
      .maybeSingle();
    if (existingRow?.id) return existingRow;

    const { data: currentClaims, error: claimsError } = await admin
      .from('weekly_bounty_claims')
      .select('claim_slot')
      .eq('week_key', weekKey)
      .eq('bounty_id', bountyId)
      .order('claim_slot', { ascending: true });
    if (claimsError) throw claimsError;
    const claimCount = (currentClaims || []).length;
    if (claimCount >= 3) throw new Error('This weekly bounty is already closed.');

    const claimSlot = claimCount + 1;
    const { data: insertedRow, error: insertError } = await admin
      .from('weekly_bounty_claims')
      .insert({
        week_key: weekKey,
        bounty_id: bountyId,
        wallet_address: walletAddress,
        claimant_name: claimedByName,
        claim_slot: claimSlot,
        reward_claim_request_id: rewardClaimRequestId,
      })
      .select('id, claim_slot')
      .single();
    if (!insertError) return insertedRow;

    const duplicateLike = /duplicate|unique/i.test(String(insertError.message || ''));
    if (duplicateLike) {
      const { data: retryRow, error: retryError } = await admin
        .from('weekly_bounty_claims')
        .select('id, claim_slot')
        .eq('week_key', weekKey)
        .eq('bounty_id', bountyId)
        .eq('wallet_address', walletAddress)
        .maybeSingle();
      if (retryError) throw retryError;
      if (retryRow?.id) return retryRow;
    }
    throw insertError;
  } catch (error) {
    if (!isMissingWeeklyClaimsTableError(error)) throw error;
    const fallbackClaims = await listWeeklyBountyClaimsCompat(admin, weekKey, bountyId);
    const existingRow = fallbackClaims.rows.find((row) => normalizeAddress(String(row.wallet_address || '')) === walletAddress);
    if (existingRow?.id) return { id: existingRow.id, claim_slot: existingRow.claim_slot };
    if (fallbackClaims.rows.length >= 3) throw new Error('This weekly bounty is already closed.');
    return { id: rewardClaimRequestId || `${weekKey}:${bountyId}:${walletAddress}`, claim_slot: fallbackClaims.rows.length + 1 };
  }
}

async function selectMaybeSingleCompat(admin: ReturnType<typeof createAdmin>, table: string, selectVariants: string[], apply: (query: any) => any) {
  let lastError: unknown = null;
  for (const columns of selectVariants) {
    const query = apply(admin.from(table).select(columns));
    const { data, error } = await query.maybeSingle();
    if (!error) return { data, columns };
    const message = String((error as { message?: unknown } | null)?.message || '').toLowerCase();
    lastError = error;
    if (message.includes('column') && message.includes('does not exist')) continue;
    throw error;
  }
  if (lastError) throw lastError;
  return { data: null, columns: '' };
}

async function ensurePlayerRowCompat(admin: ReturnType<typeof createAdmin>, walletAddress: string, claimedByName: string | null) {
  const normalizedWallet = normalizeAddress(walletAddress);
  if (!normalizedWallet) return;
  const safeName = cleanName(claimedByName);
  const variants = [
    { wallet_address: normalizedWallet, display_name: safeName, updated_at: new Date().toISOString() },
    { wallet_address: normalizedWallet, display_name: safeName },
    { wallet_address: normalizedWallet },
  ];
  let lastError: unknown = null;
  for (const payload of variants) {
    const { error } = await admin.from('players').upsert(payload, { onConflict: 'wallet_address' });
    if (!error) return;
    const message = String((error as { message?: unknown } | null)?.message || '').toLowerCase();
    lastError = error;
    if (message.includes('column') && message.includes('does not exist')) continue;
    throw error;
  }
  if (lastError) throw lastError;
}

async function insertRewardClaimCompat(admin: ReturnType<typeof createAdmin>, payload: Record<string, unknown>) {
  const variants = [
    payload,
    Object.fromEntries(Object.entries(payload).filter(([k]) => !['approved_at','resolved_at','resolved_by_wallet','admin_note','failure_reason'].includes(k))),
    Object.fromEntries(Object.entries(payload).filter(([k]) => !['approved_at','resolved_at','resolved_by_wallet','admin_note','failure_reason','amount_value','reward_currency','source_ref'].includes(k))),
  ];
  const selectVariants = [
    'id, status, tx_hash, paid_at, reward_currency, amount_value, amount_text, wallet_address, admin_note, approved_at, resolved_at, resolved_by_wallet, failure_reason',
    'id, status, tx_hash, paid_at, reward_currency, amount_value, amount_text, wallet_address, admin_note',
    'id, status, amount_text, wallet_address',
  ];
  let lastError: unknown = null;
  for (const variant of variants) {
    for (const selectCols of selectVariants) {
      const { data, error } = await admin.from('reward_claim_requests').insert(variant).select(selectCols).maybeSingle();
      if (!error && data) return data;
      const message = String((error as { message?: unknown } | null)?.message || '').toLowerCase();
      lastError = error;
      if (message.includes('column') && message.includes('does not exist')) continue;
      if (message.includes('duplicate') || message.includes('unique')) throw error;
      if (error) break;
    }
  }
  if (lastError) throw lastError;
  throw new Error('Failed to create reward claim request.');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200, headers: corsHeaders });
  const requestId = makeRequestId('claimbounty');
  try {
    const body = await req.clone().json().catch(() => ({}));
    const requestHeaders = new Headers(req.headers);
    const bodySessionToken = String((body as Record<string, unknown>)?.sessionToken || '').trim();
    if (bodySessionToken && !String(requestHeaders.get('x-session-token') || '').trim()) {
      requestHeaders.set('x-session-token', bodySessionToken);
    }
    console.log('claim-bounty request', {
      requestId,
      method: req.method,
      walletAddress: summarizeAddress((body as Record<string, unknown>).walletAddress),
      bountyId: String((body as Record<string, unknown>).bountyId || '').trim() || null,
      rewardCurrency: String((body as Record<string, unknown>).rewardCurrency || '').trim().toUpperCase() || null,
      sessionTokenFingerprint: fingerprintToken(bodySessionToken || String(requestHeaders.get('x-session-token') || '')),
    });
    const sessionReq = new Request(req.url, { method: req.method, headers: requestHeaders });

    const admin = createAdmin();
    const sessionResult = await loadValidWalletSession(admin, sessionReq, corsHeaders, { validateContext: true });
    if (sessionResult.response) {
      console.warn('claim-bounty session rejected', {
        requestId,
        sessionTokenFingerprint: fingerprintToken(bodySessionToken || String(requestHeaders.get('x-session-token') || '')),
      });
      return sessionResult.response;
    }
    const session = sessionResult.session;
    if (!session) return json({ error: 'Session not found.' }, 401);

    const walletAddress = normalizeAddress((body.walletAddress as string) || (body.wallet_address as string) || String(requestHeaders.get('x-wallet-address') || ''));
    const bountyId = String(body.bountyId || '').trim();
    const rewardCurrency = String(body.rewardCurrency || '').trim().toUpperCase();
    if (!walletAddress || walletAddress !== normalizeAddress(session.wallet_address)) {
      console.warn('claim-bounty wallet mismatch', {
        requestId,
        requestWallet: summarizeAddress(walletAddress),
        sessionWallet: summarizeAddress(session.wallet_address),
      });
      return json({ error: 'Wallet mismatch.' }, 401);
    }
    if (!bountyId) return json({ error: 'Missing bounty id.' }, 400);
    if (!['AVAX', 'JEWEL'].includes(rewardCurrency)) return json({ error: 'Choose AVAX or JEWEL before claiming.' }, 400);

    const weekKey = weekKeyFromDate(new Date());
    const active = buildActiveBounties(weekKey, walletAddress);
    const bounty = active.find((entry) => entry.id === bountyId);
    if (!bounty) return json({ error: 'That bounty is not active this week.' }, 409);

    const weeklyRuns = await listWeeklyRunsForWallet(admin, walletAddress, weekKey);
    const serverProgress = computeWeeklyBountyMetricFromRuns(weeklyRuns, String(bounty.metric || ''));
    if (serverProgress < Number(bounty.goal || 0)) {
      console.log('claim-bounty incomplete', {
        requestId,
        walletAddress: summarizeAddress(walletAddress),
        bountyId,
        progress: serverProgress,
        goal: Number(bounty.goal || 0) || 0,
        metric: bounty.metric,
      });
      return json({
        error: 'That weekly bounty is not complete yet.',
        progress: serverProgress,
        goal: Number(bounty.goal || 0) || 0,
        metric: bounty.metric,
        metricLabel: bounty.metricLabel || bounty.metric,
      }, 409);
    }

    const existingClaimsResult = await listWeeklyBountyClaimsCompat(admin, weekKey, bountyId);
    const existingClaim = existingClaimsResult.rows.find((row) => normalizeAddress(String(row.wallet_address || '')) === walletAddress);
    if (existingClaim?.id) return json({ ok: true, title: bounty.title, status: 'claimed', progress: serverProgress, goal: Number(bounty.goal || 0) || 0, metric: bounty.metric, message: `You already claimed ${bounty.title} this week.` });

    const claimCount = existingClaimsResult.rows.length;
    const claimLimit = Math.max(1, Number(bounty.claimLimit || 3) || 3);
    if (claimCount >= claimLimit) {
      console.log('claim-bounty closed', { requestId, bountyId, claimCount });
      return json({ error: 'This weekly bounty is already closed.' }, 409);
    }

    const { data: player } = await admin
      .from('players')
      .select('display_name, vanity_name')
      .eq('wallet_address', walletAddress)
      .maybeSingle();
    const claimedByName = cleanName(player?.vanity_name) || cleanName(player?.display_name) || walletAddress;
    await ensurePlayerRowCompat(admin, walletAddress, claimedByName);
    const now = new Date();
    const claimDay = now.toISOString().slice(0, 10);
    const amountValue = rewardCurrency === 'JEWEL'
      ? (Math.max(0, Number(bounty.rewardJewel || 0) || 0))
      : (Number(bounty.rewardAvax || 0) || 0);
    if (amountValue <= 0) return json({ error: `This bounty does not have a valid ${rewardCurrency} reward configured.` }, 500);
    const rewardText = rewardCurrency === 'JEWEL'
      ? `${formatRewardValue(amountValue)} JEWEL`
      : `${formatRewardValue(amountValue)} AVAX`;
    const requestCurrency = rewardCurrency;
    const requestKey = `weekly_bounty:${weekKey}:${bountyId}:${walletAddress}`;

    const { data: existingReward } = await selectMaybeSingleCompat(
      admin,
      'reward_claim_requests',
      [
        'id, status, tx_hash, paid_at, reward_currency, amount_text',
        'id, status, reward_currency, amount_text',
        'id, status, amount_text',
      ],
      (query) => query.eq('request_key', requestKey),
    );
    if (existingReward?.id) {
      await ensureWeeklyBountyClaimRow(admin, {
        weekKey,
        bountyId,
        walletAddress,
        claimedByName,
        rewardClaimRequestId: existingReward.id,
      });
      return json({ ok: true, title: bounty.title, status: existingReward.status || 'pending', rewardCurrency: existingReward.reward_currency || null, rewardText: existingReward.amount_text || null, txHash: existingReward.tx_hash || null, progress: serverProgress, goal: Number(bounty.goal || 0) || 0, metric: bounty.metric, message: `You already claimed ${bounty.title} this week.` });
    }

    const whitelistDecision = await getWhitelistDecision(admin, walletAddress, amountValue, claimDay);
    const insertedClaim = await insertRewardClaimCompat(admin, {
        request_key: requestKey,
        wallet_address: walletAddress,
        claim_type: 'bounty',
        status: whitelistDecision.autoApprove ? 'approved' : 'pending',
        player_name_snapshot: claimedByName,
        amount_text: rewardText,
        amount_value: amountValue,
        reward_currency: requestCurrency,
        reason_text: bounty.title,
        source_ref: `weekly_bounty:${weekKey}:${bountyId}`,
        claim_day: claimDay,
        approved_at: whitelistDecision.autoApprove ? now.toISOString() : null,
        resolved_at: whitelistDecision.autoApprove ? now.toISOString() : null,
        resolved_by_wallet: whitelistDecision.autoApprove ? 'whitelist:auto' : null,
        admin_note: whitelistDecision.note,
        failure_reason: null,
      });

    await ensureWeeklyBountyClaimRow(admin, {
      weekKey,
      bountyId,
      walletAddress,
      claimedByName,
      rewardClaimRequestId: insertedClaim.id,
    });

    let status = insertedClaim.status || 'pending';
    let txHash = insertedClaim.tx_hash || null;
    let message = `${claimedByName} claimed ${bounty.title}.`;
    if (whitelistDecision.autoApprove && insertedClaim?.id) {
      const payoutResult = await tryAutoPayRewardClaim(admin, {
        id: insertedClaim.id,
        wallet_address: insertedClaim.wallet_address || walletAddress,
        status: insertedClaim.status,
        amount_value: insertedClaim.amount_value,
        reward_currency: insertedClaim.reward_currency,
        amount_text: insertedClaim.amount_text,
        admin_note: insertedClaim.admin_note,
        approved_at: insertedClaim.approved_at,
        resolved_at: insertedClaim.resolved_at,
        resolved_by_wallet: insertedClaim.resolved_by_wallet,
        tx_hash: insertedClaim.tx_hash,
        paid_at: insertedClaim.paid_at,
        failure_reason: insertedClaim.failure_reason,
      });
      if (payoutResult.paid) {
        status = 'paid';
        txHash = payoutResult.txHash || null;
        message = `${claimedByName} claimed ${bounty.title} and treasury paid it automatically.`;
      } else if (payoutResult.attempted) {
        status = 'approved';
        message = `${claimedByName} claimed ${bounty.title}. Auto-approved, but treasury payout needs review: ${payoutResult.message}`;
      } else if (isAutoRewardPayoutConfigured()) {
        message = `${claimedByName} claimed ${bounty.title}. Auto-approved. ${payoutResult.message}`;
      }
    }

    console.log('claim-bounty success', {
      requestId,
      walletAddress: summarizeAddress(walletAddress),
      bountyId,
      rewardCurrency: requestCurrency,
      status,
      txHash: txHash || null,
      progress: serverProgress,
      goal: Number(bounty.goal || 0) || 0,
    });
    return json({ ok: true, title: bounty.title, rewardCurrency: requestCurrency, rewardText, amountText: rewardText, status, txHash, progress: serverProgress, goal: Number(bounty.goal || 0) || 0, metric: bounty.metric, message });
  } catch (error) {
    console.error('claim-bounty fatal error:', {
      requestId,
      ...(error instanceof Error ? { message: error.message, stack: error.stack } : { error }),
    });
    return json({ error: error instanceof Error ? error.message : 'Failed to claim bounty.' }, 500);
  }
});
