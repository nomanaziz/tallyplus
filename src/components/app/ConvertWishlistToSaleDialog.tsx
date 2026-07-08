import { getNumLocale } from "@/lib/i18n";
import { useMemo, useState } from "react";
import { Loader2, Receipt, BadgePercent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type ConvertItem = {
  id: string;
  name: string;
  qty: number | null;
  unit: string | null;
  price: number | null;
  fulfillment_status?: string | null;
  done?: boolean;
  lump?: boolean; // lump-sum: ignore qty multiplier
};

type ProductLite = {
  id: string;
  name: string;
  stock: number | null;
  cost_price: number | null;
};

export type ConvertWishlist = {
  id: string;
  shop_id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string | null;
};

export function ConvertWishlistToSaleDialog({
  open,
  onOpenChange,
  wishlist,
  items,
  onConverted,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  wishlist: ConvertWishlist | null;
  items: ConvertItem[];
  onConverted: () => void;
}) {
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [paid, setPaid] = useState<string>("");
  const [discount, setDiscount] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // Only sell items that are fulfilled (পেয়েছে) AND have a price
  const sellable = useMemo(() => {
    return items.filter((it) => {
      const fs = it.fulfillment_status ?? (it.done ? "fulfilled" : "pending");
      return fs === "fulfilled" && it.price != null && Number(it.price) > 0;
    });
  }, [items]);

  const total = useMemo(() => {
    return sellable.reduce((s, it) => {
      const q = Number(it.qty) || 0;
      const pr = Number(it.price) || 0;
      return s + (it.lump || !q ? pr : q * pr);
    }, 0);
  }, [sellable]);

  const skipped = items.length - sellable.length;

  const discountAmt = Math.max(0, Math.min(Number(discount) || 0, total));
  const grandTotal = Math.max(0, total - discountAmt);
  const paidAmtPreview = Number(paid) || 0;
  const previewDue = Math.max(0, grandTotal - paidAmtPreview);

  const handleConvert = async () => {
    if (!wishlist) return;
    if (sellable.length === 0) {
      toast.error("কোনো বিক্রয়যোগ্য আইটেম নেই — '✓ পেয়েছে' মার্ক করুন এবং দাম দিন");
      return;
    }
    setSubmitting(true);
    try {
      // 1. find or create customer by phone
      let customerId: string | null = null;
      if (wishlist.customer_phone) {
        const { data: existing } = await supabase
          .from("customers")
          .select("id")
          .eq("shop_id", wishlist.shop_id)
          .eq("phone", wishlist.customer_phone)
          .is("deleted_at", null)
          .maybeSingle();
        if (existing) {
          customerId = (existing as { id: string }).id;
        } else {
          const { data: created, error: ce } = await supabase
            .from("customers")
            .insert({
              shop_id: wishlist.shop_id,
              name: wishlist.customer_name,
              phone: wishlist.customer_phone,
              address: wishlist.customer_address,
            })
            .select("id")
            .single();
          if (ce) throw ce;
          customerId = (created as { id: string }).id;
        }
      }

      const paidAmt = Number(paid) || 0;
      const finalTotal = Math.max(0, total - discountAmt);
      const due = Math.max(finalTotal - paidAmt, 0);

      const { data: products } = await supabase
        .from("products")
        .select("id,name,stock,cost_price")
        .eq("shop_id", wishlist.shop_id)
        .is("deleted_at", null);
      const productByName = new Map(
        ((products ?? []) as ProductLite[]).map((p) => [p.name.trim().toLowerCase(), p]),
      );

      // 2. create sale
      const { data: sale, error: se } = await supabase
        .from("sales")
        .insert({
          shop_id: wishlist.shop_id,
          customer_id: customerId,
          subtotal: total,
          discount: discountAmt,
          total: finalTotal,
          paid: paidAmt,
          due,
          payment_method: paymentMethod,
          note: `গ্রাহক ফর্দ থেকে রূপান্তরিত (${wishlist.customer_name})`,
        } as never)
        .select("id")
        .single();
      if (se) throw se;
      const saleId = (sale as { id: string }).id;

      // 3. create sale items. If a fordo item name matches a product exactly,
      // link it so product/stock reports and stock reduction work like POS sales.
      const rows = sellable.map((it) => {
        const q = Number(it.qty) || 0;
        const pr = Number(it.price) || 0;
        const lineTotal = it.lump || !q ? pr : q * pr;
        const product = productByName.get(it.name.trim().toLowerCase()) ?? null;
        return {
          sale_id: saleId,
          product_id: product?.id ?? null,
          name: it.name + (it.unit ? ` (${it.qty ?? ""} ${it.unit})` : ""),
          qty: q || 1,
          price: q > 0 && !it.lump ? pr : pr,
          cost: Number(product?.cost_price ?? 0),
          total: lineTotal,
          item_type: "product",
        };
      });
      const { error: ie } = await supabase.from("sale_items").insert(rows as never);
      if (ie) throw ie;

      for (const row of rows) {
        if (!row.product_id) continue;
        const product = productByName.get(row.name.replace(/\s+\([^)]*\)$/, "").trim().toLowerCase());
        const qty = Number(row.qty) || 0;
        await supabase.from("stock_movements").insert({
          shop_id: wishlist.shop_id,
          product_id: row.product_id,
          qty,
          type: "out",
          ref_table: "sales",
          ref_id: saleId,
          note: "fordo sale",
        });
        if (product) {
          await supabase
            .from("products")
            .update({ stock: Math.max(0, Number(product.stock ?? 0) - qty) } as never)
            .eq("id", row.product_id);
        }
      }

      // 4. update customer due balance
      if (customerId && due > 0) {
        const { data: c } = await supabase
          .from("customers")
          .select("due_balance")
          .eq("id", customerId)
          .maybeSingle();
        const cur = Number((c as { due_balance: number } | null)?.due_balance ?? 0);
        await supabase
          .from("customers")
          .update({ due_balance: cur + due } as never)
          .eq("id", customerId);
      }

      // 5. mark wishlist as converted
      await supabase
        .from("customer_wishlists")
        .update({ status: "done", converted_sale_id: saleId } as never)
        .eq("id", wishlist.id);

      // record discount as adjustment history too
      if (discountAmt > 0) {
        await supabase.from("sale_adjustments").insert({
          shop_id: wishlist.shop_id,
          sale_id: saleId,
          customer_id: customerId,
          type: "discount",
          amount: discountAmt,
          note: "ফর্দ রূপান্তরে ডিসকাউন্ট",
        });
      }

      toast.success(`বিক্রয় তৈরি হয়েছে — মোট ৳${finalTotal.toLocaleString(getNumLocale())}`);
      onConverted();
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            বিক্রয়ে রূপান্তর
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {wishlist && (
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <div className="font-semibold">{wishlist.customer_name}</div>
              <div className="text-xs text-muted-foreground">{wishlist.customer_phone}</div>
            </div>
          )}

          <div className="rounded-lg border bg-background">
            <div className="border-b px-3 py-2 text-xs font-bold text-muted-foreground">
              বিক্রয় হবে ({sellable.length}টি আইটেম)
              {skipped > 0 && (
                <span className="ml-2 text-amber-600">
                  • {skipped}টি বাদ (✓ মার্ক বা দাম নেই)
                </span>
              )}
            </div>
            <ul className="max-h-40 divide-y overflow-auto text-sm">
              {sellable.length === 0 && (
                <li className="px-3 py-3 text-center text-xs text-muted-foreground">
                  আগে items "পেয়েছে" mark করুন এবং দাম বসান
                </li>
              )}
              {sellable.map((it) => {
                const q = Number(it.qty) || 0;
                const pr = Number(it.price) || 0;
                const line = it.lump || !q ? pr : q * pr;
                return (
                  <li key={it.id} className="flex items-center justify-between px-3 py-1.5">
                    <span className="truncate">
                      {it.name}
                      {q > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {" "}— {q} {it.unit ?? ""}
                          {it.lump && " (একসাথে)"}
                        </span>
                      )}
                    </span>
                    <span className="ml-2 flex-none font-mono text-xs">৳{line.toLocaleString(getNumLocale())}</span>
                  </li>
                );
              })}
            </ul>
            <div className="flex items-center justify-between border-t bg-muted/40 px-3 py-2">
              <span className="text-sm font-semibold">মোট</span>
              <span className="text-base font-extrabold tabular-nums text-primary">
                ৳ {total.toLocaleString(getNumLocale())}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">পেমেন্ট মেথড</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">নগদ</SelectItem>
                  <SelectItem value="bkash">bKash</SelectItem>
                  <SelectItem value="nagad">Nagad</SelectItem>
                  <SelectItem value="rocket">Rocket</SelectItem>
                  <SelectItem value="bank">ব্যাংক</SelectItem>
                  <SelectItem value="due">বাকি</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">পরিশোধিত</Label>
              <Input
                value={paid}
                onChange={(e) => setPaid(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder={String(grandTotal)}
                inputMode="decimal"
                className="h-9 text-right tabular-nums"
              />
            </div>
          </div>

          <div className="rounded-lg border p-3 space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              <BadgePercent className="h-3.5 w-3.5 text-primary" />
              ডিসকাউন্ট (ঐচ্ছিক)
            </Label>
            <Input
              value={discount}
              onChange={(e) => setDiscount(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="0"
              inputMode="decimal"
              className="h-9 text-right tabular-nums"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>মোট ছাড়ের পর</span>
              <span className="font-bold text-primary">৳ {grandTotal.toLocaleString(getNumLocale())}</span>
            </div>
          </div>

          {paid && previewDue > 0 && (
            <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
              বাকি থাকবে: <b>৳{previewDue.toLocaleString(getNumLocale())}</b> — গ্রাহকের due-তে যোগ হবে
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            বাতিল
          </Button>
          <Button onClick={handleConvert} disabled={submitting || sellable.length === 0}>
            {submitting && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            বিক্রয় তৈরি করুন
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}