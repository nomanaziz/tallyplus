// Public endpoint for customers to submit a wishlist (গ্রাহক ফর্দ) to a shop.
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
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json();
    const slug = String(body?.slug ?? "").trim();
    const customer_name = String(body?.customer_name ?? "").trim();
    const customer_phone = String(body?.customer_phone ?? "").trim();
    const customer_address =
      body?.customer_address != null ? String(body.customer_address).trim() : null;
    const note = body?.note != null ? String(body.note).trim() : null;
    const color = body?.color ? String(body.color).slice(0, 24) : "default";
    const items = Array.isArray(body?.items) ? body.items : [];

    if (!slug) return json({ error: "Invalid link" }, 400);
    if (customer_name.length < 1 || customer_name.length > 80)
      return json({ error: "নাম দিন" }, 400);
    if (!/^[0-9+\-\s()]{6,20}$/.test(customer_phone))
      return json({ error: "সঠিক মোবাইল নাম্বার দিন" }, 400);
    if (items.length < 1) return json({ error: "অন্তত একটি পণ্য যোগ করুন" }, 400);
    if (items.length > 100) return json({ error: "একসাথে সর্বোচ্চ ১০০টি পণ্য" }, 400);

    const cleanItems = items
      .map((it: unknown, idx: number) => {
        const o = (it ?? {}) as Record<string, unknown>;
        const name = String(o.name ?? "").trim().slice(0, 120);
        if (!name) return null;
        const qtyRaw = o.qty;
        const qty =
          qtyRaw == null || qtyRaw === ""
            ? null
            : Number.isFinite(Number(qtyRaw))
              ? Number(qtyRaw)
              : null;
        const priceRaw = o.price;
        const price =
          priceRaw == null || priceRaw === ""
            ? null
            : Number.isFinite(Number(priceRaw))
              ? Number(priceRaw)
              : null;
        const unit = o.unit != null ? String(o.unit).trim().slice(0, 16) : null;
        return { name, qty, price, unit, position: idx, done: false };
      })
      .filter(Boolean) as Array<{
        name: string;
        qty: number | null;
        price: number | null;
        unit: string | null;
        position: number;
        done: boolean;
      }>;

    if (cleanItems.length === 0) return json({ error: "অন্তত একটি পণ্য যোগ করুন" }, 400);

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey);

    const { data: shop, error: sErr } = await admin
      .from("shops")
      .select("id")
      .eq("wishlist_slug", slug)
      .is("deleted_at", null)
      .maybeSingle();
    if (sErr) return json({ error: sErr.message }, 500);
    if (!shop) return json({ error: "এই লিঙ্কটি আর সক্রিয় নেই" }, 404);

    const { data: wl, error: wErr } = await admin
      .from("customer_wishlists")
      .insert({
        shop_id: shop.id,
        customer_name,
        customer_phone,
        customer_address,
        note,
        color,
      })
      .select("id")
      .single();
    if (wErr) return json({ error: wErr.message }, 500);

    const itemsRows = cleanItems.map((it) => ({ ...it, wishlist_id: wl.id }));
    const { error: iErr } = await admin.from("customer_wishlist_items").insert(itemsRows);
    if (iErr) return json({ error: iErr.message }, 500);

    return json({ ok: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
