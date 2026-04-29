import { supabase } from "@/integrations/supabase/client";

/**
 * Canonical default category list — matches the categories present in
 * the `marketplace_products` (sample import) catalogue so that whatever
 * a shopkeeper imports automatically lines up with the categories
 * already present in their Product form dropdown.
 *
 * Order matters: it is the order categories will appear in the dropdown
 * for a brand-new shop. Grouped roughly by section (grocery → personal
 * care → stationery → electronics).
 */
export const DEFAULT_CATEGORIES: string[] = [
  // Grocery / food
  "চাল",
  "ডাল",
  "তেল",
  "আটা/ময়দা",
  "চিনি/লবণ",
  "মসলা",
  "দুধ",
  "ডিম/অন্যান্য",
  "চা/কফি",
  "পানীয়",
  "বিস্কুট/স্ন্যাকস",
  "নুডলস/পাস্তা",
  "সস/আচার",
  // Home / personal care
  "সাবান/ডিটারজেন্ট",
  "পার্সোনাল কেয়ার",
  // Stationery / office
  "কলম",
  "খাতা/নোটবুক",
  "কাগজ",
  "ফাইল/ফোল্ডার",
  "আঠা/টেপ",
  "ক্যালকুলেটর",
  "স্টেশনারি একসেসরিজ",
  "অফিস",
  // Electronics / mobile accessories
  "চার্জার",
  "কেবল",
  "ইয়ারফোন",
  "পাওয়ার ব্যাংক",
  "কভার/প্রটেক্টর",
  "একসেসরিজ",
  "রিপেয়ার পার্টস",
  "স্টোরেজ",
];

// Per-session cache so we don't re-run the seeder on every dialog open.
const seededShops = new Set<string>();

/**
 * Idempotently ensures that every name in `DEFAULT_CATEGORIES` exists
 * as a top-level (parent_id = null) category for the given shop.
 * Safe to call repeatedly. Silent on errors — categories will still
 * be creatable manually.
 */
export async function ensureDefaultCategories(
  shopId: string | null | undefined,
  opts: { force?: boolean } = {},
): Promise<void> {
  if (!shopId) return;
  if (!opts.force && seededShops.has(shopId)) return;

  try {
    const { data: existing, error } = await supabase
      .from("categories")
      .select("name")
      .eq("shop_id", shopId);
    if (error) throw error;

    const have = new Set((existing ?? []).map((r) => (r as { name: string }).name));
    const missing = DEFAULT_CATEGORIES.filter((n) => !have.has(n));

    if (missing.length > 0) {
      const { error: insErr } = await supabase
        .from("categories")
        .insert(missing.map((name) => ({ shop_id: shopId, name, parent_id: null })));
      if (insErr) throw insErr;
    }

    seededShops.add(shopId);
  } catch (e) {
    // Non-fatal: log only, never block the UI.
    // eslint-disable-next-line no-console
    console.warn("ensureDefaultCategories failed", e);
  }
}