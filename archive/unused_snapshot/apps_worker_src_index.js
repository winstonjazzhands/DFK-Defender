import { createPublicClient, http } from 'viem';
import { DFK_CHAIN, SECURITY } from '@dfk-defense/shared/config';
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.POSTGRES_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false });
const client = createPublicClient({ chain: { id: DFK_CHAIN.id, name: DFK_CHAIN.name, nativeCurrency: DFK_CHAIN.nativeCurrency, rpcUrls: { default: { http: [DFK_CHAIN.rpcUrl] } } }, transport: http(DFK_CHAIN.rpcUrl) });
const depositAddress = String(process.env.DFK_DEPOSIT_ADDRESS || '').trim().toLowerCase();
let lastScannedBlock = null;

async function q(text, params = [], db = pool) { return db.query(text, params); }

async function processNativeDeposit(txHash, tx, receipt) {
  if (!tx || !tx.to || tx.to.toLowerCase() !== depositAddress) return;
  if (!tx.value || tx.value <= 0n) return;
  const sender = String(tx.from || '').toLowerCase();
  const walletRows = await q('SELECT * FROM wallet_links WHERE address = $1 AND chain_id = $2 LIMIT 1', [sender, DFK_CHAIN.id]);
  if (!walletRows.rows[0]) return;
  const userId = walletRows.rows[0].user_id;
  await q(
    'INSERT INTO deposits (tx_hash, from_address, to_address, amount_raw, chain_id, block_number, block_hash, confirmations, status, credited_user_id, credited_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, now()) ON CONFLICT DO NOTHING',
    [txHash, sender, depositAddress, tx.value.toString(), DFK_CHAIN.id, Number(receipt.blockNumber), receipt.blockHash, SECURITY.confirmationsRequired, 'credited', userId]
  );
  const balanceRows = await q('SELECT COALESCE(SUM(amount_delta), 0) AS balance FROM ledger_entries WHERE user_id = $1', [userId]);
  const current = BigInt(String(balanceRows.rows[0].balance));
  const next = current + tx.value;
  await q('INSERT INTO ledger_entries (user_id, amount_delta, balance_after, entry_type, reference_type) VALUES ($1,$2,$3,$4,$5)', [userId, tx.value.toString(), next.toString(), 'deposit', 'native_transfer']);
}

async function scan() {
  const latest = await client.getBlockNumber();
  if (lastScannedBlock == null) lastScannedBlock = latest > 20n ? latest - 20n : 0n;
  for (let block = lastScannedBlock + 1n; block <= latest; block += 1n) {
    const fullBlock = await client.getBlock({ blockNumber: block, includeTransactions: true });
    for (const tx of fullBlock.transactions) {
      if (typeof tx === 'string') continue;
      if (!tx.to || String(tx.to).toLowerCase() !== depositAddress) continue;
      const receipt = await client.getTransactionReceipt({ hash: tx.hash });
      const confirmations = Number(latest - receipt.blockNumber + 1n);
      if (confirmations < SECURITY.confirmationsRequired) continue;
      await processNativeDeposit(tx.hash, tx, receipt);
    }
    lastScannedBlock = block;
  }
}

async function loop() {
  while (true) {
    try {
      await scan();
    } catch (error) {
      console.error('deposit watcher error', error);
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}

loop();
