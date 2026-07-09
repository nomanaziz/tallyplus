import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Module codes used across the app. Adding a new module = add the code here +
// in the migration's seed list. Common modules (dashboard, profile, training,
// settings) intentionally have NO code — they are always visible.
export const MODULES = {
  products: "products",
  purchase: "purchase",
  sales: "sales",
  expense: "expense",
  contacts: "contacts",
  cashbook: "cashbook",
  reports: "reports",
  services: "services",
  online_shop: "online_shop",
  restaurant: "restaurant",
  lpg: "lpg",
} as const;

export type ModuleCode = keyof typeof MODULES;

export const MODULE_LABELS: Record<string, { bn: string; en: string; hint?: { bn: string; en: string } }> = {
  products: { bn: "প্রোডাক্ট ও স্টক", en: "Products & Stock", hint: { bn: "প্রোডাক্ট, ক্যাটাগরি, রিটার্ন, এক্সপায়ারি", en: "Products, categories, returns, expiry" } },
  purchase: { bn: "ক্রয়", en: "Purchase", hint: { bn: "সাপ্লায়ার থেকে কেনা ও ক্রয় বই", en: "Buy from suppliers & purchase ledger" } },
  sales: { bn: "বিক্রয়", en: "Sales", hint: { bn: "বিক্রয়, দ্রুত বিক্রি, বিক্রয় বই", en: "Sell, quick sell, sales ledger" } },
  expense: { bn: "খরচ", en: "Expense", hint: { bn: "খরচের বই ও রিপোর্ট", en: "Expense book & report" } },
  contacts: { bn: "গ্রাহক ও যোগাযোগ", en: "Customers & Contacts", hint: { bn: "কাস্টমার, স্টাফ, ফর্দ, মার্কেটিং", en: "Customers, staff, fordo, marketing" } },
  cashbook: { bn: "ক্যাশবক্স ও বই", en: "Cashbook", hint: { bn: "ক্যাশবক্স, মালিকের বই, সম্পদ", en: "Cashbox, owner book, assets" } },
  reports: { bn: "রিপোর্ট", en: "Reports" },
  services: { bn: "সার্ভিস", en: "Services", hint: { bn: "সার্ভিস ব্যবসার জন্য", en: "For service business" } },
  online_shop: { bn: "অনলাইন শপ", en: "Online Shop" },
  restaurant: { bn: "রেস্টুরেন্ট", en: "Restaurant" },
  lpg: { bn: "LPG / বোতল ব্যবসা", en: "LPG / Bottle Business", hint: { bn: "গ্যাস সিলিন্ডার ও পানির বোতল ট্র্যাকিং, জামানত, ডেলিভারি", en: "Cylinder & water-bottle tracking, deposit, delivery" } },
};

// Recommended module set by shop-type category_group. Used only to show a
// "সুপারিশ" badge in Shop Settings and to reorder the module list — never to
// hide or force-enable anything. Owner still has full control.
export const SHOP_TYPE_RECOMMENDED_MODULES: Record<string, string[]> = {
  retail: ["products", "purchase", "sales", "expense", "contacts", "cashbook", "reports"],
  wholesale: ["products", "purchase", "sales", "expense", "contacts", "cashbook", "reports"],
  restaurant: ["products", "purchase", "sales", "expense", "contacts", "cashbook", "reports", "restaurant"],
  service: ["services", "sales", "expense", "contacts", "cashbook", "reports"],
  lpg: ["products", "purchase", "sales", "expense", "contacts", "cashbook", "reports", "lpg"],
  water: ["products", "purchase", "sales", "expense", "contacts", "cashbook", "reports", "lpg"],
  digital: ["products", "sales", "expense", "contacts", "cashbook", "reports", "online_shop"],
  online: ["products", "sales", "expense", "contacts", "cashbook", "reports", "online_shop"],
};

// Cached fetch of the shop-type row so callers can show name + group + icon.
export type ShopTypeInfo = {
  code: string;
  name_bn: string;
  name_en: string;
  icon: string | null;
  category_group: string | null;
};

const shopTypeCache = new Map<string, ShopTypeInfo | null>();

export function useShopType(code: string | null | undefined) {
  const [info, setInfo] = useState<ShopTypeInfo | null>(code ? shopTypeCache.get(code) ?? null : null);
  useEffect(() => {
    if (!code) { setInfo(null); return; }
    if (shopTypeCache.has(code)) { setInfo(shopTypeCache.get(code) ?? null); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("shop_types")
        .select("code,name_bn,name_en,icon,category_group")
        .eq("code", code)
        .maybeSingle();
      const row = (data as ShopTypeInfo | null) ?? null;
      shopTypeCache.set(code, row);
      if (!cancelled) setInfo(row);
    })();
    return () => { cancelled = true; };
  }, [code]);
  return info;
}

export function recommendedForGroup(group: string | null | undefined): Set<string> {
  if (!group) return new Set();
  return new Set(SHOP_TYPE_RECOMMENDED_MODULES[group] ?? []);
}

// Modules that are always visible regardless of toggle state.
const ALWAYS_ON = new Set<string>(["__common__"]);

export function useEnabledModules(shopId: string | null | undefined) {
  const [enabled, setEnabled] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!shopId) { setEnabled(new Set()); setLoading(false); return; }
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("shop_modules")
        .select("module_code,enabled")
        .eq("shop_id", shopId);
      if (cancelled) return;
      const set = new Set<string>(ALWAYS_ON);
      for (const r of (data ?? []) as Array<{ module_code: string; enabled: boolean }>) {
        if (r.enabled) set.add(r.module_code);
      }
      setEnabled(set);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [shopId]);

  return { enabled, loading };
}

export async function setShopModule(shopId: string, moduleCode: string, on: boolean): Promise<void> {
  await supabase.from("shop_modules").upsert(
    { shop_id: shopId, module_code: moduleCode, enabled: on },
    { onConflict: "shop_id,module_code" },
  );
}

export async function loadShopModules(shopId: string): Promise<Record<string, boolean>> {
  const { data } = await supabase
    .from("shop_modules")
    .select("module_code,enabled")
    .eq("shop_id", shopId);
  const out: Record<string, boolean> = {};
  for (const r of (data ?? []) as Array<{ module_code: string; enabled: boolean }>) {
    out[r.module_code] = r.enabled;
  }
  return out;
}