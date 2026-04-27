// Mark a local payment transaction as failed/cancelled when the user
// returns from Recharge Server with status=cancel or status=failed but
// without a verifiable transaction_id.
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

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "Not authenticated" }, 401);

    const body = await req.json();
    const localId = body?.local_id ? String(body.local_id) : null;
    const transactionId = body?.transaction_id ? String(body.transaction_id) : null;
    const reason = String(body?.reason ?? "cancelled").slice(0, 200);
    const paymentMethod = body?.payment_method ? String(body.payment_method).slice(0, 80) : null;
    const paymentAmount = body?.payment_amount ? String(body.payment_amount) : null;

    if (!localId && !transactionId) {
      return json({ error: "local_id or transaction_id required" }, 400);
    }

    const admin = createClient(url, serviceKey);
    let q = admin.from("payment_transactions").select("id,status").eq("user_id", user.id);
    if (localId) q = q.eq("id", localId);
    else if (transactionId) q = q.eq("transaction_id", transactionId);
    const { data: tx } = await q.maybeSingle();

    if (!tx) return json({ ok: false, error: "transaction not found" }, 404);
    // Don't overwrite an already-completed payment
    if (tx.status === "completed") return json({ ok: true, already: "completed" });

    const updates: Record<string, unknown> = {
      status: "failed",
      failure_reason: reason,
    };
    if (transactionId) updates.transaction_id = transactionId;
    if (paymentMethod) updates.payment_method = paymentMethod;
    updates.raw_response = {
      manual_mark_failed: true,
      reason,
      payment_amount: paymentAmount,
      payment_method: paymentMethod,
      at: new Date().toISOString(),
    };

    const { error } = await admin
      .from("payment_transactions")
      .update(updates)
      .eq("id", tx.id);
    if (error) return json({ error: error.message }, 500);

    return json({ ok: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});