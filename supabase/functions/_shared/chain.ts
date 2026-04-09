import { createPublicClient, http, isAddressEqual } from "npm:viem@2.21.57";
import { DFK_CHAIN_ID, DFK_RPC_URL, TREASURY_ADDRESS, requireEnv } from "./env.ts";

export function getDfkClient() {
  return createPublicClient({
    chain: {
      id: DFK_CHAIN_ID,
      name: "DFK Chain",
      nativeCurrency: { name: "JEWEL", symbol: "JEWEL", decimals: 18 },
      rpcUrls: { default: { http: [requireEnv("DFK_RPC_URL", DFK_RPC_URL)] } },
    },
    transport: http(DFK_RPC_URL),
  });
}

export async function verifyNativeJewelTransferTx(
  txHash: `0x${string}`,
  expectedFrom?: string,
  expectedAmount?: bigint,
) {
  const client = getDfkClient();
  const [tx, receipt] = await Promise.all([
    client.getTransaction({ hash: txHash }),
    client.getTransactionReceipt({ hash: txHash }),
  ]);

  if (!tx.to || !isAddressEqual(tx.to, TREASURY_ADDRESS as `0x${string}`)) {
    throw new Error("Transaction recipient does not match treasury.");
  }

  if (Number(receipt.status) !== 1) {
    throw new Error("Transaction failed on-chain.");
  }

  if (expectedFrom && String(tx.from).toLowerCase() != String(expectedFrom).toLowerCase()) {
    throw new Error("Transfer sender does not match expected wallet.");
  }

  const amount = BigInt(String(tx.value || 0n));
  if (expectedAmount != null && amount !== expectedAmount) {
    throw new Error("Transfer amount does not match expected amount.");
  }

  const txInput = String(tx.input || "0x").toLowerCase();
  if (txInput !== "0x") {
    throw new Error("Expected a native JEWEL transfer with empty calldata.");
  }

  return {
    from: String(tx.from).toLowerCase(),
    to: String(tx.to).toLowerCase(),
    amount: amount.toString(),
    blockNumber: Number(receipt.blockNumber),
    transactionHash: receipt.transactionHash,
  };
}
