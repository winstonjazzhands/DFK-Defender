import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import csrf from '@fastify/csrf-protection';
import formbody from '@fastify/formbody';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { authRoutes } from './routes/auth.js';
import { meRoutes } from './routes/me.js';
import { depositRoutes } from './routes/deposits.js';
import { adminRoutes } from './routes/admin.js';

const fastify = Fastify({ logger: true });

await fastify.register(helmet, {
  contentSecurityPolicy: false,
});
await fastify.register(cookie, { secret: process.env.SESSION_SECRET || 'replace-me' });
await fastify.register(formbody);
await fastify.register(rateLimit, { global: true, max: 120, timeWindow: '1 minute' });
await fastify.register(cors, {
  origin: [process.env.APP_ORIGIN || 'http://127.0.0.1:8080'],
  credentials: true,
});
await fastify.register(csrf, { cookieOpts: { signed: false, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' } });
await authRoutes(fastify);
await meRoutes(fastify);
await depositRoutes(fastify);
await adminRoutes(fastify);
await fastify.register(import('@fastify/static'), {
  root: new URL('../public/', import.meta.url).pathname,
  prefix: '/admin/',
  decorateReply: false,
});

fastify.get('/api/health', async () => ({ ok: true }));

const port = Number(process.env.PORT || 8787);
fastify.listen({ port, host: '0.0.0.0' });
