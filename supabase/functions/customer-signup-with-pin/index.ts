// Customer signup: name + phone + 4-digit PIN → creates consumer account.
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
  if (d.length < 6 || d.length > 15) return null;
  return "+" + d;
}

function legacyPhone(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  if (!d || d.length < 6 || d.length > 15) return null;
  return "+" + d;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "content-type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { phone, full_name, pin, country_code } = await req.json();
    const phoneRaw = String(phone ?? "");
    const normalized = normalizePhone(phoneRaw);
    const legacyNormalized = legacyPhone(phoneRaw);
    const name = String(full_name ?? "").trim();
    const pinStr = String(pin ?? "");
    const country = country_code ? String(country_code).toUpperCase().slice(0, 2) : null;

    if (!normalized) return json({ error: "Invalid phone" }, 400);
    if (name.length < 2) return json({ error: "Name required" }, 400);
    if (!/^\d{4}$/.test(pinStr)) return json({ error: "PIN must be 4 digits" }, 400);

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(url, serviceKey);

    const digits = normalized.replace(/\D/g, "");
    // Customer namespace — separate from owner (which uses <digits>@tally.local).
    // Use a valid-looking domain to satisfy Supabase's email validator.
    const email = `customer.${digits}@tallyplus.app`;
    const password = `tpc_${digits}_pw`;

    // Check if a consumer profile already exists with this phone
    const { data: existing } = await admin
      .from("consumer_profiles")
      .select("id")
      .in("phone", Array.from(new Set([normalized, legacyNormalized].filter(Boolean) as string[])))
      .maybeSingle();
    if (existing?.id) {
      return json({ error: "phone_exists" }, 409);
    }

    // Create user — handle_new_user trigger will create consumer_profiles + consumer role
    let created: Awaited<ReturnType<typeof admin.auth.admin.createUser>>["data"] | null = null;
    let createErr: { message?: string; name?: string } | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: name, phone: normalized, account_type: "consumer", country_code: country },
      });
      if (res.data?.user) { created = res.data; createErr = null; break; }
      createErr = res.error ?? { message: "Failed to create user" };
      const retriable = res.error?.name === "AuthRetryableFetchError"
        || /fetch|network|timeout|temporar/i.test(res.error?.message ?? "");
      if (!retriable) break;
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
    if (createErr || !created.user) {
      console.error("createUser error:", createErr);
      const msg = createErr?.message ?? "Failed to create user";
      if (/rate limit/i.test(msg)) return json({ error: "rate_limit" }, 429);
      if (/already.*registered|already.*exists|duplicate/i.test(msg)) return json({ error: "phone_exists" }, 409);
      return json({ error: msg }, 500);
    }
    const userId = created.user.id;

    // Hash PIN and update consumer_profile with phone + pin_hash
    const pinHash = await bcrypt.hash(pinStr, 10);
    const { error: profErr } = await admin
      .from("consumer_profiles")
      .update({ name, phone: normalized, pin_hash: pinHash, country_code: country })
      .eq("id", userId);
    if (profErr) console.error("consumer_profile update error:", profErr);

    // Sign in to issue tokens
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
      user_id: userId,
    });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});