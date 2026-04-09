import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { DFK_CHAIN_ID, DFK_JEWEL_PAYMENT_ASSET } from "../_shared/env.ts";
import { verifyNativeJewelTransferTx } from "../_shared/chain.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const paymentSessionId = String(body.paymentSessionId || "").trim();
    const txHash = String(body.txHash || "").trim().toLowerCase() as `0x${string}`;

    if (!paymentSessionId || !txHash) {
      throw new Error("paymentSessionId and txHash are required.");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: session, error: sessionError } = await supabase
      .from("dfk_token_payment_sessions")
      .select("*")
      .eq("id", paymentSessionId)
      .single();

    if (sessionError || !session) throw new Error("Payment session not found.");
    if (session.status === "verified") {
      return Response.json({ ok: true, alreadyVerified: true, verifiedAt: session.verified_at }, { headers: corsHeaders });
    }
    if (Number(session.chain_id) !== DFK_CHAIN_ID) throw new Error("Session chain mismatch.");

    const verified = await verifyNativeJewelTransferTx(
      txHash,
      session.wallet_address,
      BigInt(String(session.expected_amount_wei)),
    );

    const verifiedAt = new Date().toISOString();

    const { error: insertError } = await supabase
      .from("dfk_token_payments")
      .upsert({
        payment_session_id: session.id,
        wallet_address: session.wallet_address,
        client_run_id: session.client_run_id,
        kind: session.kind,
        chain_id: session.chain_id,
        token_address: session.token_address || "native",
        payment_asset: session.payment_asset || DFK_JEWEL_PAYMENT_ASSET,
        treasury_address: session.treasury_address,
        expected_amount_wei: session.expected_amount_wei,
        paid_amount_wei: verified.amount,
        tx_hash: verified.transactionHash,
        block_number: verified.blockNumber,
        metadata: session.metadata,
        verified_at: verifiedAt,
      }, { onConflict: "tx_hash" });

    if (insertError) throw insertError;

    const { error: updateError } = await supabase
      .from("dfk_token_payment_sessions")
      .update({
        status: "verified",
        verified_at: verifiedAt,
        tx_hash: verified.transactionHash,
        block_number: verified.blockNumber,
      })
      .eq("id", session.id);

    if (updateError) throw updateError;

    return Response.json({
      ok: true,
      paymentAsset: DFK_JEWEL_PAYMENT_ASSET,
      verifiedAt,
      txHash: verified.transactionHash,
      amountWei: verified.amount,
      walletAddress: verified.from,
      treasuryAddress: verified.to,
    }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unknown error" }, {
      status: 400,
      headers: corsHeaders,
    });
  }
});
