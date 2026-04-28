import { createPublicClient, createWalletClient, encodeFunctionData, erc20Abi, http, isAddress, isAddressEqual, parseUnits } from "npm:viem@2.21.57";
import { privateKeyToAccount } from "npm:viem@2.21.57/accounts";
import { AVAX_CHAIN_ID, AVAX_RPC_URL, AVAX_TREASURY_ADDRESS, DFK_CHAIN_ID, DFK_HONK_TOKEN_ADDRESS, DFK_JEWEL_PAYMENT_ASSET, DFK_RPC_URL, TREASURY_ADDRESS, TREASURY_PRIVATE_KEY, requireEnv } from "./env.ts";

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

function payoutLog(event: string, payload: Record<string, unknown>) {
  try { console.log(`[reward-payout] ${event} ${JSON.stringify(payload)}`); } catch (_error) { console.log(`[reward-payout] ${event}`); }
}

function payoutErrorLog(event: string, payload: Record<string, unknown>) {
  try { console.error(`[reward-payout] ${event} ${JSON.stringify(payload)}`); } catch (_error) { console.error(`[reward-payout] ${event}`); }
}

function summarizeError(error: unknown) {
  if (error instanceof Error) return { name: error.name || "Error", message: error.message || "Unknown error" };
  if (error && typeof error === "object") {
    const value = error as Record<string, unknown>;
    return { name: String(value.name || "Error"), message: String(value.message || value.error || "[object Object]"), code: value.code == null ? undefined : String(value.code), details: value.details == null ? undefined : String(value.details), hint: value.hint == null ? undefined : String(value.hint) };
  }
  return { name: "Error", message: String(error || "Unknown error") };
}

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

function getRpcCandidatesForCurrency(rewardCurrency: 'JEWEL' | 'AVAX' | 'HONK', primaryRpcUrl: string) {
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
  rewardCurrency: "JEWEL" | "AVAX" | "HONK";
  amountText: string;
  treasuryAddress: string;
  chain: ReturnType<typeof getDfkChainConfig> | ReturnType<typeof getAvaxChainConfig>;
  rpcUrl: string;
}) {
  const privateKey = String(TREASURY_PRIVATE_KEY || "").trim();
  const walletAddress = normalizeAddress(claim?.wallet_address);
  const nowIso = new Date().toISOString();
  const payoutAttemptId = `payout_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  if (!privateKey) {
    return { attempted: false, paid: false, message: "Auto-payout signer is not configured.", payoutAttemptId };
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
  let failureStage = 'init';

  payoutLog('start', { payoutAttemptId, claimId: claim.id, rewardCurrency: options.rewardCurrency, amountText: options.amountText, walletAddress, treasuryAddress: options.treasuryAddress });

  try {
    failureStage = 'preflight';
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    if (!isAddressEqual(account.address, options.treasuryAddress as `0x${string}`)) {
      throw new Error(`TREASURY_PRIVATE_KEY does not match ${options.rewardCurrency} treasury address. Derived ${account.address}.`);
    }

    const rpcCandidates = getRpcCandidatesForCurrency(options.rewardCurrency, options.rpcUrl);
    let lastPreSubmitError: unknown = null;

    for (const rpcUrl of rpcCandidates) {
      failureStage = 'rpc_preflight';
      try {
        const publicClient = createPublicClient({ chain: options.chain, transport: http(rpcUrl, { timeout: 45000 }) });
        const walletClient = createWalletClient({ account, chain: options.chain, transport: http(rpcUrl, { timeout: 45000 }) });
        const payoutWei = parseUnits(options.amountText, 18);
        const treasuryBalance = await publicClient.getBalance({ address: options.treasuryAddress as `0x${string}` });
        payoutLog('rpc-preflight-ok', { payoutAttemptId, claimId: claim.id, rpcUrl, treasuryBalanceWei: treasuryBalance.toString(), payoutWei: payoutWei.toString() });
        if (treasuryBalance < payoutWei) {
          throw new Error(`${options.rewardCurrency} treasury balance is too low for this payout. balanceWei=${treasuryBalance.toString()} payoutWei=${payoutWei.toString()}`);
        }

        failureStage = 'submit_tx';
        const txHash = await walletClient.sendTransaction({
          account,
          chain: options.chain,
          to: walletAddress as `0x${string}`,
          value: payoutWei,
        });
        submittedTxHash = txHash;
        payoutLog('tx-submitted', { payoutAttemptId, claimId: claim.id, rpcUrl, txHash });

        failureStage = 'write_submitted';
        pendingNote = appendNote(claim?.admin_note, `Treasury payout submitted on-chain via ${rpcUrl}. Attempt ${payoutAttemptId}. Tx: ${txHash}`);
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

        failureStage = 'wait_receipt';
        const receipt = await waitForReceiptWithBackoff(publicClient, txHash);
        payoutLog('receipt-observed', { payoutAttemptId, claimId: claim.id, txHash, receipt: describeReceipt(receipt) });
        if (isReceiptReverted(receipt)) {
          throw new Error(`Treasury payout transaction failed on-chain. ${describeReceipt(receipt)}`);
        }
        if (!isReceiptSuccessful(receipt)) {
          throw new Error(`Treasury payout receipt status was inconclusive. ${describeReceipt(receipt)}`);
        }

        failureStage = 'write_paid';
        const note = appendNote(pendingNote, `Auto-paid ${options.amountText} ${options.rewardCurrency} via treasury native transfer. Attempt ${payoutAttemptId}. ${describeReceipt(receipt)}.`);
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
        payoutLog('completed', { payoutAttemptId, claimId: claim.id, txHash, rewardCurrency: options.rewardCurrency });
        return { attempted: true, paid: true, txHash, payoutAttemptId, message: `Sent ${options.amountText} ${options.rewardCurrency} to ${walletAddress} via native transfer.` };
      } catch (rpcError) {
        const summary = summarizeError(rpcError);
        payoutErrorLog('rpc-attempt-failed', { payoutAttemptId, claimId: claim.id, rewardCurrency: options.rewardCurrency, stage: failureStage, rpcUrl, txHash: submittedTxHash || null, error: summary });
        if (submittedTxHash) throw new Error(`[${failureStage}] ${summary.message}`);
        lastPreSubmitError = rpcError;
        if (!isRetryableRpcError(rpcError)) throw rpcError;
      }
    }

    if (lastPreSubmitError) throw lastPreSubmitError;
    throw new Error('Treasury payout failed before transaction submission.');
  } catch (error) {
    const summary = summarizeError(error);
    const message = `[${failureStage}] ${summary.message || 'Auto-payout failed.'}`;
    payoutErrorLog('failed', { payoutAttemptId, claimId: claim.id, rewardCurrency: options.rewardCurrency, stage: failureStage, txHash: submittedTxHash || null, error: summary });
    await recordAutoPayFailure(admin, claim, nowIso, message, { adminNote: pendingNote, txHash: submittedTxHash || null });
    return { attempted: true, paid: false, message, txHash: submittedTxHash || null, payoutAttemptId, failureStage, failureReason: message };
  }
}

async function sendHonkPayout(admin: AdminClient, claim: RewardClaimRow) {
  const amountText = choosePayoutAmountText(claim);
  const nowIso = new Date().toISOString();
  const privateKey = String(TREASURY_PRIVATE_KEY || "").trim();
  const walletAddress = normalizeAddress(claim?.wallet_address);
  const payoutAttemptId = `honk_payout_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  if (!privateKey) return { attempted: false, paid: false, message: "Auto-payout signer is not configured.", payoutAttemptId };
  if (!isValidPrivateKey(privateKey)) throw new Error("TREASURY_PRIVATE_KEY is not a valid 32-byte hex key.");
  if (!isAddress(walletAddress)) throw new Error("Claim wallet is not a valid EVM address.");
  if (!isAddress(TREASURY_ADDRESS)) throw new Error("HONK treasury address is not a valid EVM address.");
  if (!isAddress(DFK_HONK_TOKEN_ADDRESS)) throw new Error("HONK token address is not valid.");
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  if (!isAddressEqual(account.address, TREASURY_ADDRESS as `0x${string}`)) throw new Error(`TREASURY_PRIVATE_KEY does not match HONK treasury address. Derived ${account.address}.`);
  let submittedTxHash = "";
  let pendingNote = String(claim?.admin_note || "").trim();
  let failureStage = "init";
  try {
    const rpcCandidates = getRpcCandidatesForCurrency("HONK", requireEnv("DFK_RPC_URL", DFK_RPC_URL));
    let lastError: unknown = null;
    for (const rpcUrl of rpcCandidates) {
      try {
        failureStage = "rpc_preflight";
        const publicClient = createPublicClient({ chain: getDfkChainConfig(), transport: http(rpcUrl, { timeout: 45000 }) });
        const walletClient = createWalletClient({ account, chain: getDfkChainConfig(), transport: http(rpcUrl, { timeout: 45000 }) });
        const payoutWei = parseUnits(amountText, 18);
        const treasuryBalance = await publicClient.readContract({ address: DFK_HONK_TOKEN_ADDRESS as `0x${string}`, abi: erc20Abi, functionName: "balanceOf", args: [TREASURY_ADDRESS as `0x${string}`] }) as bigint;
        if (treasuryBalance < payoutWei) throw new Error(`HONK treasury token balance is too low. balanceWei=${treasuryBalance.toString()} payoutWei=${payoutWei.toString()}`);
        failureStage = "submit_tx";
        const txHash = await walletClient.sendTransaction({ account, chain: getDfkChainConfig(), to: DFK_HONK_TOKEN_ADDRESS as `0x${string}`, data: encodeFunctionData({ abi: erc20Abi, functionName: "transfer", args: [walletAddress as `0x${string}`, payoutWei] }), value: 0n });
        submittedTxHash = txHash;
        failureStage = "write_submitted";
        pendingNote = appendNote(claim?.admin_note, `Treasury HONK token payout submitted via ${rpcUrl}. Attempt ${payoutAttemptId}. Tx: ${txHash}`);
        const { error: pendingError } = await admin.from("reward_claim_requests").update({ status: "approved", approved_at: claim?.approved_at || nowIso, resolved_at: claim?.resolved_at || nowIso, resolved_by_wallet: claim?.resolved_by_wallet || "treasury:auto", tx_hash: txHash, failure_reason: null, admin_note: pendingNote }).eq("id", claim.id);
        if (pendingError) throw pendingError;
        failureStage = "wait_receipt";
        const receipt = await waitForReceiptWithBackoff(publicClient, txHash);
        if (isReceiptReverted(receipt)) throw new Error(`Treasury HONK payout transaction failed on-chain. ${describeReceipt(receipt)}`);
        if (!isReceiptSuccessful(receipt)) throw new Error(`Treasury HONK payout receipt status was inconclusive. ${describeReceipt(receipt)}`);
        failureStage = "write_paid";
        const note = appendNote(pendingNote, `Auto-paid ${amountText} HONK via treasury ERC20 transfer. Attempt ${payoutAttemptId}. ${describeReceipt(receipt)}.`);
        const { error } = await admin.from("reward_claim_requests").update({ status: "paid", approved_at: claim?.approved_at || nowIso, paid_at: nowIso, resolved_at: nowIso, resolved_by_wallet: "treasury:auto", tx_hash: txHash, failure_reason: null, admin_note: note }).eq("id", claim.id);
        if (error) throw error;
        return { attempted: true, paid: true, txHash, payoutAttemptId, message: `Sent ${amountText} HONK to ${walletAddress} via token transfer.` };
      } catch (rpcError) {
        if (submittedTxHash) throw rpcError;
        lastError = rpcError;
        if (!isRetryableRpcError(rpcError)) throw rpcError;
      }
    }
    if (lastError) throw lastError;
    throw new Error("HONK treasury payout failed before transaction submission.");
  } catch (error) {
    const summary = summarizeError(error);
    const message = `[${failureStage}] ${summary.message || "HONK auto-payout failed."}`;
    await recordAutoPayFailure(admin, claim, nowIso, message, { adminNote: pendingNote, txHash: submittedTxHash || null });
    return { attempted: true, paid: false, message, txHash: submittedTxHash || null, payoutAttemptId, failureStage, failureReason: message };
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
  if (!["JEWEL", "AVAX", "HONK"].includes(currency)) {
    return { attempted: false, paid: false, message: `Auto-payout does not support ${currency || "this reward"}.` };
  }

  const amountText = choosePayoutAmountText(claim);
  if (Number(amountText) <= 0) {
    return { attempted: false, paid: false, message: "Claim amount is zero." };
  }

  if (currency === "HONK") {
    return await sendHonkPayout(admin, claim);
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
