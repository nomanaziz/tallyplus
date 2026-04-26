// Public marketplace endpoint — no auth required.
// Actions:
//   { action: "list", q?, category?, page?, pageSize? }  -> listings grid
//   { action: "shop", slug }                              -> shop page (info + listings)
//   { action: "shop-by-username", username }              -> shop page by username
//   { action: "log-visit", shop_id }                      -> increment visit counter
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
  username?: string | null;
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
  // deno-lint-ignore no-explicit-any
  admin: any,
  listings: ListingRow[],
) {
  if (listings.length === 0) return { shops: {}, products: {} };
  const shopIds = Array.from(new Set(listings.map((l) => l.shop_id)));
  const productIds = Array.from(new Set(listings.map((l) => l.product_id)));
  const [{ data: shops }, { data: products }] = await Promise.all([
    admin
      .from("shops")
      .select("id, name, slug, username, logo_url, cover_url, tagline, address, phone, shop_type_code")
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

      const minPrice = body.min_price !== undefined && body.min_price !== "" ? Number(body.min_price) : null;
      const maxPrice = body.max_price !== undefined && body.max_price !== "" ? Number(body.max_price) : null;
      const inStock = body.in_stock === true || body.in_stock === "true" || body.in_stock === 1 || body.in_stock === "1";
      const sort = String(body.sort ?? "newest");
      const shopTypesRaw = body.shop_type ?? body.shop_types;
      const shopTypes: string[] = Array.isArray(shopTypesRaw)
        ? shopTypesRaw.map((s) => String(s)).filter(Boolean)
        : typeof shopTypesRaw === "string" && shopTypesRaw.length > 0
          ? shopTypesRaw.split(",").map((s) => s.trim()).filter(Boolean)
          : [];

      // Only listings whose shop has marketplace_enabled = true
      let enabledShopsQ = admin
        .from("shops")
        .select("id")
        .eq("marketplace_enabled", true)
        .is("deleted_at", null);
      if (shopTypes.length > 0) {
        enabledShopsQ = enabledShopsQ.in("shop_type_code", shopTypes);
      }
      const { data: enabledShops } = await enabledShopsQ;
      const enabledShopIds = (enabledShops as { id: string }[] | null ?? []).map((s) => s.id);
      if (enabledShopIds.length === 0) {
        return json({ listings: [], shops: {}, products: {}, total: 0, page, pageSize });
      }

      let query = admin
        .from("marketplace_listings")
        .select("id, shop_id, product_id, price, stock, unit, min_order, is_published, created_at, warranty_months", { count: "exact" })
        .eq("is_published", true)
        .in("shop_id", enabledShopIds)
        .range(from, to);

      if (minPrice !== null && !Number.isNaN(minPrice)) query = query.gte("price", minPrice);
      if (maxPrice !== null && !Number.isNaN(maxPrice)) query = query.lte("price", maxPrice);
      // in-stock = stock != 0 (positive stock OR unlimited / -1)
      if (inStock) query = query.neq("stock", 0);

      if (sort === "price_asc") query = query.order("price", { ascending: true });
      else if (sort === "price_desc") query = query.order("price", { ascending: false });
      else query = query.order("created_at", { ascending: false });

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

    if (action === "list-shops") {
      const q = String(body.q ?? "").trim().toLowerCase();
      const page = Math.max(1, parseInt(String(body.page ?? "1"), 10) || 1);
      const pageSize = Math.min(60, Math.max(1, parseInt(String(body.pageSize ?? "24"), 10) || 24));
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const shopTypesRaw = body.shop_type ?? body.shop_types;
      const shopTypes: string[] = Array.isArray(shopTypesRaw)
        ? shopTypesRaw.map((s) => String(s)).filter(Boolean)
        : typeof shopTypesRaw === "string" && shopTypesRaw.length > 0
          ? shopTypesRaw.split(",").map((s) => s.trim()).filter(Boolean)
          : [];
      const wholesaleFilter = body.wholesale; // "true" | "false" | "all" | undefined

      let shopsQ = admin
        .from("shops")
        .select("id, name, slug, username, logo_url, cover_url, tagline, address, phone, shop_type_code, is_wholesale", { count: "exact" })
        .eq("marketplace_enabled", true)
        .is("deleted_at", null);
      if (shopTypes.length > 0) shopsQ = shopsQ.in("shop_type_code", shopTypes);
      if (wholesaleFilter === "true" || wholesaleFilter === true) shopsQ = shopsQ.eq("is_wholesale", true);
      if (wholesaleFilter === "false" || wholesaleFilter === false) shopsQ = shopsQ.eq("is_wholesale", false);
      if (q) shopsQ = shopsQ.ilike("name", `%${q}%`);
      const { data: allShops, count } = await shopsQ.order("name", { ascending: true }).range(from, to);
      const shopRows = (allShops as ShopRow[] | null) ?? [];
      if (shopRows.length === 0) return json({ shops: [], counts: {}, total: count ?? 0, page, pageSize });

      // Count published listings per shop
      const ids = shopRows.map((s) => s.id);
      const { data: listingRows } = await admin
        .from("marketplace_listings")
        .select("shop_id")
        .eq("is_published", true)
        .in("shop_id", ids);
      const counts: Record<string, number> = {};
      ((listingRows as { shop_id: string }[] | null) ?? []).forEach((l) => {
        counts[l.shop_id] = (counts[l.shop_id] ?? 0) + 1;
      });
      // Only include shops with at least 1 published listing
      const filtered = shopRows.filter((s) => (counts[s.id] ?? 0) > 0);
      return json({ shops: filtered, counts, total: count ?? filtered.length, page, pageSize });
    }

    if (action === "shop") {
      const slug = String(body.slug ?? "").trim();
      if (!slug) return json({ error: "Invalid slug" }, 400);

      const { data: shop } = await admin
        .from("shops")
        .select("id, name, slug, username, logo_url, cover_url, tagline, address, phone, shop_type_code, marketplace_enabled")
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

    if (action === "shop-by-username") {
      const username = String(body.username ?? "").trim().toLowerCase();
      if (!username) return json({ error: "Invalid username" }, 400);

      const { data: shop } = await admin
        .from("shops")
        .select("id, name, username, slug, logo_url, cover_url, tagline, address, phone, shop_type_code, marketplace_enabled, about, terms_and_conditions, return_policy, shipping_policy, facebook_url, whatsapp_number, meta_description")
        .eq("username", username)
        .is("deleted_at", null)
        .maybeSingle();
      if (!shop) return json({ error: "দোকান খুঁজে পাওয়া যায়নি" }, 404);
      const s = shop as ShopRow & {
        marketplace_enabled: boolean;
        username: string | null;
        about: string | null;
        terms_and_conditions: string | null;
        return_policy: string | null;
        shipping_policy: string | null;
        facebook_url: string | null;
        whatsapp_number: string | null;
        meta_description: string | null;
      };
      if (!s.marketplace_enabled) {
        return json({ error: "এই দোকান এখনো অনলাইনে নেই" }, 404);
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

    if (action === "log-visit") {
      const shopId = String(body.shop_id ?? "").trim();
      if (!shopId) return json({ error: "Invalid shop_id" }, 400);
      const ip = req.headers.get("x-forwarded-for") ?? "0.0.0.0";
      const ua = req.headers.get("user-agent") ?? "";
      // Hash IP for privacy
      const enc = new TextEncoder().encode(ip);
      const hashBuf = await crypto.subtle.digest("SHA-256", enc);
      const ipHash = Array.from(new Uint8Array(hashBuf)).slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join("");
      // Rate limit: skip if same hash visited in last 30 min
      const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const { count: recent } = await admin
        .from("shop_visits")
        .select("id", { count: "exact", head: true })
        .eq("shop_id", shopId)
        .eq("ip_hash", ipHash)
        .gte("visited_at", since);
      if ((recent ?? 0) === 0) {
        await admin.from("shop_visits").insert({ shop_id: shopId, ip_hash: ipHash, user_agent: ua.slice(0, 200) });
      }
      return json({ ok: true });
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
