// Customer login: phone + 4-digit PIN → session tokens.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import bcrypt from "https://esm.sh/bcryptjs@2.4.3";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function normalizePhone(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("880")) return "+" + d;
  if (d.startsWith("01") && d.length === 11) return "+880" + d.slice(1);
  if (d.length === 10) return "+880" + d;
  return "+" + d;
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

    const { data: profile } = await admin
      .from("consumer_profiles")
      .select("id, pin_hash")
      .eq("phone", normalized)
      .maybeSingle();

    if (!profile?.id) {
      // Check if an owner/shop account exists with this phone → guide user to Owner tab
      const { data: ownerProfile } = await admin
        .from("profiles")
        .select("id")
        .eq("phone", normalized)
        .maybeSingle();
      if (ownerProfile?.id) return json({ error: "owner_account_exists" }, 404);
      return json({ error: "no_account" }, 404);
    }
    if (!profile.pin_hash) return json({ error: "no_pin_set" }, 401);

    const ok = await bcrypt.compare(pinStr, profile.pin_hash as string);
    if (!ok) return json({ error: "wrong_pin" }, 401);

    const digits = normalized.replace(/\D/g, "");
    const email = `customer.${digits}@tallyplus.app`;
    const password = `tpc_${digits}_pw`;

    const anon = createClient(url, anonKey);
    const { data: signIn, error: signInErr } = await anon.auth.signInWithPassword({ email, password });
    if (signInErr || !signIn.session) {
      console.error("signIn error:", signInErr);
      return json({ error: "signin_failed" }, 500);
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