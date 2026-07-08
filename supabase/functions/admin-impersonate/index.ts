// Admin-only: return an active session for another user so the admin can
// enter that user's portal with one click. Relies on the deterministic
// PIN-based passwords used by signup-with-pin / customer-signup-with-pin.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const caller = ud?.user;
    if (!caller) return json({ error: "Not authenticated" }, 401);

    const admin = createClient(url, serviceKey);
    const { data: isAdmin } = await admin.rpc("is_admin", { _user_id: caller.id });
    if (!isAdmin) return json({ error: "Admin only" }, 403);

    const body = await req.json().catch(() => ({}));
    const userId = String(body?.user_id ?? "").trim();
    if (!UUID_RE.test(userId)) return json({ error: "Valid user_id required" }, 400);

    const { data: target, error: getErr } = await admin.auth.admin.getUserById(userId);
    if (getErr || !target?.user) return json({ error: "User not found" }, 404);
    const email = target.user.email ?? "";
    const phone = target.user.phone ?? (target.user.user_metadata as any)?.phone ?? "";
    const digits = String(phone || email).replace(/\D/g, "");
    if (!digits) return json({ error: "Cannot impersonate this user (no phone)" }, 400);

    // Derive deterministic password by account family.
    let password: string | null = null;
    if (email.endsWith("@tally.local")) password = `tp_${digits}_pw`;
    else if (email.startsWith("customer.")) password = `tpc_${digits}_pw`;
    if (!password) return json({ error: "This account type cannot be impersonated" }, 400);

    const anon = createClient(url, anonKey);
    const { data: signIn, error: signInErr } = await anon.auth.signInWithPassword({ email, password });
    if (signInErr || !signIn.session) return json({ error: signInErr?.message ?? "Sign-in failed" }, 400);

    return json({
      ok: true,
      session: signIn.session,
      kind: email.startsWith("customer.") ? "consumer" : "owner",
    });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});