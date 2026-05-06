import { supabase } from "@/integrations/supabase/client";

export type CashBookLine = { label: string; amount: number; sub?: string };
export type CashBookData = {
  monthLabel: string;
  rangeStart: string; // ISO yyyy-mm-dd
  rangeEndExclusive: string;
  debits: CashBookLine[]; // income side
  credits: CashBookLine[]; // expense side
  totalDebit: number;
  totalCredit: number;
  cashOnHand: number; // net for the month (debit - credit)
  txCount: number;
};

export function monthRange(year: number, month0: number): { start: string; endExclusive: string } {
  const start = new Date(Date.UTC(year, month0, 1));
  const end = new Date(Date.UTC(year, month0 + 1, 1));
  return { start: start.toISOString().slice(0, 10), endExclusive: end.toISOString().slice(0, 10) };
}

export function bnMonthLabel(year: number, month0: number, lang: "bn" | string = "bn") {
  const bn = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];
  const en = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const names = lang === "bn" ? bn : en;
  return `${names[month0]} ${year}`;
}

function groupBy<T>(rows: T[], keyOf: (r: T) => string, valueOf: (r: T) => number): CashBookLine[] {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = (keyOf(r) || "").trim() || "অন্যান্য";
    m.set(k, (m.get(k) ?? 0) + (valueOf(r) || 0));
  }
  return Array.from(m.entries())
    .map(([label, amount]) => ({ label, amount }))
    .filter((l) => l.amount !== 0)
    .sort((a, b) => b.amount - a.amount);
}

/** Shop-owner cash book — categorized debit/credit for one month. */
export async function loadShopCashBook(shopId: string, year: number, month0: number): Promise<CashBookData> {
  const { start, endExclusive } = monthRange(year, month0);

  const [salesRes, purchasesRes, expensesRes, paymentsRes] = await Promise.all([
    supabase
      .from("sales")
      .select("total,paid,due,created_at,deleted_at")
      .eq("shop_id", shopId)
      .is("deleted_at", null)
      .gte("created_at", start)
      .lt("created_at", endExclusive),
    supabase
      .from("purchases")
      .select("total,paid,due,created_at,deleted_at")
      .eq("shop_id", shopId)
      .is("deleted_at", null)
      .gte("created_at", start)
      .lt("created_at", endExclusive),
    supabase
      .from("expenses")
      .select("amount,category,created_at,deleted_at")
      .eq("shop_id", shopId)
      .is("deleted_at", null)
      .gte("created_at", start)
      .lt("created_at", endExclusive),
    supabase
      .from("payments")
      .select("amount,direction,customer_id,supplier_id,created_at")
      .eq("shop_id", shopId)
      .gte("created_at", start)
      .lt("created_at", endExclusive),
  ]);

  const sales = (salesRes.data ?? []) as Array<{ total: number; paid: number }>;
  const purchases = (purchasesRes.data ?? []) as Array<{ total: number; paid: number }>;
  const expenses = (expensesRes.data ?? []) as Array<{ amount: number; category: string | null }>;
  const payments = (paymentsRes.data ?? []) as Array<{ amount: number; direction: string; customer_id: string | null; supplier_id: string | null }>;

  // DEBIT (cash in)
  const cashSales = sales.reduce((s, r) => s + Number(r.paid || 0), 0);
  const dueReceived = payments.filter((p) => p.direction === "in" && p.customer_id).reduce((s, p) => s + Number(p.amount), 0);
  const debits: CashBookLine[] = [];
  if (cashSales > 0) debits.push({ label: "নগদ বিক্রি", sub: "(কাস্টমার বাকি বাদে)", amount: cashSales });
  if (dueReceived > 0) debits.push({ label: "কাস্টমারের বাকি আদায়", amount: dueReceived });

  // CREDIT (cash out)
  const cashPurchase = purchases.reduce((s, r) => s + Number(r.paid || 0), 0);
  const duePaid = payments.filter((p) => p.direction === "out" && p.supplier_id).reduce((s, p) => s + Number(p.amount), 0);
  const credits: CashBookLine[] = [];
  if (cashPurchase > 0) credits.push({ label: "নগদ ক্রয়", sub: "(সাপ্লায়ার বাকি বাদে)", amount: cashPurchase });
  if (duePaid > 0) credits.push({ label: "সাপ্লায়ারকে পরিশোধ", amount: duePaid });

  // Categorized expenses — the main feature (বেতন, ভাড়া, যাতায়াত, …)
  const expGroups = groupBy(expenses, (r) => r.category ?? "অন্যান্য খরচ", (r) => Number(r.amount || 0));
  credits.push(...expGroups);

  const totalDebit = debits.reduce((s, l) => s + l.amount, 0);
  const totalCredit = credits.reduce((s, l) => s + l.amount, 0);

  return {
    monthLabel: bnMonthLabel(year, month0, "bn"),
    rangeStart: start,
    rangeEndExclusive: endExclusive,
    debits,
    credits,
    totalDebit,
    totalCredit,
    cashOnHand: totalDebit - totalCredit,
    txCount: sales.length + purchases.length + expenses.length + payments.length,
  };
}

/** Personal (consumer) cash book — categorized debit/credit for one month. */
export async function loadConsumerCashBook(userId: string, year: number, month0: number): Promise<CashBookData> {
  const { start, endExclusive } = monthRange(year, month0);

  const { data, error } = await supabase
    .from("consumer_transactions")
    .select("type,amount,category,tx_date,transfer_group_id,kind")
    .eq("user_id", userId)
    .gte("tx_date", start)
    .lt("tx_date", endExclusive);
  if (error) throw error;

  const rows = (data ?? []) as Array<{ type: "income" | "expense"; amount: number; category: string | null; transfer_group_id: string | null; kind: string | null }>;
  // Exclude transfers and loan-event entries from the cash book totals.
  const clean = rows.filter((r) => !r.transfer_group_id && (!r.kind || r.kind === "regular"));

  const incomes = clean.filter((r) => r.type === "income");
  const expenses = clean.filter((r) => r.type === "expense");

  const debits = groupBy(incomes, (r) => r.category ?? "অন্যান্য আয়", (r) => Number(r.amount || 0));
  const credits = groupBy(expenses, (r) => r.category ?? "অন্যান্য খরচ", (r) => Number(r.amount || 0));

  const totalDebit = debits.reduce((s, l) => s + l.amount, 0);
  const totalCredit = credits.reduce((s, l) => s + l.amount, 0);

  return {
    monthLabel: bnMonthLabel(year, month0, "bn"),
    rangeStart: start,
    rangeEndExclusive: endExclusive,
    debits,
    credits,
    totalDebit,
    totalCredit,
    cashOnHand: totalDebit - totalCredit,
    txCount: clean.length,
  };
}