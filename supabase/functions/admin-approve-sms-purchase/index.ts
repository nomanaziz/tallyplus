// Admin-only: approve/reject manual SMS purchase requests and credit shop balance.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: ud } = await userClient.auth.getUser();
    const user = ud?.user;
    if (!user) return json({ error: "Not authenticated" }, 401);

    const admin = createClient(url, serviceKey);
    const { data: isAdmin } = await admin.rpc("is_admin", { _user_id: user.id });
    if (!isAdmin) return json({ error: "Admin only" }, 403);

    const body = await req.json().catch(() => ({}));
    const requestId = String(body?.request_id ?? "").trim();
    const action = String(body?.action ?? "").trim();
    if (!UUID_RE.test(requestId)) return json({ error: "Valid request_id required" }, 400);
    if (!["approve", "reject"].includes(action)) return json({ error: "action must be approve or reject" }, 400);

    const { data: purchase, error: purchaseErr } = await admin
      .from("sms_purchase_requests")
      .select("id, shop_id, sms_count, payment_status")
      .eq("id", requestId)
      .maybeSingle();
    if (purchaseErr) throw purchaseErr;
    if (!purchase) return json({ error: "SMS purchase request not found" }, 404);
    if (purchase.payment_status !== "pending") {
      return json({ ok: true, already_processed: true, payment_status: purchase.payment_status });
    }

    const now = new Date().toISOString();

    if (action === "reject") {
      const { error } = await admin
        .from("sms_purchase_requests")
        .update({ payment_status: "rejected", updated_at: now })
        .eq("id", requestId)
        .eq("payment_status", "pending");
      if (error) throw error;
      return json({ ok: true, action: "reject" });
    }

    const smsCount = Number(purchase.sms_count ?? 0);
    if (smsCount <= 0) return json({ error: "Invalid SMS count" }, 400);

    // Claim the pending request first so a double-click cannot credit twice.
    const { data: claimed, error: claimErr } = await admin
      .from("sms_purchase_requests")
      .update({ payment_status: "approved", approved_at: now, updated_at: now })
      .eq("id", requestId)
      .eq("payment_status", "pending")
      .select("id, shop_id, sms_count")
      .maybeSingle();
    if (claimErr) throw claimErr;
    if (!claimed) return json({ ok: true, already_processed: true });

    const { data: bal, error: balErr } = await admin
      .from("shop_sms_balance")
      .select("balance, total_purchased")
      .eq("shop_id", purchase.shop_id)
      .maybeSingle();
    if (balErr) throw balErr;

    if (bal) {
      const { error } = await admin
        .from("shop_sms_balance")
        .update({
          balance: Number(bal.balance ?? 0) + smsCount,
          total_purchased: Number(bal.total_purchased ?? 0) + smsCount,
          updated_at: now,
        })
        .eq("shop_id", purchase.shop_id);
      if (error) throw error;
    } else {
      const { error } = await admin.from("shop_sms_balance").insert({
        shop_id: purchase.shop_id,
        balance: smsCount,
        total_purchased: smsCount,
        total_used: 0,
        updated_at: now,
      });
      if (error) throw error;
    }

    return json({ ok: true, action: "approve", credited: smsCount });
  } catch (e) {
    console.error("[admin-approve-sms-purchase] error", e);
    return json({ error: (e as Error).message }, 500);
  }
});