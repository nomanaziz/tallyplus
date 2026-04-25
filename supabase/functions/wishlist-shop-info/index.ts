// Public endpoint: returns minimal branding info for a shop's wishlist link.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
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
    let slug = "";
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      slug = String(body?.slug ?? "").trim();
    } else {
      slug = new URL(req.url).searchParams.get("slug")?.trim() ?? "";
    }
    if (!slug) return json({ error: "Invalid link" }, 400);

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey);

    const { data, error } = await admin
      .from("shops")
      .select("name, logo_url")
      .eq("wishlist_slug", slug)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) return json({ error: error.message }, 500);
    if (!data) return json({ error: "এই লিঙ্কটি আর সক্রিয় নেই" }, 404);

    return json({ shop_name: data.name, shop_logo_url: data.logo_url });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});