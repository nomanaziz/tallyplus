// Unified fordo history for a logged-in consumer.
// Returns wishlists matched by ANY of:
//   - consumer_user_id = current user
//   - wishlist_customer_id linked to any wishlist_customers row matching the
//     consumer's phone (in normalized variants)
//   - customer_phone equal to a normalized variant of the consumer's phone
// Uses the service role inside the edge function so RLS can stay strict on the
// underlying table.
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

function phoneVariants(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const digits = String(raw).replace(/\D/g, "");
  const out = new Set<string>();
  if (raw) out.add(String(raw).trim());
  if (digits) out.add(digits);
  const last10 = digits.slice(-10);
  if (last10) {
    out.add(last10);
    out.add("0" + last10);
    out.add("88" + last10);
    out.add("+88" + last10);
  }
  return Array.from(out).filter(Boolean);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;

  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return json({ error: "Unauthorized" }, 401);

  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: ud } = await userClient.auth.getUser();
  const user = ud?.user;
  if (!user) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(url, serviceKey);

  // Pull phone from consumer profile, fall back to auth.user.phone
  const { data: prof } = await admin
    .from("consumer_profiles")
    .select("phone")
    .eq("id", user.id)
    .maybeSingle();
  const phone = (prof as { phone: string | null } | null)?.phone ?? user.phone ?? null;
  const variants = phoneVariants(phone);

  // 1) Find wishlist_customers rows with any matching phone (across all shops)
  let wishlistCustomerIds: string[] = [];
  if (variants.length > 0) {
    const { data: wcs } = await admin
      .from("wishlist_customers")
      .select("id")
      .in("phone", variants);
    wishlistCustomerIds = (wcs ?? []).map((w: { id: string }) => w.id);
  }

  // 2) Build OR filter for customer_wishlists
  const orParts: string[] = [`consumer_user_id.eq.${user.id}`];
  if (variants.length > 0) {
    const list = variants.map((v) => `"${v.replace(/"/g, '\\"')}"`).join(",");
    orParts.push(`customer_phone.in.(${list})`);
  }
  if (wishlistCustomerIds.length > 0) {
    const list = wishlistCustomerIds.join(",");
    orParts.push(`wishlist_customer_id.in.(${list})`);
  }
  const orFilter = orParts.join(",");

  const { data: wls, error: wErr } = await admin
    .from("customer_wishlists")
    .select("id, shop_id, customer_name, customer_phone, status, note, created_at, consumer_user_id, wishlist_customer_id")
    .or(orFilter)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(200);
  if (wErr) return json({ error: wErr.message }, 500);

  const wishlists = wls ?? [];
  const ids = wishlists.map((w: { id: string }) => w.id);
  let items: unknown[] = [];
  if (ids.length > 0) {
    const { data: rows } = await admin
      .from("customer_wishlist_items")
      .select("id, wishlist_id, name, qty, unit, price, fulfillment_status, done, position")
      .in("wishlist_id", ids)
      .order("position", { ascending: true });
    items = rows ?? [];
  }

  const shopIds = Array.from(new Set(wishlists.map((w: { shop_id: string }) => w.shop_id)));
  let shops: Array<{ id: string; name: string }> = [];
  if (shopIds.length > 0) {
    const { data: ss } = await admin
      .from("shops")
      .select("id, name")
      .in("id", shopIds);
    shops = (ss ?? []) as Array<{ id: string; name: string }>;
  }

  // Best-effort: also link any orphaned phone-matched wishlists to this
  // consumer_user_id so future loads are faster and direct.
  try {
    const orphanIds = wishlists
      .filter((w: { id: string; consumer_user_id: string | null }) => w.consumer_user_id !== user.id)
      .map((w: { id: string }) => w.id);
    if (orphanIds.length > 0) {
      await admin
        .from("customer_wishlists")
        .update({ consumer_user_id: user.id })
        .in("id", orphanIds);
    }
  } catch { /* ignore */ }

  return json({ ok: true, wishlists, items, shops });
});