# Local runbook

1. Load `db/schema.sql` into PostgreSQL.
2. Copy `.env.example` to `.env` and fill secrets.
3. `npm install`
4. `npm run dev:api`
5. `npm run dev:worker`
6. Serve the root static game with a local web server.
7. Set `window.DFK_DEFENSE_API_BASE` before `js/security-wallet.js` if the API is not hosted at `/api`.

Before production:
- Put the API behind HTTPS.
- Store secrets outside the repo.
- Keep the treasury key off the web host.
- Restrict admin access.
- Keep withdrawals manual.
- Get an external review.
