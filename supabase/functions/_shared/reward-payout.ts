import { createPublicClient, createWalletClient, http, isAddress, isAddressEqual, parseUnits } from "npm:viem@2.21.57";
import { privateKeyToAccount } from "npm:viem@2.21.57/accounts";
import { DFK_CHAIN_ID, DFK_JEWEL_PAYMENT_ASSET, DFK_RPC_URL, TREASURY_ADDRESS, TREASURY_PRIVATE_KEY, requireEnv } from "./env.ts";

type AdminClient = {
  from: (table: string) => {
    update: (values: Record<string, unknown>) => { eq: (column: string, value: unknown) => Promise<{ error: unknown }> };
  };
};

export type RewardClaimRow = {
  id: string;
  wallet_address: string;
  status?: string | null;
  amount_value?: number | string | null;
  reward_currency?: string | null;
  amount_text?: string | null;
  admin_note?: string | null;
  approved_at?: string | null;
  resolved_at?: string | null;
  resolved_by_wallet?: string | null;
  tx_hash?: string | null;
  paid_at?: string | null;
  failure_reason?: string | null;
};

function normalizeAddress(address: string | null | undefined) {
  return String(address || "").trim().toLowerCase();
}

function normalizeNumberish(value: number | string) {
  const text = typeof value === "number" ? value.toString() : String(value || "").trim();
  if (!text) return "0";
  const cleaned = text.replace(/,/g, "");
  if (!/^\d+(\.\d+)?$/.test(cleaned)) throw new Error("Invalid payout amount.");
  return cleaned;
}

function getChainConfig() {
  return {
    id: DFK_CHAIN_ID,
    name: "DFK Chain",
    nativeCurrency: { name: "JEWEL", symbol: "JEWEL", decimals: 18 },
    rpcUrls: { default: { http: [requireEnv("DFK_RPC_URL", DFK_RPC_URL)] } },
  } as const;
}

function appendNote(existing: string | null | undefined, next: string) {
  const base = String(existing || "").trim();
  return base ? `${base} ${next}` : next;
}

function isValidPrivateKey(value: string) {
  return /^0x[0-9a-fA-F]{64}$/.test(String(value || "").trim());
}


async function waitForReceiptWithBackoff(publicClient: ReturnType<typeof createPublicClient>, txHash: `0x${string}`) {
  const timeoutMs = 180000;
  const startedAt = Date.now();
  let lastError: unknown = null;
  while ((Date.now() - startedAt) < timeoutMs) {
    try {
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 45000, pollingInterval: 2000 });
      if (receipt) return receipt;
    } catch (error) {
      lastError = error;
      try {
        const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
        if (receipt) return receipt;
      } catch (innerError) {
        lastError = innerError;
      }
    }
  }
  if (lastError instanceof Error) throw lastError;
  throw new Error('Treasury payout confirmation timed out.');
}

async function recordAutoPayFailure(admin: AdminClient, claim: RewardClaimRow, nowIso: string, message: string) {
  const note = appendNote(claim?.admin_note, "Auto-payout failed; manual review required.");
  const { error: updateError } = await admin
    .from("reward_claim_requests")
    .update({
      status: "approved",
      approved_at: claim?.approved_at || nowIso,
      resolved_at: claim?.resolved_at || nowIso,
      resolved_by_wallet: claim?.resolved_by_wallet || "treasury:auto",
      failure_reason: message,
      admin_note: note,
    })
    .eq("id", claim.id);
  if (updateError) throw updateError;
}

export function isAutoJewelPayoutConfigured() {
  return isValidPrivateKey(TREASURY_PRIVATE_KEY);
}

export async function tryAutoPayJewelClaim(admin: AdminClient, claim: RewardClaimRow) {
  const status = String(claim?.status || "").trim().toLowerCase();
  const walletAddress = normalizeAddress(claim?.wallet_address);
  if (!claim?.id || !walletAddress) {
    return { attempted: false, paid: false, message: "Missing claim id or wallet address." };
  }
  if (status === "paid" || String(claim?.paid_at || "").trim() || String(claim?.tx_hash || "").trim()) {
    return { attempted: false, paid: true, txHash: String(claim?.tx_hash || "").trim() || null, message: "Claim already paid." };
  }
  if (String(claim?.reward_currency || "").trim().toUpperCase() !== "JEWEL") {
    return { attempted: false, paid: false, message: "Auto-payout only supports JEWEL rewards." };
  }
  const amountRaw = claim?.amount_value;
  const amountText = normalizeNumberish(typeof amountRaw === "number" || typeof amountRaw === "string" ? amountRaw : 0);
  if (amountText === "0") {
    return { attempted: false, paid: false, message: "Claim amount is zero." };
  }
  const privateKey = String(TREASURY_PRIVATE_KEY || "").trim();
  if (!privateKey) {
    return { attempted: false, paid: false, message: "Auto-payout signer is not configured." };
  }
  if (!isAddress(walletAddress)) {
    throw new Error("Claim wallet is not a valid EVM address.");
  }

  const chain = getChainConfig();
  const nowIso = new Date().toISOString();

  try {
    if (!isValidPrivateKey(privateKey)) {
      throw new Error("TREASURY_PRIVATE_KEY is not a valid 32-byte hex key.");
    }
    if (!isAddress(TREASURY_ADDRESS)) {
      throw new Error("TREASURY_ADDRESS is not a valid EVM address.");
    }

    const account = privateKeyToAccount(privateKey as `0x${string}`);
    if (!isAddressEqual(account.address, TREASURY_ADDRESS as `0x${string}`)) {
      throw new Error(`TREASURY_PRIVATE_KEY does not match TREASURY_ADDRESS. Derived ${account.address}.`);
    }

    const publicClient = createPublicClient({ chain, transport: http(DFK_RPC_URL) });
    const walletClient = createWalletClient({ account, chain, transport: http(DFK_RPC_URL) });

    if (String(DFK_JEWEL_PAYMENT_ASSET || "native_jewel").trim().toLowerCase() !== "native_jewel") {
      throw new Error("JEWEL auto-payout is configured for native_jewel only in this build.");
    }

    const txHash = await walletClient.sendTransaction({
      account,
      chain,
      to: walletAddress as `0x${string}`,
      value: parseUnits(amountText, 18),
    });
    const pendingNote = appendNote(claim?.admin_note, `Treasury payout submitted on-chain. Tx: ${txHash}`);
    const { error: pendingError } = await admin
      .from("reward_claim_requests")
      .update({
        status: "approved",
        approved_at: claim?.approved_at || nowIso,
        resolved_at: claim?.resolved_at || nowIso,
        resolved_by_wallet: claim?.resolved_by_wallet || "treasury:auto",
        tx_hash: txHash,
        failure_reason: null,
        admin_note: pendingNote,
      })
      .eq("id", claim.id);
    if (pendingError) throw pendingError;
    const receipt = await waitForReceiptWithBackoff(publicClient, txHash);
    if (Number(receipt.status) !== 1) {
      throw new Error("Treasury payout transaction failed on-chain.");
    }
    const note = appendNote(pendingNote, `Auto-paid ${amountText} JEWEL via treasury native transfer.`);
    const { error } = await admin
      .from("reward_claim_requests")
      .update({
        status: "paid",
        approved_at: claim?.approved_at || nowIso,
        paid_at: nowIso,
        resolved_at: nowIso,
        resolved_by_wallet: "treasury:auto",
        tx_hash: txHash,
        failure_reason: null,
        admin_note: note,
      })
      .eq("id", claim.id);
    if (error) throw error;
    return { attempted: true, paid: true, txHash, message: `Sent ${amountText} JEWEL to ${walletAddress} via native transfer.` };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Auto-payout failed.";
    await recordAutoPayFailure(admin, claim, nowIso, message);
    return { attempted: true, paid: false, message };
  }
}
