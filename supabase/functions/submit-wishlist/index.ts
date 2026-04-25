// Public endpoint for customers to submit a wishlist (গ্রাহক ফর্দ) to a shop.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  cors,
  generatePin,
  hashPin,
  json,
  normalizePhone,
  signToken,
  verifyPin,
} from "../_shared/wishlist-auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json();
    const slug = String(body?.slug ?? "").trim();
    const customer_name = String(body?.customer_name ?? "").trim();
    const customer_phone_raw = String(body?.customer_phone ?? "").trim();
    const customer_phone = normalizePhone(customer_phone_raw);
    const provided_pin = body?.pin != null ? String(body.pin).trim() : null;
    const customer_address =
      body?.customer_address != null ? String(body.customer_address).trim() : null;
    const note = body?.note != null ? String(body.note).trim() : null;
    const color = body?.color ? String(body.color).slice(0, 24) : "default";
    const items = Array.isArray(body?.items) ? body.items : [];

    if (!slug) return json({ error: "Invalid link" }, 400);
    if (customer_name.length < 1 || customer_name.length > 80)
      return json({ error: "নাম দিন" }, 400);
    if (!/^[0-9+]{6,20}$/.test(customer_phone))
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

    // Find or create the persistent wishlist customer for this (shop, phone)
    const { data: existingCustomer } = await admin
      .from("wishlist_customers")
      .select("id, pin_hash, name")
      .eq("shop_id", shop.id)
      .eq("phone", customer_phone)
      .maybeSingle();

    let customerId: string;
    let issuedPin: string | null = null;

    if (existingCustomer) {
      // If a PIN was provided, verify it. Otherwise allow submit (one-shot)
      // but do NOT issue a token.
      if (provided_pin) {
        const ok = await verifyPin(provided_pin, (existingCustomer as { pin_hash: string }).pin_hash);
        if (!ok) return json({ error: "ভুল PIN — আপনার আগের ফর্দ দেখতে সঠিক PIN দিন" }, 401);
      }
      customerId = (existingCustomer as { id: string }).id;
      await admin
        .from("wishlist_customers")
        .update({
          name: customer_name,
          address: customer_address,
          last_seen_at: new Date().toISOString(),
        })
        .eq("id", customerId);
    } else {
      // First time — auto-generate PIN and create profile
      issuedPin = generatePin();
      const pin_hash = await hashPin(issuedPin);
      const { data: created, error: cErr } = await admin
        .from("wishlist_customers")
        .insert({
          shop_id: shop.id,
          phone: customer_phone,
          name: customer_name,
          address: customer_address,
          pin_hash,
          last_seen_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (cErr || !created) return json({ error: cErr?.message ?? "Failed to create customer" }, 500);
      customerId = (created as { id: string }).id;
    }

    const { data: wl, error: wErr } = await admin
      .from("customer_wishlists")
      .insert({
        shop_id: shop.id,
        wishlist_customer_id: customerId,
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

    // Issue 30-day token so the customer can immediately view history
    const token = await signToken({
      cid: customerId,
      sid: shop.id,
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
    });

    return json({
      ok: true,
      wishlist_id: wl.id,
      customer_id: customerId,
      pin: issuedPin, // only set on first-ever submit
      token,
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
