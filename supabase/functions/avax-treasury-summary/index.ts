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

function sumWei(rows: Array<{ expected_amount_wei?: string | number | null }>) {
  return rows.reduce((total, row) => total + BigInt(String(row?.expected_amount_wei || '0')), 0n).toString();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200, headers: corsHeaders });
  try {
    const admin = createAdmin();
    const body = await req.json().catch(() => ({}));
    const session = await requireTreasurySession(req, admin);
    const walletAddress = normalizeAddress(body.walletAddress || session.wallet_address);
    const treasuryAddress = normalizeAddress(Deno.env.get('DFK_AVAX_TREASURY_ADDRESS') || '0x971bdacd04ef40141ddb6ba175d4f76665103c81');
    if (!walletAddress) return json({ error: 'walletAddress is required.' }, 400);
    if (walletAddress !== normalizeAddress(session.wallet_address)) return json({ error: 'Wallet mismatch.' }, 401);
    if (walletAddress !== treasuryAddress) return json({ error: 'Treasury access only.' }, 403);

    const { data: rows, error } = await admin
      .from('crypto_payment_sessions')
      .select('kind, expected_amount_wei, confirmed_at, status')
      .eq('status', 'confirmed');

    if (error) throw error;

    const today = new Date().toISOString().slice(0, 10);
    const confirmed = Array.isArray(rows) ? rows : [];
    const todayRows = confirmed.filter((row) => String(row.confirmed_at || '').slice(0, 10) === today);
    const entryRows = confirmed.filter((row) => String(row.kind || '') === 'entry_fee');
    const goldRows = confirmed.filter((row) => String(row.kind || '') === 'gold_swap');
    const heroRows = confirmed.filter((row) => String(row.kind || '') === 'milestone_hero_hire');

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
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ error: error instanceof Error ? error.message : 'Could not load treasury summary.' }, 500);
  }
});
