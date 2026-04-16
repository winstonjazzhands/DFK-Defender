import { createPublicClient, createWalletClient, http, isAddress, isAddressEqual, parseUnits } from "npm:viem@2.21.57";
import { privateKeyToAccount } from "npm:viem@2.21.57/accounts";
import { AVAX_CHAIN_ID, AVAX_RPC_URL, AVAX_TREASURY_ADDRESS, DFK_CHAIN_ID, DFK_JEWEL_PAYMENT_ASSET, DFK_RPC_URL, TREASURY_ADDRESS, TREASURY_PRIVATE_KEY, requireEnv } from "./env.ts";

type AdminClient = {
  from: (table: string) => {
    update: (values: Record<string, unknown>) => { eq: (column: string, value: unknown) => Promise<{ error: unknown }> };
  };
};

export type RewardClaimRow = {
  id: string;
  wallet_address: string;
  status?: string | null;
  amount?: number | string | null;
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

type ReceiptLike = {
  status?: unknown;
  blockNumber?: unknown;
  gasUsed?: unknown;
};

function stringifyReceiptStatus(status: unknown) {
  if (typeof status === "bigint") return status.toString();
  if (typeof status === "string") return status.trim().toLowerCase();
  if (typeof status === "number") return String(status);
  return "";
}

function isReceiptSuccessful(receipt: ReceiptLike | null | undefined) {
  const normalized = stringifyReceiptStatus(receipt?.status);
  return normalized === "1" || normalized === "0x1" || normalized === "success" || normalized === "successful";
}

function isReceiptReverted(receipt: ReceiptLike | null | undefined) {
  const normalized = stringifyReceiptStatus(receipt?.status);
  return normalized === "0" || normalized === "0x0" || normalized === "reverted" || normalized === "failed";
}

function describeReceipt(receipt: ReceiptLike | null | undefined) {
  if (!receipt) return "receipt=missing";
  const parts = [
    `receipt.status=${stringifyReceiptStatus(receipt.status) || "unknown"}` ,
    `receipt.blockNumber=${typeof receipt.blockNumber === "bigint" ? receipt.blockNumber.toString() : String(receipt.blockNumber ?? "unknown")}`,
    `receipt.gasUsed=${typeof receipt.gasUsed === "bigint" ? receipt.gasUsed.toString() : String(receipt.gasUsed ?? "unknown")}` ,
  ];
  return parts.join(", ");
}


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

function parseAmountFromText(text: string | null | undefined) {
  const raw = String(text || "").trim();
  if (!raw) return "0";
  const match = raw.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  if (!match?.[1]) return "0";
  return normalizeNumberish(match[1]);
}

function choosePayoutAmountText(claim: RewardClaimRow) {
  const amountCandidates = [claim?.amount_value, claim?.amount];
  for (const candidate of amountCandidates) {
    if (candidate == null) continue;
    const normalized = normalizeNumberish(typeof candidate === "number" ? candidate.toString() : String(candidate || "").trim());
    if (Number(normalized) > 0) return normalized;
  }
  return parseAmountFromText(claim?.amount_text);
}

function getDfkChainConfig() {
  return {
    id: DFK_CHAIN_ID,
    name: "DFK Chain",
    nativeCurrency: { name: "JEWEL", symbol: "JEWEL", decimals: 18 },
    rpcUrls: { default: { http: [requireEnv("DFK_RPC_URL", DFK_RPC_URL)] } },
  } as const;
}

function getAvaxChainConfig() {
  return {
    id: AVAX_CHAIN_ID,
    name: "Avalanche C-Chain",
    nativeCurrency: { name: "Avalanche", symbol: "AVAX", decimals: 18 },
    rpcUrls: { default: { http: [requireEnv("AVAX_RPC_URL", AVAX_RPC_URL)] } },
  } as const;
}

function appendNote(existing: string | null | undefined, next: string) {
  const base = String(existing || "").trim();
  return base ? `${base} ${next}` : next;
}

function isValidPrivateKey(value: string) {
  return /^0x[0-9a-fA-F]{64}$/.test(String(value || "").trim());
}


function isRetryableRpcError(error: unknown) {
  const message = String((error as { message?: unknown } | null)?.message || error || "").toLowerCase();
  return [
    'timeout',
    'timed out',
    'etimedout',
    'network error',
    'fetch failed',
    'failed to fetch',
    'socket hang up',
    'econnreset',
    '503',
    '502',
    '429',
    'gateway',
    'upstream',
    'rate limit',
  ].some((needle) => message.includes(needle));
}

function parseRpcList(value: string | null | undefined) {
  return String(value || "")
    .split(/[\s,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function uniqueRpcCandidates(primary: string, fallbacks: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of [primary, ...fallbacks]) {
    const url = String(entry || '').trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

function getRpcCandidatesForCurrency(rewardCurrency: 'JEWEL' | 'AVAX', primaryRpcUrl: string) {
  if (rewardCurrency === 'AVAX') {
    return uniqueRpcCandidates(primaryRpcUrl, [
      ...parseRpcList(Deno.env.get('AVAX_RPC_URL_FALLBACKS')),
      'https://api.avax.network/ext/bc/C/rpc',
      'https://avalanche.public-rpc.com',
      'https://1rpc.io/avax/c',
    ]);
  }
  return uniqueRpcCandidates(primaryRpcUrl, parseRpcList(Deno.env.get('DFK_RPC_URL_FALLBACKS')));
}

async function waitForReceiptWithBackoff(publicClient: ReturnType<typeof createPublicClient>, txHash: `0x${string}`) {
  const timeoutMs = 180000;
  const startedAt = Date.now();
  let lastError: unknown = null;
  let lastReceipt: ReceiptLike | null = null;
  while ((Date.now() - startedAt) < timeoutMs) {
    try {
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 45000, pollingInterval: 2000 });
      if (receipt) {
        lastReceipt = receipt;
        break;
      }
    } catch (error) {
      lastError = error;
    }
    try {
      const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
      if (receipt) {
        lastReceipt = receipt;
        break;
      }
    } catch (innerError) {
      lastError = innerError;
    }
  }
  if (!lastReceipt) {
    if (lastError instanceof Error) throw lastError;
    throw new Error('Treasury payout confirmation timed out.');
  }

  try {
    const canonicalReceipt = await publicClient.getTransactionReceipt({ hash: txHash });
    if (canonicalReceipt) return canonicalReceipt;
  } catch (canonicalError) {
    lastError = canonicalError;
  }

  if (lastReceipt) return lastReceipt;
  if (lastError instanceof Error) throw lastError;
  throw new Error('Treasury payout confirmation timed out.');
}

async function recordAutoPayFailure(admin: AdminClient, claim: RewardClaimRow, nowIso: string, message: string, options: { adminNote?: string | null; txHash?: string | null } = {}) {
  const baseNote = options.adminNote != null ? String(options.adminNote || '').trim() : String(claim?.admin_note || '').trim();
  const txHash = String(options.txHash || '').trim();
  const noteWithTx = txHash ? appendNote(baseNote, `Submitted tx before failure: ${txHash}.`) : baseNote;
  const note = appendNote(noteWithTx, "Auto-payout failed; manual review required.");
  const { error: updateError } = await admin
    .from("reward_claim_requests")
    .update({
      status: "approved",
      approved_at: claim?.approved_at || nowIso,
      resolved_at: claim?.resolved_at || nowIso,
      resolved_by_wallet: claim?.resolved_by_wallet || "treasury:auto",
      failure_reason: message,
      admin_note: note,
      tx_hash: txHash || claim?.tx_hash || null,
      paid_at: null,
    })
    .eq("id", claim.id);
  if (updateError) throw updateError;
}

export function isAutoJewelPayoutConfigured() {
  return isValidPrivateKey(TREASURY_PRIVATE_KEY);
}

export function isAutoRewardPayoutConfigured() {
  return isAutoJewelPayoutConfigured();
}

async function sendNativePayout(admin: AdminClient, claim: RewardClaimRow, options: {
  rewardCurrency: "JEWEL" | "AVAX";
  amountText: string;
  treasuryAddress: string;
  chain: ReturnType<typeof getDfkChainConfig> | ReturnType<typeof getAvaxChainConfig>;
  rpcUrl: string;
}) {
  const privateKey = String(TREASURY_PRIVATE_KEY || "").trim();
  const walletAddress = normalizeAddress(claim?.wallet_address);
  const nowIso = new Date().toISOString();

  if (!privateKey) {
    return { attempted: false, paid: false, message: "Auto-payout signer is not configured." };
  }
  if (!isValidPrivateKey(privateKey)) {
    throw new Error("TREASURY_PRIVATE_KEY is not a valid 32-byte hex key.");
  }
  if (!isAddress(walletAddress)) {
    throw new Error("Claim wallet is not a valid EVM address.");
  }
  if (!isAddress(options.treasuryAddress)) {
    throw new Error(`${options.rewardCurrency} treasury address is not a valid EVM address.`);
  }

  let submittedTxHash = "";
  let pendingNote = String(claim?.admin_note || "").trim();

  try {
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    if (!isAddressEqual(account.address, options.treasuryAddress as `0x${string}`)) {
      throw new Error(`TREASURY_PRIVATE_KEY does not match ${options.rewardCurrency} treasury address. Derived ${account.address}.`);
    }

    const rpcCandidates = getRpcCandidatesForCurrency(options.rewardCurrency, options.rpcUrl);
    let lastPreSubmitError: unknown = null;

    for (const rpcUrl of rpcCandidates) {
      try {
        const publicClient = createPublicClient({ chain: options.chain, transport: http(rpcUrl, { timeout: 45000 }) });
        const walletClient = createWalletClient({ account, chain: options.chain, transport: http(rpcUrl, { timeout: 45000 }) });

        const txHash = await walletClient.sendTransaction({
          account,
          chain: options.chain,
          to: walletAddress as `0x${string}`,
          value: parseUnits(options.amountText, 18),
        });
        submittedTxHash = txHash;

        pendingNote = appendNote(claim?.admin_note, `Treasury payout submitted on-chain via ${rpcUrl}. Tx: ${txHash}`);
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
        if (isReceiptReverted(receipt)) {
          throw new Error(`Treasury payout transaction failed on-chain. ${describeReceipt(receipt)}`);
        }
        if (!isReceiptSuccessful(receipt)) {
          throw new Error(`Treasury payout receipt status was inconclusive. ${describeReceipt(receipt)}`);
        }

        const note = appendNote(pendingNote, `Auto-paid ${options.amountText} ${options.rewardCurrency} via treasury native transfer. ${describeReceipt(receipt)}.`);
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
        return { attempted: true, paid: true, txHash, message: `Sent ${options.amountText} ${options.rewardCurrency} to ${walletAddress} via native transfer.` };
      } catch (rpcError) {
        if (submittedTxHash) throw rpcError;
        lastPreSubmitError = rpcError;
        if (!isRetryableRpcError(rpcError)) throw rpcError;
      }
    }

    if (lastPreSubmitError) throw lastPreSubmitError;
    throw new Error('Treasury payout failed before transaction submission.');
  } catch (error) {
    const message = error instanceof Error ? error.message : "Auto-payout failed.";
    await recordAutoPayFailure(admin, claim, nowIso, message, { adminNote: pendingNote, txHash: submittedTxHash || null });
    return { attempted: true, paid: false, message, txHash: submittedTxHash || null };
  }
}

export async function tryAutoPayRewardClaim(admin: AdminClient, claim: RewardClaimRow) {
  const status = String(claim?.status || "").trim().toLowerCase();
  const walletAddress = normalizeAddress(claim?.wallet_address);
  if (!claim?.id || !walletAddress) {
    return { attempted: false, paid: false, message: "Missing claim id or wallet address." };
  }
  if (status === "paid" || String(claim?.paid_at || "").trim()) {
    return { attempted: false, paid: true, txHash: String(claim?.tx_hash || "").trim() || null, message: "Claim already paid." };
  }

  const existingTxHash = String(claim?.tx_hash || "").trim();
  if (existingTxHash) {
    return { attempted: false, paid: false, txHash: existingTxHash, message: "Claim already has a submitted treasury transaction and needs confirmation or manual review." };
  }

  const currency = String(claim?.reward_currency || "").trim().toUpperCase();
  if (!["JEWEL", "AVAX"].includes(currency)) {
    return { attempted: false, paid: false, message: `Auto-payout does not support ${currency || "this reward"}.` };
  }

  const amountText = choosePayoutAmountText(claim);
  if (Number(amountText) <= 0) {
    return { attempted: false, paid: false, message: "Claim amount is zero." };
  }

  if (currency === "JEWEL") {
    if (String(DFK_JEWEL_PAYMENT_ASSET || "native_jewel").trim().toLowerCase() !== "native_jewel") {
      return { attempted: false, paid: false, message: "JEWEL auto-payout is configured for native_jewel only in this build." };
    }
    return await sendNativePayout(admin, claim, {
      rewardCurrency: "JEWEL",
      amountText,
      treasuryAddress: TREASURY_ADDRESS,
      chain: getDfkChainConfig(),
      rpcUrl: requireEnv("DFK_RPC_URL", DFK_RPC_URL),
    });
  }

  return await sendNativePayout(admin, claim, {
    rewardCurrency: "AVAX",
    amountText,
    treasuryAddress: AVAX_TREASURY_ADDRESS,
    chain: getAvaxChainConfig(),
    rpcUrl: requireEnv("AVAX_RPC_URL", AVAX_RPC_URL),
  });
}

export async function tryAutoPayJewelClaim(admin: AdminClient, claim: RewardClaimRow) {
  return await tryAutoPayRewardClaim(admin, claim);
}
