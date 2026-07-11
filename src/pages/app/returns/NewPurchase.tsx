import { useNavigate } from "@/lib/router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/lib/shop";
import { useI18n, fmtMoney } from "@/lib/i18n";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Item = { product_id: string | null; name: string; qty: number; price: number };

const REASONS = [
  { v: "damaged", bn: "ক্ষতিগ্রস্ত / নষ্ট", en: "Damaged" },
  { v: "wrong_item", bn: "ভুল পণ্য", en: "Wrong item" },
  { v: "expired", bn: "মেয়াদোত্তীর্ণ", en: "Expired" },
  { v: "quality_issue", bn: "গুণগত সমস্যা", en: "Quality issue" },
  { v: "other", bn: "অন্যান্য", en: "Other" },
];

function NewPurchaseReturnPage() {
  const { lang, t } = useI18n();
  const { current } = useShop();
  const nav = useNavigate();

  const [purSearch, setPurSearch] = useState("");
  const [pickedPurId, setPickedPurId] = useState<string | null>(null);
  const [pickedPur, setPickedPur] = useState<{ id: string; invoice_no: string | null; supplier_id: string | null; total: number; created_at: string } | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [reason, setReason] = useState<string>("damaged");
  const [reasonNote, setReasonNote] = useState("");
  const [refundStatus, setRefundStatus] = useState<"received" | "pending" | "adjusted_to_due">("received");
  const [refundMethod, setRefundMethod] = useState<string>("cash");
  const [restock, setRestock] = useState(true);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: purHits } = useQuery({
    queryKey: ["preturn-pur-search", current?.id, purSearch],
    enabled: !!current?.id && purSearch.trim().length >= 1,
    queryFn: async () => {
      const q = purSearch.trim();
      const { data } = await supabase
        .from("purchases")
        .select("id,invoice_no,supplier_id,total,created_at")
        .eq("shop_id", current!.id)
        .is("deleted_at", null)
        .ilike("invoice_no", `%${q}%`)
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  const { data: products } = useQuery({
    queryKey: ["preturn-products", current?.id],
    enabled: !!current?.id && !pickedPurId,
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id,name,cost_price")
        .eq("shop_id", current!.id)
        .is("deleted_at", null)
        .order("name");
      return (data ?? []) as { id: string; name: string; cost_price: number }[];
    },
  });

  async function selectPurchase(id: string) {
    const { data: pur } = await supabase
      .from("purchases").select("id,invoice_no,supplier_id,total,created_at").eq("id", id).maybeSingle();
    setPickedPurId(id);
    setPickedPur(pur as any);
    const { data: lines } = await supabase.from("purchase_items").select("product_id,name,qty,price").eq("purchase_id", id);
    setItems(((lines ?? []) as any[]).map((l) => ({ product_id: l.product_id, name: l.name, qty: Number(l.qty), price: Number(l.price) })));
    setPurSearch("");
  }

  function clearPurchase() { setPickedPurId(null); setPickedPur(null); setItems([]); }
  function addBlankRow() { setItems((p) => [...p, { product_id: null, name: "", qty: 1, price: 0 }]); }
  function pickProduct(idx: number, productId: string) {
    const p = (products ?? []).find((x) => x.id === productId);
    if (!p) return;
    setItems((arr) => arr.map((it, i) => i === idx ? { ...it, product_id: p.id, name: p.name, price: Number(p.cost_price ?? 0) } : it));
  }
  function updateRow(idx: number, patch: Partial<Item>) {
    setItems((arr) => arr.map((it, i) => i === idx ? { ...it, ...patch } : it));
  }
  function removeRow(idx: number) { setItems((arr) => arr.filter((_, i) => i !== idx)); }

  const total = useMemo(() => items.reduce((a, it) => a + Number(it.qty || 0) * Number(it.price || 0), 0), [items]);
  const [refundAmount, setRefundAmount] = useState<string>("");
  useEffect(() => { setRefundAmount(String(total.toFixed(2))); }, [total]);

  async function onSave() {
    if (!current?.id) return;
    if (items.length === 0) { toast.error(lang === "bn" ? "কমপক্ষে একটি আইটেম যোগ করুন" : "Add at least one item"); return; }
    if (items.some((it) => !it.name.trim() || Number(it.qty) <= 0)) {
      toast.error(lang === "bn" ? "প্রতিটি লাইন পূরণ করুন" : "Fill every line"); return;
    }
    setSaving(true);
    try {
      const { count } = await supabase.from("purchase_returns").select("id", { count: "exact", head: true }).eq("shop_id", current.id);
      const nextNo = `PR-${String((count ?? 0) + 1).padStart(4, "0")}`;

      const refundAmt = Number(refundAmount || 0);
      const { data: ret, error } = await supabase
        .from("purchase_returns")
        .insert({
          shop_id: current.id,
          purchase_id: pickedPurId,
          supplier_id: pickedPur?.supplier_id ?? null,
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
        .select("id").single();
      if (error) throw error;
      const returnId = ret!.id as string;

      const itemsPayload = items.map((it) => ({
        return_id: returnId,
        product_id: it.product_id,
        name: it.name,
        qty: Number(it.qty),
        price: Number(it.price),
        total: Number(it.qty) * Number(it.price),
      }));
      const { error: itErr } = await supabase.from("purchase_return_items").insert(itemsPayload);
      if (itErr) throw itErr;

      // Reduce stock (goods went back to supplier)
      if (restock) {
        for (const it of items) {
          if (!it.product_id) continue;
          const { data: prod } = await supabase.from("products").select("stock").eq("id", it.product_id).maybeSingle();
          const newStock = Math.max(0, Number(prod?.stock ?? 0) - Number(it.qty));
          await supabase.from("products").update({ stock: newStock }).eq("id", it.product_id);
        }
      }

      // Cash IN — supplier refunded us in cash
      if (refundStatus === "received" && refundAmt > 0 && refundMethod === "cash") {
        await supabase.from("cash_movements").insert({
          shop_id: current.id,
          direction: "in",
          amount: refundAmt,
          note: `Purchase Return ${nextNo}`,
          ref_table: "purchase_returns",
          ref_id: returnId,
          denominations: {},
        });
      }

      // Adjust to due — reduce supplier's due_balance
      if (refundStatus === "adjusted_to_due" && refundAmt > 0 && pickedPur?.supplier_id) {
        const { data: s } = await supabase.from("suppliers").select("due_balance").eq("id", pickedPur.supplier_id).maybeSingle();
        const newDue = Math.max(0, Number(s?.due_balance ?? 0) - refundAmt);
        await supabase.from("suppliers").update({ due_balance: newDue }).eq("id", pickedPur.supplier_id);
      }

      toast.success(lang === "bn" ? "রিটার্ন সংরক্ষিত হয়েছে" : "Return saved");
      nav({ to: "/app/returns" });
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const title = lang === "bn" ? "নতুন সাপ্লায়ার রিটার্ন" : "New supplier return";

  return (
    <div className="min-h-full bg-muted/30">
      <PageHeader breadcrumb={lang === "bn" ? "সাপ্লায়ার রিটার্ন" : "Supplier Return"} title={title} />
      <div className="container space-y-3 px-3 py-3 md:space-y-4 md:px-4 md:py-4">

        <div className="rounded-xl border bg-background p-3 md:p-4">
          <Label className="text-xs">{lang === "bn" ? "মূল ক্রয় ইনভয়েস (ঐচ্ছিক)" : "Original purchase invoice (optional)"}</Label>
          {pickedPur ? (
            <div className="mt-2 flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
              <div>
                <div className="text-sm font-bold">{pickedPur.invoice_no ?? pickedPur.id.slice(0, 6)}</div>
                <div className="text-xs text-muted-foreground">{fmtMoney(Number(pickedPur.total ?? 0), lang)} · {new Date(pickedPur.created_at).toLocaleDateString("en-GB")}</div>
              </div>
              <Button variant="ghost" className="h-9 gap-2" onClick={clearPurchase}>{lang === "bn" ? "মুছুন" : "Clear"}</Button>
            </div>
          ) : (
            <>
              <Input className="mt-2" placeholder={lang === "bn" ? "ইনভয়েস নং খুঁজুন" : "Search invoice no"} value={purSearch} onChange={(e) => setPurSearch(e.target.value)} />
              {(purHits?.length ?? 0) > 0 && (
                <ul className="mt-1 max-h-48 overflow-auto rounded-md border bg-background">
                  {(purHits ?? []).map((s: any) => (
                    <li key={s.id}>
                      <button type="button" className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted/40" onClick={() => selectPurchase(s.id)}>
                        <span className="font-semibold">{s.invoice_no ?? s.id.slice(0, 6)}</span>
                        <span className="text-xs text-muted-foreground">{fmtMoney(Number(s.total), lang)} · {new Date(s.created_at).toLocaleDateString("en-GB")}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        <div className="rounded-xl border bg-background p-3 md:p-4">
          <div className="mb-2 flex items-center justify-between">
            <Label className="text-sm font-bold">{lang === "bn" ? "ফেরত পণ্য" : "Returned items"}</Label>
            <Button variant="outline" className="h-10 gap-2" onClick={addBlankRow}><Plus className="h-4 w-4" />{lang === "bn" ? "যোগ" : "Add"}</Button>
          </div>
          {items.length === 0 ? (
            <div className="py-4 text-center text-xs text-muted-foreground">{lang === "bn" ? "কোনো আইটেম নেই" : "No items"}</div>
          ) : (
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 rounded-lg border p-2">
                  <div className="col-span-12 md:col-span-5">
                    {pickedPurId || it.product_id ? (
                      <Input value={it.name} onChange={(e) => updateRow(idx, { name: e.target.value })} placeholder={lang === "bn" ? "পণ্যের নাম" : "Product name"} />
                    ) : (
                      <Select value={it.product_id ?? ""} onValueChange={(v) => pickProduct(idx, v)}>
                        <SelectTrigger><SelectValue placeholder={lang === "bn" ? "পণ্য বাছাই" : "Pick product"} /></SelectTrigger>
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
            <span className="text-sm font-bold">{lang === "bn" ? "মোট" : "Total"}</span>
            <span className="text-base font-extrabold">{fmtMoney(total, lang)}</span>
          </div>
        </div>

        <div className="rounded-xl border bg-background p-3 md:p-4">
          <Label className="text-xs">{lang === "bn" ? "কারণ" : "Reason"}</Label>
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

        <div className="rounded-xl border bg-background p-3 md:p-4 space-y-3">
          <Label className="text-sm font-bold">{lang === "bn" ? "সাপ্লায়ার থেকে ফেরত" : "Refund from supplier"}</Label>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <div>
              <Label className="text-[11px] text-muted-foreground">{lang === "bn" ? "ফেরত পরিমাণ" : "Refund amount"}</Label>
              <Input type="number" min={0} step="any" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">{lang === "bn" ? "স্ট্যাটাস" : "Status"}</Label>
              <Select value={refundStatus} onValueChange={(v) => setRefundStatus(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="received">{lang === "bn" ? "নগদ ফেরত পেয়েছি" : "Cash received"}</SelectItem>
                  <SelectItem value="adjusted_to_due">{lang === "bn" ? "বাকিতে সমন্বয়" : "Adjust to supplier due"}</SelectItem>
                  <SelectItem value="pending">{lang === "bn" ? "মুলতবি" : "Pending"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">{lang === "bn" ? "মাধ্যম" : "Method"}</Label>
              <Select value={refundMethod} onValueChange={setRefundMethod} disabled={refundStatus !== "received"}>
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
          {refundStatus === "received" && refundMethod === "cash" && (
            <p className="text-[11px] text-emerald-700">
              {lang === "bn" ? "এই টাকা ক্যাশবক্সে যোগ হবে।" : "This amount will be added back to cash."}
            </p>
          )}
          {refundStatus === "adjusted_to_due" && !pickedPur?.supplier_id && (
            <p className="text-[11px] text-amber-600">
              {lang === "bn" ? "সাপ্লায়ার নেই — বাকি সমন্বয় হবে না।" : "No supplier on the purchase — due won't be adjusted."}
            </p>
          )}

          <div className="flex items-center justify-between rounded-lg border p-2">
            <div>
              <div className="text-sm font-semibold">{lang === "bn" ? "স্টক থেকে বাদ" : "Reduce from stock"}</div>
              <div className="text-[11px] text-muted-foreground">{lang === "bn" ? "ফেরত পরিমাণ স্টক থেকে কমবে" : "Returned qty will be removed from stock"}</div>
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
      </div>
    </div>
  );
}
export default NewPurchaseReturnPage;