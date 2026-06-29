// Admin-only: check delivery status of a previously sent SMS via REVE getstatus API.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });

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
    const messageId: string = String(body?.message_id ?? "").trim();
    if (!messageId) return json({ error: "message_id required" }, 400);

    const { data: gw } = await admin
      .from("sms_gateways")
      .select("*")
      .eq("provider", "reve")
      .eq("is_active", true)
      .order("is_primary", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!gw) return json({ error: "No active SMS gateway configured" }, 503);

    const cfg = (gw.config ?? {}) as Record<string, string>;
    const baseUrl = (cfg.base_url || "http://smpp.revesms.com:7788").replace(/\/$/, "");
    const apiKey = cfg.api_key || cfg.username || "";
    const secretKey = cfg.secret_key || cfg.password || "";
    if (!apiKey || !secretKey) return json({ error: "Gateway missing credentials" }, 400);

    const reqUrl = `${baseUrl}/getstatus?apikey=${encodeURIComponent(apiKey)}&secretkey=${encodeURIComponent(secretKey)}&messageid=${encodeURIComponent(messageId)}`;
    console.log("[admin-sms-status] GET", reqUrl.replace(secretKey, "***"));

    const res = await fetch(reqUrl);
    const text = await res.text();
    console.log("[admin-sms-status] status=", res.status, "body=", text.slice(0, 400));
    return json({ ok: res.ok, status: res.status, message_id: messageId, provider_response: text.slice(0, 800) });
  } catch (e) {
    console.error("[admin-sms-status] error", e);
    return json({ error: (e as Error).message }, 500);
  }
});