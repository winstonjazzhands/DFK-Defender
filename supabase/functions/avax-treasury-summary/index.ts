import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function createAdmin() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

function normalizeAddress(address: string | null | undefined) {
  return String(address || '').trim().toLowerCase();
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

async function requireTreasurySession(req: Request, admin: ReturnType<typeof createAdmin>) {
  const authHeader = req.headers.get('Authorization') || '';
  const fallbackHeader = req.headers.get('x-session-token') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim() || String(fallbackHeader).trim();
  if (!token) throw new Response(JSON.stringify({ error: 'Session token required.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  const { data: session, error } = await admin
    .from('wallet_sessions')
    .select('session_token, wallet_address, expires_at, revoked_at')
    .eq('session_token', token)
    .single();

  if (error || !session) throw new Response(JSON.stringify({ error: 'Session not found.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  if (session.revoked_at) throw new Response(JSON.stringify({ error: 'Session revoked.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  if (Date.now() >= new Date(session.expires_at).getTime()) throw new Response(JSON.stringify({ error: 'Session expired.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  return session;
}

function sumWei(rows: Array<{ expected_amount_wei?: string | number | null; amount_wei?: string | number | null; paid_amount_wei?: string | number | null }>) {
  return rows.reduce((total, row) => total + BigInt(String((row && (row.amount_wei ?? row.paid_amount_wei ?? row.expected_amount_wei)) || '0')), 0n).toString();
}


async function fetchPaginatedBurnRows(admin: ReturnType<typeof createAdmin>) {
  const pageSize = 1000;
  const rows: Array<{ burn_amount?: number | string | null; confirmed_at?: string | null }> = [];
  let from = 0;
  while (true) {
    const { data, error } = await admin
      .from('dfk_gold_burns')
      .select('burn_amount, confirmed_at')
      .range(from, from + pageSize - 1);
    if (error && error.code !== 'PGRST205') throw error;
    const batch = Array.isArray(data) ? data : [];
    rows.push(...batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200, headers: corsHeaders });
  try {
    const admin = createAdmin();
    const body = await req.json().catch(() => ({}));
    const session = await requireTreasurySession(req, admin);
    const walletAddress = normalizeAddress(body.walletAddress || session.wallet_address);
    const treasuryAddress = normalizeAddress(Deno.env.get('DFK_AVAX_TREASURY_ADDRESS') || '0xab45288409900be5ef23c19726a30c28268495ad');
    const privateAdminWallets = (Deno.env.get('DFK_PRIVATE_ADMIN_WALLETS') || `${treasuryAddress},0x971bdacd04ef40141ddb6ba175d4f76665103c81`)
      .split(',')
      .map((value) => normalizeAddress(value))
      .filter(Boolean);
    if (!walletAddress) return json({ error: 'walletAddress is required.' }, 400);
    if (walletAddress !== normalizeAddress(session.wallet_address)) return json({ error: 'Wallet mismatch.' }, 401);
    if (!privateAdminWallets.includes(walletAddress)) return json({ error: 'Treasury access only.' }, 403);

    const [
      { data: sessionRows, error: sessionError },
      { data: tokenRows, error: tokenError },
      burnRows,
      { count: lifetimeTrackedRunsCount, error: runCountError },
    ] = await Promise.all([
      admin.from('crypto_payment_sessions').select('kind, expected_amount_wei, paid_amount_wei, verified_at, confirmed_at, status').eq('status', 'confirmed'),
      admin.from('dfk_token_payments').select('kind, paid_amount_wei, expected_amount_wei, verified_at'),
      fetchPaginatedBurnRows(admin),
      admin.from('runs').select('id', { count: 'exact', head: true }),
    ]);

    if (sessionError && sessionError.code !== 'PGRST205') throw sessionError;
    if (tokenError && tokenError.code !== 'PGRST205') throw tokenError;
    if (runCountError && runCountError.code !== 'PGRST205') throw runCountError;

    const today = new Date().toISOString().slice(0, 10);
    const confirmed = []
      .concat(Array.isArray(sessionRows) ? sessionRows.map((row) => ({
        kind: row.kind,
        amount_wei: row.paid_amount_wei || row.expected_amount_wei,
        confirmed_at: row.verified_at || row.confirmed_at,
      })) : [])
      .concat(Array.isArray(tokenRows) ? tokenRows.map((row) => ({
        kind: row.kind,
        amount_wei: row.paid_amount_wei || row.expected_amount_wei,
        confirmed_at: row.verified_at,
      })) : []);
    const todayRows = confirmed.filter((row) => String(row.confirmed_at || '').slice(0, 10) === today);
    const entryRows = confirmed.filter((row) => String(row.kind || '') === 'entry_fee');
    const goldRows = confirmed.filter((row) => String(row.kind || '') === 'gold_swap');
    const heroRows = confirmed.filter((row) => {
      const kind = String(row.kind || '');
      return kind === 'hero_hire' || kind === 'milestone_hero_hire';
    });
    const burnEntries = Array.isArray(burnRows) ? burnRows : [];
    const todayBurnRows = burnEntries.filter((row) => String(row.confirmed_at || '').slice(0, 10) === today);
    const lifetimeTrackedRuns = Math.max(0, Number(lifetimeTrackedRunsCount || 0));
    const lifetimeBurnedGold = burnEntries.reduce((total, row) => total + (Number(row.burn_amount || 0) || 0), 0);
    const todayBurnedGold = todayBurnRows.reduce((total, row) => total + (Number(row.burn_amount || 0) || 0), 0);

    return json({
      ok: true,
      walletAddress,
      treasuryAddress,
      confirmedCount: confirmed.length,
      todayConfirmedCount: todayRows.length,
      totalConfirmedWei: sumWei(confirmed),
      todayConfirmedWei: sumWei(todayRows),
      entryFeeWei: sumWei(entryRows),
      goldSwapWei: sumWei(goldRows),
      heroHireWei: sumWei(heroRows),
      entryFeeCount: entryRows.length,
      goldSwapCount: goldRows.length,
      heroHireCount: heroRows.length,
      lifetimeTrackedRuns,
      lifetimeBurnedGold,
      todayBurnedGold,
      burnedGoldCount: burnEntries.length,
      todayBurnedGoldCount: todayBurnRows.length,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ error: error instanceof Error ? error.message : 'Could not load treasury summary.' }, 500);
  }
});
