// Save / update / delete a saved wishlist template ("মাসিক বাজার").
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { cors, json, verifyToken } from "../_shared/wishlist-auth.ts";

type TemplateItem = { name: string; qty: number | null; unit: string | null; price: number | null };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json();
    const token = String(body?.token ?? "").trim();
    const action = String(body?.action ?? "save"); // save | delete
    const payload = await verifyToken(token);
    if (!payload) return json({ error: "টোকেন মেয়াদ শেষ" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey);

    if (action === "delete") {
      const id = String(body?.id ?? "");
      if (!id) return json({ error: "Missing id" }, 400);
      const { error } = await admin
        .from("wishlist_templates")
        .delete()
        .eq("id", id)
        .eq("wishlist_customer_id", payload.cid);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    const name = String(body?.name ?? "").trim().slice(0, 80);
    if (!name) return json({ error: "নাম দিন" }, 400);
    const itemsRaw = Array.isArray(body?.items) ? body.items : [];
    const items: TemplateItem[] = itemsRaw
      .map((it: unknown) => {
        const o = (it ?? {}) as Record<string, unknown>;
        const n = String(o.name ?? "").trim().slice(0, 120);
        if (!n) return null;
        const qty = o.qty != null && o.qty !== "" && Number.isFinite(Number(o.qty)) ? Number(o.qty) : null;
        const price = o.price != null && o.price !== "" && Number.isFinite(Number(o.price)) ? Number(o.price) : null;
        const unit = o.unit != null ? String(o.unit).slice(0, 16) : null;
        return { name: n, qty, unit, price };
      })
      .filter(Boolean) as TemplateItem[];
    if (items.length === 0) return json({ error: "কমপক্ষে একটি পণ্য দিন" }, 400);
    if (items.length > 100) return json({ error: "১০০ এর বেশি পণ্য নয়" }, 400);

    const id = body?.id ? String(body.id) : null;
    if (id) {
      const { error } = await admin
        .from("wishlist_templates")
        .update({ name, items })
        .eq("id", id)
        .eq("wishlist_customer_id", payload.cid);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, id });
    } else {
      const { data, error } = await admin
        .from("wishlist_templates")
        .insert({ wishlist_customer_id: payload.cid, name, items })
        .select("id")
        .single();
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, id: (data as { id: string }).id });
    }
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});