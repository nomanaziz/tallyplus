// Tally Plus — One-time super-admin bootstrap.
// Creates the FIRST admin account. Refuses to run if any admin already exists.
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
    const { email, password, full_name } = await req.json();
    const cleanEmail = String(email ?? "").trim().toLowerCase();
    const pwd = String(password ?? "");
    const name = String(full_name ?? "Super Admin").trim();

    if (!cleanEmail || !cleanEmail.includes("@")) return json({ error: "সঠিক email দিন" }, 400);
    if (pwd.length < 8) return json({ error: "Password কমপক্ষে ৮ অক্ষরের হতে হবে" }, 400);

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

    // Refuse if an admin already exists (one-time bootstrap)
    const { data: existing, error: existErr } = await admin
      .from("user_roles")
      .select("id")
      .eq("role", "admin")
      .limit(1);
    if (existErr) return json({ error: existErr.message }, 500);
    if (existing && existing.length > 0) {
      return json({ error: "একটি admin account ইতিমধ্যে আছে। নতুন তৈরি করা যাবে না।" }, 403);
    }

    // Create the auth user (email-confirmed)
    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email: cleanEmail,
      password: pwd,
      email_confirm: true,
      user_metadata: { full_name: name },
    });
    if (cErr || !created.user) return json({ error: cErr?.message ?? "User তৈরি ব্যর্থ" }, 500);

    const uid = created.user.id;

    // Ensure profile row
    await admin.from("profiles").upsert({ id: uid, full_name: name }, { onConflict: "id" });

    // Remove the default 'owner' role from trigger and assign 'admin'
    await admin.from("user_roles").delete().eq("user_id", uid);
    const { error: rErr } = await admin.from("user_roles").insert({ user_id: uid, role: "admin" });
    if (rErr) return json({ error: rErr.message }, 500);

    return json({ ok: true, email: cleanEmail });
  } catch (e) {
    return json({ error: (e as Error).message ?? "Server error" }, 500);
  }
});