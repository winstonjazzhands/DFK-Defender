export const DFK_CHAIN = Object.freeze({
  id: Number(process.env.DFK_CHAIN_ID || 53935),
  name: 'DFK Chain',
  rpcUrl: process.env.DFK_CHAIN_RPC || 'https://subnets.avax.network/defi-kingdoms/dfk-chain/rpc',
  explorerUrl: 'https://subnets.avax.network/defi-kingdoms/',
  nativeCurrency: { name: 'JEWEL', symbol: 'JEWEL', decimals: 18 },
});

export const SECURITY = Object.freeze({
  confirmationsRequired: Number(process.env.DFK_CONFIRMATIONS_REQUIRED || 12),
  sessionTtlMs: 1000 * 60 * 60 * 8,
  nonceTtlMs: 1000 * 60 * 5,
});
