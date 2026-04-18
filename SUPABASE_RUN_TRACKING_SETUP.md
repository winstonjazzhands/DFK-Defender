# DFK Defender Supabase run tracking setup

1. In Supabase SQL Editor, run `schema.sql` from this zip.
2. Install the Supabase CLI locally if you do not already have it.
3. From this project folder, deploy the edge functions:
   - `supabase functions deploy wallet-auth-nonce`
   - `supabase functions deploy wallet-auth-verify`
   - `supabase functions deploy submit-run`
4. This zip now includes `supabase/config.toml` with `verify_jwt = false` for all three run-tracking functions. Redeploy them from this folder so Supabase stops rejecting requests before your custom wallet auth logic runs.
5. Make sure your local Supabase CLI is linked to the correct project.
5. Confirm the publishable key and project URL in `supabase.config.js` are correct.
6. Host the updated game files.
7. Connect wallet in the game, click `Enable Run Tracking`, sign the message, then finish a run.

Notes:
- This setup signs a wallet message for tracking only. It does not send a blockchain transaction.
- Runs are written only when the portal dies in the current build.
- Existing auth.users based schema from the old setup is no longer used by this build.


## V3 deploy note
If the browser still shows **Missing authorization header** when you click **Enable Run Tracking**, redeploy the functions with the CLI flag below. This is the part that actually removes gateway JWT enforcement for these custom wallet-auth endpoints:

```
npx supabase functions deploy wallet-auth-nonce --no-verify-jwt
npx supabase functions deploy wallet-auth-verify --no-verify-jwt
npx supabase functions deploy submit-run --no-verify-jwt
```

A helper script is included in this zip:
- `deploy-supabase-functions.bat`
- `deploy-supabase-functions.sh`


## New in V5
- Added `revoke-run-session` so disabling run tracking revokes the active server-side session, not just the local browser token.
- Redeploy this function too:
  - `npx supabase functions deploy revoke-run-session --no-verify-jwt`


## Important after queue/backend fixes

After changing `supabase/functions/submit-run/index.ts`, redeploy the `submit-run` Edge Function or the live endpoint will keep using the old code.

## Burn table compatibility fix

If a DFK Gold burn succeeds on-chain but the Supabase burn table stays empty, do all 3 of these steps:

1. In Supabase SQL Editor, run `schema.sql` from this zip again.
2. Also run `supabase/migrations/20260402_burn_table_compat_fix.sql` from this zip.
3. Redeploy both burn-related Edge Functions from this project folder:
   - `npx supabase functions deploy record-dfkgold-burn --no-verify-jwt`
   - `npx supabase functions deploy public-leaderboard --no-verify-jwt`

After that, do one fresh burn test and check `public.dfk_gold_burns`.


## Leaderboard hardening

- `submit-run` now rejects obviously impossible payloads, including invalid run timing, mismatched tower counts, malformed hero aggregates, and extreme out-of-range values.
- Runs that arrive implausibly fast for their cleared wave count are rejected server-side.
- Rapid-fire run spam is rate-limited per wallet over a rolling 10-minute window.


## High-value run secure submission

For runs at wave 30 and above, deploy `run-submit-challenge` alongside `submit-run` and set `RUN_SUBMIT_CHALLENGE_SECRET` in Supabase Edge Function secrets. This enables the final signature flow and lets high-value runs stay recoverable locally until the backend confirms receipt.

## Duplicate submission hardening

- `RUN_SUBMIT_CHALLENGE_SECRET` must be set in Supabase Edge Function secrets. Do not rely on any fallback secret.
- Apply the latest database migration so `public.runs` enforces a unique normalized `client_run_id`; this is what blocks duplicate run inserts even if the same payload is replayed.


## Weekly bounty test reset

A new Edge Function, `bounty-reset-progress`, was added for the private test wallet. It clears the current week's bounty claim requests, weekly bounty claim slots, and tracked runs for that wallet only.

If you want a wallet other than the built-in test wallet to use this button, set this optional secret before deploying the function:

```
BOUNTY_TEST_RESET_WALLET=0xyourwallethere
```

You need to deploy this function after updating the build:

```
npx supabase functions deploy bounty-reset-progress --no-verify-jwt
```
