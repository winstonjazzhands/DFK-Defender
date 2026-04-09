import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { DFK_CHAIN_ID, DFK_JEWEL_PAYMENT_ASSET } from "../_shared/env.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const now = new Date();
    const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();

    const [{ data: tokenRows, error: tokenError }, { data: legacyRows, error: legacyError }] = await Promise.all([
      supabase
        .from("dfk_token_payments")
        .select("kind, payment_asset, paid_amount_wei, verified_at, wallet_address, tx_hash")
        .eq("chain_id", DFK_CHAIN_ID),
      supabase
        .from("avax_payment_verifications")
        .select("kind, paid_amount_wei, verified_at, wallet_address, tx_hash")
        .limit(100000),
    ]);

    if (tokenError) throw tokenError;
    if (legacyError && legacyError.code !== "PGRST205") throw legacyError;

    const jewelPayments = (tokenRows || []).filter((row) => String(row.payment_asset || DFK_JEWEL_PAYMENT_ASSET) === DFK_JEWEL_PAYMENT_ASSET);
    const avaxPayments = legacyRows || [];

    const jewelTotalWei = jewelPayments.reduce((sum, row) => sum + BigInt(String(row.paid_amount_wei || "0")), 0n);
    const jewelTodayWei = jewelPayments
      .filter((row) => row.verified_at && String(row.verified_at) >= dayStart)
      .reduce((sum, row) => sum + BigInt(String(row.paid_amount_wei || "0")), 0n);

    const jewelGoldSwaps = jewelPayments.filter((row) => row.kind === "jewel_gold_swap").length;
    const jewelHeroHires = jewelPayments.filter((row) => String(row.kind || "").includes("hero")).length;

    return Response.json({
      ok: true,
      summary: {
        jewel: {
          payment_asset: DFK_JEWEL_PAYMENT_ASSET,
          total_wei: jewelTotalWei.toString(),
          today_wei: jewelTodayWei.toString(),
          tx_count: jewelPayments.length,
          gold_swaps: jewelGoldSwaps,
          hero_hires: jewelHeroHires,
        },
        avax: {
          tx_count: avaxPayments.length,
        },
        combined: {
          confirmed_payments: jewelPayments.length + avaxPayments.length,
        },
      },
    }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unknown error" }, {
      status: 400,
      headers: corsHeaders,
    });
  }
});
