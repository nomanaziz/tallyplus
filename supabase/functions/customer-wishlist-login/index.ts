// Customer-wishlist login: phone + PIN → signed 30-day token.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { cors, json, normalizePhone, signToken, verifyPin } from "../_shared/wishlist-auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json();
    const slug = String(body?.slug ?? "").trim();
    const phone = normalizePhone(String(body?.phone ?? "").trim());
    const pin = String(body?.pin ?? "").trim();

    if (!slug) return json({ error: "Invalid link" }, 400);
    if (!/^[0-9+]{6,20}$/.test(phone)) return json({ error: "সঠিক মোবাইল নাম্বার দিন" }, 400);
    if (!/^\d{4,8}$/.test(pin)) return json({ error: "সঠিক PIN দিন" }, 400);

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey);

    const { data: shop } = await admin
      .from("shops")
      .select("id, name")
      .eq("wishlist_slug", slug)
      .is("deleted_at", null)
      .maybeSingle();
    if (!shop) return json({ error: "এই লিঙ্কটি আর সক্রিয় নেই" }, 404);

    const { data: cust } = await admin
      .from("wishlist_customers")
      .select("id, name, pin_hash")
      .eq("shop_id", (shop as { id: string }).id)
      .eq("phone", phone)
      .maybeSingle();
    if (!cust) return json({ error: "এই নাম্বারে কোনো ফর্দ পাওয়া যায়নি" }, 404);

    const ok = await verifyPin(pin, (cust as { pin_hash: string }).pin_hash);
    if (!ok) return json({ error: "ভুল PIN" }, 401);

    await admin
      .from("wishlist_customers")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", (cust as { id: string }).id);

    const token = await signToken({
      cid: (cust as { id: string }).id,
      sid: (shop as { id: string }).id,
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
    });

    return json({
      ok: true,
      token,
      customer: { id: (cust as { id: string }).id, name: (cust as { name: string }).name },
      shop: { id: (shop as { id: string }).id, name: (shop as { name: string }).name },
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});