import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, Search, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getNumLocale, useI18n, fmtMoney } from "@/lib/i18n";
import { InvoiceDialog, type InvoiceData } from "@/components/app/InvoiceDialog";

export type CompleteBooking = {
  id: string;
  shop_id: string;
  service_id: string;
  service_name: string;
  service_price: number;
  customer_name: string;
  customer_phone: string;
  customer_address: string | null;
  advance_amount: number;
  advance_paid: boolean;
};

type ProductRow = { id: string; name: string; sale_price: number; stock: number };
type Line = { kind: "service"; name: string; qty: number; price: number; service_id: string }
  | { kind: "product"; product_id: string | null; name: string; qty: number; price: number };

export function CompleteServiceDialog({
  open,
  onClose,
  booking,
  shop,
  onCompleted,
}: {
  open: boolean;
  onClose: () => void;
  booking: CompleteBooking | null;
  shop: { id: string; name: string; address: string | null; phone: string | null; logo_url: string | null };
  onCompleted: () => void;
}) {
  const { lang, t } = useI18n();
  const [serviceCharge, setServiceCharge] = useState(0);
  const [extras, setExtras] = useState<Line[]>([]);
  const [discount, setDiscount] = useState(0);
  const [paid, setPaid] = useState(0);
  const [additionalCost, setAdditionalCost] = useState(0);
  const [additionalCostNote, setAdditionalCostNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bkash" | "nagad" | "rocket" | "card" | "bank">("cash");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<ProductRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);

  useEffect(() => {
    if (!open || !booking) return;
    setServiceCharge(Number(booking.service_price) || 0);
    setExtras([]);
    setDiscount(0);
    setAdditionalCost(0);
    setAdditionalCostNote("");
    setPaymentMethod("cash");
    setSearch("");
    setResults([]);
    // Default paid = expected total minus advance (assume customer pays remaining)
    setPaid(Math.max(0, Number(booking.service_price) - (booking.advance_paid ? Number(booking.advance_amount) : 0)));
  }, [open, booking]);

  // Search products
  useEffect(() => {
    if (!open || !booking) return;
    const q = search.trim();
    if (q.length < 2) { setResults([]); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("products")
        .select("id,name,sale_price,stock")
        .eq("shop_id", booking.shop_id)
        .is("deleted_at", null)
        .ilike("name", `%${q}%`)
        .limit(10);
      setResults((data ?? []) as ProductRow[]);
      setSearching(false);
    }, 250);
    return () => clearTimeout(t);
  }, [search, open, booking]);

  const totals = useMemo(() => {
    if (!booking) return { subtotal: 0, total: 0, due: 0, advance: 0 };
    const subtotal = serviceCharge + extras.reduce((a, l) => a + l.qty * l.price, 0);
    const advance = booking.advance_paid ? Number(booking.advance_amount) || 0 : 0;
    const total = Math.max(0, subtotal - discount);
    const remaining = Math.max(0, total - advance);
    const due = Math.max(0, remaining - paid);
    return { subtotal, total, due, advance };
  }, [serviceCharge, extras, discount, paid, booking]);

  const addExtra = (p: ProductRow) => {
    if (extras.find((e) => e.kind === "product" && e.product_id === p.id)) {
      toast.message(t("p4_AlreadyAdded"));
      return;
    }
    setExtras((es) => [...es, { kind: "product", product_id: p.id, name: p.name, qty: 1, price: Number(p.sale_price) || 0 }]);
    setSearch("");
    setResults([]);
  };
  const addCustom = () => {
    const name = search.trim();
    if (!name) return;
    setExtras((es) => [...es, { kind: "product", product_id: null, name, qty: 1, price: 0 }]);
    setSearch("");
  };
  const updateExtra = (i: number, patch: Partial<Line>) => {
    setExtras((es) => es.map((l, idx) => (idx === i ? { ...l, ...patch } as Line : l)));
  };
  const removeExtra = (i: number) => setExtras((es) => es.filter((_, idx) => idx !== i));

  const submit = async () => {
    if (!booking) return;
    setSubmitting(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const userId = u?.user?.id ?? null;

      // Find or create customer
      let customerId: string | null = null;
      const phoneClean = booking.customer_phone.trim();
      if (phoneClean) {
        const { data: existing } = await supabase
          .from("customers")
          .select("id")
          .eq("shop_id", booking.shop_id)
          .eq("phone", phoneClean)
          .maybeSingle();
        if (existing) customerId = (existing as { id: string }).id;
        else {
          const { data: created, error: ce } = await supabase
            .from("customers")
            .insert({
              shop_id: booking.shop_id,
              name: booking.customer_name,
              phone: phoneClean,
              address: booking.customer_address,
            })
            .select("id")
            .single();
          if (ce) throw ce;
          customerId = (created as { id: string }).id;
        }
      }

      // Create sale
      const subtotal = totals.subtotal;
      const total = totals.total;
      const advance = totals.advance;
      // Payment recorded into accounts = advance (already received) + paid now
      const paidTotal = advance + paid;
      const due = Math.max(0, total - paidTotal);

      const { data: sale, error: eS } = await supabase
        .from("sales")
        .insert({
          shop_id: booking.shop_id,
          customer_id: customerId,
          subtotal,
          discount,
          tax: 0,
          total,
          paid: paidTotal,
          due,
          payment_method: paymentMethod,
          status: "completed",
          note: `Service: ${booking.service_name}`,
          created_by: userId,
        })
        .select("id")
        .single();
      if (eS) throw eS;
      const saleId = (sale as { id: string }).id;

      // Sale items
      type SaleItemInsert = {
        sale_id: string;
        product_id: string | null;
        service_id: string | null;
        item_type: string;
        name: string;
        qty: number;
        price: number;
        total: number;
      };
      const items: SaleItemInsert[] = [];
      items.push({
        sale_id: saleId,
        product_id: null,
        service_id: booking.service_id,
        item_type: "service",
        name: booking.service_name,
        qty: 1,
        price: serviceCharge,
        total: serviceCharge,
      });
      for (const l of extras) {
        if (l.kind === "product") {
          items.push({
            sale_id: saleId,
            product_id: l.product_id,
            service_id: null,
            item_type: "product",
            name: l.name,
            qty: l.qty,
            price: l.price,
            total: l.qty * l.price,
          });
        }
      }
      const { error: eI } = await supabase.from("sale_items").insert(items);
      if (eI) throw eI;

      // Decrement stock for stocked products
      for (const l of extras) {
        if (l.kind === "product" && l.product_id) {
          await supabase.from("stock_movements").insert({
            shop_id: booking.shop_id,
            product_id: l.product_id,
            qty: l.qty,
            type: "out",
            ref_table: "sales",
            ref_id: saleId,
            note: "service-extra",
            created_by: userId,
          });
          const { data: prod } = await supabase.from("products").select("stock").eq("id", l.product_id).single();
          if (prod) {
            await supabase
              .from("products")
              .update({ stock: Math.max(0, Number((prod as { stock: number }).stock) - l.qty) })
              .eq("id", l.product_id);
          }
        }
      }

      // Cash movements: only the "paid now" amount creates new cash-in (advance was recorded earlier when received).
      if (paid > 0) {
        await supabase.from("cash_movements").insert({
          shop_id: booking.shop_id,
          direction: "in",
          amount: paid,
          note: `service ${saleId}`,
          ref_table: "sales",
          ref_id: saleId,
          created_by: userId,
        });
      }
      if (due > 0 && customerId) {
        const { data: cur } = await supabase.from("customers").select("due_balance").eq("id", customerId).single();
        await supabase
          .from("customers")
          .update({ due_balance: (Number((cur as { due_balance: number } | null)?.due_balance ?? 0)) + due })
          .eq("id", customerId);
      }

      // Warranty (look up service warranty config)
      const { data: svc } = await supabase
        .from("services")
        .select("warranty_enabled,warranty_value,warranty_unit")
        .eq("id", booking.service_id)
        .maybeSingle();
      if (svc && (svc as { warranty_enabled: boolean }).warranty_enabled) {
        const v = Number((svc as { warranty_value: number | null }).warranty_value ?? 0);
        const unit = (svc as { warranty_unit: string | null }).warranty_unit ?? "days";
        if (v > 0) {
          const now = new Date();
          const exp = new Date(now);
          if (unit === "days") exp.setDate(exp.getDate() + v);
          else if (unit === "months") exp.setMonth(exp.getMonth() + v);
          else if (unit === "years") exp.setFullYear(exp.getFullYear() + v);
          await supabase.from("service_warranties").insert({
            shop_id: booking.shop_id,
            service_id: booking.service_id,
            sale_id: saleId,
            customer_id: customerId,
            customer_name: booking.customer_name,
            customer_phone: booking.customer_phone,
            starts_at: now.toISOString(),
            expires_at: exp.toISOString(),
            status: "active",
          });
        }
      }

      // Update booking
      await supabase
        .from("service_bookings")
        .update({
          status: "completed",
          sale_id: saleId,
          completed_at: new Date().toISOString(),
          final_amount: total,
          discount_amount: discount,
        })
        .eq("id", booking.id);

      // Additional cost — record as an expense tied to this service
      if (additionalCost > 0) {
        await supabase.from("expenses").insert({
          shop_id: booking.shop_id,
          category: lang === "bn" ? "সার্ভিস খরচ" : "Service cost",
          amount: additionalCost,
          note: `${booking.service_name}${additionalCostNote ? " — " + additionalCostNote : ""} (sale ${saleId.slice(0, 8)})`,
          paid_via: paymentMethod,
          created_by: userId,
        });
      }

      toast.success(t("p4_ServiceCompletedInv"));
      onCompleted();

      // Show invoice
      const invoiceItems = [
        { name: booking.service_name + (t("p4_ServiceChargeParen")), qty: 1, unit: "service", price: serviceCharge, total: serviceCharge },
        ...extras.map((l) => ({ name: l.name, qty: l.qty, unit: null, price: l.price, total: l.qty * l.price })),
      ];
      setInvoice({
        mode: "sell",
        shop: { name: shop.name, address: shop.address, phone: shop.phone, logo_url: shop.logo_url },
        party: { name: booking.customer_name, phone: booking.customer_phone, address: booking.customer_address },
        invoiceNo: saleId.slice(0, 8).toUpperCase(),
        date: new Date().toISOString(),
        items: invoiceItems,
        subtotal,
        discount,
        delivery: 0,
        grandTotal: total,
        paid: paidTotal,
        previousDue: 0,
        currentDue: due,
      });
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!booking) return (
    <InvoiceDialog open={!!invoice} onClose={() => setInvoice(null)} data={invoice} />
  );

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Wrench className="h-5 w-5" /> {t("p4_CompleteService")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <div className="font-semibold">{booking.service_name}</div>
              <div className="text-xs text-muted-foreground">{booking.customer_name} • {booking.customer_phone}</div>
              <div className="mt-1 text-xs">{t("p4_BookedPrice")}: <strong>{fmtMoney(booking.service_price, lang)}</strong></div>
              {booking.advance_paid && booking.advance_amount > 0 && (
                <div className="text-xs text-emerald-700 dark:text-emerald-400">
                  {t("p4_AdvancePaid")}: {fmtMoney(booking.advance_amount, lang)}
                </div>
              )}
            </div>

            <div>
              <Label>{t("p4_FinalServiceCharge")}</Label>
              <Input type="number" inputMode="decimal" value={serviceCharge} onChange={(e) => setServiceCharge(Math.max(0, Number(e.target.value) || 0))} />
              <p className="mt-1 text-xs text-muted-foreground">{t("p4_UpdateChargeHint")}</p>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label>{t("p4_ExtraProducts")}</Label>
                <span className="text-xs text-muted-foreground">{extras.length} {t("p4_Items")}</span>
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("p4_SearchOrType")} className="pl-9" />
                {results.length > 0 && (
                  <div className="absolute left-0 right-0 z-10 mt-1 max-h-56 overflow-y-auto rounded-md border bg-popover shadow-lg">
                    {results.map((p) => (
                      <button key={p.id} type="button" onClick={() => addExtra(p)} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent">
                        <span className="truncate">{p.name}</span>
                        <span className="text-xs text-muted-foreground">৳{p.sale_price} • {t("p4_StockLower")}: {p.stock}</span>
                      </button>
                    ))}
                  </div>
                )}
                {search.trim().length >= 2 && !searching && results.length === 0 && (
                  <button type="button" onClick={addCustom} className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                    <Plus className="h-3 w-3" /> {t("p4_AddXCustom", { name: search.trim() })}
                  </button>
                )}
                {searching && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
              </div>

              {extras.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {extras.map((l, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-md border p-2">
                      <div className="min-w-0 flex-1 truncate text-sm">{l.name}</div>
                      <Input className="h-8 w-16" type="number" value={l.qty} onChange={(e) => updateExtra(i, { qty: Math.max(1, Number(e.target.value) || 1) })} />
                      <span className="text-xs text-muted-foreground">×</span>
                      <Input className="h-8 w-24" type="number" value={l.price} onChange={(e) => updateExtra(i, { price: Math.max(0, Number(e.target.value) || 0) })} />
                      <span className="w-20 text-right text-sm font-semibold">৳{(l.qty * l.price).toLocaleString(getNumLocale())}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeExtra(i)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("p4_DiscountTk")}</Label>
                <Input type="number" value={discount} onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))} />
              </div>
              <div>
                <Label>{t("p4_PaidNow")}</Label>
                <Input type="number" value={paid} onChange={(e) => setPaid(Math.max(0, Number(e.target.value) || 0))} />
              </div>
            </div>

            <div className="rounded-md border bg-amber-50/40 dark:bg-amber-950/20 p-3">
              <Label className="text-xs font-semibold">
                {lang === "bn" ? "অতিরিক্ত খরচ (পার্টস/লেবার)" : "Additional cost (parts/labor)"}
              </Label>
              <div className="mt-1 grid grid-cols-[1fr_2fr] gap-2">
                <Input
                  type="number"
                  inputMode="decimal"
                  value={additionalCost}
                  onChange={(e) => setAdditionalCost(Math.max(0, Number(e.target.value) || 0))}
                  placeholder="0"
                />
                <Input
                  value={additionalCostNote}
                  onChange={(e) => setAdditionalCostNote(e.target.value)}
                  placeholder={lang === "bn" ? "নোট (ঐচ্ছিক)" : "Note (optional)"}
                />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {lang === "bn" ? "এটি খরচ হিসেবে রেকর্ড হবে।" : "Recorded as an expense."}
              </p>
            </div>

            <div>
              <Label>{t("p4_PaymentMethod")}</Label>
              <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as typeof paymentMethod)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">{t("p4_Cash")}</SelectItem>
                  <SelectItem value="bkash">bKash</SelectItem>
                  <SelectItem value="nagad">Nagad</SelectItem>
                  <SelectItem value="rocket">Rocket</SelectItem>
                  <SelectItem value="card">{t("p4_Card")}</SelectItem>
                  <SelectItem value="bank">{t("p4_Bank")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <Row label={t("p4_Subtotal")} value={fmtMoney(totals.subtotal, lang)} />
              <Row label={t("p4_Discount")} value={`- ${fmtMoney(discount, lang)}`} />
              <Row label={t("p4_Total")} value={fmtMoney(totals.total, lang)} bold />
              {totals.advance > 0 && <Row label={t("p4_AdvancePaidParen")} value={`- ${fmtMoney(totals.advance, lang)}`} />}
              <Row label={t("p4_PaidNow")} value={`- ${fmtMoney(paid, lang)}`} />
              <Row label={t("p4_Due")} value={fmtMoney(totals.due, lang)} bold />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>{t("p4_Cancel")}</Button>
            <Button onClick={submit} disabled={submitting}>
              {submitting && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              {t("p4_CompleteInvoice")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <InvoiceDialog open={!!invoice} onClose={() => setInvoice(null)} data={invoice} />
    </>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between py-0.5 ${bold ? "font-bold border-t mt-1 pt-1" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}