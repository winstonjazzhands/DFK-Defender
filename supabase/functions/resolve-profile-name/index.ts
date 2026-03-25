import { Contract, JsonRpcProvider } from 'npm:ethers@6';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const DFK_CHAIN_RPC_URL = Deno.env.get('DFK_CHAIN_RPC_URL') || 'https://subnets.avax.network/defi-kingdoms/dfk-chain/rpc';
const DFK_PROFILES_ADDRESS = '0xC4cD8C09D1A90b21Be417be91A81603B03993E81';

const PROFILES_ABI = [
  'function addressToProfile(address) view returns (address owner, string name, uint64 created, uint256 nftId, uint256 collectionId, string picUri)',
  'function getProfile(address) view returns ((address owner, string name, uint64 created, uint256 nftId, uint256 collectionId, string picUri))',
  'function getProfileByAddress(address) view returns (uint256 _id, address _owner, string _name, uint64 _created, uint8 _picId, uint256 _heroId, uint256 _points)',
];

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function normalizeAddress(address: string | null | undefined) {
  return String(address || '').trim().toLowerCase();
}

function cleanName(value: unknown) {
  const name = typeof value === 'string' ? value.trim() : '';
  return name || null;
}

async function resolveName(address: string) {
  const provider = new JsonRpcProvider(DFK_CHAIN_RPC_URL, 53935, { staticNetwork: true });
  const contract = new Contract(DFK_PROFILES_ADDRESS, PROFILES_ABI, provider);
  const normalized = normalizeAddress(address);

  const attempts = [
    async () => {
      const result = await contract.addressToProfile(normalized);
      const owner = normalizeAddress(result?.owner);
      const name = cleanName(result?.name);
      return owner === normalized && name ? { name, method: 'addressToProfile' } : null;
    },
    async () => {
      const result = await contract.getProfile(normalized);
      const owner = normalizeAddress(result?.owner);
      const name = cleanName(result?.name);
      return owner === normalized && name ? { name, method: 'getProfile' } : null;
    },
    async () => {
      const result = await contract.getProfileByAddress(normalized);
      const owner = normalizeAddress(result?._owner);
      const name = cleanName(result?._name);
      return owner === normalized && name ? { name, method: 'getProfileByAddress' } : null;
    },
  ];

  for (const attempt of attempts) {
    try {
      const resolved = await attempt();
      if (resolved?.name) return resolved;
    } catch (_error) {
      // try next call shape
    }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200, headers: corsHeaders });
  try {
    const { address } = await req.json();
    const normalized = normalizeAddress(address);
    if (!/^0x[a-f0-9]{40}$/.test(normalized)) {
      return json({ error: 'Valid wallet address required.' }, 400);
    }

    const resolved = await resolveName(normalized);
    return json({
      address: normalized,
      name: resolved?.name || null,
      source: resolved ? 'onchain' : 'onchain-miss',
      method: resolved?.method || null,
      contract: DFK_PROFILES_ADDRESS,
      chainId: 53935,
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Profile resolution failed.' }, 500);
  }
});
