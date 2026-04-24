// Tally Plus — Verify OTP and issue Supabase session.
// Dev mode: any 6-digit OTP, or 123456, is accepted.
// Creates the auth user (with phone) on first login, then issues a magiclink-style session.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { phone, otp } = await req.json();
    const normalized = normalizePhone(String(phone ?? ""));
    const code = String(otp ?? "");
    if (!normalized) {
      return new Response(JSON.stringify({ error: "Invalid phone" }), { status: 400, headers: { ...cors, "content-type": "application/json" } });
    }
    if (!/^\d{6}$/.test(code)) {
      return new Response(JSON.stringify({ error: "Invalid OTP" }), { status: 400, headers: { ...cors, "content-type": "application/json" } });
    }
    // DEV MODE: accept anything that matches /^\d{6}$/
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Use phone as a synthetic email so we can use password auth (deterministic)
    const email = `${normalized.replace(/\D/g, "")}@tally.local`;
    const password = `tp_${normalized.replace(/\D/g, "")}_pw`;

    // Try to create user (idempotent)
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      phone: normalized,
      email_confirm: true,
      phone_confirm: true,
      user_metadata: { full_name: "" },
    });
    if (createErr && !String(createErr.message).match(/already|exists|registered/i)) {
      console.error("createUser error:", createErr);
    }

    // Sign the user in to get an access+refresh token
    const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: signIn, error: signInErr } = await anon.auth.signInWithPassword({ email, password });
    if (signInErr || !signIn.session) {
      console.error("signIn error:", signInErr);
      return new Response(JSON.stringify({ error: signInErr?.message ?? "Sign-in failed" }), { status: 500, headers: { ...cors, "content-type": "application/json" } });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        access_token: signIn.session.access_token,
        refresh_token: signIn.session.refresh_token,
        user_id: signIn.user?.id ?? created?.user?.id,
        phone: normalized,
      }),
      { headers: { ...cors, "content-type": "application/json" } },
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...cors, "content-type": "application/json" } });
  }
});