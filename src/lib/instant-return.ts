import { supabase } from "@/integrations/supabase/client";

export type InstantReturnItem = {
  product_id: string | null;
  name: string;
  qty: number;
  price: number;
};

export type InstantReturnOpts = {
  shopId: string;
  saleId: string;
  items?: InstantReturnItem[]; // if omitted, return ALL sale items
  refundMethod?: "cash" | "due_adjust" | "none";
  reason?: string;
  note?: string;
};

export async function createInstantReturn(opts: InstantReturnOpts) {
  const { shopId, saleId } = opts;
  const refundMethod = opts.refundMethod ?? "cash";

  // 1. Fetch sale + items
  const { data: sale, error: sErr } = await supabase
    .from("sales")
    .select("id,invoice_no,customer_id,total,paid,due,payment_method")
    .eq("id", saleId)
    .maybeSingle();
  if (sErr || !sale) throw new Error(sErr?.message ?? "Sale not found");

  let lines = opts.items;
  if (!lines || lines.length === 0) {
    const { data: saleLines } = await supabase
      .from("sale_items")
      .select("product_id,name,qty,price")
      .eq("sale_id", saleId);
    lines = ((saleLines ?? []) as any[]).map((l) => ({
      product_id: l.product_id,
      name: l.name,
      qty: Number(l.qty),
      price: Number(l.price),
    }));
  }
  lines = lines.filter((l) => Number(l.qty) > 0);
  if (lines.length === 0) throw new Error("No items to return");

  const total = lines.reduce((a, l) => a + Number(l.qty) * Number(l.price), 0);
  const refundAmt = total;

  // 2. Generate return number
  const { count } = await supabase
    .from("sale_returns")
    .select("id", { count: "exact", head: true })
    .eq("shop_id", shopId);
  const nextNo = `R-${String((count ?? 0) + 1).padStart(4, "0")}`;

  const refundStatus = refundMethod === "none" ? "pending" : refundMethod === "due_adjust" ? "adjusted_to_due" : "refunded";
  const refundMethodDb = refundMethod === "due_adjust" ? "cash" : refundMethod === "none" ? "cash" : "cash";

  // 3. Insert sale_returns
  const userId = (await supabase.auth.getUser()).data.user?.id ?? null;
  const { data: ret, error: rErr } = await supabase
    .from("sale_returns")
    .insert({
      shop_id: shopId,
      sale_id: saleId,
      customer_id: sale.customer_id,
      return_no: nextNo,
      reason: opts.reason ?? "customer_changed",
      total,
      refund_amount: refundAmt,
      refund_method: refundMethodDb as any,
      refund_status: refundStatus,
      restock: true,
      note: opts.note ?? null,
      created_by: userId,
    })
    .select("id")
    .single();
  if (rErr || !ret) throw new Error(rErr?.message ?? "Return insert failed");
  const returnId = ret.id as string;

  // 4. Insert return items
  const itemsPayload = lines.map((l) => ({
    return_id: returnId,
    product_id: l.product_id,
    name: l.name,
    qty: Number(l.qty),
    price: Number(l.price),
    total: Number(l.qty) * Number(l.price),
  }));
  const { error: iErr } = await supabase.from("sale_return_items").insert(itemsPayload);
  if (iErr) throw new Error(iErr.message);

  // 5. Restock tracked products
  for (const l of lines) {
    if (!l.product_id) continue;
    const { data: prod } = await supabase
      .from("products")
      .select("stock,track_stock")
      .eq("id", l.product_id)
      .maybeSingle();
    if (!prod) continue;
    // Only restock if stock is tracked
    if ((prod as any).track_stock === false) continue;
    const newStock = Number((prod as any).stock ?? 0) + Number(l.qty);
    await supabase.from("products").update({ stock: newStock }).eq("id", l.product_id);
  }

  // 6. Adjust sale totals (reduce total; reduce paid or due depending on refund method)
  const saleTotal = Number(sale.total);
  const salePaid = Number(sale.paid);
  const saleDue = Number(sale.due);
  const newTotal = Math.max(0, saleTotal - refundAmt);
  let newPaid = salePaid;
  let newDue = saleDue;
  if (refundMethod === "cash") {
    // Money goes back to customer — paid decreases
    newPaid = Math.max(0, salePaid - refundAmt);
  } else if (refundMethod === "due_adjust") {
    // Due reduces
    newDue = Math.max(0, saleDue - refundAmt);
  } else {
    // none: just reduce due first then paid
    const fromDue = Math.min(saleDue, refundAmt);
    newDue = saleDue - fromDue;
    newPaid = Math.max(0, salePaid - (refundAmt - fromDue));
  }
  await supabase
    .from("sales")
    .update({ total: newTotal, paid: newPaid, due: newDue })
    .eq("id", saleId);

  // sale_adjustments trace
  await supabase.from("sale_adjustments").insert({
    shop_id: shopId,
    sale_id: saleId,
    customer_id: sale.customer_id,
    amount: -refundAmt,
    type: "return",
    note: `Return ${nextNo}`,
    created_by: userId,
  });

  // 7. Cash refund movement
  if (refundMethod === "cash" && refundAmt > 0) {
    await supabase.from("cash_movements").insert({
      shop_id: shopId,
      direction: "out",
      amount: refundAmt,
      note: `Return ${nextNo}`,
      ref_table: "sale_returns",
      ref_id: returnId,
      denominations: {},
    });
  }

  // 8. Customer due_balance adjust (due_adjust)
  if (refundMethod === "due_adjust" && refundAmt > 0 && sale.customer_id) {
    const { data: c } = await supabase
      .from("customers")
      .select("due_balance")
      .eq("id", sale.customer_id)
      .maybeSingle();
    const newBal = Math.max(0, Number((c as any)?.due_balance ?? 0) - refundAmt);
    await supabase.from("customers").update({ due_balance: newBal }).eq("id", sale.customer_id);
  }

  return { returnId, returnNo: nextNo, total: refundAmt };
}