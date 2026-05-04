import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, cache-control',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const CHAIN_IDS: Record<string, number> = Object.freeze({ dfk: 53935, metis: 1088 });
const CHAIN_NAMES: Record<number, string> = Object.freeze({ 53935: 'dfk', 1088: 'metis' });

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

function normalizeAddress(value: unknown) {
  const text = String(value || '').trim().toLowerCase();
  return /^0x[a-f0-9]{40}$/.test(text) ? text : '';
}

function normalizeChainId(hero: Record<string, unknown>) {
  const rawChainId = Number(hero.chain_id ?? hero.chainId ?? 0);
  if (Number.isFinite(rawChainId) && rawChainId > 0) return Math.trunc(rawChainId);
  const chainKey = String(hero.chain_name ?? hero.chainName ?? hero.chainKey ?? hero.network ?? '').trim().toLowerCase();
  return CHAIN_IDS[chainKey] || 0;
}

function normalizeChainName(chainId: number, hero: Record<string, unknown>) {
  const explicit = String(hero.chain_name ?? hero.chainName ?? hero.chainKey ?? hero.network ?? '').trim().toLowerCase();
  if (explicit === 'dfk' || explicit === 'metis') return explicit;
  return CHAIN_NAMES[chainId] || 'wallet';
}

function numberOrNull(value: unknown) {
  const n = Number(value ?? NaN);
  return Number.isFinite(n) ? n : null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200, headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const walletAddress = normalizeAddress(body.walletAddress || body.address || body.wallet);
    if (!walletAddress) return json({ error: 'walletAddress required.' }, 400);

    const heroes = Array.isArray(body.heroes) ? body.heroes : [];
    if (!heroes.length) return json({ ok: true, queuedCount: 0, skippedCount: 0 });

    const now = new Date().toISOString();
    const rows = [];
    const seen = new Set<string>();
    for (const rawHero of heroes) {
      if (!rawHero || typeof rawHero !== 'object') continue;
      const hero = rawHero as Record<string, unknown>;
      const heroId = String(hero.hero_id ?? hero.heroId ?? hero.normalizedId ?? hero.id ?? '').trim();
      const chainId = normalizeChainId(hero);
      if (!heroId || !chainId) continue;
      const key = `${walletAddress}:${heroId}:${chainId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const chainName = normalizeChainName(chainId, hero);
      const classId = numberOrNull(hero.class_id ?? hero.classId ?? hero.mainClass);
      const rarityId = numberOrNull(hero.rarity_id ?? hero.rarityId ?? hero.rarity);
      const generation = numberOrNull(hero.generation);
      rows.push({
        wallet_address: walletAddress,
        hero_id: heroId,
        chain_id: chainId,
        chain_name: chainName,
        class_id: classId,
        class_name: hero.class_name ?? hero.className ?? null,
        level: numberOrNull(hero.level),
        rarity_id: rarityId,
        rarity_name: hero.rarity_name ?? hero.rarityName ?? null,
        generation,
        is_gen0: Boolean(hero.is_gen0 ?? hero.isGen0 ?? generation === 0),
        summons_remaining: numberOrNull(hero.summons_remaining ?? hero.summonsRemaining),
        eligible: Boolean(hero.eligible ?? hero.type),
        updated_at: now,
        last_seen_at: now,
        source: 'wallet_connect_scan',
        index_status: 'pending',
        index_error: null,
      });
    }

    if (!rows.length) return json({ ok: true, queuedCount: 0, skippedCount: heroes.length });

    const admin = createAdmin();
    const { data: existing, error: existingError } = await admin
      .from('wallet_heroes')
      .select('wallet_address,hero_id,chain_id,index_status')
      .eq('wallet_address', walletAddress);
    if (existingError) throw existingError;

    const indexedKeys = new Set((existing || [])
      .filter((row: any) => String(row.index_status || '').toLowerCase() === 'indexed')
      .map((row: any) => `${String(row.wallet_address).toLowerCase()}:${String(row.hero_id)}:${Number(row.chain_id)}`));

    const newRows = rows.filter((row) => !indexedKeys.has(`${row.wallet_address}:${row.hero_id}:${row.chain_id}`));
    const indexedRows = rows.filter((row) => indexedKeys.has(`${row.wallet_address}:${row.hero_id}:${row.chain_id}`));

    if (newRows.length) {
      const { error } = await admin
        .from('wallet_heroes')
        .upsert(newRows, { onConflict: 'wallet_address,hero_id,chain_id' });
      if (error) throw error;
    }

    if (indexedRows.length) {
      for (const row of indexedRows) {
        const { error } = await admin
          .from('wallet_heroes')
          .update({ last_seen_at: now, updated_at: now, source: 'wallet_connect_scan' })
          .eq('wallet_address', row.wallet_address)
          .eq('hero_id', row.hero_id)
          .eq('chain_id', row.chain_id);
        if (error) throw error;
      }
    }

    return json({ ok: true, queuedCount: newRows.length, alreadyIndexedCount: indexedRows.length, skippedCount: heroes.length - rows.length });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'queue-hero-index failed.' }, 500);
  }
});
