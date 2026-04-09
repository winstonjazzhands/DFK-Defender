export const DFK_CHAIN_ID = Number(Deno.env.get("DFK_CHAIN_ID") || "53935");
export const DFK_RPC_URL = Deno.env.get("DFK_RPC_URL") || "";
export const DFK_JEWEL_TOKEN_ADDRESS = (Deno.env.get("DFK_JEWEL_TOKEN_ADDRESS") || "0xCCb93dABD71c8Dad03Fc4CE5559dC3D89F67a260").toLowerCase();
export const TREASURY_ADDRESS = (Deno.env.get("TREASURY_ADDRESS") || "0x971bDACd04EF40141ddb6bA175d4f76665103c81").toLowerCase();
export const DFK_JEWEL_PAYMENT_ASSET = Deno.env.get("DFK_JEWEL_PAYMENT_ASSET") || "native_jewel";

export function requireEnv(name: string, value: string) {
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}
