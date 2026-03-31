#!/usr/bin/env bash
set -euo pipefail
npx supabase link --project-ref gsjlabbghztkrqvcijxp
npx supabase functions deploy wallet-auth-nonce --no-verify-jwt
npx supabase functions deploy wallet-auth-verify --no-verify-jwt
npx supabase functions deploy submit-run --no-verify-jwt

npx supabase functions deploy revoke-run-session --no-verify-jwt
