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
