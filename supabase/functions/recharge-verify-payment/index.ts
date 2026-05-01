// Verify a Recharge Server payment by transaction_id and activate the subscription.
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

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "Not authenticated" }, 401);

    const body = await req.json();
    const transactionId = String(body?.transaction_id ?? "").trim();
    const localId = body?.local_id ? String(body.local_id) : null;
    if (!transactionId) return json({ error: "transaction_id required" }, 400);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "BRAND-KEY": brandKey,
    };
    if (apiKey) headers["API-KEY"] = apiKey;
    if (secretKey) headers["SECRET-KEY"] = secretKey;

    const rsRes = await fetch("https://payment.rechargeserver.com/api/payment/verify", {
      method: "POST",
      headers,
      body: JSON.stringify({ transaction_id: transactionId }),
    });
    const rsData = await rsRes.json().catch(() => ({}));

    const admin = createClient(url, serviceKey);

    // Find local tx (by local_id from metadata, or by transaction_id)
    let txQuery = admin.from("payment_transactions").select("*").eq("user_id", user.id);
    if (localId) txQuery = txQuery.eq("id", localId);
    else txQuery = txQuery.eq("transaction_id", transactionId);
    const { data: tx } = await txQuery.maybeSingle();

    const status = String(rsData?.status ?? "").toUpperCase();
    const isPaid = status === "COMPLETED";
    const newStatus = isPaid ? "completed" : status === "PENDING" ? "pending" : "failed";

    if (tx) {
      const failureReason = isPaid
        ? null
        : status === "PENDING"
          ? "pending_at_gateway"
          : status
            ? `gateway_status_${status.toLowerCase()}`
            : "no_gateway_status";
      await admin
        .from("payment_transactions")
        .update({
          status: newStatus,
          transaction_id: transactionId,
          payment_method: rsData?.payment_method ?? null,
          failure_reason: failureReason,
          raw_response: rsData,
        })
        .eq("id", tx.id);
    }

    if (isPaid && tx?.plan_id) {
      // Fetch plan to compute expiry
      const { data: plan } = await admin
        .from("subscription_plans")
        .select("duration_days")
        .eq("id", tx.plan_id)
        .maybeSingle();
      const days = Number(plan?.duration_days ?? 30);
      const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

      await admin.from("subscriptions").insert({
        user_id: user.id,
        plan_id: tx.plan_id,
        starts_at: new Date().toISOString(),
        expires_at: expiresAt,
        status: "active",
      });
    }

    // SMS package purchase: credit shop_sms_balance
    if (isPaid && tx?.sms_package_id && tx?.shop_id) {
      const { data: pkg } = await admin
        .from("sms_packages")
        .select("sms_count, price_bdt")
        .eq("id", tx.sms_package_id)
        .maybeSingle();
      const smsCount = Number(pkg?.sms_count ?? 0);
      if (smsCount > 0) {
        // Upsert balance
        const { data: bal } = await admin
          .from("shop_sms_balance")
          .select("balance, total_purchased")
          .eq("shop_id", tx.shop_id)
          .maybeSingle();
        if (bal) {
          await admin
            .from("shop_sms_balance")
            .update({
              balance: Number(bal.balance ?? 0) + smsCount,
              total_purchased: Number(bal.total_purchased ?? 0) + smsCount,
              updated_at: new Date().toISOString(),
            })
            .eq("shop_id", tx.shop_id);
        } else {
          await admin.from("shop_sms_balance").insert({
            shop_id: tx.shop_id,
            balance: smsCount,
            total_purchased: smsCount,
          });
        }
        // Mark the related sms_purchase_request (if any) approved
        await admin
          .from("sms_purchase_requests")
          .insert({
            shop_id: tx.shop_id,
            user_id: user.id,
            package_id: tx.sms_package_id,
            sms_count: smsCount,
            amount_bdt: Number(pkg?.price_bdt ?? tx.amount ?? 0),
            payment_status: "approved",
            payment_method: "online",
            payment_provider: "recharge_server",
            payment_session_id: transactionId,
            txn_id: transactionId,
          });
      }
    }

    return json({ ok: true, status: newStatus, paid: isPaid, details: rsData });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});