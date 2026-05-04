import { createClient } from 'jsr:@supabase/supabase-js@2';
import { ethers } from 'npm:ethers@6.13.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, cache-control',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const RARITY_NAMES: Record<number, string> = Object.freeze({
  0: 'Common',
  1: 'Uncommon',
  2: 'Rare',
  3: 'Legendary',
  4: 'Mythic',
});

const CLASS_NAMES: Record<number, string> = Object.freeze({
  0: 'Warrior',
  1: 'Knight',
  2: 'Thief',
  3: 'Archer',
  4: 'Priest',
  5: 'Wizard',
  6: 'Monk',
  7: 'Pirate',
  8: 'Berserker',
  9: 'Seer',
  10: 'Legionnaire',
  11: 'Scholar',
  16: 'Paladin',
  17: 'DarkKnight',
  18: 'Summoner',
  19: 'Ninja',
  20: 'Shapeshifter',
  21: 'Bard',
  24: 'Dragoon',
  25: 'Sage',
  26: 'SpellBow',
  28: 'DreadKnight',
});

const PLAYABLE_CLASS_IDS = new Set([0, 3, 4, 5, 6, 8, 25]);
const METIS_GEN0_INFLUENCE_THRESHOLD = 100000n;

const CHAIN_CONFIGS = {
  dfk: {
    key: 'dfk',
    chainId: 53935,
    rpcUrl: 'https://subnets.avax.network/defi-kingdoms/dfk-chain/rpc',
    heroAddress: '0xEb9B61B145D6489Be575D3603F4a704810e143dF',
  },
  metis: {
    key: 'metis',
    chainId: 1088,
    rpcUrl: 'https://andromeda.metis.io/?owner=1088',
    heroAddress: '0xc7681698B14a2381d9f1eD69FC3D27F33965b53B',
  },
} as const;

type ChainKey = keyof typeof CHAIN_CONFIGS;
type IndexedHero = {
  wallet_address: string;
  hero_id: string;
  chain_id: number;
  chain_name: string;
  class_id: number | null;
  class_name: string | null;
  level: number | null;
  rarity_id: number | null;
  rarity_name: string | null;
  generation: number | null;
  is_gen0: boolean;
  influence_score: string | null;
  influence_value: string | null;
  summons_remaining: number | null;
  eligible: boolean;
  source?: string;
  index_status?: string;
  indexed_at?: string;
  last_seen_at?: string;
  index_error?: string | null;
  updated_at: string;
};

function createAdmin() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function normalizeAddress(value: unknown) {
  const text = String(value || '').trim().toLowerCase();
  return /^0x[a-f0-9]{40}$/.test(text) ? text : '';
}

function toNumber(value: unknown, fallback: number | null = null) {
  const n = Number(value ?? NaN);
  return Number.isFinite(n) ? n : fallback;
}

function toBigIntString(value: unknown) {
  try {
    if (value == null) return null;
    return BigInt(String(value)).toString();
  } catch (_error) {
    return null;
  }
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: number | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms) as unknown as number;
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

const DFK_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
  'function getHeroV3(uint256 _id) view returns (tuple(uint256 id, tuple(uint256 summonedTime, uint256 nextSummonTime, uint256 summonerId, uint256 assistantId, uint32 summons, uint32 maxSummons) summoningInfo, tuple(uint256 statGenes, uint256 visualGenes, uint8 rarity, bool shiny, uint16 generation, uint32 firstName, uint32 lastName, uint8 shinyStyle, uint8 class, uint8 subClass) info, tuple(uint256 staminaFullAt, uint256 hpFullAt, uint256 mpFullAt, uint16 level, uint64 xp, address currentQuest, uint8 sp, uint8 status) state, tuple(uint16 strength, uint16 intelligence, uint16 wisdom, uint16 luck, uint16 agility, uint16 vitality, uint16 endurance, uint16 dexterity, uint16 hp, uint16 mp, uint16 stamina) stats, tuple(uint16 strength, uint16 intelligence, uint16 wisdom, uint16 luck, uint16 agility, uint16 vitality, uint16 endurance, uint16 dexterity, uint16 hpSm, uint16 hpRg, uint16 hpLg, uint16 mpSm, uint16 mpRg, uint16 mpLg) primaryStatGrowth, tuple(uint16 strength, uint16 intelligence, uint16 wisdom, uint16 luck, uint16 agility, uint16 vitality, uint16 endurance, uint16 dexterity, uint16 hpSm, uint16 hpRg, uint16 hpLg, uint16 mpSm, uint16 mpRg, uint16 mpLg) secondaryStatGrowth, tuple(uint16 mining, uint16 gardening, uint16 foraging, uint16 fishing, uint16 craft1, uint16 craft2) professions, tuple(uint256 equippedSlots, uint256 petId, uint128 weapon1Id, uint128 weapon1VisageId, uint128 weapon2Id, uint128 weapon2VisageId, uint128 offhand1Id, uint128 offhand1VisageId, uint128 offhand2Id, uint128 offhand2VisageId, uint128 armorId, uint128 armorVisageId, uint128 accessoryId, uint128 accessoryVisageId) equipment))',
];

const METIS_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function getHero(uint256 _heroId) view returns (tuple(uint256 id, uint256 realmId, uint256 xp, uint256 level, uint256 class, uint256 subclass, uint256 rarity, uint256 summonsRemaining, uint256 hpSmallGrowth, uint256 hpMediumGrowth, uint256 hpLargeGrowth, uint256 equippedSlots, uint256 petId, uint8 state, uint256 strength, uint256 dexterity, uint256 agility, uint256 vitality, uint256 endurance, uint256 intelligence, uint256 wisdom, uint256 luck, uint256 hp, uint256 mp, uint256 baseSTR, uint256 baseDEX, uint256 baseAGI, uint256 baseVIT, uint256 baseEND, uint256 baseINT, uint256 baseWIS, uint256 baseLCK, uint256 baseHP, uint256 baseMP, uint256 lesserCrystals, uint256 regularCrystals, uint256 greaterCrystals, uint256 stoneTier, uint256 levelResets, uint256 resetFrom, uint256 rerollCost, uint256 levelCarryover, bool perilousJourneySurvivor, uint256 strengthPGrowth, uint256 strengthSGrowth, uint256 dexterityPGrowth, uint256 dexteritySGrowth, uint256 agilityPGrowth, uint256 agilitySGrowth, uint256 vitalityPGrowth, uint256 vitalitySGrowth, uint256 endurancePGrowth, uint256 enduranceSGrowth, uint256 intelligencePGrowth, uint256 intelligenceSGrowth, uint256 wisdomPGrowth, uint256 wisdomSGrowth, uint256 luckPGrowth, uint256 luckSGrowth, uint256 mpSmallGrowth, uint256 mpMediumGrowth, uint256 mpLargeGrowth, uint256 weapon1Id, uint256 weapon1VisageId, uint256 weapon2Id, uint256 weapon2VisageId, uint256 offhand1Id, uint256 offhand1VisageId, uint256 offhand2Id, uint256 offhand2VisageId, uint256 armorId, uint256 armorVisageId, uint256 accessoryId, uint256 accessoryVisageId))',
  'function getHeroInfluenceData(uint256 _heroId) view returns (uint256 score, uint256 influence, uint256 daysLocked)',
];

async function getOwnedHeroIds(provider: ethers.JsonRpcProvider, contract: ethers.Contract, wallet: string, mode: ChainKey) {
  const balance = Number(await withTimeout(contract.balanceOf(wallet), 12000, `${mode}.balanceOf`));
  const ids: string[] = [];
  if (balance <= 0) return ids;

  try {
    const indexBatchSize = 80;
    for (let start = 0; start < balance; start += indexBatchSize) {
      const count = Math.min(indexBatchSize, balance - start);
      const batch = await withTimeout(
        Promise.all(Array.from({ length: count }, (_, i) => contract.tokenOfOwnerByIndex(wallet, start + i))),
        20000,
        `${mode}.tokenOfOwnerByIndex`,
      );
      ids.push(...batch.map((id) => id.toString()));
    }
    return ids;
  } catch (error) {
    if (mode !== 'metis') throw error;
  }

  // Metis can fail ERC721 enumeration for some wallets. Fallback to Transfer log discovery.
  const ownerTopic = ethers.zeroPadValue(wallet, 32).toLowerCase();
  const transferTopic = ethers.id('Transfer(address,address,uint256)');
  const latestBlock = Number(await provider.getBlockNumber());
  const candidateHeroIds = new Set<string>();
  const logChunkSize = 100000;
  for (let fromBlock = 0; fromBlock <= latestBlock; fromBlock += logChunkSize) {
    const toBlock = Math.min(latestBlock, fromBlock + logChunkSize - 1);
    const logs = await withTimeout(
      provider.getLogs({ address: CHAIN_CONFIGS.metis.heroAddress, fromBlock, toBlock, topics: [transferTopic, null, ownerTopic] }),
      20000,
      `metis.getLogs ${fromBlock}-${toBlock}`,
    );
    for (const log of logs) {
      try { candidateHeroIds.add(BigInt(log.topics[3]).toString()); } catch (_error) {}
    }
  }
  const candidateList = Array.from(candidateHeroIds.values());
  const ownerBatchSize = 40;
  for (let start = 0; start < candidateList.length; start += ownerBatchSize) {
    const batch = candidateList.slice(start, start + ownerBatchSize);
    const ownershipChecks = await withTimeout(Promise.all(batch.map(async (heroId) => {
      try {
        const owner = await contract.ownerOf(heroId);
        return String(owner || '').toLowerCase() === wallet ? heroId : '';
      } catch (_error) {
        return '';
      }
    })), 20000, 'metis.ownerOf batch');
    ids.push(...ownershipChecks.filter(Boolean));
  }
  return ids;
}

async function fetchChainHeroes(wallet: string, chainKey: ChainKey, updatedAt: string): Promise<IndexedHero[]> {
  const config = CHAIN_CONFIGS[chainKey];
  const provider = new ethers.JsonRpcProvider(config.rpcUrl, config.chainId, { staticNetwork: true });
  const contract = new ethers.Contract(config.heroAddress, chainKey === 'metis' ? METIS_ABI : DFK_ABI, provider);
  const ids = await getOwnedHeroIds(provider, contract, wallet, chainKey);
  const rows: IndexedHero[] = [];
  const batchSize = chainKey === 'metis' ? 16 : 24;

  for (let start = 0; start < ids.length; start += batchSize) {
    const batch = ids.slice(start, start + batchSize);
    const batchRows = await Promise.all(batch.map(async (heroId) => {
      if (chainKey === 'dfk') {
        const core = await withTimeout(contract.getHeroV3(heroId), 16000, `dfk.getHeroV3 ${heroId}`);
        const classId = toNumber(core?.info?.class, null);
        const rarityId = toNumber(core?.info?.rarity, null);
        const generation = toNumber(core?.info?.generation, null);
        return {
          wallet_address: wallet,
          hero_id: String(heroId),
          chain_id: config.chainId,
          chain_name: chainKey,
          class_id: classId,
          class_name: classId == null ? null : CLASS_NAMES[classId] || `Class ${classId}`,
          level: toNumber(core?.state?.level, 1),
          rarity_id: rarityId,
          rarity_name: rarityId == null ? null : RARITY_NAMES[rarityId] || `Rarity ${rarityId}`,
          generation,
          is_gen0: generation === 0,
          influence_score: null,
          influence_value: null,
          summons_remaining: toNumber(core?.summoningInfo?.summons, null),
          eligible: classId == null ? false : PLAYABLE_CLASS_IDS.has(classId),
          updated_at: updatedAt,
        } satisfies IndexedHero;
      }

      const core = await withTimeout(contract.getHero(heroId), 16000, `metis.getHero ${heroId}`);
      const classId = toNumber(core?.class, null);
      const rarityId = toNumber(core?.rarity, null);
      let influenceScore: string | null = null;
      let influenceValue: string | null = null;
      try {
        const influenceData = await withTimeout(contract.getHeroInfluenceData(heroId), 12000, `metis.getHeroInfluenceData ${heroId}`);
        influenceScore = toBigIntString(influenceData?.score ?? influenceData?.[0]);
        influenceValue = toBigIntString(influenceData?.influence ?? influenceData?.[1]);
      } catch (_error) {}
      const influenceBigInt = influenceValue ? BigInt(influenceValue) : 0n;
      return {
        wallet_address: wallet,
        hero_id: String(heroId),
        chain_id: config.chainId,
        chain_name: chainKey,
        class_id: classId,
        class_name: classId == null ? null : CLASS_NAMES[classId] || `Class ${classId}`,
        level: toNumber(core?.level, 1),
        rarity_id: rarityId,
        rarity_name: rarityId == null ? null : RARITY_NAMES[rarityId] || `Rarity ${rarityId}`,
        generation: null,
        is_gen0: influenceBigInt >= METIS_GEN0_INFLUENCE_THRESHOLD,
        influence_score: influenceScore,
        influence_value: influenceValue,
        summons_remaining: toNumber(core?.summonsRemaining, null),
        eligible: classId == null ? false : PLAYABLE_CLASS_IDS.has(classId),
        updated_at: updatedAt,
      } satisfies IndexedHero;
    }));
    rows.push(...batchRows);
  }
  return rows;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200, headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const walletAddress = normalizeAddress(body.walletAddress || body.address || body.wallet);

    const requestedChain = String(body.chain || body.network || '').trim().toLowerCase();
    const chains: ChainKey[] = requestedChain === 'dfk' || requestedChain === 'metis'
      ? [requestedChain]
      : ['dfk', 'metis'];

    const admin = createAdmin();
    const pendingOnly = body.pendingOnly === true || body.mode === 'pending' || body.mode === 'process_pending';
    let targetWallets = walletAddress ? [walletAddress] : [];
    if (pendingOnly && !targetWallets.length) {
      const limit = Math.max(1, Math.min(50, Number(body.limit || 20)));
      const { data: pendingRows, error: pendingError } = await admin
        .from('wallet_heroes')
        .select('wallet_address')
        .in('index_status', ['pending', 'queued', 'failed'])
        .order('last_seen_at', { ascending: true, nullsFirst: true })
        .limit(limit);
      if (pendingError) throw pendingError;
      targetWallets = Array.from(new Set((pendingRows || [])
        .map((row: any) => normalizeAddress(row.wallet_address))
        .filter(Boolean)));
    }
    if (!targetWallets.length) return json({ error: 'walletAddress required unless pendingOnly is true.' }, 400);

    const updatedAt = new Date().toISOString();
    const perWallet: Record<string, { perChain: Record<string, { ok: boolean; count: number; error?: string }>; indexedCount: number }> = {};
    const allRows: IndexedHero[] = [];

    for (const targetWallet of targetWallets) {
      const perChain: Record<string, { ok: boolean; count: number; error?: string }> = {};
      for (const chain of chains) {
        try {
          const rows = await fetchChainHeroes(targetWallet, chain, updatedAt);
          const hydratedRows = rows.map((row) => ({
            ...row,
            source: 'index-wallet-heroes',
            index_status: 'indexed',
            indexed_at: updatedAt,
            last_seen_at: updatedAt,
            index_error: null,
          }));
          perChain[chain] = { ok: true, count: hydratedRows.length };
          allRows.push(...hydratedRows);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error || 'unknown error');
          perChain[chain] = { ok: false, count: 0, error: message };
          if (pendingOnly) {
            await admin
              .from('wallet_heroes')
              .update({ index_status: 'failed', index_error: message, updated_at: updatedAt })
              .eq('wallet_address', targetWallet)
              .eq('chain_name', chain);
          }
        }
      }
      perWallet[targetWallet] = { perChain, indexedCount: 0 };
    }

    if (allRows.length) {
      const { error } = await admin
        .from('wallet_heroes')
        .upsert(allRows, { onConflict: 'wallet_address,hero_id,chain_id' });
      if (error) throw error;
      for (const row of allRows) {
        const bucket = perWallet[row.wallet_address];
        if (bucket) bucket.indexedCount += 1;
      }
    }

    return json({
      ok: true,
      walletAddress: targetWallets.length === 1 ? targetWallets[0] : null,
      processedWallets: targetWallets,
      indexedCount: allRows.length,
      perWallet,
      heroes: allRows,
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'index-wallet-heroes failed.' }, 500);
  }
});
