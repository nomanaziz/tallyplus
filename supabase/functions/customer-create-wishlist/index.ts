// Logged-in consumer creates a wishlist (fordo) and sends to a target shop.
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

  let body: {
    shop_id?: string;
    note?: string;
    items?: Array<{ name: string; qty?: number | string; unit?: string; price?: number | string }>;
  };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const shop_id = String(body.shop_id ?? "").trim();
  if (!shop_id) return json({ error: "shop_id required" }, 400);
  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) return json({ error: "অন্তত একটি পণ্য যোগ করুন" }, 400);
  if (items.length > 100) return json({ error: "একসাথে সর্বোচ্চ ১০০টি পণ্য" }, 400);

  const cleanItems = items
    .map((it, idx) => {
      const name = String(it.name ?? "").trim().slice(0, 120);
      if (!name) return null;
      const qty = it.qty == null || it.qty === "" ? null : Number(it.qty) || null;
      const price = it.price == null || it.price === "" ? null : Number(it.price) || null;
      const unit = it.unit ? String(it.unit).trim().slice(0, 16) : null;
      return { name, qty, price, unit, position: idx, done: false };
    })
    .filter(Boolean) as Array<{ name: string; qty: number | null; price: number | null; unit: string | null; position: number; done: boolean }>;
  if (cleanItems.length === 0) return json({ error: "অন্তত একটি পণ্য যোগ করুন" }, 400);

  const admin = createClient(url, serviceKey);

  // Verify shop exists
  const { data: shop } = await admin
    .from("shops")
    .select("id")
    .eq("id", shop_id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!shop) return json({ error: "দোকান পাওয়া যায়নি" }, 404);

  // Get consumer profile for name/phone
  const { data: prof } = await admin
    .from("consumer_profiles")
    .select("name,phone,address")
    .eq("id", user.id)
    .maybeSingle();
  const customer_name = (prof?.name ?? user.user_metadata?.name ?? "Customer").slice(0, 80);
  const customer_phone = (prof?.phone ?? user.phone ?? "").slice(0, 20);
  const customer_address = prof?.address ?? null;

  const { data: wl, error: wErr } = await admin
    .from("customer_wishlists")
    .insert({
      shop_id,
      customer_name,
      customer_phone,
      customer_address,
      note: body.note ? String(body.note).trim().slice(0, 500) : null,
      consumer_user_id: user.id,
      status: "new",
    })
    .select("id")
    .single();
  if (wErr) return json({ error: wErr.message }, 500);

  const itemsRows = cleanItems.map((it) => ({ ...it, wishlist_id: wl.id }));
  const { error: iErr } = await admin.from("customer_wishlist_items").insert(itemsRows);
  if (iErr) return json({ error: iErr.message }, 500);

  return json({ ok: true, wishlist_id: wl.id });
});