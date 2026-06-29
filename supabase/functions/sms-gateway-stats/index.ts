// Fetch live SMS gateway stats (balance + usage). REVE primary, with local fallback.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function pickNumber(obj: any, keys: string[]): number | null {
  if (!obj || typeof obj !== "object") return null;
  for (const k of keys) {
    const v = obj[k];
    if (v == null) continue;
    const n = typeof v === "number" ? v : Number(String(v).replace(/[^\d.\-]/g, ""));
    if (!isNaN(n)) return n;
  }
  return null;
}

async function sumSmsCount(admin: any, status: string, sinceIso: string): Promise<number> {
  let from = 0;
  let total = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await admin
      .from("sms_history")
      .select("sms_count")
      .eq("status", status)
      .gte("created_at", sinceIso)
      .range(from, from + pageSize - 1);
    if (error) throw error;
    const rows = data ?? [];
    total += rows.reduce((sum: number, row: any) => sum + Number(row.sms_count ?? 0), 0);
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return total;
}

async function sumShopBalance(admin: any): Promise<number> {
  let from = 0;
  let total = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await admin
      .from("shop_sms_balance")
      .select("balance")
      .range(from, from + pageSize - 1);
    if (error) throw error;
    const rows = data ?? [];
    total += rows.reduce((sum: number, row: any) => sum + Number(row.balance ?? 0), 0);
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return total;
}

async function reveBalance(cfg: any): Promise<{ balance: number | null; raw: string; error?: string }> {
  // Per REVE API doc, balance endpoint is:
  //   http://smpp.revesms.com/sms/smsConfiguration/smsClientBalance.jsp?client=CLIENT_ID
  // It requires a Client ID (not the apikey/secretkey used for sending).
  const clientId = (cfg.client_id || "").toString().trim();
  if (!clientId) {
    return { balance: null, raw: "", error: "REVE Client ID missing — Admin → SMS Settings এ Client ID দিন (balance API এর জন্য)" };
  }
  const urls = [
    `http://smpp.revesms.com/sms/smsConfiguration/smsClientBalance.jsp?client=${encodeURIComponent(clientId)}`,
    `http://103.177.125.106/portal/sms/smsConfiguration/smsClientBalance.jsp?client=${encodeURIComponent(clientId)}`,
  ];
  let lastErr = "";
  let lastBody = "";
  for (const url of urls) {
    try {
      console.log("[sms-gateway-stats] reve balance →", url);
      const res = await fetch(url, { method: "GET" });
      const text = (await res.text()).trim();
      lastBody = text;
      console.log("[sms-gateway-stats] status=", res.status, "body=", text.slice(0, 300));
      if (!res.ok) { lastErr = `HTTP ${res.status}`; continue; }
      // REVE returns balance as a plain string (e.g. "983.35").
      let n: number | null = null;
      const m = text.match(/-?\d+(\.\d+)?/);
      if (m) n = parseFloat(m[0]);
      if (n != null && !isNaN(n)) return { balance: n, raw: text };
      lastErr = "Could not parse balance from response";
    } catch (e) {
      lastErr = (e as Error).message;
    }
  }
  return { balance: null, raw: lastBody, error: lastErr || "Balance fetch failed" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey);

    // Load primary active gateway
    const { data: gw, error: gwErr } = await admin
      .from("sms_gateways")
      .select("*")
      .eq("is_active", true)
      .order("is_primary", { ascending: false })
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (gwErr) console.error("[sms-gateway-stats] gw err", gwErr);

    // Local stats from sms_history (always compute as base/fallback)
    const monthStart = new Date();
    monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

    const [todaySent, monthSent, monthFailed, localBalance] = await Promise.all([
      sumSmsCount(admin, "sent", todayStart.toISOString()),
      sumSmsCount(admin, "sent", monthStart.toISOString()),
      sumSmsCount(admin, "failed", monthStart.toISOString()),
      sumShopBalance(admin),
    ]);

    let balance = localBalance;
    let source: "reve" | "local" | "mixed" = "local";
    let providerError: string | undefined;
    let providerRaw: string | undefined;
    let gatewayConfigured = !!gw;

    if (gw && gw.provider === "reve") {
      const r = await reveBalance(gw.config ?? {});
      if (r.balance != null) {
        balance = r.balance; // ৳ (BDT) per REVE portal
        source = "reve";
      } else {
        source = "local";
        providerError = r.error;
        providerRaw = r.raw;
      }
    }

    return json({
      ok: true,
      balance,
      today: todaySent,
      month: monthSent,
      failed: monthFailed,
      source,
      gateway_configured: gatewayConfigured,
      provider: gw?.provider ?? null,
      provider_error: providerError ?? null,
      provider_raw: providerRaw ?? null,
    });
  } catch (e) {
    console.error("[sms-gateway-stats] fatal", e);
    return json({ ok: false, error: (e as Error).message, balance: 0, today: 0, month: 0, failed: 0, source: "local", fallback: true });
  }
});