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
    const { phone, full_name, shop_name, pin, shop_type_code } = await req.json();
    const normalized = normalizePhone(String(phone ?? ""));
    const name = String(full_name ?? "").trim();
    const shop = String(shop_name ?? "").trim();
    const pinStr = String(pin ?? "");
    const typeCode = shop_type_code ? String(shop_type_code) : null;

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

    // Create user (trigger will auto-create profiles + user_roles row).
    // NOTE: We deliberately do NOT pass `phone` here. Passing phone makes
    // Supabase try to send a confirmation SMS/email which trips the
    // shared "email rate limit exceeded" guard. Phone is stored in
    // public.profiles instead.
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
    });
    if (createErr || !created.user) {
      console.error("createUser error:", createErr);
      const msg = createErr?.message ?? "Failed to create user";
      if (/rate limit/i.test(msg)) return json({ error: "rate_limit" }, 429);
      return json({ error: msg }, 500);
    }
    const userId = created.user.id;

    // Hash PIN and store in profile
    const pinHash = await bcrypt.hash(pinStr, 10);
    const { error: profErr } = await admin
      .from("profiles")
      .update({ full_name: name, pin_hash: pinHash, phone: normalized })
      .eq("id", userId);
    if (profErr) console.error("profile update error:", profErr);

    // Create the shop (with type, if provided)
    const shopInsert: Record<string, unknown> = { owner_id: userId, name: shop };
    if (typeCode) shopInsert.shop_type_code = typeCode;
    const { data: shopRow, error: shopErr } = await admin
      .from("shops")
      .insert(shopInsert)
      .select("id")
      .single();
    if (shopErr) console.error("shop insert error:", shopErr);

    // Seed default categories for shop type
    if (shopRow?.id && typeCode) {
      const { data: typeRow } = await admin
        .from("shop_types")
        .select("default_categories")
        .eq("code", typeCode)
        .maybeSingle();
      const defaults = (typeRow?.default_categories as string[] | undefined) ?? [];
      if (defaults.length > 0) {
        await admin
          .from("categories")
          .insert(defaults.map((n) => ({ shop_id: shopRow.id, name: n })));
      }
    }

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