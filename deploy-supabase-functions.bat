@echo off
setlocal
npx supabase link --project-ref gsjlabbghztkrqvcijxp
npx supabase functions deploy wallet-auth-nonce --no-verify-jwt
npx supabase functions deploy wallet-auth-verify --no-verify-jwt
npx supabase functions deploy submit-run --no-verify-jwt
npx supabase functions deploy run-submit-challenge --no-verify-jwt
npx supabase functions deploy revoke-run-session --no-verify-jwt
npx supabase functions deploy record-dfkgold-burn --no-verify-jwt
npx supabase functions deploy public-leaderboard --no-verify-jwt

rem AVAX rails / treasury functions
npx supabase functions deploy create-avax-session --no-verify-jwt
npx supabase functions deploy verify-avax-payment --no-verify-jwt
npx supabase functions deploy avax-run-balance --no-verify-jwt
npx supabase functions deploy avax-consume-run --no-verify-jwt
npx supabase functions deploy avax-treasury-summary --no-verify-jwt
npx supabase functions deploy bounty-reset-progress --no-verify-jwt
endlocal
