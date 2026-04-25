// Returns the customer's wishlist history (and saved templates) for their token.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { cors, json, verifyToken } from "../_shared/wishlist-auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json();
    const token = String(body?.token ?? "").trim();
    if (!token) return json({ error: "Missing token" }, 400);

    const payload = await verifyToken(token);
    if (!payload) return json({ error: "টোকেন মেয়াদ শেষ — আবার লগইন করুন" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey);

    const { data: cust } = await admin
      .from("wishlist_customers")
      .select("id, name, phone, address, shop_id")
      .eq("id", payload.cid)
      .maybeSingle();
    if (!cust) return json({ error: "Customer not found" }, 404);

    const { data: shop } = await admin
      .from("shops")
      .select("id, name, logo_url, phone")
      .eq("id", payload.sid)
      .maybeSingle();

    const { data: wishlists } = await admin
      .from("customer_wishlists")
      .select("id, status, color, note, created_at, deleted_at")
      .eq("wishlist_customer_id", payload.cid)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(50);

    const ids = (wishlists ?? []).map((w: { id: string }) => w.id);
    let items: unknown[] = [];
    if (ids.length > 0) {
      const { data: rows } = await admin
        .from("customer_wishlist_items")
        .select("id, wishlist_id, name, qty, unit, price, position, fulfillment_status, shopkeeper_note, done")
        .in("wishlist_id", ids)
        .order("position", { ascending: true });
      items = rows ?? [];
    }

    const { data: templates } = await admin
      .from("wishlist_templates")
      .select("id, name, items, created_at, updated_at")
      .eq("wishlist_customer_id", payload.cid)
      .order("updated_at", { ascending: false });

    return json({ ok: true, customer: cust, shop, wishlists: wishlists ?? [], items, templates: templates ?? [] });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});