import { supabase } from "@/integrations/supabase/client";

export type LedgerRow = {
  id: string;
  source: "sale" | "purchase" | "payment";
  date: string; // ISO
  note: string | null;
  /** Money you received from this contact (or paid to a supplier) */
  you_got: number;
  /** Money/goods you gave to this contact (or received from supplier) */
  you_gave: number;
  balance: number; // running, computed by caller
};

/**
 * Build a unified ledger for one contact:
 *  - For a CUSTOMER:   sales (you_gave = sale.total), payments in (you_got), payments out (you_gave = advance)
 *  - For a SUPPLIER:   purchases (you_got = purchase.total — they delivered goods), payments out (you_gave = paid them), payments in (you_got = refund)
 *
 * Running balance interpretation:
 *   For customer: positive = customer owes us (due). We add `you_gave - you_got` cumulatively.
 *   For supplier: positive = we owe supplier. We add `you_got - you_gave` cumulatively.
 */
export async function fetchContactLedger(opts: {
  shopId: string;
  party: "customer" | "supplier";
  contactId: string;
  fromIso?: string; // optional date range
  toIso?: string;
}): Promise<LedgerRow[]> {
  const { shopId, party, contactId, fromIso, toIso } = opts;

  // 1) Sales / Purchases (only for non-employee — but employee uses customers table too;
  //    we still try sales since it's safe — there usually won't be sales rows for an employee)
  let salesRows: { id: string; total: number; created_at: string; note: string | null }[] = [];
  let purchaseRows: { id: string; total: number; created_at: string; note: string | null }[] = [];

  if (party === "customer") {
    let q = supabase
      .from("sales")
      .select("id,total,created_at,note")
      .eq("shop_id", shopId)
      .eq("customer_id", contactId)
      .is("deleted_at", null);
    if (fromIso) q = q.gte("created_at", fromIso);
    if (toIso) q = q.lte("created_at", toIso);
    const { data } = await q;
    salesRows = (data ?? []) as typeof salesRows;
  } else {
    let q = supabase
      .from("purchases")
      .select("id,total,created_at,note")
      .eq("shop_id", shopId)
      .eq("supplier_id", contactId)
      .is("deleted_at", null);
    if (fromIso) q = q.gte("created_at", fromIso);
    if (toIso) q = q.lte("created_at", toIso);
    const { data } = await q;
    purchaseRows = (data ?? []) as typeof purchaseRows;
  }

  // 2) Payments
  const payCol = party === "customer" ? "customer_id" : "supplier_id";
  let pq = supabase
    .from("payments")
    .select("id,direction,amount,note,created_at")
    .eq("shop_id", shopId)
    .eq(payCol, contactId);
  if (fromIso) pq = pq.gte("created_at", fromIso);
  if (toIso) pq = pq.lte("created_at", toIso);
  const { data: paymentsData } = await pq;
  const payments = (paymentsData ?? []) as { id: string; direction: string; amount: number; note: string | null; created_at: string }[];

  const rows: LedgerRow[] = [];

  if (party === "customer") {
    for (const s of salesRows) {
      rows.push({ id: `sale_${s.id}`, source: "sale", date: s.created_at, note: s.note ?? "বিক্রয়", you_got: 0, you_gave: Number(s.total ?? 0), balance: 0 });
    }
    for (const p of payments) {
      if (p.direction === "in") {
        rows.push({ id: `pay_${p.id}`, source: "payment", date: p.created_at, note: p.note, you_got: Number(p.amount), you_gave: 0, balance: 0 });
      } else {
        rows.push({ id: `pay_${p.id}`, source: "payment", date: p.created_at, note: p.note ?? "অগ্রিম", you_got: 0, you_gave: Number(p.amount), balance: 0 });
      }
    }
  } else {
    for (const p of purchaseRows) {
      // Supplier delivered goods → we owe them. Show as you_gave (we gave them an IOU)
      rows.push({ id: `pur_${p.id}`, source: "purchase", date: p.created_at, note: p.note ?? "ক্রয়", you_got: Number(p.total ?? 0), you_gave: 0, balance: 0 });
    }
    for (const p of payments) {
      if (p.direction === "out") {
        // We paid supplier
        rows.push({ id: `pay_${p.id}`, source: "payment", date: p.created_at, note: p.note, you_got: 0, you_gave: Number(p.amount), balance: 0 });
      } else {
        // Supplier returned money (rare)
        rows.push({ id: `pay_${p.id}`, source: "payment", date: p.created_at, note: p.note ?? "ফেরত", you_got: Number(p.amount), you_gave: 0, balance: 0 });
      }
    }
  }

  // Sort chronological for running balance
  rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  let bal = 0;
  for (const r of rows) {
    if (party === "customer") {
      bal += r.you_gave - r.you_got; // positive = customer owes
    } else {
      bal += r.you_got - r.you_gave; // positive = we owe supplier
    }
    r.balance = bal;
  }
  // Newest first for display
  rows.reverse();
  return rows;
}
