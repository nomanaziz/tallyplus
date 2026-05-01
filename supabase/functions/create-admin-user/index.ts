// Create a new platform admin (super admin only).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "content-type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("authorization") ?? "";
    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "not_authenticated" }, 401);
    const callerId = userData.user.id;

    const admin = createClient(url, serviceKey);
    const { data: superRow } = await admin
      .from("admin_profiles")
      .select("is_super")
      .eq("user_id", callerId)
      .maybeSingle();
    if (!superRow?.is_super) return json({ error: "not_super_admin" }, 403);

    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const fullName = String(body.full_name ?? "").trim();
    const permissions = body.permissions ?? {};

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "invalid_email" }, 400);
    if (password.length < 6) return json({ error: "password_too_short" }, 400);
    if (fullName.length < 2) return json({ error: "name_required" }, 400);

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (createErr || !created.user) {
      return json({ error: createErr?.message ?? "create_failed" }, 500);
    }
    const newUserId = created.user.id;

    await admin.from("profiles").upsert({ id: newUserId, full_name: fullName }, { onConflict: "id" });
    await admin.from("user_roles").upsert(
      { user_id: newUserId, role: "admin" },
      { onConflict: "user_id,role" },
    );
    await admin.from("admin_profiles").upsert(
      {
        user_id: newUserId,
        email,
        full_name: fullName,
        is_super: false,
        permissions,
      },
      { onConflict: "user_id" },
    );

    return json({ ok: true, user_id: newUserId });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});