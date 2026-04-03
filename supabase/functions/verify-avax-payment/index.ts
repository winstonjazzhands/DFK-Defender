import { createClient } from 'jsr:@supabase/supabase-js@2';
import { JsonRpcProvider } from 'npm:ethers@6';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const rpcByChainId = new Map<number, string>([
  [43114, Deno.env.get('AVAX_RPC_URL') || 'https://api.avax.network/ext/bc/C/rpc'],
  [43113, Deno.env.get('AVAX_FUJI_RPC_URL') || 'https://api.avax-test.network/ext/bc/C/rpc'],
]);

function errorMessage(error: unknown) {
  return String((error as { message?: string } | null)?.message || error || '');
}

function isMissingColumnError(error: unknown, columnName: string) {
  const message = errorMessage(error).toLowerCase();
  return message.includes('column') && message.includes(columnName.toLowerCase()) && message.includes('does not exist');
}

function isAnyMissingColumnsError(error: unknown, columnNames: string[]) {
  return columnNames.some((columnName) => isMissingColumnError(error, columnName));
}

async function loadPlayer(admin: ReturnType<typeof createAdmin>, walletAddress: string) {
  const fullSelect = 'wallet_address, paid_games_remaining, total_paid_games_purchased';
  const fallbackSelect = 'wallet_address, paid_games_remaining';

  const primary = await admin
    .from('players')
    .select(fullSelect)
    .eq('wallet_address', walletAddress)
    .single();

  if (!primary.error && primary.data) return { ...primary.data, total_paid_games_purchased: Number((primary.data as { total_paid_games_purchased?: number }).total_paid_games_purchased || 0) };
  if (!isAnyMissingColumnsError(primary.error, ['paid_games_remaining', 'total_paid_games_purchased'])) throw primary.error || new Error('Player record not found.');

  const fallback = await admin
    .from('players')
    .select(fallbackSelect)
    .eq('wallet_address', walletAddress)
    .single();

  if (fallback.error || !fallback.data) throw fallback.error || new Error('Player record not found.');
  return { ...fallback.data, total_paid_games_purchased: 0 };
}

function normalizeAddress(address: string | null | undefined) {
  return String(address || '').trim().toLowerCase();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200, headers: corsHeaders });
  try {
    const body = await req.json();
    const paymentSessionId = String(body.paymentSessionId || '').trim();
    const txHash = String(body.txHash || '').trim();
    const walletAddress = normalizeAddress(body.walletAddress);
    const expectedAmountWei = String(body.expectedAmountWei || '0').trim();
    const expectedTo = normalizeAddress(body.expectedTo);
    const expectedNote = String(body.expectedNote || '').trim();
    const chainId = Number(body.chainId || 43114);
    const clientRunId = typeof body.clientRunId === 'string' ? body.clientRunId.trim() : null;
    const kind = typeof body.kind === 'string' ? body.kind.trim().slice(0, 60) : 'entry_fee';
    if (!paymentSessionId || !txHash || !walletAddress || !expectedTo) return json({ error: 'Missing verification fields.' }, 400);

    const admin = createAdmin();
    const { data: session, error: sessionError } = await admin.from('crypto_payment_sessions')
      .select('id, wallet_address, status, expected_amount_wei, expires_at')
      .eq('id', paymentSessionId)
      .single();
    if (sessionError || !session) return json({ error: 'Payment session not found.' }, 404);
    if (normalizeAddress(session.wallet_address) !== walletAddress) return json({ error: 'Wallet mismatch.' }, 400);
    if (Date.now() > new Date(session.expires_at).getTime()) return json({ error: 'Payment session expired.' }, 400);

    const provider = new JsonRpcProvider(rpcByChainId.get(chainId) || rpcByChainId.get(43114)!, chainId, { staticNetwork: true });
    const tx = await provider.getTransaction(txHash);
    if (!tx) return json({ error: 'Transaction not found yet.' }, 404);
    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt || receipt.status !== 1) return json({ error: 'Transaction not confirmed successfully yet.' }, 400);
    if (normalizeAddress(tx.from) !== walletAddress) return json({ error: 'Transaction sender mismatch.' }, 400);
    if (normalizeAddress(tx.to) !== expectedTo) return json({ error: 'Transaction recipient mismatch.' }, 400);
    if (tx.value.toString() !== expectedAmountWei) return json({ error: 'Transaction value mismatch.' }, 400);
    
    const verifiedAt = new Date().toISOString();
    const bundleGamesGranted = kind === 'entry_fee' ? 100 : 0;
    const { error: updateError } = await admin.from('crypto_payment_sessions').update({
      client_run_id: clientRunId,
      kind,
      status: 'confirmed',
      payment_tx_hash: txHash,
      confirmed_at: verifiedAt,
      metadata: {
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
      },
    }).eq('id', paymentSessionId);
    if (updateError) throw updateError;

    if (bundleGamesGranted > 0) {
      const player = await loadPlayer(admin, walletAddress);
      const nextPaidGamesRemaining = Math.max(0, Number(player.paid_games_remaining || 0)) + bundleGamesGranted;
      const nextTotalPaidGamesPurchased = Math.max(0, Number(player.total_paid_games_purchased || 0)) + bundleGamesGranted;
      const desiredUpdate = {
        paid_games_remaining: nextPaidGamesRemaining,
        total_paid_games_purchased: nextTotalPaidGamesPurchased,
      };
      let { error: playerUpdateError } = await admin
        .from('players')
        .update(desiredUpdate)
        .eq('wallet_address', walletAddress);

      if (isMissingColumnError(playerUpdateError, 'total_paid_games_purchased')) {
        const fallbackUpdate = await admin
          .from('players')
          .update({ paid_games_remaining: nextPaidGamesRemaining })
          .eq('wallet_address', walletAddress);
        playerUpdateError = fallbackUpdate.error;
      }

      if (playerUpdateError && isAnyMissingColumnsError(playerUpdateError, ['paid_games_remaining', 'total_paid_games_purchased'])) {
        throw new Error('players table is missing AVAX paid-game columns; run the schema.sql migration, then redeploy verify-avax-payment and avax-run-balance.');
      }

      if (playerUpdateError) throw playerUpdateError;
    }

    return json({ ok: true, verifiedAt, txHash, blockNumber: receipt.blockNumber, bundleGamesGranted });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || 'Payment verification failed.');
    return json({ error: message || 'Payment verification failed.' }, 500);
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
