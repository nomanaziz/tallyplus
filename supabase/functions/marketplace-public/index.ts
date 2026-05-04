// Public marketplace endpoint — no auth required.
// Actions:
//   { action: "list", q?, category?, page?, pageSize? }  -> listings grid
//   { action: "shop", slug }                              -> shop page (info + listings)
//   { action: "shop-by-username", username }              -> shop page by username
//   { action: "log-visit", shop_id }                      -> increment visit counter
//   { action: "listing", id }                             -> single listing detail
//   { action: "place-order", shop_id, items, customer_name, customer_phone,
//       customer_address?, note?, payment_method? }        -> create marketplace order
//   { action: "delivery-zones", shop_id }                  -> active delivery zones for shop
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "content-type": "application/json", ...extraHeaders },
  });
}

// Public list endpoints can be briefly cached on the edge / browser to soften
// Edge Function cold-start latency on repeat visits.
const PUBLIC_CACHE = { "cache-control": "public, max-age=30, s-maxage=60, stale-while-revalidate=300" };

type ShopRow = {
  id: string;
  name: string;
  slug: string | null;
  username?: string | null;
  wishlist_slug?: string | null;
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

// deno-lint-ignore no-explicit-any
async function loadShopListings(admin: any, shopId: string): Promise<ListingRow[]> {
  const { data } = await admin
    .from("marketplace_listings")
    .select("id, shop_id, product_id, price, stock, unit, min_order, is_published, created_at, warranty_months")
    .eq("shop_id", shopId)
    .eq("is_published", true)
    .order("created_at", { ascending: false });
  return (data as ListingRow[] | null) ?? [];
}

// deno-lint-ignore no-explicit-any
async function loadProductsFor(admin: any, listings: ListingRow[]): Promise<Record<string, ProductRow>> {
  if (listings.length === 0) return {};
  const productIds = Array.from(new Set(listings.map((l) => l.product_id)));
  const { data } = await admin
    .from("products")
    .select("id, name, image_url, category_id, unit")
    .in("id", productIds)
    .is("deleted_at", null);
  const map: Record<string, ProductRow> = {};
  ((data as ProductRow[] | null) ?? []).forEach((p) => (map[p.id] = p));
  return map;
}

// deno-lint-ignore no-explicit-any
async function loadShopServices(admin: any, shopId: string): Promise<Array<Record<string, unknown>>> {
  const { data: ml } = await admin
    .from("marketplace_service_listings")
    .select("service_id")
    .eq("shop_id", shopId)
    .eq("is_published", true);
  const sids = ((ml as { service_id: string }[] | null) ?? []).map((l) => l.service_id);
  if (sids.length === 0) return [];
  const { data: services } = await admin
    .from("services")
    .select("id, shop_id, name, description, price, duration_minutes, duration_label, unit, image_url, home_service, service_charge_extra, service_areas, warranty_enabled, warranty_value, warranty_unit, advance_amount, advance_required, booking_enabled")
    .in("id", sids)
    .is("deleted_at", null)
    .eq("is_active", true)
    .order("name");
  return (services as Array<Record<string, unknown>> | null) ?? [];
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

      return json({ listings: rows, shops, products, total: count ?? rows.length, page, pageSize }, 200, PUBLIC_CACHE);
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
        .select("id, name, slug, username, wishlist_slug, logo_url, cover_url, tagline, address, phone, shop_type_code, is_wholesale", { count: "exact" })
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

      // Count published service listings per shop
      const { data: svcListingRows } = await admin
        .from("marketplace_service_listings")
        .select("shop_id")
        .eq("is_published", true)
        .in("shop_id", ids);
      const service_counts: Record<string, number> = {};
      ((svcListingRows as { shop_id: string }[] | null) ?? []).forEach((l) => {
        service_counts[l.shop_id] = (service_counts[l.shop_id] ?? 0) + 1;
      });

      // Return all marketplace-enabled shops, including those with 0 published
      // listings yet — they still belong in the directory so customers can
      // discover newly created shops.
      return json({ shops: shopRows, counts, service_counts, total: count ?? shopRows.length, page, pageSize }, 200, PUBLIC_CACHE);
    }

    if (action === "shop") {
      const slug = String(body.slug ?? "").trim();
      if (!slug) return json({ error: "Invalid slug" }, 400);

      const { data: shop } = await admin
        .from("shops")
        .select("id, name, slug, username, logo_url, cover_url, tagline, address, phone, shop_type_code, marketplace_enabled, is_wholesale")
        .eq("slug", slug)
        .is("deleted_at", null)
        .maybeSingle();
      if (!shop) return json({ error: "দোকান খুঁজে পাওয়া যায়নি" }, 404);
      const s = shop as ShopRow & { marketplace_enabled: boolean };
      if (!s.marketplace_enabled) {
        return json({ error: "এই দোকান এখনো অনলাইন মার্কেটে যুক্ত হয়নি" }, 404);
      }

      const rows = await loadShopListings(admin, s.id);
      const products = await loadProductsFor(admin, rows);
      const services = await loadShopServices(admin, s.id);

      return json({ shop: s, listings: rows, products, services });
    }

    if (action === "shop-by-username") {
      const username = String(body.username ?? "").trim().toLowerCase();
      if (!username) return json({ error: "Invalid username" }, 400);

      const { data: shop } = await admin
        .from("shops")
        .select("id, name, username, slug, wishlist_slug, logo_url, cover_url, tagline, address, phone, shop_type_code, marketplace_enabled, about, terms_and_conditions, return_policy, shipping_policy, facebook_url, whatsapp_number, meta_description")
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

      const rows = await loadShopListings(admin, s.id);
      const products = await loadProductsFor(admin, rows);
      const services = await loadShopServices(admin, s.id);

      return json({ shop: s, listings: rows, products, services });
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

    if (action === "place-order") {
      const shopId = String(body.shop_id ?? "").trim();
      const items = Array.isArray(body.items) ? body.items as Array<{ listing_id: string; qty: number }> : [];
      const customerName = String(body.customer_name ?? "").trim();
      const customerPhone = String(body.customer_phone ?? "").trim();
      const customerAddress = String(body.customer_address ?? "").trim();
      const note = String(body.note ?? "").trim();
      const paymentMethod = String(body.payment_method ?? "cod").trim();
      const deliveryZoneId = body.delivery_zone_id ? String(body.delivery_zone_id) : null;

      if (!shopId) return json({ error: "Invalid shop_id" }, 400);
      if (items.length === 0) return json({ error: "Cart is empty" }, 400);
      if (!customerName || customerName.length < 2) return json({ error: "Name required" }, 400);
      if (!customerPhone) return json({ error: "Phone required" }, 400);
      if (!customerAddress) return json({ error: "Address required" }, 400);

      // Resolve consumer user from auth header (optional)
      let consumerUserId: string | null = null;
      const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization");
      if (authHeader?.startsWith("Bearer ")) {
        try {
          const url = Deno.env.get("SUPABASE_URL")!;
          const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
          const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
          const { data } = await userClient.auth.getUser();
          if (data?.user?.id) consumerUserId = data.user.id;
        } catch (_) { /* ignore */ }
      }

      // Validate listings belong to shop and are published
      const listingIds = items.map((i) => String(i.listing_id));
      const { data: listingsData } = await admin
        .from("marketplace_listings")
        .select("id, shop_id, product_id, price, stock, unit, is_published")
        .in("id", listingIds);
      const listingMap = new Map<string, { id: string; shop_id: string; product_id: string; price: number; stock: number; unit: string | null; is_published: boolean }>();
      ((listingsData as Array<{ id: string; shop_id: string; product_id: string; price: number; stock: number; unit: string | null; is_published: boolean }> | null) ?? []).forEach((l) => listingMap.set(l.id, l));
      const productIds: string[] = [];
      for (const it of items) {
        const l = listingMap.get(String(it.listing_id));
        if (!l || l.shop_id !== shopId || !l.is_published) {
          return json({ error: "এক বা একাধিক পণ্য আর available নেই" }, 400);
        }
        productIds.push(l.product_id);
      }
      const { data: productsData } = await admin
        .from("products")
        .select("id, name")
        .in("id", productIds);
      const productNameMap = new Map<string, string>();
      ((productsData as Array<{ id: string; name: string }> | null) ?? []).forEach((p) => productNameMap.set(p.id, p.name));

      let subtotal = 0;
      const orderItems = items.map((it) => {
        const l = listingMap.get(String(it.listing_id))!;
        const qty = Math.max(1, Number(it.qty) || 1);
        const lineTotal = Number(l.price) * qty;
        subtotal += lineTotal;
        return {
          listing_id: l.id,
          product_id: l.product_id,
          name: productNameMap.get(l.product_id) ?? "Item",
          qty,
          price: Number(l.price),
          total: lineTotal,
        };
      });

      let deliveryCharge = 0;
      if (deliveryZoneId) {
        const { data: zone } = await admin
          .from("shop_delivery_zones")
          .select("id, shop_id, charge, free_shipping_min, is_active")
          .eq("id", deliveryZoneId)
          .maybeSingle();
        const z = zone as { id: string; shop_id: string; charge: number; free_shipping_min: number | null; is_active: boolean } | null;
        if (z && z.shop_id === shopId && z.is_active) {
          deliveryCharge = z.free_shipping_min !== null && subtotal >= Number(z.free_shipping_min) ? 0 : Number(z.charge);
        }
      }
      const total = subtotal + deliveryCharge;
      const orderNo = "MO-" + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 1000).toString(36).toUpperCase();

      const { data: created, error: orderErr } = await admin
        .from("marketplace_orders")
        .insert({
          shop_id: shopId,
          order_no: orderNo,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_address: customerAddress,
          subtotal,
          delivery_charge: deliveryCharge,
          total,
          status: "pending",
          payment_method: paymentMethod,
          note: note || null,
          consumer_user_id: consumerUserId,
          delivery_zone_id: deliveryZoneId,
        })
        .select("id, order_no")
        .single();
      if (orderErr || !created) {
        console.error("order insert error:", orderErr);
        return json({ error: orderErr?.message ?? "Order failed" }, 500);
      }
      const orderId = (created as { id: string; order_no: string }).id;
      const { error: itemsErr } = await admin
        .from("marketplace_order_items")
        .insert(orderItems.map((oi) => ({ ...oi, order_id: orderId })));
      if (itemsErr) {
        console.error("order items insert error:", itemsErr);
        return json({ error: itemsErr.message }, 500);
      }
      return json({ ok: true, order_id: orderId, order_no: (created as { order_no: string }).order_no });
    }

    if (action === "delivery-zones") {
      const shopId = String(body.shop_id ?? "").trim();
      if (!shopId) return json({ error: "Invalid shop_id" }, 400);
      const { data, error } = await admin
        .from("shop_delivery_zones")
        .select("id, name, charge, free_shipping_min, sort_order")
        .eq("shop_id", shopId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) return json({ error: error.message }, 500);
      return json({ zones: data ?? [] }, 200, PUBLIC_CACHE);
    }

    // ============================================================
    // SERVICES — public marketplace endpoints
    // ============================================================

    if (action === "list-services") {
      const q = String(body.q ?? "").trim().toLowerCase();
      const page = Math.max(1, parseInt(String(body.page ?? "1"), 10) || 1);
      const pageSize = Math.min(48, Math.max(1, parseInt(String(body.pageSize ?? "24"), 10) || 24));
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const minPrice = body.min_price !== undefined && body.min_price !== "" ? Number(body.min_price) : null;
      const maxPrice = body.max_price !== undefined && body.max_price !== "" ? Number(body.max_price) : null;
      const sort = String(body.sort ?? "newest");
      const homeService = body.home_service === true || body.home_service === "true";
      const division = String(body.division ?? "").trim();
      const district = String(body.district ?? "").trim();
      const upazila = String(body.upazila ?? "").trim();
      const categoryId = String(body.category_id ?? "").trim();
      const shopTypesRaw = body.shop_type ?? body.shop_types;
      const shopTypes: string[] = Array.isArray(shopTypesRaw)
        ? shopTypesRaw.map((s) => String(s)).filter(Boolean)
        : typeof shopTypesRaw === "string" && shopTypesRaw.length > 0
          ? shopTypesRaw.split(",").map((s) => s.trim()).filter(Boolean)
          : [];

      // marketplace-enabled shops
      let enabledShopsQ = admin
        .from("shops")
        .select("id")
        .eq("marketplace_enabled", true)
        .is("deleted_at", null);
      if (shopTypes.length > 0) enabledShopsQ = enabledShopsQ.in("shop_type_code", shopTypes);
      const { data: enabledShops } = await enabledShopsQ;
      const enabledShopIds = (enabledShops as { id: string }[] | null ?? []).map((s) => s.id);
      if (enabledShopIds.length === 0) {
        return json({ services: [], shops: {}, total: 0, page, pageSize });
      }

      // Get published service listings to know which services to show
      const { data: listingRows } = await admin
        .from("marketplace_service_listings")
        .select("service_id, shop_id")
        .eq("is_published", true)
        .in("shop_id", enabledShopIds);
      const allowedServiceIds = ((listingRows as { service_id: string; shop_id: string }[] | null) ?? []).map((r) => r.service_id);
      if (allowedServiceIds.length === 0) {
        return json({ services: [], shops: {}, total: 0, page, pageSize });
      }

      let query = admin
        .from("services")
        .select("id, shop_id, category_id, name, description, price, duration_minutes, duration_label, unit, warranty_enabled, warranty_value, warranty_unit, image_url, home_service, service_charge_extra, service_areas, created_at", { count: "exact" })
        .eq("is_active", true)
        .is("deleted_at", null)
        .in("id", allowedServiceIds)
        .range(from, to);

      if (minPrice !== null && !Number.isNaN(minPrice)) query = query.gte("price", minPrice);
      if (maxPrice !== null && !Number.isNaN(maxPrice)) query = query.lte("price", maxPrice);
      if (homeService) query = query.eq("home_service", true);
      if (categoryId) query = query.eq("category_id", categoryId);
      if (q) query = query.ilike("name", `%${q}%`);

      // Service area filter — match if any area string contains the chosen division/district/upazila
      // service_areas format: "Division › District › Upazila" (• area)
      const areaTerms = [division, district, upazila].filter((s) => s.length > 0);
      // We can't easily filter `text[]` for substring on each element via PostgREST,
      // so we apply this filter post-fetch.

      if (sort === "price_asc") query = query.order("price", { ascending: true });
      else if (sort === "price_desc") query = query.order("price", { ascending: false });
      else query = query.order("created_at", { ascending: false });

      const { data: services, count } = await query;
      let rows = (services as Array<Record<string, unknown>> | null) ?? [];

      if (areaTerms.length > 0) {
        rows = rows.filter((s) => {
          const areas = (s.service_areas as string[] | null) ?? [];
          if (areas.length === 0) return false;
          return areas.some((a) => areaTerms.every((t) => a.toLowerCase().includes(t.toLowerCase())));
        });
      }

      // Attach shop info
      const shopIds = Array.from(new Set(rows.map((r) => String(r.shop_id))));
      const { data: shops } = shopIds.length > 0
        ? await admin
            .from("shops")
            .select("id, name, slug, username, logo_url, address, phone, shop_type_code")
            .in("id", shopIds)
        : { data: [] as ShopRow[] };
      const shopMap: Record<string, ShopRow> = {};
      ((shops as ShopRow[] | null) ?? []).forEach((s) => (shopMap[s.id] = s));

      return json({ services: rows, shops: shopMap, total: count ?? rows.length, page, pageSize }, 200, PUBLIC_CACHE);
    }

    if (action === "service-detail") {
      const id = String(body.id ?? "").trim();
      if (!id) return json({ error: "Invalid id" }, 400);
      const { data: service } = await admin
        .from("services")
        .select("*")
        .eq("id", id)
        .is("deleted_at", null)
        .maybeSingle();
      if (!service) return json({ error: "সার্ভিস পাওয়া যায়নি" }, 404);
      const s = service as Record<string, unknown>;

      // Confirm there's a published listing
      const { data: listing } = await admin
        .from("marketplace_service_listings")
        .select("id, is_published")
        .eq("service_id", id)
        .eq("is_published", true)
        .maybeSingle();
      if (!listing) return json({ error: "এই সার্ভিস এখন অনলাইনে নেই" }, 404);

      const { data: shop } = await admin
        .from("shops")
        .select("id, name, slug, username, logo_url, cover_url, tagline, address, phone, shop_type_code, marketplace_enabled, whatsapp_number")
        .eq("id", s.shop_id as string)
        .is("deleted_at", null)
        .maybeSingle();
      if (!shop || !(shop as { marketplace_enabled: boolean }).marketplace_enabled) {
        return json({ error: "এই দোকান এখন অনলাইনে নেই" }, 404);
      }
      // Public payment provider info (so consumer can send bKash/Nagad)
      const { data: pay } = await admin
        .from("payment_gateway_settings")
        .select("provider, is_enabled")
        .eq("id", true)
        .maybeSingle();
      return json({ service: s, shop, payment: pay ?? null });
    }

    if (action === "list-service-categories") {
      // Distinct service categories used across published services
      const { data: listings } = await admin
        .from("marketplace_service_listings")
        .select("service_id")
        .eq("is_published", true);
      const sids = ((listings as { service_id: string }[] | null) ?? []).map((l) => l.service_id);
      if (sids.length === 0) return json({ categories: [] });
      const { data: services } = await admin
        .from("services")
        .select("category_id")
        .in("id", sids)
        .is("deleted_at", null)
        .not("category_id", "is", null);
      const catIds = Array.from(new Set(((services as { category_id: string | null }[] | null) ?? []).map((s) => s.category_id).filter(Boolean) as string[]));
      if (catIds.length === 0) return json({ categories: [] });
      const { data: cats } = await admin
        .from("service_categories")
        .select("id, name")
        .in("id", catIds)
        .order("name");
      return json({ categories: cats ?? [] }, 200, PUBLIC_CACHE);
    }

    if (action === "shop-services") {
      const shopId = String(body.shop_id ?? "").trim();
      if (!shopId) return json({ error: "Invalid shop_id" }, 400);
      const { data: listings } = await admin
        .from("marketplace_service_listings")
        .select("service_id")
        .eq("shop_id", shopId)
        .eq("is_published", true);
      const sids = ((listings as { service_id: string }[] | null) ?? []).map((l) => l.service_id);
      if (sids.length === 0) return json({ services: [] }, 200, PUBLIC_CACHE);
      const { data: services } = await admin
        .from("services")
        .select("id, shop_id, name, description, price, duration_minutes, duration_label, unit, image_url, home_service, service_charge_extra, service_areas, warranty_enabled, warranty_value, warranty_unit")
        .in("id", sids)
        .is("deleted_at", null)
        .eq("is_active", true)
        .order("name");
      return json({ services: services ?? [] }, 200, PUBLIC_CACHE);
    }

    if (action === "create-service-booking") {
      const serviceId = String(body.service_id ?? "").trim();
      if (!serviceId) return json({ error: "Invalid service_id" }, 400);
      const customer_name = String(body.customer_name ?? "").trim();
      const customer_phone = String(body.customer_phone ?? "").trim();
      if (!customer_name || !customer_phone) {
        return json({ error: "নাম ও ফোন আবশ্যক" }, 400);
      }

      const { data: svc } = await admin
        .from("services")
        .select("id, shop_id, name, price, advance_amount, advance_required, booking_enabled, is_marketplace_published, deleted_at")
        .eq("id", serviceId)
        .maybeSingle();
      if (!svc || (svc as { deleted_at: string | null }).deleted_at) {
        return json({ error: "সার্ভিস পাওয়া যায়নি" }, 404);
      }
      const s = svc as Record<string, unknown>;
      if (!s.booking_enabled) return json({ error: "এই সার্ভিসে অনলাইন বুকিং বন্ধ" }, 400);

      const advanceRequired = !!s.advance_required;
      const advance_payment_method = body.advance_payment_method ? String(body.advance_payment_method).trim() : null;
      const advance_txn_id = body.advance_txn_id ? String(body.advance_txn_id).trim() : null;
      if (advanceRequired && (!advance_payment_method || !advance_txn_id)) {
        return json({ error: "এই সার্ভিসে অগ্রিম বাধ্যতামূলক — পেমেন্ট মাধ্যম ও TxnID দিন" }, 400);
      }

      // Reject past scheduled times
      if (body.scheduled_at) {
        const t = new Date(String(body.scheduled_at)).getTime();
        if (Number.isNaN(t)) return json({ error: "অবৈধ সময়" }, 400);
        if (t < Date.now() - 60_000) {
          return json({ error: "পেছনের তারিখ/সময়ে বুকিং করা যাবে না" }, 400);
        }
      }

      // Try to identify the consumer from the bearer token (optional)
      let consumer_user_id: string | null = null;
      const auth = req.headers.get("authorization");
      if (auth?.startsWith("Bearer ")) {
        try {
          const userClient = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_ANON_KEY")!,
            { global: { headers: { Authorization: auth } } },
          );
          const { data: u } = await userClient.auth.getUser();
          if (u?.user?.id) consumer_user_id = u.user.id;
        } catch (_) { /* ignore */ }
      }

      const insertRow = {
        shop_id: s.shop_id as string,
        service_id: s.id as string,
        consumer_user_id,
        customer_name,
        customer_phone,
        customer_address: body.customer_address ? String(body.customer_address).trim() : null,
        division: body.division ? String(body.division).trim() : null,
        district: body.district ? String(body.district).trim() : null,
        upazila: body.upazila ? String(body.upazila).trim() : null,
        area: body.area ? String(body.area).trim() : null,
        scheduled_at: body.scheduled_at ? new Date(String(body.scheduled_at)).toISOString() : null,
        note: body.note ? String(body.note).trim() : null,
        service_name: s.name as string,
        service_price: Number(s.price ?? 0),
        advance_amount: Number(s.advance_amount ?? 0),
        advance_paid: false,
        advance_payment_method,
        advance_txn_id,
        status: "pending",
      };
      const { data: row, error } = await admin
        .from("service_bookings")
        .insert(insertRow)
        .select("id")
        .single();
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true, id: (row as { id: string }).id });
    }

    if (action === "list-my-service-bookings") {
      const auth = req.headers.get("authorization");
      if (!auth?.startsWith("Bearer ")) return json({ error: "auth_required" }, 401);
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: auth } } },
      );
      const { data: u } = await userClient.auth.getUser();
      const uid = u?.user?.id;
      if (!uid) return json({ error: "auth_required" }, 401);
      const { data: phonesData } = await userClient.rpc("my_phones");
      const phones: string[] = Array.isArray(phonesData) ? (phonesData as string[]) : [];

      let q = admin
        .from("service_bookings")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (phones.length > 0) {
        q = q.or(`consumer_user_id.eq.${uid},customer_phone.in.(${phones.map((p) => `"${p}"`).join(",")})`);
      } else {
        q = q.eq("consumer_user_id", uid);
      }
      const { data: rows, error } = await q;
      if (error) return json({ error: error.message }, 500);
      const list = (rows as Array<Record<string, unknown>>) ?? [];
      const shopIds = Array.from(new Set(list.map((r) => String(r.shop_id))));
      const { data: shops } = shopIds.length
        ? await admin.from("shops").select("id, name, logo_url, phone, slug, username").in("id", shopIds)
        : { data: [] };
      const shopMap: Record<string, unknown> = {};
      ((shops as Array<{ id: string }> | null) ?? []).forEach((s) => (shopMap[s.id] = s));
      return json({ bookings: list, shops: shopMap });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
