import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function normalizeAddress(address: string | null | undefined) {
  return String(address || '').trim().toLowerCase();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200, headers: corsHeaders });
  try {
    const body = await req.json();
    const walletAddress = normalizeAddress(body.walletAddress);
    if (!walletAddress) return json({ error: 'walletAddress is required.' }, 400);
    const clientRunId = typeof body.clientRunId === 'string' ? body.clientRunId.trim() : null;
    const kind = typeof body.kind === 'string' && body.kind.trim() ? body.kind.trim().slice(0, 60) : 'entry_fee';
    const chainId = Number(body.chainId || 43114);
    const expectedAmountWei = String(body.expectedAmountWei || '0').trim();
    const parentPaymentSessionId = typeof body.parentPaymentSessionId === 'string' && body.parentPaymentSessionId.trim() ? body.parentPaymentSessionId.trim() : null;
    const metadata = body && typeof body.metadata === 'object' && body.metadata && !Array.isArray(body.metadata) ? body.metadata : {};
    const admin = createAdmin();

    const playerUpsert = await admin.from('players').upsert({ wallet_address: walletAddress }, { onConflict: 'wallet_address' });
    if (playerUpsert.error) throw new Error(`players upsert failed: ${playerUpsert.error.message || playerUpsert.error}`);

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const { data, error } = await admin.from('crypto_payment_sessions').insert({
      wallet_address: walletAddress,
      client_run_id: clientRunId,
      kind,
      chain_id: chainId,
      expected_amount_wei: expectedAmountWei,
      parent_payment_session_id: parentPaymentSessionId,
      expires_at: expiresAt,
      metadata,
    }).select('id, wallet_address, client_run_id, kind, chain_id, expected_amount_wei, created_at, expires_at').single();
    if (error) throw new Error(`crypto_payment_sessions insert failed: ${error.message || error}`);

    return json({
      ok: true,
      paymentSessionId: data.id,
      walletAddress: data.wallet_address,
      clientRunId: data.client_run_id,
      kind: data.kind,
      chainId: data.chain_id,
      expectedAmountWei: String(data.expected_amount_wei),
      createdAt: data.created_at,
      expiresAt: data.expires_at,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || 'Could not create payment session.');
    return json({ error: message || 'Could not create payment session.' }, 500);
  }
});

function createAdmin() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
