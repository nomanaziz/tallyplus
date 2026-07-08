import { getNumLocale } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

export type Tx = {
  id: string;
  type: "income" | "expense";
  amount: number;
  category: string | null;
  tx_date: string;
  transfer_group_id?: string | null;
  kind?: string | null;
};

export type Budget = {
  id: string;
  user_id: string;
  category_name: string;
  month: string; // YYYY-MM-DD
  amount_limit: number;
};

export function monthStart(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
export function monthEnd(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
export function toIsoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}
export function fmtMonthBn(d: Date) {
  const months = ["জানুয়ারি","ফেব্রুয়ারি","মার্চ","এপ্রিল","মে","জুন","জুলাই","আগস্ট","সেপ্টেম্বর","অক্টোবর","নভেম্বর","ডিসেম্বর"];
  return `${months[d.getMonth()]}, ${d.getFullYear()}`;
}
export function bdt(n: number) {
  return new Intl.NumberFormat(getNumLocale(), { maximumFractionDigits: 0 }).format(n) + " ৳";
}

export function isRegularTx(r: Tx) {
  if (r.transfer_group_id) return false;
  if (r.kind && r.kind !== "regular") return false;
  return true;
}

export async function loadMonthTransactions(userId: string, anchor: Date) {
  const start = toIsoDate(monthStart(anchor));
  const end = toIsoDate(monthEnd(anchor));
  const { data, error } = await supabase
    .from("consumer_transactions")
    .select("id,type,amount,category,tx_date,transfer_group_id,kind")
    .eq("user_id", userId)
    .gte("tx_date", start)
    .lte("tx_date", end)
    .order("tx_date", { ascending: true })
    .limit(2000);
  if (error) throw error;
  return (data ?? []) as Tx[];
}

export async function loadLastNMonths(userId: string, n: number) {
  const now = new Date();
  const start = toIsoDate(new Date(now.getFullYear(), now.getMonth() - (n - 1), 1));
  const end = toIsoDate(monthEnd(now));
  const { data, error } = await supabase
    .from("consumer_transactions")
    .select("id,type,amount,category,tx_date,transfer_group_id,kind")
    .eq("user_id", userId)
    .gte("tx_date", start)
    .lte("tx_date", end)
    .limit(5000);
  if (error) throw error;
  return (data ?? []) as Tx[];
}

export async function loadMonthBudgets(userId: string, anchor: Date) {
  const month = toIsoDate(monthStart(anchor));
  const { data, error } = await supabase
    .from("consumer_budgets")
    .select("*")
    .eq("user_id", userId)
    .eq("month", month);
  if (error) throw error;
  return (data ?? []) as Budget[];
}

export async function upsertBudget(
  userId: string,
  categoryName: string,
  anchor: Date,
  amount: number,
) {
  const month = toIsoDate(monthStart(anchor));
  if (amount <= 0) {
    const { error } = await supabase
      .from("consumer_budgets")
      .delete()
      .eq("user_id", userId)
      .eq("category_name", categoryName)
      .eq("month", month);
    if (error) throw error;
    return;
  }
  const { error } = await supabase
    .from("consumer_budgets")
    .upsert(
      { user_id: userId, category_name: categoryName, month, amount_limit: amount },
      { onConflict: "user_id,category_name,month" },
    );
  if (error) throw error;
}

export async function copyPreviousMonthBudgets(userId: string, anchor: Date) {
  const prev = new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1);
  const prevMonth = toIsoDate(monthStart(prev));
  const thisMonth = toIsoDate(monthStart(anchor));
  const { data, error } = await supabase
    .from("consumer_budgets")
    .select("category_name,amount_limit")
    .eq("user_id", userId)
    .eq("month", prevMonth);
  if (error) throw error;
  if (!data?.length) return 0;
  const rows = data.map((b) => ({
    user_id: userId,
    category_name: b.category_name,
    amount_limit: b.amount_limit,
    month: thisMonth,
  }));
  const { error: upErr } = await supabase
    .from("consumer_budgets")
    .upsert(rows, { onConflict: "user_id,category_name,month" });
  if (upErr) throw upErr;
  return rows.length;
}

// Distinct, pleasant chart colors (works in both light/dark)
export const CHART_COLORS = [
  "hsl(221 83% 53%)", "hsl(142 71% 45%)", "hsl(0 84% 60%)", "hsl(45 93% 47%)",
  "hsl(262 83% 58%)", "hsl(199 89% 48%)", "hsl(24 95% 53%)", "hsl(330 81% 60%)",
  "hsl(173 80% 40%)", "hsl(282 68% 48%)", "hsl(160 60% 45%)", "hsl(15 80% 50%)",
];
