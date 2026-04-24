// Tally Plus — Mock OTP sender (dev mode)
// In production, swap this body to call a real SMS gateway.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("880")) return "+" + digits;
  if (digits.startsWith("01") && digits.length === 11) return "+880" + digits.slice(1);
  if (digits.length === 10) return "+880" + digits;
  return "+" + digits;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { phone } = await req.json();
    const normalized = normalizePhone(String(phone ?? ""));
    if (!normalized) {
      return new Response(JSON.stringify({ error: "Invalid phone" }), { status: 400, headers: { ...cors, "content-type": "application/json" } });
    }
    // Dev mode: deterministic OTP based on phone, plus 123456 always works
    const otp = "123456";
    console.log(`[send-otp] phone=${normalized} otp=${otp} (dev mode)`);
    return new Response(
      JSON.stringify({ ok: true, phone: normalized, devOtp: otp, message: "OTP sent (dev mode)" }),
      { headers: { ...cors, "content-type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...cors, "content-type": "application/json" } });
  }
});