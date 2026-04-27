// One-time admin endpoint to seed/refresh BD divisions/districts/upazilas.
// Body: { divisions: [{id, name_en, name_bn}], districts: [{id, division_id, name_en, name_bn}], upazilas: [{id, district_id, name_en, name_bn}] }
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...cors },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return json({ error: "Unauthorized" }, 401);

  // Verify caller is admin
  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: uErr } = await userClient.auth.getUser();
  if (uErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(url, serviceKey);
  const { data: isAdminData, error: aErr } = await admin.rpc("is_admin", { _user_id: userData.user.id });
  if (aErr || !isAdminData) return json({ error: "Forbidden — admin only" }, 403);

  let body: {
    divisions?: Array<{ id: string; name_en: string; name_bn: string }>;
    districts?: Array<{ id: string; division_id: string; name_en: string; name_bn: string }>;
    upazilas?: Array<{ id: string; district_id: string; name_en: string; name_bn: string }>;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const result = { divisions: 0, districts: 0, upazilas: 0 };

  if (body.divisions?.length) {
    const rows = body.divisions.map((d) => ({
      legacy_id: d.id,
      name_en: d.name_en,
      name_bn: d.name_bn,
    }));
    const { error } = await admin
      .from("bd_divisions")
      .upsert(rows, { onConflict: "legacy_id" });
    if (error) return json({ error: `divisions: ${error.message}` }, 500);
    result.divisions = rows.length;
  }

  if (body.districts?.length) {
    const rows = body.districts.map((d) => ({
      legacy_id: d.id,
      division_legacy_id: d.division_id,
      name_en: d.name_en,
      name_bn: d.name_bn,
    }));
    // Chunked upsert (500 per batch)
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      const { error } = await admin
        .from("bd_districts")
        .upsert(chunk, { onConflict: "legacy_id" });
      if (error) return json({ error: `districts: ${error.message}` }, 500);
    }
    result.districts = rows.length;
  }

  if (body.upazilas?.length) {
    const rows = body.upazilas.map((u) => ({
      legacy_id: u.id,
      district_legacy_id: u.district_id,
      name_en: u.name_en,
      name_bn: u.name_bn,
    }));
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      const { error } = await admin
        .from("bd_upazilas")
        .upsert(chunk, { onConflict: "legacy_id" });
      if (error) return json({ error: `upazilas: ${error.message}` }, 500);
    }
    result.upazilas = rows.length;
  }

  return json({ ok: true, ...result });
});