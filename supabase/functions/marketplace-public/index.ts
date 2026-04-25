// Public marketplace endpoint — no auth required.
// Actions:
//   { action: "list", q?, category?, page?, pageSize? }  -> listings grid
//   { action: "shop", slug }                              -> shop page (info + listings)
//   { action: "listing", id }                             -> single listing detail
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

type ShopRow = {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  cover_url: string | null;
  tagline: string | null;
  address: string | null;
  phone: string | null;
  shop_type_code: string | null;
};

type ListingRow = {
  id: string;
  shop_id: string;
  product_id: string;
  price: number;
  stock: number;
  unit: string | null;
  min_order: number | null;
  is_published: boolean;
  created_at: string;
  warranty_months?: number | null;
};

type ProductRow = {
  id: string;
  name: string;
  image_url: string | null;
  category_id: string | null;
  unit: string | null;
};

async function buildAdmin() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, serviceKey);
}

async function attachShopsAndProducts(
  admin: ReturnType<typeof createClient>,
  listings: ListingRow[],
) {
  if (listings.length === 0) return { shops: {}, products: {} };
  const shopIds = Array.from(new Set(listings.map((l) => l.shop_id)));
  const productIds = Array.from(new Set(listings.map((l) => l.product_id)));
  const [{ data: shops }, { data: products }] = await Promise.all([
    admin
      .from("shops")
      .select("id, name, slug, logo_url, cover_url, tagline, address, phone, shop_type_code")
      .in("id", shopIds)
      .is("deleted_at", null),
    admin
      .from("products")
      .select("id, name, image_url, category_id, unit")
      .in("id", productIds)
      .is("deleted_at", null),
  ]);
  const shopMap: Record<string, ShopRow> = {};
  (shops as ShopRow[] | null ?? []).forEach((s) => (shopMap[s.id] = s));
  const productMap: Record<string, ProductRow> = {};
  (products as ProductRow[] | null ?? []).forEach((p) => (productMap[p.id] = p));
  return { shops: shopMap, products: productMap };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    let body: Record<string, unknown> = {};
    if (req.method === "POST") {
      body = await req.json().catch(() => ({}));
    } else {
      const sp = new URL(req.url).searchParams;
      sp.forEach((v, k) => (body[k] = v));
    }
    const action = String(body.action ?? "list");
    const admin = await buildAdmin();

    if (action === "list") {
      const q = String(body.q ?? "").trim().toLowerCase();
      const page = Math.max(1, parseInt(String(body.page ?? "1"), 10) || 1);
      const pageSize = Math.min(48, Math.max(1, parseInt(String(body.pageSize ?? "24"), 10) || 24));
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // Only listings whose shop has marketplace_enabled = true
      const { data: enabledShops } = await admin
        .from("shops")
        .select("id")
        .eq("marketplace_enabled", true)
        .is("deleted_at", null);
      const enabledShopIds = (enabledShops as { id: string }[] | null ?? []).map((s) => s.id);
      if (enabledShopIds.length === 0) {
        return json({ listings: [], shops: {}, products: {}, total: 0, page, pageSize });
      }

      let query = admin
        .from("marketplace_listings")
        .select("id, shop_id, product_id, price, stock, unit, min_order, is_published, created_at, warranty_months", { count: "exact" })
        .eq("is_published", true)
        .in("shop_id", enabledShopIds)
        .order("created_at", { ascending: false })
        .range(from, to);

      const { data: listings, count } = await query;
      let rows = (listings as ListingRow[] | null) ?? [];

      const { shops, products } = await attachShopsAndProducts(admin, rows);

      // Optional client-side text filter (name only, simple)
      if (q) {
        rows = rows.filter((l) => {
          const p = products[l.product_id];
          const s = shops[l.shop_id];
          return (
            p?.name?.toLowerCase().includes(q) ||
            s?.name?.toLowerCase().includes(q)
          );
        });
      }

      return json({ listings: rows, shops, products, total: count ?? rows.length, page, pageSize });
    }

    if (action === "shop") {
      const slug = String(body.slug ?? "").trim();
      if (!slug) return json({ error: "Invalid slug" }, 400);

      const { data: shop } = await admin
        .from("shops")
        .select("id, name, slug, logo_url, cover_url, tagline, address, phone, shop_type_code, marketplace_enabled")
        .eq("slug", slug)
        .is("deleted_at", null)
        .maybeSingle();
      if (!shop) return json({ error: "দোকান খুঁজে পাওয়া যায়নি" }, 404);
      const s = shop as ShopRow & { marketplace_enabled: boolean };
      if (!s.marketplace_enabled) {
        return json({ error: "এই দোকান এখনো অনলাইন মার্কেটে যুক্ত হয়নি" }, 404);
      }

      const { data: listings } = await admin
        .from("marketplace_listings")
        .select("id, shop_id, product_id, price, stock, unit, min_order, is_published, created_at, warranty_months")
        .eq("shop_id", s.id)
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      const rows = (listings as ListingRow[] | null) ?? [];
      const { products } = await attachShopsAndProducts(admin, rows);

      return json({ shop: s, listings: rows, products });
    }

    if (action === "listing") {
      const id = String(body.id ?? "").trim();
      if (!id) return json({ error: "Invalid id" }, 400);

      const { data: listing } = await admin
        .from("marketplace_listings")
        .select("id, shop_id, product_id, price, stock, unit, min_order, is_published, created_at, warranty_months")
        .eq("id", id)
        .eq("is_published", true)
        .maybeSingle();
      if (!listing) return json({ error: "পণ্য খুঁজে পাওয়া যায়নি" }, 404);
      const l = listing as ListingRow;

      const [{ data: shop }, { data: product }] = await Promise.all([
        admin
          .from("shops")
          .select("id, name, slug, logo_url, cover_url, tagline, address, phone, shop_type_code, marketplace_enabled")
          .eq("id", l.shop_id)
          .is("deleted_at", null)
          .maybeSingle(),
        admin
          .from("products")
          .select("id, name, image_url, category_id, unit")
          .eq("id", l.product_id)
          .is("deleted_at", null)
          .maybeSingle(),
      ]);
      if (!shop || !(shop as { marketplace_enabled: boolean }).marketplace_enabled) {
        return json({ error: "এই দোকান এখন অনলাইনে নেই" }, 404);
      }
      if (!product) return json({ error: "পণ্য পাওয়া যায়নি" }, 404);

      return json({ listing: l, shop, product });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
