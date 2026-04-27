// Look up published shops by owner phone. Returns multiple shops if same owner has multiple.
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

function normalize(p: string): string[] {
  const digits = p.replace(/\D/g, "");
  const variants = new Set<string>();
  variants.add(p.trim());
  variants.add(digits);
  if (digits.startsWith("88")) {
    variants.add(digits.slice(2));
    variants.add("+" + digits);
  }
  if (digits.startsWith("0")) {
    variants.add("+88" + digits);
    variants.add("88" + digits);
  }
  if (digits.length === 10 && digits.startsWith("1")) {
    variants.add("0" + digits);
    variants.add("+880" + digits);
    variants.add("880" + digits);
  }
  return Array.from(variants).filter(Boolean);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: { phone?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const phone = (body.phone ?? "").trim();
  if (!phone) return json({ error: "phone required" }, 400);

  const variants = normalize(phone);

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, serviceKey);

  // Try shop.phone first
  const { data: shops } = await admin
    .from("shops")
    .select("id,name,phone,owner_id,logo_url,wishlist_slug")
    .in("phone", variants)
    .is("deleted_at", null)
    .limit(20);

  let result = (shops ?? []) as Array<{ id: string; name: string; phone: string; owner_id: string; logo_url: string | null; wishlist_slug: string | null }>;

  // If none found, try via profiles.phone -> owner shops
  if (result.length === 0) {
    const { data: prof } = await admin
      .from("profiles")
      .select("id,phone")
      .in("phone", variants)
      .limit(5);
    const ownerIds = (prof ?? []).map((p) => p.id);
    if (ownerIds.length > 0) {
      const { data: shops2 } = await admin
        .from("shops")
        .select("id,name,phone,owner_id,logo_url,wishlist_slug")
        .in("owner_id", ownerIds)
        .is("deleted_at", null)
        .limit(20);
      result = (shops2 ?? []) as typeof result;
    }
  }

  return json({ shops: result });
});