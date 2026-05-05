// Create a Recharge Server payment session for a Shop Transfer charge.
// Returns a payment_url to redirect the user to.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const brandKey = Deno.env.get("RECHARGE_BRAND_KEY") ?? "";
    const apiKey = Deno.env.get("RECHARGE_API_KEY") ?? "";
    const secretKey = Deno.env.get("RECHARGE_SECRET_KEY") ?? "";

    if (!brandKey) return json({ error: "RECHARGE_BRAND_KEY not configured" }, 500);

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "Not authenticated" }, 401);

    const body = await req.json();
    const transferId = String(body?.transfer_id ?? "");
    const origin = String(body?.origin ?? "").replace(/\/$/, "");
    if (!transferId) return json({ error: "transfer_id required" }, 400);
    if (!origin) return json({ error: "origin required" }, 400);

    const admin = createClient(url, serviceKey);
    const { data: tr, error: trErr } = await admin
      .from("shop_transfer_requests")
      .select("id, from_user_id, charge_amount, status, shop_id")
      .eq("id", transferId)
      .maybeSingle();
    if (trErr || !tr) return json({ error: "Transfer not found" }, 404);
    if (tr.from_user_id !== user.id) return json({ error: "forbidden" }, 403);
    if (tr.status !== "pending_payment") return json({ error: "invalid_state" }, 400);

    const finalPrice = Number(tr.charge_amount);

    const { data: tx, error: tErr } = await admin
      .from("payment_transactions")
      .insert({
        user_id: user.id,
        shop_transfer_id: tr.id,
        shop_id: tr.shop_id,
        kind: "shop_transfer",
        provider: "recharge_server",
        amount: finalPrice,
        status: "pending",
      })
      .select("id")
      .single();
    if (tErr || !tx) return json({ error: tErr?.message ?? "Failed to create tx" }, 500);

    const successUrl = `${origin}/app/shops/transfer-callback?status=success&local_id=${tx.id}&transfer_id=${tr.id}`;
    const cancelUrl = `${origin}/app/shops/transfer-callback?status=cancel&local_id=${tx.id}&transfer_id=${tr.id}`;
    const phoneMeta = String(body?.phone ?? user.phone ?? user.email ?? "").slice(0, 20);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "BRAND-KEY": brandKey,
    };
    if (apiKey) headers["API-KEY"] = apiKey;
    if (secretKey) headers["SECRET-KEY"] = secretKey;

    const rsRes = await fetch("https://payment.rechargeserver.com/api/payment/create", {
      method: "POST",
      headers,
      body: JSON.stringify({
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: { phone: phoneMeta, local_id: tx.id, user_id: user.id, kind: "shop_transfer", transfer_id: tr.id },
        amount: String(finalPrice),
      }),
    });

    const rsData = await rsRes.json().catch(() => ({}));
    if (!rsRes.ok || rsData?.status === false) {
      await admin.from("payment_transactions").update({ status: "failed", raw_response: rsData }).eq("id", tx.id);
      return json({ error: rsData?.message ?? "Recharge Server error", details: rsData }, 502);
    }

    await admin.from("payment_transactions").update({ raw_response: rsData }).eq("id", tx.id);

    return json({ ok: true, payment_url: rsData?.payment_url, local_id: tx.id });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});