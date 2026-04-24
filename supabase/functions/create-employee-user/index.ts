// Tally Plus — Create an employee/staff user account from the owner's device.
// Owner provides: phone + 4-digit PIN + name. We create the auth user,
// hash the PIN, and return the user_id so the caller can insert into shop_members.
// If a profile already exists with the phone, we just return that user_id (idempotent).
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
    const { phone, full_name, pin, overwrite_pin } = await req.json();
    const normalized = normalizePhone(String(phone ?? ""));
    const name = String(full_name ?? "").trim();
    const pinStr = String(pin ?? "");

    if (!normalized) return json({ error: "Invalid phone" }, 400);
    if (name.length < 2) return json({ error: "Name required" }, 400);
    if (!/^\d{4}$/.test(pinStr)) return json({ error: "PIN must be 4 digits" }, 400);

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey);

    const digits = normalized.replace(/\D/g, "");
    const email = `${digits}@tally.local`;
    const password = `tp_${digits}_pw`;

    // If a profile already exists, reuse it (and optionally reset the PIN).
    const { data: existing } = await admin
      .from("profiles")
      .select("id")
      .eq("phone", normalized)
      .maybeSingle();

    let userId: string;
    if (existing?.id) {
      userId = existing.id;
      if (overwrite_pin) {
        const pinHash = await bcrypt.hash(pinStr, 10);
        await admin.from("profiles").update({ pin_hash: pinHash, full_name: name }).eq("id", userId);
      }
    } else {
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
      userId = created.user.id;

      const pinHash = await bcrypt.hash(pinStr, 10);
      const { error: profErr } = await admin
        .from("profiles")
        .update({ full_name: name, pin_hash: pinHash, phone: normalized })
        .eq("id", userId);
      if (profErr) console.error("profile update error:", profErr);
    }

    return json({ ok: true, user_id: userId, phone: normalized, exists: !!existing?.id });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});