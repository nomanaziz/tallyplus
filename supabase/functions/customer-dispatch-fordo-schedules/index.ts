// Cron-driven worker: dispatches due consumer_fordo_schedules into customer_wishlists.
// Should be invoked every few minutes via pg_cron.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json" } });
}

function nextMonthly(day: number): Date {
  const now = new Date();
  const yr = now.getFullYear();
  const mo = now.getMonth() + 1; // next month
  const lastOfNext = new Date(yr, mo + 1, 0).getDate();
  return new Date(yr, mo, Math.min(day, lastOfNext), 9, 0, 0);
}
function nextWeekly(weekday: number): Date {
  const now = new Date();
  const candidate = new Date(now);
  candidate.setHours(9, 0, 0, 0);
  const diff = (weekday - candidate.getDay() + 7) % 7;
  candidate.setDate(candidate.getDate() + (diff === 0 ? 7 : diff));
  return candidate;
}

Deno.serve(async (_req) => {
  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, serviceKey);

  const nowIso = new Date().toISOString();
  const { data: due, error } = await admin
    .from("consumer_fordo_schedules")
    .select("id,consumer_user_id,shop_id,items,note,recurrence,day_of_month,day_of_week")
    .eq("is_active", true)
    .lte("next_run_at", nowIso)
    .limit(200);
  if (error) return json({ error: error.message }, 500);

  const dispatched: string[] = [];
  for (const s of due ?? []) {
    try {
      const items = Array.isArray(s.items) ? (s.items as Array<{ name: string; qty?: number | string | null; unit?: string | null }>) : [];
      if (items.length === 0) continue;

      // Verify shop still active
      const { data: shop } = await admin
        .from("shops")
        .select("id")
        .eq("id", s.shop_id)
        .is("deleted_at", null)
        .maybeSingle();
      if (!shop) {
        await admin.from("consumer_fordo_schedules").update({ is_active: false }).eq("id", s.id);
        continue;
      }

      // Get consumer profile
      const { data: prof } = await admin
        .from("consumer_profiles")
        .select("name,phone,address")
        .eq("id", s.consumer_user_id)
        .maybeSingle();
      const customer_name = (prof?.name ?? "Customer").slice(0, 80);
      const customer_phone = (prof?.phone ?? "").slice(0, 20);
      const customer_address = prof?.address ?? null;

      const { data: wl, error: wErr } = await admin
        .from("customer_wishlists")
        .insert({
          shop_id: s.shop_id,
          customer_name,
          customer_phone,
          customer_address,
          note: s.note ? String(s.note).slice(0, 500) : null,
          consumer_user_id: s.consumer_user_id,
          status: "new",
        })
        .select("id")
        .single();
      if (wErr) { console.error("wishlist insert", wErr); continue; }

      const rows = items.map((it, idx) => ({
        wishlist_id: wl.id,
        name: String(it.name ?? "").slice(0, 120),
        qty: it.qty == null || it.qty === "" ? null : Number(it.qty) || null,
        unit: it.unit ? String(it.unit).slice(0, 16) : null,
        position: idx,
        done: false,
      })).filter((r) => r.name);
      if (rows.length > 0) {
        await admin.from("customer_wishlist_items").insert(rows);
      }

      // Update schedule
      let next: Date | null = null;
      let isActive = true;
      if (s.recurrence === "monthly" && s.day_of_month) next = nextMonthly(s.day_of_month);
      else if (s.recurrence === "weekly" && s.day_of_week !== null && s.day_of_week !== undefined) next = nextWeekly(s.day_of_week);
      else { isActive = false; next = new Date(Date.now() + 365 * 24 * 3600 * 1000); }

      await admin
        .from("consumer_fordo_schedules")
        .update({
          last_run_at: nowIso,
          next_run_at: next!.toISOString(),
          is_active: isActive,
        })
        .eq("id", s.id);

      dispatched.push(s.id);
    } catch (e) {
      console.error("dispatch error", s.id, e);
    }
  }

  return json({ ok: true, count: dispatched.length, ids: dispatched });
});