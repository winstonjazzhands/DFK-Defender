export const DFK_CHAIN_ID = Number(Deno.env.get("DFK_CHAIN_ID") || "53935");
export const DFK_RPC_URL = Deno.env.get("DFK_RPC_URL") || "";
export const DFK_JEWEL_TOKEN_ADDRESS = (Deno.env.get("DFK_JEWEL_TOKEN_ADDRESS") || "0xCCb93dABD71c8Dad03Fc4CE5559dC3D89F67a260").toLowerCase();
export const TREASURY_ADDRESS = (Deno.env.get("TREASURY_ADDRESS") || "0xab45288409900be5ef23c19726a30c28268495ad").trim().toLowerCase();
export const DFK_JEWEL_PAYMENT_ASSET = Deno.env.get("DFK_JEWEL_PAYMENT_ASSET") || "native_jewel";
const RAW_TREASURY_PRIVATE_KEY = Deno.env.get("TREASURY_PRIVATE_KEY") || Deno.env.get("DFK_TREASURY_PRIVATE_KEY") || "";

export function normalizePrivateKey(value: string | null | undefined) {
  const trimmed = String(value || "").trim().replace(/^['"]+|['"]+$/g, "");
  if (!trimmed) return "";
  if (/^0x[0-9a-fA-F]{64}$/.test(trimmed)) return trimmed;
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) return `0x${trimmed}`;
  return trimmed;
}

export const TREASURY_PRIVATE_KEY = normalizePrivateKey(RAW_TREASURY_PRIVATE_KEY);

export function requireEnv(name: string, value: string) {
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}
