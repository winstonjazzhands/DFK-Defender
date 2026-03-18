import bcrypt from 'bcryptjs';
import { query, withTransaction } from '../db.js';
import { SECURITY } from '@dfk-defense/shared/config';
import { extractAddress, extractField, verifyWalletSignature } from '../lib/siwe.js';
import { adminCookieOptions, hashValue, normalizeAddress, randomToken, sessionCookieOptions } from '../lib/security.js';

export async function authRoutes(fastify) {
  fastify.post('/api/auth/nonce', async (request) => {
    const address = normalizeAddress(request.body && request.body.address);
    if (!address) throw fastify.httpErrors.badRequest('Address is required.');
    const nonce = randomToken(16);
    await query(
      'INSERT INTO siwe_nonces (address, nonce, expires_at, ip_hash) VALUES ($1,$2, now() + ($3 || \' milliseconds\')::interval, $4)',
      [address, nonce, String(SECURITY.nonceTtlMs), hashValue(request.ip)]
    );
    return { nonce, expiresAt: new Date(Date.now() + SECURITY.nonceTtlMs).toISOString(), chainId: 53935 };
  });

  fastify.post('/api/auth/verify', async (request, reply) => {
    const body = request.body || {};
    const claimedAddress = normalizeAddress(body.address);
    const messageAddress = normalizeAddress(extractAddress(body.message));
    const nonce = extractField(body.message, 'Nonce');
    const chainId = Number(extractField(body.message, 'Chain ID') || '0');
    if (!claimedAddress || !body.message || !body.signature || !nonce) throw fastify.httpErrors.badRequest('Missing auth payload.');
    if (claimedAddress !== messageAddress) throw fastify.httpErrors.badRequest('Signed address mismatch.');
    if (chainId !== 53935) throw fastify.httpErrors.badRequest('Wrong chain for sign-in.');

    const verified = await verifyWalletSignature({ address: claimedAddress, message: body.message, signature: body.signature });
    if (!verified) throw fastify.httpErrors.unauthorized('Invalid wallet signature.');

    const nonceRows = await query('SELECT * FROM siwe_nonces WHERE nonce = $1 AND address = $2 AND used_at IS NULL LIMIT 1', [nonce, claimedAddress]);
    const nonceRow = nonceRows.rows[0];
    if (!nonceRow) throw fastify.httpErrors.unauthorized('Nonce missing or already used.');
    if (new Date(nonceRow.expires_at).getTime() < Date.now()) throw fastify.httpErrors.unauthorized('Nonce expired.');

    const sessionToken = randomToken(32);
    const csrfToken = randomToken(24);
    const sessionTokenHash = hashValue(sessionToken);
    const csrfTokenHash = hashValue(csrfToken);
    const userAgentHash = hashValue(request.headers['user-agent'] || '');
    const ipHash = hashValue(request.ip || '');

    const user = await withTransaction(async (client) => {
      await client.query('UPDATE siwe_nonces SET used_at = now() WHERE id = $1', [nonceRow.id]);
      const walletRows = await client.query('SELECT * FROM wallet_links WHERE address = $1 AND chain_id = $2 LIMIT 1', [claimedAddress, 53935]);
      let userId;
      if (walletRows.rows[0]) {
        userId = walletRows.rows[0].user_id;
      } else {
        const userRows = await client.query('INSERT INTO users DEFAULT VALUES RETURNING *');
        userId = userRows.rows[0].id;
        await client.query(
          'INSERT INTO wallet_links (user_id, address, chain_id, wallet_label, is_primary, verified_at) VALUES ($1,$2,$3,$4,TRUE,now())',
          [userId, claimedAddress, 53935, body.walletProvider || null]
        );
      }
      await client.query(
        'INSERT INTO sessions (user_id, session_token_hash, csrf_token_hash, user_agent_hash, ip_hash, expires_at) VALUES ($1,$2,$3,$4,$5, now() + interval \'8 hours\')',
        [userId, sessionTokenHash, csrfTokenHash, userAgentHash, ipHash]
      );
      const meRows = await client.query('SELECT id FROM users WHERE id = $1', [userId]);
      return { id: meRows.rows[0].id, primaryWallet: claimedAddress, csrfToken };
    });

    reply.setCookie('dfk_session', sessionToken, sessionCookieOptions());
    reply.setCookie('dfk_csrf', csrfToken, { ...sessionCookieOptions(), httpOnly: false });
    return { ok: true, user };
  });

  fastify.post('/api/auth/logout', async (request, reply) => {
    const sessionToken = request.cookies.dfk_session;
    if (sessionToken) {
      await query('UPDATE sessions SET revoked_at = now() WHERE session_token_hash = $1', [hashValue(sessionToken)]);
    }
    reply.clearCookie('dfk_session', sessionCookieOptions());
    reply.clearCookie('dfk_csrf', { ...sessionCookieOptions(), httpOnly: false });
    reply.code(204).send();
  });

  fastify.post('/api/admin/login', async (request, reply) => {
    const body = request.body || {};
    const result = await query('SELECT * FROM admins WHERE email = $1 LIMIT 1', [String(body.email || '').trim().toLowerCase()]);
    const admin = result.rows[0];
    if (!admin) throw fastify.httpErrors.unauthorized('Invalid admin login.');
    const valid = await bcrypt.compare(String(body.password || ''), admin.password_hash);
    if (!valid) throw fastify.httpErrors.unauthorized('Invalid admin login.');
    const sessionToken = randomToken(32);
    await query('INSERT INTO admin_sessions (admin_id, session_token_hash, expires_at) VALUES ($1,$2, now() + interval \'8 hours\')', [admin.id, hashValue(sessionToken)]);
    reply.setCookie('dfk_admin_session', sessionToken, adminCookieOptions());
    return { ok: true };
  });
}
