// Tally Plus — Sign up with name + phone + shop name + 4-digit PIN.
// No OTP. Auto-creates user, profile, role, shop and signs the user in.
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
    const { phone, full_name, shop_name, pin } = await req.json();
    const normalized = normalizePhone(String(phone ?? ""));
    const name = String(full_name ?? "").trim();
    const shop = String(shop_name ?? "").trim();
    const pinStr = String(pin ?? "");

    if (!normalized) return json({ error: "Invalid phone" }, 400);
    if (name.length < 2) return json({ error: "Name required" }, 400);
    if (shop.length < 2) return json({ error: "Shop name required" }, 400);
    if (!/^\d{4}$/.test(pinStr)) return json({ error: "PIN must be 4 digits" }, 400);

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(url, serviceKey);

    const digits = normalized.replace(/\D/g, "");
    const email = `${digits}@tally.local`;
    const password = `tp_${digits}_pw`;

    // Check if profile already exists with this phone
    const { data: existing } = await admin
      .from("profiles")
      .select("id")
      .eq("phone", normalized)
      .maybeSingle();
    if (existing?.id) {
      return json({ error: "phone_exists" }, 409);
    }

    // Create user (trigger will auto-create profiles + user_roles row)
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      phone: normalized,
      email_confirm: true,
      phone_confirm: true,
      user_metadata: { full_name: name },
    });
    if (createErr || !created.user) {
      console.error("createUser error:", createErr);
      return json({ error: createErr?.message ?? "Failed to create user" }, 500);
    }
    const userId = created.user.id;

    // Hash PIN and store in profile
    const pinHash = await bcrypt.hash(pinStr, 10);
    const { error: profErr } = await admin
      .from("profiles")
      .update({ full_name: name, pin_hash: pinHash, phone: normalized })
      .eq("id", userId);
    if (profErr) console.error("profile update error:", profErr);

    // Create the shop
    const { error: shopErr } = await admin
      .from("shops")
      .insert({ owner_id: userId, name: shop });
    if (shopErr) console.error("shop insert error:", shopErr);

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