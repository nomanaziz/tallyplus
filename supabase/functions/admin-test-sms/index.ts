// Admin-only: send a test SMS via primary REVE gateway to verify config.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });

function normalizePhone(raw: string): string | null {
  const d = String(raw ?? "").replace(/\D/g, "");
  if (!d) return null;
  // BD shortcuts
  if (d.length === 11 && d.startsWith("01")) return "88" + d;
  if (d.length === 10 && d.startsWith("1")) return "880" + d;
  // Already has country code (8-15 digits)
  if (d.length >= 8 && d.length <= 15) return d;
  return null;
}

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
    const rawPhone: string = body?.phone ?? "";
    const customMsg: string = (body?.message ?? "").toString().trim();
    const phone = normalizePhone(rawPhone);
    if (!phone) return json({ error: "Invalid phone. Include country code, e.g. 8801XXXXXXXXX" }, 400);

    // Load primary REVE gateway
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
    const callerID = cfg.sender_id || "";
    if (!apiKey || !secretKey || !callerID) {
      return json({ error: "Gateway missing api_key / secret_key / sender_id" }, 400);
    }

    const message = customMsg || `Test SMS from TallyPlus admin at ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC`;
    const reqUrl = `${baseUrl}/sendtext?apikey=${encodeURIComponent(apiKey)}&secretkey=${encodeURIComponent(secretKey)}&callerID=${encodeURIComponent(callerID)}&toUser=${encodeURIComponent(phone)}&messageContent=${encodeURIComponent(message)}`;
    console.log("[admin-test-sms] sending to", phone, "via", baseUrl, "sender=", callerID);

    const res = await fetch(reqUrl, { method: "GET" });
    const text = await res.text();
    console.log("[admin-test-sms] response status=", res.status, "body=", text.slice(0, 400));

    if (!res.ok) {
      return json({ ok: false, status: res.status, provider_response: text.slice(0, 500) }, 200);
    }
    let providerId: string | undefined;
    try {
      const j = JSON.parse(text);
      providerId = j.messageid || j.message_id || j.id;
    } catch { providerId = text.trim().slice(0, 100); }
    return json({ ok: true, phone, sender: callerID, message, provider_id: providerId, provider_response: text.slice(0, 500) });
  } catch (e) {
    console.error("[admin-test-sms] error", e);
    return json({ error: (e as Error).message }, 500);
  }
});