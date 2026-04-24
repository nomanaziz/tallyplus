// Tally Plus — Login with phone + 4-digit PIN. No OTP.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import bcrypt from "https://esm.sh/bcryptjs@2.4.3";

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

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "content-type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { phone, pin } = await req.json();
    const normalized = normalizePhone(String(phone ?? ""));
    const pinStr = String(pin ?? "");
    if (!normalized) return json({ error: "Invalid phone" }, 400);
    if (!/^\d{4}$/.test(pinStr)) return json({ error: "PIN must be 4 digits" }, 400);

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(url, serviceKey);

    // Look up profile by phone
    const { data: profile, error: profErr } = await admin
      .from("profiles")
      .select("id, pin_hash")
      .eq("phone", normalized)
      .maybeSingle();
    if (profErr) {
      console.error("profile lookup:", profErr);
      return json({ error: "Lookup failed" }, 500);
    }
    if (!profile) return json({ error: "no_account" }, 404);
    if (!profile.pin_hash) return json({ error: "no_pin" }, 400);

    const ok = await bcrypt.compare(pinStr, profile.pin_hash);
    if (!ok) return json({ error: "wrong_pin" }, 401);

    const digits = normalized.replace(/\D/g, "");
    const email = `${digits}@tally.local`;
    const password = `tp_${digits}_pw`;

    const anon = createClient(url, anonKey);
    const { data: signIn, error: signInErr } = await anon.auth.signInWithPassword({ email, password });
    if (signInErr || !signIn.session) {
      console.error("signIn error:", signInErr);
      return json({ error: signInErr?.message ?? "Sign-in failed" }, 500);
    }

    return json({
      ok: true,
      access_token: signIn.session.access_token,
      refresh_token: signIn.session.refresh_token,
      user_id: profile.id,
    });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});