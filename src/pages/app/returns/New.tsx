import { useNavigate } from "@/lib/router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/lib/shop";
import { useI18n, fmtMoney } from "@/lib/i18n";
import { PageHeader } from "@/components/app/PageHeader";
import { RequirePerm } from "@/components/app/RequirePerm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, ChevronDown } from "lucide-react";
import { toast } from "sonner";



type Item = { product_id: string | null; name: string; qty: number; price: number };

const REASONS = [
  { v: "damaged", bn: "ক্ষতিগ্রস্ত / নষ্ট", en: "Damaged" },
  { v: "wrong_item", bn: "ভুল পণ্য", en: "Wrong item" },
  { v: "expired", bn: "মেয়াদোত্তীর্ণ", en: "Expired" },
  { v: "customer_changed", bn: "গ্রাহক পরিবর্তন করেছেন", en: "Customer changed mind" },
  { v: "quality_issue", bn: "গুণগত সমস্যা", en: "Quality issue" },
  { v: "other", bn: "অন্যান্য", en: "Other" },
];

function NewReturnPage() {
  const { lang } = useI18n();
  const { current } = useShop();
  const nav = useNavigate();

  const [saleSearch, setSaleSearch] = useState("");
  const [pickedSaleId, setPickedSaleId] = useState<string | null>(null);
  const [pickedSale, setPickedSale] = useState<any | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [reason, setReason] = useState<string>("damaged");
  const [reasonNote, setReasonNote] = useState("");
  const [refundStatus, setRefundStatus] = useState<"refunded" | "pending" | "adjusted_to_due">("refunded");
  const [refundMethod, setRefundMethod] = useState<string>("cash");
  const [restock, setRestock] = useState(true);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  // Sale picker
  const { data: saleHits } = useQuery({
    queryKey: ["return-sale-search", current?.id, saleSearch],
    enabled: !!current?.id && saleSearch.trim().length >= 1,
    queryFn: async () => {
      const q = saleSearch.trim();
      const { data } = await supabase
        .from("sales")
        .select("id,invoice_no,customer_id,total,created_at")
        .eq("shop_id", current!.id)
        .is("deleted_at", null)
        .or(`invoice_no.ilike.%${q}%`)
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  // Product list for ad-hoc add
  const { data: products } = useQuery({
    queryKey: ["return-products", current?.id],
    enabled: !!current?.id && !pickedSaleId,
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id,name,sale_price")
        .eq("shop_id", current!.id)
        .is("deleted_at", null)
        .order("name");
      return (data ?? []) as { id: string; name: string; sale_price: number }[];
    },
  });

  async function selectSale(id: string) {
    const { data: sale } = await supabase.from("sales").select("id,invoice_no,customer_id,total,created_at").eq("id", id).maybeSingle();
    setPickedSaleId(id);
    setPickedSale(sale);
    const { data: lines } = await supabase.from("sale_items").select("product_id,name,qty,price").eq("sale_id", id);
    setItems(((lines ?? []) as any[]).map((l) => ({ product_id: l.product_id, name: l.name, qty: Number(l.qty), price: Number(l.price) })));
    setSaleSearch("");
  }

  function clearSale() {
    setPickedSaleId(null); setPickedSale(null); setItems([]);
  }

  function addBlankRow() {
    setItems((p) => [...p, { product_id: null, name: "", qty: 1, price: 0 }]);
  }
  function pickProduct(idx: number, productId: string) {
    const p = (products ?? []).find((x) => x.id === productId);
    if (!p) return;
    setItems((arr) => arr.map((it, i) => i === idx ? { ...it, product_id: p.id, name: p.name, price: Number(p.sale_price ?? 0) } : it));
  }
  function updateRow(idx: number, patch: Partial<Item>) {
    setItems((arr) => arr.map((it, i) => i === idx ? { ...it, ...patch } : it));
  }
  function removeRow(idx: number) {
    setItems((arr) => arr.filter((_, i) => i !== idx));
  }

  const total = useMemo(() => items.reduce((a, it) => a + Number(it.qty || 0) * Number(it.price || 0), 0), [items]);
  const [refundAmount, setRefundAmount] = useState<string>("");
  useEffect(() => { setRefundAmount(String(total.toFixed(2))); }, [total]);

  async function onSave() {
    if (!current?.id) return;
    if (items.length === 0) { toast.error(lang === "bn" ? "অন্তত একটি পণ্য যোগ করুন" : "Add at least one item"); return; }
    if (items.some((it) => !it.name.trim() || Number(it.qty) <= 0)) { toast.error(lang === "bn" ? "প্রতিটি লাইনে পণ্য ও পরিমাণ দিন" : "Fill in every line"); return; }
    setSaving(true);
    try {
      // Generate return number: R-{count+1 padded}
      const { count } = await supabase.from("sale_returns").select("id", { count: "exact", head: true }).eq("shop_id", current.id);
      const nextNo = `R-${String((count ?? 0) + 1).padStart(4, "0")}`;

      const refundAmt = Number(refundAmount || 0);
      const { data: ret, error } = await supabase
        .from("sale_returns")
        .insert({
          shop_id: current.id,
          sale_id: pickedSaleId,
          customer_id: pickedSale?.customer_id ?? null,
          return_no: nextNo,
          reason,
          reason_note: reasonNote || null,
          total,
          refund_amount: refundAmt,
          refund_method: refundMethod as any,
          refund_status: refundStatus,
          restock,
          note: note || null,
          created_by: (await supabase.auth.getUser()).data.user?.id ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;
      const returnId = ret!.id as string;

      // Items
      const itemsPayload = items.map((it) => ({
        return_id: returnId,
        product_id: it.product_id,
        name: it.name,
        qty: Number(it.qty),
        price: Number(it.price),
        total: Number(it.qty) * Number(it.price),
      }));
      const { error: itErr } = await supabase.from("sale_return_items").insert(itemsPayload);
      if (itErr) throw itErr;

      // Restock products
      if (restock) {
        for (const it of items) {
          if (!it.product_id) continue;
          const { data: prod } = await supabase.from("products").select("stock").eq("id", it.product_id).maybeSingle();
          const newStock = Number(prod?.stock ?? 0) + Number(it.qty);
          await supabase.from("products").update({ stock: newStock }).eq("id", it.product_id);
        }
      }

      // Cash out for refund
      if (refundStatus === "refunded" && refundAmt > 0 && refundMethod === "cash") {
        await supabase.from("cash_movements").insert({
          shop_id: current.id,
          direction: "out",
          amount: refundAmt,
          note: `Return ${nextNo}`,
          ref_table: "sale_returns",
          ref_id: returnId,
          denominations: {},
        });
      }

      // Adjust to due (reduce customer's due_balance)
      if (refundStatus === "adjusted_to_due" && refundAmt > 0 && pickedSale?.customer_id) {
        const { data: c } = await supabase.from("customers").select("due_balance").eq("id", pickedSale.customer_id).maybeSingle();
        const newDue = Math.max(0, Number(c?.due_balance ?? 0) - refundAmt);
        await supabase.from("customers").update({ due_balance: newDue }).eq("id", pickedSale.customer_id);
      }

      toast.success(lang === "bn" ? "রিটার্ন সংরক্ষিত হয়েছে" : "Return saved");
      nav({ to: "/app/returns" });
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-full bg-muted/30">
      <PageHeader breadcrumb={lang === "bn" ? "প্রোডাক্ট রিটার্ন" : "Product Return"} title={lang === "bn" ? "নতুন রিটার্ন" : "New return"} />
      <div className="container space-y-3 px-3 py-3 md:space-y-4 md:px-4 md:py-4">

        {/* Sale picker */}
        <div className="rounded-xl border bg-background p-3 md:p-4">
          <Label className="text-xs">{lang === "bn" ? "মূল ইনভয়েস (ঐচ্ছিক)" : "Original invoice (optional)"}</Label>
          {pickedSale ? (
            <div className="mt-2 flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
              <div>
                <div className="text-sm font-bold">{pickedSale.invoice_no ?? pickedSale.id.slice(0, 6)}</div>
                <div className="text-xs text-muted-foreground">{fmtMoney(Number(pickedSale.total ?? 0), lang)} · {new Date(pickedSale.created_at).toLocaleDateString("en-GB")}</div>
              </div>
              <Button variant="ghost" className="h-9 gap-2" onClick={clearSale}>{lang === "bn" ? "মুছুন" : "Clear"}</Button>
            </div>
          ) : (
            <>
              <Input className="mt-2" placeholder={lang === "bn" ? "ইনভয়েস নং দিয়ে খুঁজুন" : "Search invoice no"} value={saleSearch} onChange={(e) => setSaleSearch(e.target.value)} />
              {(saleHits?.length ?? 0) > 0 && (
                <ul className="mt-1 max-h-48 overflow-auto rounded-md border bg-background">
                  {(saleHits ?? []).map((s: any) => (
                    <li key={s.id}>
                      <button type="button" className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted/40" onClick={() => selectSale(s.id)}>
                        <span className="font-semibold">{s.invoice_no ?? s.id.slice(0, 6)}</span>
                        <span className="text-xs text-muted-foreground">{fmtMoney(Number(s.total), lang)} · {new Date(s.created_at).toLocaleDateString("en-GB")}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-1 text-[11px] text-muted-foreground">{lang === "bn" ? "ওয়াক-ইন রিটার্নের জন্য ফাঁকা রাখুন।" : "Leave empty for walk-in returns."}</p>
            </>
          )}
        </div>

        {/* Items */}
        <div className="rounded-xl border bg-background p-3 md:p-4">
          <div className="mb-2 flex items-center justify-between">
            <Label className="text-sm font-bold">{lang === "bn" ? "ফেরত আসা পণ্য" : "Returned items"}</Label>
            <Button variant="outline" className="h-10 gap-2" onClick={addBlankRow}><Plus className="h-4 w-4" />{lang === "bn" ? "যোগ" : "Add"}</Button>
          </div>
          {items.length === 0 ? (
            <div className="py-4 text-center text-xs text-muted-foreground">{lang === "bn" ? "কোনো পণ্য নেই" : "No items"}</div>
          ) : (
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 rounded-lg border p-2">
                  <div className="col-span-12 md:col-span-5">
                    {pickedSaleId || it.product_id ? (
                      <Input value={it.name} onChange={(e) => updateRow(idx, { name: e.target.value })} placeholder={lang === "bn" ? "পণ্যের নাম" : "Product name"} />
                    ) : (
                      <Select value={it.product_id ?? ""} onValueChange={(v) => pickProduct(idx, v)}>
                        <SelectTrigger><SelectValue placeholder={lang === "bn" ? "পণ্য বাছুন" : "Pick product"} /></SelectTrigger>
                        <SelectContent>
                          {(products ?? []).map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <div className="col-span-5 md:col-span-3">
                    <Input type="number" min={0} step="any" value={it.qty} onChange={(e) => updateRow(idx, { qty: Number(e.target.value) })} placeholder={lang === "bn" ? "পরিমাণ" : "Qty"} />
                  </div>
                  <div className="col-span-5 md:col-span-3">
                    <Input type="number" min={0} step="any" value={it.price} onChange={(e) => updateRow(idx, { price: Number(e.target.value) })} placeholder={lang === "bn" ? "একক মূল্য" : "Unit price"} />
                  </div>
                  <div className="col-span-2 md:col-span-1 flex items-center justify-end">
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-600" onClick={() => removeRow(idx)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 flex items-center justify-between border-t pt-2">
            <span className="text-sm font-bold">{lang === "bn" ? "মোট রিটার্ন মূল্য" : "Total"}</span>
            <span className="text-base font-extrabold">{fmtMoney(total, lang)}</span>
          </div>
        </div>

        {/* Reason */}
        <div className="rounded-xl border bg-background p-3 md:p-4">
          <Label className="text-xs">{lang === "bn" ? "ফেরতের কারণ" : "Reason"}</Label>
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {REASONS.map((r) => (
                <SelectItem key={r.v} value={r.v}>{lang === "bn" ? r.bn : r.en}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea className="mt-2" rows={2} placeholder={lang === "bn" ? "অতিরিক্ত নোট (ঐচ্ছিক)" : "Additional note (optional)"} value={reasonNote} onChange={(e) => setReasonNote(e.target.value)} />
        </div>

        {/* Refund */}
        <div className="rounded-xl border bg-background p-3 md:p-4 space-y-3">
          <Label className="text-sm font-bold">{lang === "bn" ? "টাকা ফেরত" : "Refund"}</Label>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <div>
              <Label className="text-[11px] text-muted-foreground">{lang === "bn" ? "ফেরতের পরিমাণ" : "Refund amount"}</Label>
              <Input type="number" min={0} step="any" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">{lang === "bn" ? "অবস্থা" : "Status"}</Label>
              <Select value={refundStatus} onValueChange={(v) => setRefundStatus(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="refunded">{lang === "bn" ? "এখনই ফেরত দিচ্ছি" : "Refund now"}</SelectItem>
                  <SelectItem value="adjusted_to_due">{lang === "bn" ? "বাকিতে সমন্বয়" : "Adjust to due"}</SelectItem>
                  <SelectItem value="pending">{lang === "bn" ? "অপেক্ষমান" : "Pending"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">{lang === "bn" ? "মাধ্যম" : "Method"}</Label>
              <Select value={refundMethod} onValueChange={setRefundMethod} disabled={refundStatus !== "refunded"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">{lang === "bn" ? "নগদ" : "Cash"}</SelectItem>
                  <SelectItem value="bkash">bKash</SelectItem>
                  <SelectItem value="nagad">Nagad</SelectItem>
                  <SelectItem value="rocket">Rocket</SelectItem>
                  <SelectItem value="bank">{lang === "bn" ? "ব্যাংক" : "Bank"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {refundStatus === "refunded" && refundMethod === "cash" && (
            <p className="text-[11px] text-rose-600">
              {lang === "bn" ? "এই টাকা স্বয়ংক্রিয়ভাবে ক্যাশবক্স থেকে কেটে নেওয়া হবে।" : "This amount will be deducted from cash automatically."}
            </p>
          )}
          {refundStatus === "adjusted_to_due" && !pickedSale?.customer_id && (
            <p className="text-[11px] text-amber-600">
              {lang === "bn" ? "মূল ইনভয়েসে কোনো কাস্টমার নেই — বাকিতে সমন্বয় হবে না।" : "No customer on the sale — adjustment will be skipped."}
            </p>
          )}

          <div className="flex items-center justify-between rounded-lg border p-2">
            <div>
              <div className="text-sm font-semibold">{lang === "bn" ? "স্টকে যোগ করুন" : "Restock items"}</div>
              <div className="text-[11px] text-muted-foreground">{lang === "bn" ? "ফেরত আসা পণ্য আবার স্টকে যোগ হবে" : "Returned qty added back to stock"}</div>
            </div>
            <Switch checked={restock} onCheckedChange={setRestock} />
          </div>

          <Textarea rows={2} placeholder={lang === "bn" ? "অভ্যন্তরীণ নোট (ঐচ্ছিক)" : "Internal note (optional)"} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" className="h-10 gap-2 flex-1 sm:flex-none" onClick={() => nav({ to: "/app/returns" })}>
            {lang === "bn" ? "বাতিল" : "Cancel"}
          </Button>
          <Button className="h-10 gap-2 flex-1 sm:flex-none" onClick={onSave} disabled={saving}>
            {saving ? "…" : (lang === "bn" ? "সংরক্ষণ" : "Save")}
          </Button>
        </div>
        <ChevronDown className="hidden" />
      </div>
    </div>
  );
}
export default NewReturnPage;
