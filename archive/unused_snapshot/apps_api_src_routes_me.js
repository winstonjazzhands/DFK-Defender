import { query, withTransaction } from '../db.js';
import { hashValue, normalizeAddress } from '../lib/security.js';

async function requireUser(request, fastify) {
  const sessionToken = request.cookies.dfk_session;
  if (!sessionToken) throw fastify.httpErrors.unauthorized('Session required.');
  const rows = await query(
    'SELECT sessions.*, users.id AS user_id FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.session_token_hash = $1 AND sessions.revoked_at IS NULL AND sessions.expires_at > now() LIMIT 1',
    [hashValue(sessionToken)]
  );
  const session = rows.rows[0];
  if (!session) throw fastify.httpErrors.unauthorized('Session required.');
  return session;
}

async function getBalanceRaw(userId, client) {
  const rows = await client.query('SELECT COALESCE(SUM(amount_delta), 0) AS balance FROM ledger_entries WHERE user_id = $1', [userId]);
  return rows.rows[0].balance;
}

export async function meRoutes(fastify) {
  fastify.get('/api/me', async (request) => {
    const session = await requireUser(request, fastify);
    const walletRows = await query('SELECT address, chain_id, wallet_label, is_primary FROM wallet_links WHERE user_id = $1 ORDER BY is_primary DESC, created_at ASC', [session.user_id]);
    return { id: session.user_id, wallets: walletRows.rows };
  });

  fastify.get('/api/me/balance', async (request) => {
    const session = await requireUser(request, fastify);
    const rows = await query('SELECT COALESCE(SUM(amount_delta), 0) AS balance FROM ledger_entries WHERE user_id = $1', [session.user_id]);
    return { authenticated: true, balance: rows.rows[0].balance };
  });

  fastify.post('/api/me/wallets/link', async (request) => {
    const session = await requireUser(request, fastify);
    const address = normalizeAddress(request.body && request.body.address);
    if (!address) throw fastify.httpErrors.badRequest('Address is required.');
    await query(
      'INSERT INTO wallet_links (user_id, address, chain_id, wallet_label, is_primary, verified_at) VALUES ($1,$2,$3,$4,FALSE,now()) ON CONFLICT (address, chain_id) DO NOTHING',
      [session.user_id, address, 53935, request.body && request.body.walletProvider ? request.body.walletProvider : null]
    );
    return { ok: true };
  });

  fastify.post('/api/me/spend', async (request) => {
    const session = await requireUser(request, fastify);
    const amountRaw = BigInt(String(request.body && request.body.amountRaw || '0'));
    if (amountRaw <= 0n) throw fastify.httpErrors.badRequest('Spend amount must be positive.');
    const result = await withTransaction(async (client) => {
      const current = BigInt(String(await getBalanceRaw(session.user_id, client)));
      if (current < amountRaw) throw fastify.httpErrors.badRequest('Insufficient settled balance.');
      const next = current - amountRaw;
      const insert = await client.query(
        'INSERT INTO ledger_entries (user_id, amount_delta, balance_after, entry_type, reference_type) VALUES ($1,$2,$3,$4,$5) RETURNING *',
        [session.user_id, `-${amountRaw.toString()}`, next.toString(), 'game_spend', 'run_entry']
      );
      return insert.rows[0];
    });
    return { ok: true, balance: result.balance_after };
  });

  fastify.post('/api/me/withdrawals/request', async (request) => {
    const session = await requireUser(request, fastify);
    const toAddress = normalizeAddress(request.body && request.body.toAddress);
    const amountRaw = BigInt(String(request.body && request.body.amountRaw || '0'));
    if (!toAddress || amountRaw <= 0n) throw fastify.httpErrors.badRequest('Valid withdrawal payload required.');
    const walletRows = await query('SELECT 1 FROM wallet_links WHERE user_id = $1 AND address = $2 LIMIT 1', [session.user_id, toAddress]);
    if (!walletRows.rows[0]) throw fastify.httpErrors.badRequest('Withdrawals are limited to linked wallets.');
    const balance = BigInt(String((await query('SELECT COALESCE(SUM(amount_delta), 0) AS balance FROM ledger_entries WHERE user_id = $1', [session.user_id])).rows[0].balance));
    if (balance < amountRaw) throw fastify.httpErrors.badRequest('Insufficient settled balance.');
    const rows = await query(
      'INSERT INTO withdrawal_requests (user_id, to_address, amount_raw, status) VALUES ($1,$2,$3,$4) RETURNING *',
      [session.user_id, toAddress, amountRaw.toString(), 'pending']
    );
    return { ok: true, request: rows.rows[0] };
  });
}
