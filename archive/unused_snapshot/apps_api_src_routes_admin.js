import { query, withTransaction } from '../db.js';
import { hashValue } from '../lib/security.js';

async function requireAdmin(request, fastify) {
  const sessionToken = request.cookies.dfk_admin_session;
  if (!sessionToken) throw fastify.httpErrors.unauthorized('Admin session required.');
  const rows = await query('SELECT * FROM admin_sessions WHERE session_token_hash = $1 AND revoked_at IS NULL AND expires_at > now() LIMIT 1', [hashValue(sessionToken)]);
  const session = rows.rows[0];
  if (!session) throw fastify.httpErrors.unauthorized('Admin session required.');
  return session;
}

export async function adminRoutes(fastify) {
  fastify.get('/api/admin/pending-withdrawals', async (request) => {
    await requireAdmin(request, fastify);
    const rows = await query('SELECT * FROM withdrawal_requests WHERE status = $1 ORDER BY created_at ASC', ['pending']);
    return { withdrawals: rows.rows };
  });

  fastify.post('/api/admin/withdrawals/:id/approve', async (request) => {
    const admin = await requireAdmin(request, fastify);
    const id = request.params.id;
    const result = await withTransaction(async (client) => {
      const rows = await client.query('SELECT * FROM withdrawal_requests WHERE id = $1 FOR UPDATE', [id]);
      const withdrawal = rows.rows[0];
      if (!withdrawal) throw fastify.httpErrors.notFound('Withdrawal request not found.');
      if (withdrawal.status !== 'pending') throw fastify.httpErrors.badRequest('Withdrawal is not pending.');
      const balanceRows = await client.query('SELECT COALESCE(SUM(amount_delta), 0) AS balance FROM ledger_entries WHERE user_id = $1', [withdrawal.user_id]);
      const current = BigInt(String(balanceRows.rows[0].balance));
      const amount = BigInt(String(withdrawal.amount_raw));
      if (current < amount) throw fastify.httpErrors.badRequest('Insufficient balance for approval.');
      const next = current - amount;
      await client.query(
        'INSERT INTO ledger_entries (user_id, amount_delta, balance_after, entry_type, reference_type, reference_id) VALUES ($1,$2,$3,$4,$5,$6)',
        [withdrawal.user_id, `-${amount.toString()}`, next.toString(), 'withdrawal_request', 'withdrawal_request', withdrawal.id]
      );
      await client.query('UPDATE withdrawal_requests SET status = $1, reviewed_by = $2, reviewed_at = now() WHERE id = $3', ['approved', admin.admin_id, withdrawal.id]);
      return { ok: true };
    });
    return result;
  });
}
