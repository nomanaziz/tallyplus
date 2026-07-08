// Admin-only: reset a user's 4-digit login PIN.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import bcrypt from "https://esm.sh/bcryptjs@2.4.3";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: ud } = await userClient.auth.getUser();
    const user = ud?.user;
    if (!user) return json({ error: "Not authenticated" }, 401);

    const admin = createClient(url, serviceKey);
    const { data: isAdmin } = await admin.rpc("is_admin", { _user_id: user.id });
    if (!isAdmin) return json({ error: "Admin only" }, 403);

    const body = await req.json().catch(() => ({}));
    const userId = String(body?.user_id ?? "").trim();
    const newPin = String(body?.new_pin ?? "").trim();
    if (!UUID_RE.test(userId)) return json({ error: "Valid user_id required" }, 400);
    if (!/^\d{4}$/.test(newPin)) return json({ error: "PIN must be 4 digits" }, 400);

    // Look up target profile — must have a phone (uses PIN login)
    const { data: profile, error: profErr } = await admin
      .from("profiles")
      .select("id, phone")
      .eq("id", userId)
      .maybeSingle();
    if (profErr) throw profErr;
    if (!profile) return json({ error: "User not found" }, 404);

    const pinHash = await bcrypt.hash(newPin, 10);
    const { error: updErr } = await admin
      .from("profiles")
      .update({ pin_hash: pinHash })
      .eq("id", userId);
    if (updErr) throw updErr;

    // Also reset auth password back to the deterministic PIN-login password
    // (in case anyone changed it) so signInWithPassword continues to work.
    if (profile.phone) {
      const digits = String(profile.phone).replace(/\D/g, "");
      if (digits) {
        const password = `tp_${digits}_pw`;
        await admin.auth.admin.updateUserById(userId, { password });
      }
    }

    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});