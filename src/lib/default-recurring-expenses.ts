import { supabase } from "@/integrations/supabase/client";

type DefaultTpl = {
  name: string;
  category: string;
  kind: "fixed" | "variable";
  amount: number;
  day_of_month: number;
};

export const DEFAULT_RECURRING_EXPENSES: DefaultTpl[] = [
  { name: "কর্মচারী ১", category: "salary", kind: "fixed", amount: 10000, day_of_month: 1 },
  { name: "সিকিউরিটি গার্ড", category: "other", kind: "fixed", amount: 300, day_of_month: 1 },
  { name: "কারেন্ট বিল", category: "utility", kind: "variable", amount: 800, day_of_month: 1 },
  { name: "ইন্টারনেট", category: "internet", kind: "fixed", amount: 500, day_of_month: 1 },
  { name: "দোকান ভাড়া", category: "rent", kind: "fixed", amount: 3000, day_of_month: 1 },
];

const seededShops = new Set<string>();

/**
 * Idempotently seeds a brand-new shop with a starter set of recurring
 * expense templates. Only seeds when the shop currently has ZERO templates
 * (active or paused). If the user deletes the seeded ones, we won't
 * recreate them.
 */
export async function ensureDefaultRecurringExpenses(
  shopId: string | null | undefined,
  userId: string | null | undefined,
): Promise<void> {
  if (!shopId || !userId) return;
  if (seededShops.has(shopId)) return;
  seededShops.add(shopId);

  try {
    const { count, error: cntErr } = await supabase
      .from("recurring_expenses")
      .select("id", { count: "exact", head: true })
      .eq("shop_id", shopId);
    if (cntErr) return;
    if ((count ?? 0) > 0) return;

    const rows = DEFAULT_RECURRING_EXPENSES.map((t) => ({
      shop_id: shopId,
      created_by: userId,
      name: t.name,
      category: t.category,
      kind: t.kind,
      amount: t.amount,
      day_of_month: t.day_of_month,
    }));
    await supabase.from("recurring_expenses").insert(rows);
    // After seeding, also generate this month's dues so they show up immediately.
    await supabase.rpc("generate_recurring_dues_for_shop", { _shop_id: shopId });
  } catch {
    // silent — user can still create manually
  }
}