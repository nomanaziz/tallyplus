import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, fmtMoney } from "@/lib/i18n";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

export type InvoiceEditTarget = {
  kind: "sale" | "purchase";
  id: string;
  shopId: string;
};

type Item = {
  product_id: string | null;
  name: string;
  qty: number;
  price: number;
  cost?: number;
};

type Contact = { id: string; name: string; phone: string | null };
type Product = { id: string; name: string; sale_price: number; cost_price: number };

export function InvoiceEditDialog({
  target,
  onOpenChange,
  onSaved,
}: {
  target: InvoiceEditTarget | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const { lang, t } = useI18n();
  const open = !!target;

  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [contactId, setContactId] = useState<string>("");
  const [items, setItems] = useState<Item[]>([]);
  const [discount, setDiscount] = useState("0");
  const [paid, setPaid] = useState("0");
  const [note, setNote] = useState("");
  const [createdAt, setCreatedAt] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (!target) return;
    setLoading(true);
    (async () => {
      const isSale = target.kind === "sale";
      const partyCol = isSale ? "customer_id" : "supplier_id";

      const headPromise = isSale
        ? supabase.from("sales").select("*").eq("id", target.id).maybeSingle()
        : supabase.from("purchases").select("*").eq("id", target.id).maybeSingle();
      const itemsPromise = isSale
        ? supabase.from("sale_items").select("product_id,name,qty,price,cost").eq("sale_id", target.id)
        : supabase.from("purchase_items").select("product_id,name,qty,price").eq("purchase_id", target.id);
      const contactPromise = isSale
        ? supabase.from("customers").select("id,name,phone").eq("shop_id", target.shopId).is("deleted_at", null).order("name")
        : supabase.from("suppliers").select("id,name,phone").eq("shop_id", target.shopId).is("deleted_at", null).order("name");

      const [headRes, itemsRes, contactRes, productRes] = await Promise.all([
        headPromise,
        itemsPromise,
        contactPromise,
        supabase.from("products").select("id,name,sale_price,cost_price").eq("shop_id", target.shopId).is("deleted_at", null).order("name").limit(1000),
      ]);

      const head = headRes.data as any;
      if (head) {
        setContactId((head as any)[partyCol] ?? "");
        setDiscount(String(head.discount ?? 0));
        setPaid(String(head.paid ?? 0));
        setNote(head.note ?? "");
        const d = new Date(head.created_at);
        const pad = (n: number) => String(n).padStart(2, "0");
        setCreatedAt(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
      }
      const its = (itemsRes.data ?? []) as any[];
      setItems(its.map((it) => ({
        product_id: it.product_id ?? null,
        name: it.name ?? "",
        qty: Number(it.qty ?? 0),
        price: Number(it.price ?? 0),
        cost: it.cost != null ? Number(it.cost) : undefined,
      })));
      setContacts((contactRes.data ?? []) as Contact[]);
      setProducts((productRes.data ?? []) as Product[]);
      setLoading(false);
    })();
  }, [target]);

  const subtotal = useMemo(() => items.reduce((a, it) => a + it.qty * it.price, 0), [items]);
  const total = useMemo(() => Math.max(subtotal - Number(discount || 0), 0), [subtotal, discount]);
  const due = useMemo(() => Math.max(total - Number(paid || 0), 0), [total, paid]);

  const updateItem = (idx: number, patch: Partial<Item>) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const addItem = () => {
    setItems((prev) => [...prev, { product_id: null, name: "", qty: 1, price: 0 }]);
  };

  const pickProduct = (idx: number, productId: string) => {
    if (productId === "__custom__") {
      updateItem(idx, { product_id: null });
      return;
    }
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    updateItem(idx, {
      product_id: p.id,
      name: p.name,
      price: target?.kind === "sale" ? Number(p.sale_price) : Number(p.cost_price),
      cost: Number(p.cost_price),
    });
  };

  const save = async () => {
    if (!target) return;
    if (items.length === 0) {
      toast.error(t("p7_Add_at_least_one_item_2"));
      return;
    }
    if (items.some((it) => !it.name.trim() || it.qty <= 0)) {
      toast.error(t("p7_Fill_all_item_names_and_quanti"));
      return;
    }
    setBusy(true);
    const payload = items.map((it) => ({
      product_id: it.product_id,
      name: it.name,
      qty: it.qty,
      price: it.price,
      cost: it.cost ?? 0,
      item_type: "product",
    }));
    const rpc = target.kind === "sale" ? "edit_sale_invoice" : "edit_purchase_invoice";
    const args =
      target.kind === "sale"
        ? {
            p_sale_id: target.id,
            p_customer_id: contactId || null,
            p_discount: Number(discount || 0),
            p_paid: Number(paid || 0),
            p_note: note || null,
            p_created_at: createdAt ? new Date(createdAt).toISOString() : null,
            p_items: payload,
          }
        : {
            p_purchase_id: target.id,
            p_supplier_id: contactId || null,
            p_discount: Number(discount || 0),
            p_paid: Number(paid || 0),
            p_note: note || null,
            p_created_at: createdAt ? new Date(createdAt).toISOString() : null,
            p_items: payload,
          };
    const { error } = await supabase.rpc(rpc as never, args as never);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("p7_Invoice_updated"));
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {target?.kind === "sale"
              ? t("p7_Edit_Sale_Invoice")
              : t("p7_Edit_Purchase_Invoice")}
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">{t("p7_Loading")}</div>
        ) : (
          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>
                  {target?.kind === "sale"
                    ? t("p7_Customer")
                    : t("p7_Supplier")}
                </Label>
                <Select value={contactId || "__none__"} onValueChange={(v) => setContactId(v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t("p7_x")}</SelectItem>
                    {contacts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}{c.phone ? ` (${c.phone})` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>{t("p7_Date")}</Label>
                <Input type="datetime-local" value={createdAt} onChange={(e) => setCreatedAt(e.target.value)} />
              </div>
            </div>

            <div className="rounded-lg border">
              <div className="border-b bg-muted/40 px-3 py-2 text-xs font-semibold">
                {t("p7_Items")}
              </div>
              <div className="divide-y">
                {items.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 p-2">
                    <div className="col-span-12 sm:col-span-5">
                      <Select value={it.product_id ?? "__custom__"} onValueChange={(v) => pickProduct(idx, v)}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__custom__">{t("p7_Custom_item")}</SelectItem>
                          {products.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        className="mt-1 h-8 text-xs"
                        placeholder={t("p7_Item_name")}
                        value={it.name}
                        onChange={(e) => updateItem(idx, { name: e.target.value })}
                      />
                    </div>
                    <Input
                      className="col-span-4 sm:col-span-2 h-9"
                      type="number"
                      placeholder="Qty"
                      value={it.qty}
                      onChange={(e) => updateItem(idx, { qty: Number(e.target.value) || 0 })}
                    />
                    <Input
                      className="col-span-4 sm:col-span-2 h-9"
                      type="number"
                      placeholder="Price"
                      value={it.price}
                      onChange={(e) => updateItem(idx, { price: Number(e.target.value) || 0 })}
                    />
                    <div className="col-span-3 sm:col-span-2 flex items-center justify-end pr-1 text-sm font-semibold">
                      {fmtMoney(it.qty * it.price, lang)}
                    </div>
                    <div className="col-span-1 flex items-center justify-end">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600" onClick={() => removeItem(idx)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t p-2">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={addItem}>
                  <Plus className="h-3.5 w-3.5" />
                  {t("p7_Add_item")}
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>{t("p7_Discount")}</Label>
                <Input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>{t("p7_Paid")}</Label>
                <Input type="number" value={paid} onChange={(e) => setPaid(e.target.value)} />
              </div>
              <div className="grid gap-1.5 sm:col-span-2">
                <Label>{t("p7_Note")}</Label>
                <Input value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
            </div>

            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <div className="flex justify-between"><span>{t("p7_Subtotal")}</span><span>{fmtMoney(subtotal, lang)}</span></div>
              <div className="flex justify-between"><span>{t("p7_Discount")}</span><span>-{fmtMoney(Number(discount || 0), lang)}</span></div>
              <div className="flex justify-between font-bold"><span>{t("p7_Total_2")}</span><span>{fmtMoney(total, lang)}</span></div>
              <div className="flex justify-between"><span>{t("p7_Paid")}</span><span>{fmtMoney(Number(paid || 0), lang)}</span></div>
              <div className="flex justify-between font-bold text-rose-600"><span>{t("p7_Due")}</span><span>{fmtMoney(due, lang)}</span></div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("p7_Cancel")}</Button>
          <Button onClick={save} disabled={busy || loading}>{busy ? "..." : t("p7_Save_2")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}