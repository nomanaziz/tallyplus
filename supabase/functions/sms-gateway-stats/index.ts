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

async function reveBalance(cfg: any): Promise<{ balance: number | null; raw: string; error?: string }> {
  const baseUrl = (cfg.base_url || "http://smpp.revesms.com:7788").replace(/\/$/, "");
  const apikey = cfg.api_key || cfg.username || "";
  const secretkey = cfg.secret_key || cfg.password || "";
  if (!apikey || !secretkey) return { balance: null, raw: "", error: "Missing credentials" };
  // REVE balance endpoint varies by account — try known paths in order.
  const paths = ["/balance", "/getbalance", "/getBalance", "/checkBalance", "/getBalanceAPI"];
  const qs = `apikey=${encodeURIComponent(apikey)}&secretkey=${encodeURIComponent(secretkey)}`;
  let lastStatus = 0;
  let lastBody = "";
  for (const p of paths) {
    const url = `${baseUrl}${p}?${qs}`;
    console.log("[sms-gateway-stats] try", p);
    try {
      const res = await fetch(url, { method: "GET" });
      const text = await res.text();
      lastStatus = res.status;
      lastBody = text;
      console.log("[sms-gateway-stats]", p, "status=", res.status, "body=", text.slice(0, 200));
      if (res.status === 404) continue; // try next path
      if (!res.ok) return { balance: null, raw: text, error: `HTTP ${res.status} at ${p}` };
      let n: number | null = null;
      try {
        const j = JSON.parse(text);
        n = pickNumber(j, ["balance", "Balance", "credit", "amount", "data"]);
        if (n == null && j && typeof j === "object") {
          n = pickNumber(j, ["Text", "text", "message"]);
        }
      } catch {
        const m = text.match(/-?\d+(\.\d+)?/);
        if (m) n = Number(m[0]);
      }
      if (n != null) return { balance: n, raw: text };
      // ok but unparseable — keep trying other paths
    } catch (e) {
      return { balance: null, raw: "", error: (e as Error).message };
    }
  }
  return { balance: null, raw: lastBody, error: `HTTP ${lastStatus} — no balance endpoint matched. Ask REVE support for your account's balance URL.` };
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

    const [{ count: todaySent }, { count: monthSent }, { count: monthFailed }, { data: balRows }] = await Promise.all([
      admin.from("sms_history").select("*", { count: "exact", head: true }).eq("status", "sent").gte("created_at", todayStart.toISOString()),
      admin.from("sms_history").select("*", { count: "exact", head: true }).eq("status", "sent").gte("created_at", monthStart.toISOString()),
      admin.from("sms_history").select("*", { count: "exact", head: true }).eq("status", "failed").gte("created_at", monthStart.toISOString()),
      admin.from("shop_sms_balance").select("balance"),
    ]);
    const localBalance = (balRows ?? []).reduce((s: number, r: any) => s + Number(r.balance ?? 0), 0);

    let balance = localBalance;
    let source: "reve" | "local" | "mixed" = "local";
    let providerError: string | undefined;
    let providerRaw: string | undefined;
    let gatewayConfigured = !!gw;

    if (gw && gw.provider === "reve") {
      const r = await reveBalance(gw.config || {});
      providerRaw = r.raw?.slice(0, 500);
      if (r.balance != null) {
        balance = r.balance;
        source = "mixed"; // balance from REVE, usage from local
      } else {
        providerError = r.error || "Could not parse balance from REVE response";
      }
    } else if (!gw) {
      providerError = "No active SMS gateway configured";
    }

    return json({
      ok: true,
      balance,
      today: todaySent ?? 0,
      month: monthSent ?? 0,
      failed: monthFailed ?? 0,
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