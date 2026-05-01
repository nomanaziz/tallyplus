// Public lookup: search published shops by name (consumer-facing).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json", ...cors } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: { name?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const q = (body.name ?? "").trim();
  if (q.length < 2) return json({ error: "name must be at least 2 characters" }, 400);

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, serviceKey);

  const { data, error } = await admin
    .from("shops")
    .select("id,name,phone,owner_id,logo_url,wishlist_slug")
    .ilike("name", `%${q}%`)
    .is("deleted_at", null)
    .order("name", { ascending: true })
    .limit(20);

  if (error) return json({ error: error.message }, 500);
  return json({ shops: data ?? [] });
});