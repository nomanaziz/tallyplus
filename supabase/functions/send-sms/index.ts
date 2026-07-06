// Send SMS via configured gateway (REVE primary). Auth: shop member.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });

function normalizeBdPhone(raw: string): string | null {
  const d = String(raw ?? "").replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("01")) return "88" + d;
  if (d.length === 13 && d.startsWith("8801")) return d;
  if (d.length === 10 && d.startsWith("1")) return "880" + d;
  return null;
}

function renderTemplate(tpl: string, vars: Record<string, string | number | undefined>, signature: string): string {
  let out = tpl;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replaceAll(`{${k}}`, String(v ?? ""));
  }
  return signature ? `${out}\n${signature}` : out;
}

function smsSegments(msg: string): number {
  const isUnicode = /[^\x00-\x7F]/.test(msg);
  const per = isUnicode ? 70 : 160;
  return Math.max(1, Math.ceil(msg.length / per));
}

async function sendViaReve(cfg: any, phone: string, message: string): Promise<{ ok: boolean; id?: string; error?: string }> {
  const baseUrl = (cfg.base_url || "http://smpp.revesms.com:7788").replace(/\/$/, "");
  const apiKey = cfg.api_key || "";
  const secretKey = cfg.secret_key || "";
  const callerID = cfg.sender_id || "";
  if (!apiKey || !secretKey || !callerID) return { ok: false, error: "Gateway not configured" };
  const url = `${baseUrl}/sendtext?apikey=${encodeURIComponent(apiKey)}&secretkey=${encodeURIComponent(secretKey)}&callerID=${encodeURIComponent(callerID)}&toUser=${encodeURIComponent(phone)}&messageContent=${encodeURIComponent(message)}`;
  try {
    const res = await fetch(url, { method: "GET" });
    const text = await res.text();
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}: ${text.slice(0, 200)}` };
    // REVE returns json or plain text with messageid
    let id: string | undefined;
    try {
      const j = JSON.parse(text);
      id = j.messageid || j.message_id || j.id;
    } catch { id = text.trim().slice(0, 100); }
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
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

    const body = await req.json();
    const shopId: string = body?.shop_id;
    const templateCode: string | undefined = body?.template_code;
    const customMessage: string | undefined = body?.message;
    const recipients: Array<{ phone: string; name?: string; vars?: Record<string, any> }> = body?.recipients ?? [];
    if (!shopId || recipients.length === 0 || (!templateCode && !customMessage))
      return json({ error: "shop_id, (template_code or message), recipients required" }, 400);

    const admin = createClient(url, serviceKey);

    // Verify shop member
    const { data: isMem } = await admin.rpc("is_shop_member", { _user_id: user.id, _shop_id: shopId });
    if (!isMem) return json({ error: "Not a shop member" }, 403);

    // Load shop signature
    const { data: shop } = await admin.from("shops").select("name,phone").eq("id", shopId).maybeSingle();
    const signature = shop ? `- ${shop.name}${shop.phone ? `(${shop.phone})` : ""}` : "";

    // Load template (only when custom message not provided)
    let tpl: any = null;
    if (!customMessage) {
      const { data } = await admin.from("sms_templates").select("*").eq("code", templateCode!).eq("is_active", true).maybeSingle();
      if (!data) return json({ error: "Template not found or inactive" }, 400);
      tpl = data;
    }

    // Load primary gateway
    const { data: gw } = await admin.from("sms_gateways").select("*").eq("provider", "reve").eq("is_active", true).order("is_primary", { ascending: false }).limit(1).maybeSingle();
    if (!gw) return json({ error: "No active SMS gateway. Contact admin." }, 503);

    // Pre-render messages, count total segments
    const prepared = recipients.map((r) => {
      const phone = normalizeBdPhone(r.phone);
      const raw = customMessage
        ? renderTemplate(customMessage, { name: r.name ?? "", ...(r.vars ?? {}) }, signature)
        : renderTemplate(tpl.body_template, { name: r.name ?? "", ...(r.vars ?? {}) }, signature);
      return { ...r, phone, msg: raw, segs: phone ? smsSegments(raw) : 0 };
    });
    const valid = prepared.filter((p) => p.phone);
    const totalSegs = valid.reduce((s, p) => s + p.segs, 0);
    if (totalSegs === 0) return json({ error: "No valid recipients" }, 400);

    // Check balance
    const { data: bal } = await admin.from("shop_sms_balance").select("balance").eq("shop_id", shopId).maybeSingle();
    const currentBal = bal?.balance ?? 0;
    if (currentBal < totalSegs)
      return json({ error: "Insufficient SMS balance", required: totalSegs, available: currentBal }, 402);

    // Send each
    const results: Array<any> = [];
    let usedSegs = 0;
    for (const p of prepared) {
      if (!p.phone) {
        results.push({ phone: p.phone, name: p.name, status: "failed", error: "Invalid phone" });
        continue;
      }
      const r = await sendViaReve(gw.config, p.phone, p.msg);
      const status = r.ok ? "sent" : "failed";
      if (r.ok) usedSegs += p.segs;
      await admin.from("sms_history").insert({
        shop_id: shopId, gateway_id: gw.id, template_code: templateCode ?? "custom",
        recipient_phone: p.phone, recipient_name: p.name ?? null,
        message: p.msg, sms_count: p.segs, status,
        provider_message_id: r.id ?? null, error: r.error ?? null, created_by: user.id,
      });
      results.push({ phone: p.phone, name: p.name, status, error: r.error });
    }

    // Decrement balance for successfully sent only
    if (usedSegs > 0) {
      await admin.from("shop_sms_balance").upsert({
        shop_id: shopId, balance: currentBal - usedSegs, total_used: (bal as any)?.total_used != null ? ((bal as any).total_used + usedSegs) : usedSegs,
      } as any, { onConflict: "shop_id" });
    }

    const newBal = currentBal - usedSegs;
    return json({ ok: true, results, used: usedSegs, balance: newBal });
  } catch (e) {
    console.error("[send-sms] error", e);
    return json({ error: (e as Error).message }, 500);
  }
});