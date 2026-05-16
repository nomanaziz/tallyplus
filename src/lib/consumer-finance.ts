import { supabase } from "@/integrations/supabase/client";

export const DEFAULT_INCOME_CATS = [
  "বেতন","ব্যবসার আয়","ফ্রিল্যান্স","উপহার","বোনাস",
  "বিনিয়োগ থেকে আয়","ভাড়া আয়","ভাতা/পেনশন","ধার ফেরত পেলাম","অন্যান্য",
];
export const DEFAULT_EXPENSE_CATS = [
  "বাজার/খাবার","বাসা ভাড়া","ইউটিলিটি বিল","ইন্টারনেট/মোবাইল","যাতায়াত",
  "চিকিৎসা","শিক্ষা","পোশাক","বিনোদন","দান/সদকাহ",
  "ঋণ পরিশোধ","সঞ্চয়/বিনিয়োগ","ব্যবসায়িক খরচ","অন্যান্য",
];

export const ACCOUNT_KIND_LABEL: Record<string, string> = {
  cash: "ক্যাশ", bank: "ব্যাংক", bkash: "বিকাশ",
  nagad: "নগদ", card: "কার্ড", other: "অন্যান্য",
};

export type ConsumerAccount = {
  id: string; user_id: string; name: string;
  kind: "cash" | "bank" | "bkash" | "nagad" | "card" | "other";
  opening_balance: number; color: string | null; is_archived: boolean;
};
export type ConsumerCategory = {
  id: string; user_id: string; name: string;
  kind: "income" | "expense"; parent_id: string | null;
  icon: string | null; color: string | null; is_archived: boolean;
};
export type RecurringRule = {
  id: string; user_id: string; type: "income" | "expense";
  amount: number; account_id: string | null; category: string | null;
  subcategory_id: string | null; note: string | null;
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  day_of_month: number | null; next_run_date: string;
  last_run_date: string | null; is_active: boolean;
};

/** Ensures the user has at least one account + default categories. Idempotent. */
export async function ensureConsumerFinanceSetup(userId: string) {
  const [{ count: accCount }, { count: catCount }] = await Promise.all([
    supabase.from("consumer_accounts").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("consumer_categories").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);
  if ((accCount ?? 0) === 0) {
    await supabase.from("consumer_accounts").upsert(
      { user_id: userId, name: "ক্যাশ", kind: "cash", opening_balance: 0 },
      { onConflict: "user_id,name", ignoreDuplicates: true },
    );
  }
  if ((catCount ?? 0) === 0) {
    const rows = [
      ...DEFAULT_INCOME_CATS.map((n, i) => ({ user_id: userId, name: n, kind: "income" as const, sort_order: i })),
      ...DEFAULT_EXPENSE_CATS.map((n, i) => ({ user_id: userId, name: n, kind: "expense" as const, sort_order: i })),
    ];
    await supabase.from("consumer_categories").upsert(rows, {
      onConflict: "user_id,name,kind",
      ignoreDuplicates: true,
    });
  }
}