import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Plus, Search, Trash2, ListChecks, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/lib/shop";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

type StoreProduct = {
  id: string;
  name: string;
  sale_price: number;
  cost_price: number;
  unit: string | null;
  stock: number;
  sku: string | null;
  barcode: string | null;
};

type Row = {
  tempId: string;
  productId: string | null;
  name: string;
  qty: number;
  unit: string;
  cost: number;
  price: number;
  profit: number;
  // which two fields the user just typed (so we know which is auto)
  lastEdited: "cost" | "price" | "profit" | null;
};

function tid() {
  return Math.random().toString(36).slice(2, 10);
}

function recompute(r: Row): Row {
  const cost = Number(r.cost) || 0;
  const price = Number(r.price) || 0;
  const profit = Number(r.profit) || 0;
  // If two of (cost, price, profit) > 0 and the other was auto, derive
  if (r.lastEdited === "profit" && cost > 0) {
    return { ...r, price: cost + profit };
  }
  if (r.lastEdited === "price" && cost > 0) {
    return { ...r, profit: price - cost };
  }
  if (r.lastEdited === "cost" && price > 0) {
    return { ...r, profit: price - cost };
  }
  return r;
}

export function QuickFordoDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const { current } = useShop();
  const { lang } = useI18n();

  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custAddress, setCustAddress] = useState("");
  const [note, setNote] = useState("");

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<StoreProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDrop, setShowDrop] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [rows, setRows] = useState<Row[]>([]);
  const [saving, setSaving] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const debTimer = useRef<number | null>(null);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setCustName(""); setCustPhone(""); setCustAddress(""); setNote("");
      setRows([]); setQuery(""); setSuggestions([]); setShowDrop(false);
    }
  }, [open]);

  // Debounced product search
  useEffect(() => {
    if (!current?.id || !open) return;
    const q = query.trim();
    if (!q) { setSuggestions([]); setSearching(false); return; }
    setSearching(true);
    if (debTimer.current) window.clearTimeout(debTimer.current);
    debTimer.current = window.setTimeout(async () => {
      const escaped = q.replace(/[%,]/g, "");
      const { data } = await supabase
        .from("products")
        .select("id,name,sale_price,cost_price,unit,stock,sku,barcode")
        .eq("shop_id", current.id)
        .is("deleted_at", null)
        .or(`name.ilike.%${escaped}%,sku.ilike.%${escaped}%,barcode.ilike.%${escaped}%`)
        .limit(8);
      setSuggestions((data as StoreProduct[]) ?? []);
      setSearching(false);
      setActiveIdx(0);
    }, 200);
    return () => { if (debTimer.current) window.clearTimeout(debTimer.current); };
  }, [query, current?.id, open]);

  const addStoreProduct = (p: StoreProduct) => {
    setRows((rs) => {
      const idx = rs.findIndex((r) => r.productId === p.id);
      if (idx >= 0) {
        const next = rs.slice();
        next[idx] = { ...next[idx], qty: (Number(next[idx].qty) || 0) + 1 };
        return next;
      }
      const cost = Number(p.cost_price) || 0;
      const price = Number(p.sale_price) || 0;
      return [...rs, {
        tempId: tid(),
        productId: p.id,
        name: p.name,
        qty: 1,
        unit: p.unit || "pcs",
        cost,
        price,
        profit: price - cost,
        lastEdited: null,
      }];
    });
    setQuery(""); setSuggestions([]); setShowDrop(false);
    setTimeout(() => inputRef.current?.focus(), 30);
  };

  const addExternal = (name: string) => {
    setRows((rs) => [...rs, {
      tempId: tid(),
      productId: null,
      name: name.trim(),
      qty: 1,
      unit: "pcs",
      cost: 0,
      price: 0,
      profit: 0,
      lastEdited: null,
    }]);
    setQuery(""); setSuggestions([]); setShowDrop(false);
    setTimeout(() => inputRef.current?.focus(), 30);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (suggestions.length > 0 && activeIdx >= 0 && activeIdx < suggestions.length) {
        addStoreProduct(suggestions[activeIdx]);
      } else if (query.trim()) {
        addExternal(query);
      }
    } else if (e.key === "Escape") { setShowDrop(false); }
  };

  const updateRow = (id: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.tempId === id ? recompute({ ...r, ...patch }) : r)));
  const removeRow = (id: string) => setRows((rs) => rs.filter((r) => r.tempId !== id));

  const totals = useMemo(() => {
    let sell = 0, cost = 0;
    for (const r of rows) {
      sell += (Number(r.qty) || 0) * (Number(r.price) || 0);
      cost += (Number(r.qty) || 0) * (Number(r.cost) || 0);
    }
    return { sell, cost, profit: sell - cost };
  }, [rows]);

  const save = async () => {
    if (!current?.id) return;
    if (!custName.trim()) {
      toast.error(lang === "bn" ? "গ্রাহকের নাম দিন" : "Enter customer name");
      return;
    }
    if (rows.length === 0) {
      toast.error(lang === "bn" ? "কোনো পণ্য যোগ করুন" : "Add at least one item");
      return;
    }
    if (rows.some((r) => !r.name.trim())) {
      toast.error(lang === "bn" ? "প্রতিটি পণ্যের নাম দিন" : "Each item needs a name");
      return;
    }
    setSaving(true);
    try {
      const { data: wl, error: e1 } = await supabase
        .from("customer_wishlists")
        .insert({
          shop_id: current.id,
          customer_name: custName.trim(),
          customer_phone: custPhone.trim(),
          customer_address: custAddress.trim() || null,
          note: note.trim() || null,
          status: "new",
        })
        .select("id")
        .single();
      if (e1) throw e1;
      const wlId = (wl as { id: string }).id;
      const items = rows.map((r, i) => ({
        wishlist_id: wlId,
        name: r.name.trim(),
        qty: r.qty,
        unit: r.unit || null,
        price: r.price || null,
        cost_price: r.cost || null,
        profit: (r.price || 0) - (r.cost || 0),
        position: i,
      }));
      const { error: e2 } = await supabase.from("customer_wishlist_items").insert(items);
      if (e2) throw e2;
      toast.success(lang === "bn" ? "ফর্দ সংরক্ষিত" : "Fordo saved");
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-primary" />
            {lang === "bn" ? "নিজে ফর্দ তৈরি করুন" : "Create Fordo"}
          </DialogTitle>
        </DialogHeader>

        {/* Customer */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {lang === "bn" ? "গ্রাহকের নাম *" : "Customer name *"}
            </Label>
            <Input value={custName} onChange={(e) => setCustName(e.target.value)} className="h-10" />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {lang === "bn" ? "মোবাইল" : "Phone"}
            </Label>
            <Input value={custPhone} onChange={(e) => setCustPhone(e.target.value)} className="h-10" />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {lang === "bn" ? "ঠিকানা / নোট" : "Address / Note"}
            </Label>
            <Input value={custAddress} onChange={(e) => setCustAddress(e.target.value)} className="h-10" placeholder={lang === "bn" ? "ঐচ্ছিক" : "Optional"} />
          </div>
        </div>

        {/* Smart product input */}
        <div className="rounded-xl border bg-card p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setShowDrop(true); }}
              onFocus={() => setShowDrop(true)}
              onBlur={() => setTimeout(() => setShowDrop(false), 150)}
              onKeyDown={onKeyDown}
              placeholder={lang === "bn" ? "পণ্য টাইপ করুন... (Enter চাপুন)" : "Type product... (press Enter)"}
              className="h-10 pl-9"
            />
            {showDrop && query.trim() && (
              <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-auto rounded-xl border bg-popover shadow-lg">
                {searching ? (
                  <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> {lang === "bn" ? "খুঁজছে..." : "Searching..."}
                  </div>
                ) : suggestions.length > 0 ? (
                  <ul>
                    {suggestions.map((p, i) => (
                      <li
                        key={p.id}
                        onMouseDown={(e) => { e.preventDefault(); addStoreProduct(p); }}
                        className={`flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm ${i === activeIdx ? "bg-accent" : "hover:bg-accent/60"}`}
                      >
                        <div className="min-w-0">
                          <div className="truncate font-medium">{p.name}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {lang === "bn" ? "ক্রয়" : "Cost"}: ৳{Number(p.cost_price).toFixed(0)} · {lang === "bn" ? "বিক্রয়" : "Sell"}: ৳{Number(p.sale_price).toFixed(0)}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); addExternal(query); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-accent"
                  >
                    <Plus className="h-4 w-4 text-muted-foreground" />
                    <span><b>"{query.trim()}"</b> {lang === "bn" ? "নাম দিয়ে যোগ করুন" : "add by name"}</span>
                  </button>
                )}
              </div>
            )}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {lang === "bn" ? "দোকানের পণ্য না হলেও নাম লিখে Enter চেপে যোগ করতে পারবেন।" : "Type any name and press Enter — does not need to be in your store."}
          </p>
        </div>

        {/* Rows */}
        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
            {lang === "bn" ? "এখনো কোনো পণ্য যোগ হয়নি" : "No items yet"}
          </div>
        ) : (
          <ul className="space-y-2">
            {rows.map((r, idx) => {
              const lineTotal = (Number(r.qty) || 0) * (Number(r.price) || 0);
              const lineProfit = ((Number(r.price) || 0) - (Number(r.cost) || 0)) * (Number(r.qty) || 0);
              return (
                <li key={r.tempId} className="rounded-xl border bg-card p-3">
                  <div className="mb-2 flex items-start gap-2">
                    <div className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">{idx + 1}</div>
                    <Input
                      value={r.name}
                      onChange={(e) => updateRow(r.tempId, { name: e.target.value })}
                      className="h-9 text-sm font-semibold"
                      placeholder={lang === "bn" ? "পণ্যের নাম" : "Item name"}
                    />
                    <button
                      type="button"
                      onClick={() => removeRow(r.tempId)}
                      className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label="remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase text-muted-foreground">{lang === "bn" ? "পরিমাণ" : "Qty"}</Label>
                      <Input type="number" inputMode="decimal" value={r.qty || ""} onChange={(e) => updateRow(r.tempId, { qty: Number(e.target.value) || 0 })} className="h-9 text-sm" min={0} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase text-muted-foreground">{lang === "bn" ? "একক" : "Unit"}</Label>
                      <Input value={r.unit} onChange={(e) => updateRow(r.tempId, { unit: e.target.value })} className="h-9 text-sm" maxLength={10} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase text-muted-foreground">{lang === "bn" ? "ক্রয়" : "Cost"}</Label>
                      <Input type="number" inputMode="decimal" value={r.cost || ""} onChange={(e) => updateRow(r.tempId, { cost: Number(e.target.value) || 0, lastEdited: "cost" })} className="h-9 text-sm" placeholder="0" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase text-muted-foreground">{lang === "bn" ? "বিক্রয়" : "Sell"}</Label>
                      <Input type="number" inputMode="decimal" value={r.price || ""} onChange={(e) => updateRow(r.tempId, { price: Number(e.target.value) || 0, lastEdited: "price" })} className="h-9 text-sm" placeholder="0" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase text-muted-foreground">{lang === "bn" ? "লাভ" : "Profit"}</Label>
                      <Input type="number" inputMode="decimal" value={r.profit || ""} onChange={(e) => updateRow(r.tempId, { profit: Number(e.target.value) || 0, lastEdited: "profit" })} className="h-9 text-sm" placeholder="0" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between rounded-lg bg-muted/40 px-3 py-1.5 text-[11px]">
                    <span className="text-muted-foreground">
                      {lang === "bn" ? "লাইন লাভ" : "Line profit"}:{" "}
                      <span className={`font-semibold ${lineProfit >= 0 ? "text-success" : "text-destructive"}`}>৳{lineProfit.toFixed(0)}</span>
                    </span>
                    <span className="text-muted-foreground">
                      {lang === "bn" ? "মোট" : "Total"}:{" "}
                      <span className="text-sm font-bold text-foreground">৳{lineTotal.toFixed(0)}</span>
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* Totals */}
        {rows.length > 0 && (
          <div className="space-y-1 rounded-xl border bg-muted/30 p-3 text-sm">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{lang === "bn" ? "মোট ক্রয়" : "Total cost"}</span>
              <span className="tabular-nums">৳ {totals.cost.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{lang === "bn" ? "মোট লাভ" : "Total profit"}</span>
              <span className={`font-bold tabular-nums ${totals.profit >= 0 ? "text-success" : "text-destructive"}`}>৳ {totals.profit.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between border-t pt-1.5">
              <span className="font-bold">{lang === "bn" ? "মোট বিক্রয়" : "Total sell"}</span>
              <span className="text-lg font-extrabold tabular-nums text-primary">৳ {totals.sell.toFixed(2)}</span>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{lang === "bn" ? "বাতিল" : "Cancel"}</Button>
          <Button onClick={save} disabled={saving || rows.length === 0}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {lang === "bn" ? "ফর্দ সংরক্ষণ" : "Save Fordo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}