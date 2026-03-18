import { query } from '../db.js';

const depositAddress = String(process.env.DFK_DEPOSIT_ADDRESS || '').trim();
const confirmationsRequired = Number(process.env.DFK_CONFIRMATIONS_REQUIRED || 12);

export async function depositRoutes(fastify) {
  fastify.get('/api/deposits/config', async () => ({
    chainId: 53935,
    asset: 'JEWEL',
    depositAddress,
    confirmationsRequired,
  }));

  fastify.get('/api/admin/deposits', async () => {
    const rows = await query('SELECT * FROM deposits ORDER BY created_at DESC LIMIT 100');
    return { deposits: rows.rows };
  });
}
