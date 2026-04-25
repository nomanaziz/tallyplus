import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MoreVertical, Pencil, Trash2, Package, Plus, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/lib/shop";
import { useAuth } from "@/lib/auth";
import { useI18n, fmtMoney } from "@/lib/i18n";
import { assetsListQuery, type AssetRow } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/app/EmptyState";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { RequirePerm } from "@/components/app/RequirePerm";

export const Route = createFileRoute("/app/assets")({
  head: () => ({ meta: [{ title: "দোকানের সম্পদ — Tally Plus" }] }),
  component: GuardedAssets,
});

function GuardedAssets() {
  return <RequirePerm group="expense"><AssetsPage /></RequirePerm>;
}

const STATUS_LABEL: Record<string, { bn: string; en: string; cls: string }> = {
  active: { bn: "সচল", en: "Active", cls: "bg-emerald-100 text-emerald-700" },
  damaged: { bn: "নষ্ট", en: "Damaged", cls: "bg-rose-100 text-rose-700" },
  sold: { bn: "বিক্রিত", en: "Sold", cls: "bg-amber-100 text-amber-700" },
  disposed: { bn: "বাতিল", en: "Disposed", cls: "bg-slate-200 text-slate-700" },
};

function AssetsPage() {
  const { lang } = useI18n();
  const { current } = useShop();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data = [], refetch } = useQuery(assetsListQuery(current?.id ?? null));
  const list = data;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AssetRow | null>(null);
  const [disposeOpen, setDisposeOpen] = useState(false);
  const [disposeTarget, setDisposeTarget] = useState<AssetRow | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "damaged">("all");

  const totals = useMemo(() => {
    let activeVal = 0, loss = 0;
    for (const a of list) {
      const p = Number(a.purchase_price);
      if (a.status === "active") activeVal += p;
      else loss += Math.max(0, p - Number(a.disposed_value ?? 0));
    }
    return { activeVal, loss };
  }, [list]);

  const filtered = useMemo(() => {
    if (filter === "all") return list;
    if (filter === "active") return list.filter((a) => a.status === "active");
    return list.filter((a) => a.status !== "active");
  }, [list, filter]);

  const refresh = async () => { await qc.invalidateQueries({ queryKey: ["assets"] }); await refetch(); };

  const onDelete = async (a: AssetRow) => {
    if (!confirm(lang === "bn" ? "ডিলিট করবেন?" : "Delete?")) return;
    const { error } = await supabase.from("assets").update({ deleted_at: new Date().toISOString() }).eq("id", a.id);
    if (error) { toast.error(error.message); return; }
    toast.success(lang === "bn" ? "ডিলিট হয়েছে" : "Deleted");
    void refresh();
  };

  return (
    <div className="container px-4 py-4">
      <div className="mb-1 text-xs text-muted-foreground">Assets</div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => nav({ to: "/app/dashboard" })}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Package className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-extrabold md:text-2xl">{lang === "bn" ? "দোকানের সম্পদ" : "Shop Assets"}</h1>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }} className="gap-1">
          <Plus className="h-4 w-4" /> <span className="text-xs">{lang === "bn" ? "নতুন সম্পদ" : "New asset"}</span>
        </Button>
      </div>

      {/* Summary */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <div className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">{lang === "bn" ? "মোট সচল সম্পদ" : "Active asset value"}</div>
          <div className="mt-1 text-base font-extrabold text-emerald-700 md:text-xl">{fmtMoney(totals.activeVal, lang)}</div>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
          <div className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">{lang === "bn" ? "নষ্ট/বিক্রিত ক্ষতি" : "Loss / disposal"}</div>
          <div className="mt-1 text-base font-extrabold text-rose-700 md:text-xl">{fmtMoney(totals.loss, lang)}</div>
        </div>
      </div>

      {/* Filter */}
      <div className="mt-4 flex items-center gap-2">
        {(["all", "active", "damaged"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={"rounded-full border px-3 py-1 text-xs font-semibold " + (filter === f ? "border-primary bg-primary text-primary-foreground" : "bg-background")}
          >
            {f === "all" ? (lang === "bn" ? "সব" : "All") : f === "active" ? (lang === "bn" ? "সচল" : "Active") : (lang === "bn" ? "নষ্ট/বিক্রিত" : "Damaged/sold")}
          </button>
        ))}
      </div>

      <div className="mt-3 rounded-xl border bg-card">
        {filtered.length === 0 ? (
          <EmptyState icon={<Package className="h-6 w-6" />} title={lang === "bn" ? "কোনো সম্পদ নেই" : "No assets"} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{lang === "bn" ? "নাম" : "Name"}</TableHead>
                <TableHead>{lang === "bn" ? "ক্যাটাগরি" : "Category"}</TableHead>
                <TableHead>{lang === "bn" ? "তারিখ" : "Date"}</TableHead>
                <TableHead className="text-right">{lang === "bn" ? "মূল্য" : "Price"}</TableHead>
                <TableHead>{lang === "bn" ? "অবস্থা" : "Status"}</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((a) => {
                const st = STATUS_LABEL[a.status];
                return (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">
                      {a.name}
                      {a.quantity > 1 ? <span className="ml-1 text-xs text-muted-foreground">×{a.quantity}</span> : null}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{a.category ?? "—"}</TableCell>
                    <TableCell className="text-xs">{a.purchase_date}</TableCell>
                    <TableCell className="text-right font-semibold">{fmtMoney(Number(a.purchase_price), lang)}</TableCell>
                    <TableCell>
                      <span className={"inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold " + st.cls}>
                        {lang === "bn" ? st.bn : st.en}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditing(a); setOpen(true); }}>
                            <Pencil className="mr-2 h-4 w-4" /> {lang === "bn" ? "এডিট" : "Edit"}
                          </DropdownMenuItem>
                          {a.status === "active" && (
                            <DropdownMenuItem onClick={() => { setDisposeTarget(a); setDisposeOpen(true); }}>
                              <AlertTriangle className="mr-2 h-4 w-4" /> {lang === "bn" ? "নষ্ট/বিক্রিত চিহ্নিত করুন" : "Mark damaged/sold"}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem className="text-destructive" onClick={() => onDelete(a)}>
                            <Trash2 className="mr-2 h-4 w-4" /> {lang === "bn" ? "ডিলিট" : "Delete"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <AssetDialog open={open} onOpenChange={setOpen} editing={editing} onSaved={refresh} />
      <DisposeDialog open={disposeOpen} onOpenChange={setDisposeOpen} target={disposeTarget} onSaved={refresh} />
    </div>
  );
}

const CATEGORY_SUGGESTIONS = ["ইলেকট্রনিক্স", "ফার্নিচার", "ডেকোরেশন", "ফিক্সচার", "যন্ত্রপাতি", "অন্যান্য"];

function AssetDialog({ open, onOpenChange, editing, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; editing: AssetRow | null; onSaved: () => void }) {
  const { lang } = useI18n();
  const { current } = useShop();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("1");
  const [pDate, setPDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [paidVia, setPaidVia] = useState<"cash" | "bkash" | "nagad" | "rocket" | "bank">("cash");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? "");
      setCategory(editing?.category ?? "");
      setPrice(editing ? String(editing.purchase_price) : "");
      setQty(editing ? String(editing.quantity) : "1");
      setPDate(editing?.purchase_date ?? new Date().toISOString().slice(0, 10));
      setPaidVia(((editing?.paid_via as any) ?? "cash"));
      setNote(editing?.note ?? "");
    }
  }, [open, editing]);

  const save = async () => {
    if (!current || !user) return;
    if (!name.trim()) { toast.error(lang === "bn" ? "নাম দিন" : "Enter name"); return; }
    const p = Number(price);
    if (p < 0 || isNaN(p)) { toast.error(lang === "bn" ? "মূল্য সঠিক নয়" : "Invalid price"); return; }
    setBusy(true);
    const payload = {
      shop_id: current.id,
      name: name.trim(),
      category: category.trim() || null,
      purchase_price: p,
      purchase_date: pDate,
      paid_via: paidVia,
      quantity: Math.max(1, Number(qty) || 1),
      note: note.trim() || null,
      created_by: user.id,
    };
    let result;
    if (editing) {
      result = await supabase.from("assets").update(payload).eq("id", editing.id).select("id").single();
    } else {
      result = await supabase.from("assets").insert(payload).select("id").single();
    }
    if (result.error) { setBusy(false); toast.error(result.error.message); return; }

    if (!editing && p > 0) {
      // mirror cash outflow
      await supabase.from("cash_movements").insert({
        shop_id: current.id,
        amount: p,
        direction: "out",
        note: `সম্পদ কেনা — ${name.trim()}`,
        ref_table: "assets",
        ref_id: result.data?.id ?? null,
        created_by: user.id,
      });
    }
    setBusy(false);
    toast.success(lang === "bn" ? "সেভ হয়েছে" : "Saved");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? (lang === "bn" ? "সম্পদ এডিট" : "Edit asset") : (lang === "bn" ? "নতুন সম্পদ" : "New asset")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>{lang === "bn" ? "নাম" : "Name"}</Label>
            <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={lang === "bn" ? "যেমন: ছাদের ফ্যান" : "e.g. Ceiling fan"} />
          </div>
          <div className="grid gap-1.5">
            <Label>{lang === "bn" ? "ক্যাটাগরি" : "Category"}</Label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} list="asset-cats" placeholder={lang === "bn" ? "ইলেকট্রনিক্স / ফার্নিচার..." : "Electronics / Furniture"} />
            <datalist id="asset-cats">
              {CATEGORY_SUGGESTIONS.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>{lang === "bn" ? "মূল্য" : "Price"}</Label>
              <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>{lang === "bn" ? "পরিমাণ" : "Qty"}</Label>
              <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>{lang === "bn" ? "তারিখ" : "Date"}</Label>
              <Input type="date" value={pDate} onChange={(e) => setPDate(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>{lang === "bn" ? "মাধ্যম" : "Paid via"}</Label>
              <Select value={paidVia} onValueChange={(v) => setPaidVia(v as typeof paidVia)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bkash">bKash</SelectItem>
                  <SelectItem value="nagad">Nagad</SelectItem>
                  <SelectItem value="rocket">Rocket</SelectItem>
                  <SelectItem value="bank">Bank</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>{lang === "bn" ? "নোট" : "Note"}</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{lang === "bn" ? "বাতিল" : "Cancel"}</Button>
          <Button onClick={save} disabled={busy}>{busy ? "..." : lang === "bn" ? "সেভ" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DisposeDialog({ open, onOpenChange, target, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; target: AssetRow | null; onSaved: () => void }) {
  const { lang } = useI18n();
  const { current } = useShop();
  const { user } = useAuth();
  const [status, setStatus] = useState<"damaged" | "sold" | "disposed">("damaged");
  const [value, setValue] = useState("");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setStatus("damaged");
      setValue("");
      setDate(new Date().toISOString().slice(0, 10));
    }
  }, [open]);

  const save = async () => {
    if (!target || !current || !user) return;
    setBusy(true);
    const v = Number(value) || 0;
    const { error } = await supabase.from("assets").update({
      status,
      disposed_at: date,
      disposed_value: v,
    }).eq("id", target.id);
    if (error) { setBusy(false); toast.error(error.message); return; }

    if (v > 0) {
      await supabase.from("cash_movements").insert({
        shop_id: current.id,
        amount: v,
        direction: "in",
        note: `সম্পদ বিক্রি — ${target.name}`,
        ref_table: "assets",
        ref_id: target.id,
        created_by: user.id,
      });
    }
    setBusy(false);
    toast.success(lang === "bn" ? "আপডেট হয়েছে" : "Updated");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{lang === "bn" ? "অবস্থা পরিবর্তন" : "Change status"} — {target?.name}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>{lang === "bn" ? "অবস্থা" : "Status"}</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="damaged">{lang === "bn" ? "নষ্ট" : "Damaged"}</SelectItem>
                <SelectItem value="sold">{lang === "bn" ? "বিক্রি করা হয়েছে" : "Sold"}</SelectItem>
                <SelectItem value="disposed">{lang === "bn" ? "বাতিল/ফেলে দেওয়া" : "Disposed"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>{lang === "bn" ? "প্রাপ্ত মূল্য (যদি বিক্রি করেন)" : "Received value (if sold)"}</Label>
            <Input type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0" />
          </div>
          <div className="grid gap-1.5">
            <Label>{lang === "bn" ? "তারিখ" : "Date"}</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{lang === "bn" ? "বাতিল" : "Cancel"}</Button>
          <Button onClick={save} disabled={busy}>{busy ? "..." : lang === "bn" ? "আপডেট" : "Update"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}