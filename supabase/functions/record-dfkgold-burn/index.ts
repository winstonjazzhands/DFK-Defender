import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, cache-control',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const DFK_CHAIN_RPC_URL = 'https://subnets.avax.network/defi-kingdoms/dfk-chain/rpc';
const DFK_GOLD_CONTRACT = '0x576c260513204392f0ec0bc865450872025cb1ca';
const DFK_GOLD_BURN_ADDRESS = '0x000000000000000000000000000000000000dead';
const DFK_GOLD_DECIMALS = 3n;
const TRANSFER_TOPIC0 = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({ ok: true }, 200);
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  try {
    const body = await req.json().catch(() => null) as Record<string, unknown> | null;
    if (!body) return json({ error: 'Invalid body.' }, 400);

    const txHash = normalizeTxHash(body.txHash);
    const walletAddress = normalizeAddress(body.walletAddress);
    const requestedBurnAmount = sanitizeNumber(body.burnAmount ?? body.amount);
    const defenderGoldAwarded = sanitizeInt(body.defenderGoldAwarded);

    if (!txHash) return json({ error: 'txHash is required.' }, 400);
    if (!walletAddress) return json({ error: 'walletAddress is required.' }, 400);

    const admin = createAdmin();
    const existing = await fetchExistingBurn(admin, txHash);
    if (existing) {
      return json({ ok: true, duplicate: true, burn_amount: existing.burnAmount, global_dfk_gold_burned: await fetchGlobalBurned(admin) }, 200);
    }

    const verified = await verifyBurnTransaction(txHash, walletAddress, requestedBurnAmount);
    await insertBurn(admin, {
      tx_hash: txHash,
      wallet_address: walletAddress,
      burn_amount: verified.burnAmount,
      amount: verified.burnAmount,
      defender_gold_awarded: defenderGoldAwarded,
      chain_id: 53935,
      block_number: verified.blockNumber,
      confirmed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    });

    const total = await fetchGlobalBurned(admin);
    return json({ ok: true, burn_amount: verified.burnAmount, global_dfk_gold_burned: total }, 200);
  } catch (error) {
    console.error('record-dfkgold-burn failed', normalizeError(error));
    return json({ error: normalizeError(error).message || 'Unable to record burn.' }, 500);
  }
});

async function verifyBurnTransaction(txHash: string, walletAddress: string, requestedBurnAmount: number) {
  const receipt = await rpcCall('eth_getTransactionReceipt', [txHash]);
  if (!receipt || typeof receipt !== 'object') throw new Error('Transaction receipt not found yet.');

  const row = receipt as Record<string, unknown>;
  if (String(row.status || '').toLowerCase() !== '0x1') throw new Error('Burn transaction did not succeed.');

  const logs = Array.isArray(row.logs) ? row.logs as Array<Record<string, unknown>> : [];
  const fromTopic = toAddressTopic(walletAddress);
  const toTopic = toAddressTopic(DFK_GOLD_BURN_ADDRESS);

  for (const log of logs) {
    const address = normalizeAddress(log.address);
    const topics = Array.isArray(log.topics) ? log.topics.map((value) => String(value || '').toLowerCase()) : [];
    if (address !== DFK_GOLD_CONTRACT) continue;
    if (topics[0] !== TRANSFER_TOPIC0) continue;
    if (topics[1] !== fromTopic) continue;
    if (topics[2] !== toTopic) continue;
    const rawValue = parseBigIntHex(String(log.data || '0x0'));
    const burnAmount = Number(rawValue) / Number(10n ** DFK_GOLD_DECIMALS);
    if (requestedBurnAmount > 0 && Math.abs(burnAmount - requestedBurnAmount) > 0.0001) {
      throw new Error('Burn amount mismatch.');
    }
    return {
      burnAmount,
      blockNumber: parseInt(String(row.blockNumber || '0x0'), 16) || 0,
    };
  }

  throw new Error('Verified DFK Gold burn transfer log not found in transaction.');
}

async function fetchGlobalBurned(admin: SupabaseClient) {
  const rows = await fetchBurnRows(admin);
  let total = 0;
  for (const row of rows) total += getBurnAmount(row);
  return Number(total.toFixed(3));
}

async function fetchExistingBurn(admin: SupabaseClient, txHash: string) {
  const rows = await fetchBurnRows(admin, txHash);
  const first = rows[0];
  if (!first) return null;
  return { burnAmount: getBurnAmount(first) };
}

async function fetchBurnRows(admin: SupabaseClient, txHash?: string) {
  const selectVariants = [
    'tx_hash, burn_amount',
    'tx_hash, amount',
    'tx_hash, burn_amount, amount',
  ];

  for (const columns of selectVariants) {
    let query = admin.from('dfk_gold_burns').select(columns);
    if (txHash) query = query.eq('tx_hash', txHash);
    const { data, error } = await query;
    if (!error) return (Array.isArray(data) ? data : []) as Array<Record<string, unknown>>;
    if (isMissingColumnError(error) || isMissingRelationError(error)) continue;
    throw error;
  }

  return [];
}

function getBurnAmount(row: Record<string, unknown>) {
  return sanitizeNumber(row.burn_amount ?? row.amount ?? 0);
}

async function insertBurn(admin: SupabaseClient, payload: Record<string, unknown>) {
  const optionalColumns = [
    'amount',
    'burn_amount',
    'defender_gold_awarded',
    'chain_id',
    'block_number',
    'confirmed_at',
    'created_at',
  ];

  const seen = new Set<string>();
  const variants: Array<Record<string, unknown>> = [];

  function pushVariant(columnsToDrop: string[]) {
    const variant = Object.fromEntries(Object.entries(payload).filter(([key]) => !columnsToDrop.includes(key)));
    const key = JSON.stringify(Object.keys(variant).sort());
    if (seen.has(key)) return;
    seen.add(key);
    variants.push(variant);
  }

  pushVariant([]);
  for (const column of optionalColumns) pushVariant([column]);
  for (let i = 0; i < optionalColumns.length; i += 1) {
    for (let j = i + 1; j < optionalColumns.length; j += 1) {
      pushVariant([optionalColumns[i], optionalColumns[j]]);
    }
  }
  pushVariant(optionalColumns);

  let lastError: unknown = null;
  for (const variant of variants) {
    const { error } = await admin.from('dfk_gold_burns').upsert(variant, { onConflict: 'tx_hash' });
    if (!error) return;
    lastError = error;
    if (isMissingColumnError(error)) continue;
    throw error;
  }
  if (lastError) throw lastError;
}

async function rpcCall(method: string, params: unknown[]) {
  const response = await fetch(DFK_CHAIN_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const json = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok || !json) throw new Error('RPC request failed.');
  if (json.error) {
    const errorRow = json.error as Record<string, unknown>;
    throw new Error(String(errorRow.message || 'RPC request failed.'));
  }
  return json.result;
}

function toAddressTopic(address: string) {
  return '0x000000000000000000000000' + normalizeAddress(address).replace(/^0x/, '');
}

function parseBigIntHex(value: string) {
  const hex = String(value || '0x0');
  return BigInt(hex.startsWith('0x') ? hex : `0x${hex}`);
}

function normalizeAddress(value: unknown) {
  const text = String(value || '').trim().toLowerCase();
  return /^0x[a-f0-9]{40}$/.test(text) ? text : '';
}

function normalizeTxHash(value: unknown) {
  const text = String(value || '').trim().toLowerCase();
  return /^0x[a-f0-9]{64}$/.test(text) ? text : '';
}

function isMissingColumnError(error: unknown) {
  const message = String((error && typeof error === 'object' && 'message' in error ? (error as { message?: unknown }).message : '') || '').toLowerCase();
  return message.includes('column') && (message.includes('does not exist') || message.includes('not found in schema cache'));
}

function isMissingRelationError(error: unknown) {
  const message = String((error && typeof error === 'object' && 'message' in error ? (error as { message?: unknown }).message : '') || '').toLowerCase();
  return message.includes('relation') && message.includes('does not exist');
}

function sanitizeNumber(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function sanitizeInt(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : 0;
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
      message: String(row.message || 'Unable to record burn.'),
      code: row.code ?? null,
      details: row.details ?? null,
      hint: row.hint ?? null,
      name: row.name ?? null,
    };
  }
  return { message: String(error || 'Unable to record burn.'), code: null, details: null, hint: null, name: null };
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
