import { useNavigate } from "@/lib/router";
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
import { DataPagination } from "@/components/app/DataPagination";
import { usePagination } from "@/hooks/use-pagination";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { RequirePerm } from "@/components/app/RequirePerm";



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
  const { lang, t } = useI18n();
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
  const pg = usePagination(filtered, 25);

  const refresh = async () => { await qc.invalidateQueries({ queryKey: ["assets"] }); await refetch(); };

  const onDelete = async (a: AssetRow) => {
    if (!confirm(t("p7_Delete"))) return;
    const { error } = await supabase.from("assets").update({ deleted_at: new Date().toISOString() }).eq("id", a.id);
    if (error) { toast.error(error.message); return; }
    toast.success(t("p7_Deleted"));
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
          <h1 className="text-xl font-extrabold md:text-2xl">{t("p7_Shop_Assets")}</h1>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }} className="gap-1">
          <Plus className="h-4 w-4" /> <span className="text-xs">{t("p7_New_asset")}</span>
        </Button>
      </div>

      {/* Summary */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <div className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">{t("p7_Active_asset_value")}</div>
          <div className="mt-1 text-base font-extrabold text-emerald-700 md:text-xl">{fmtMoney(totals.activeVal, lang)}</div>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
          <div className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">{t("p7_Loss_disposal")}</div>
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
            {f === "all" ? (t("p7_All_2")) : f === "active" ? (t("p7_Active_4")) : (t("p7_Damaged_sold"))}
          </button>
        ))}
      </div>

      <div className="mt-3 rounded-xl border bg-card">
        {filtered.length === 0 ? (
          <EmptyState icon={<Package className="h-6 w-6" />} title={t("p7_No_assets")} />
        ) : (
          <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("p7_Name")}</TableHead>
                <TableHead>{t("p7_Category")}</TableHead>
                <TableHead>{t("p7_Date")}</TableHead>
                <TableHead className="text-right">{t("p7_Price")}</TableHead>
                <TableHead>{t("p7_Status")}</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pg.paged.map((a) => {
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
                            <Pencil className="mr-2 h-4 w-4" /> {t("p7_Edit")}
                          </DropdownMenuItem>
                          {a.status === "active" && (
                            <DropdownMenuItem onClick={() => { setDisposeTarget(a); setDisposeOpen(true); }}>
                              <AlertTriangle className="mr-2 h-4 w-4" /> {t("p7_Mark_damaged_sold")}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem className="text-destructive" onClick={() => onDelete(a)}>
                            <Trash2 className="mr-2 h-4 w-4" /> {t("p7_Delete_3")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <DataPagination
            page={pg.page}
            pageCount={pg.pageCount}
            pageSize={pg.pageSize}
            total={pg.total}
            from={pg.from}
            to={pg.to}
            onPageChange={pg.setPage}
            onPageSizeChange={pg.setPageSize}
          />
          </>
        )}
      </div>

      <AssetDialog open={open} onOpenChange={setOpen} editing={editing} onSaved={refresh} />
      <DisposeDialog open={disposeOpen} onOpenChange={setDisposeOpen} target={disposeTarget} onSaved={refresh} />
    </div>
  );
}

const CATEGORY_SUGGESTIONS = ["ইলেকট্রনিক্স", "ফার্নিচার", "ডেকোরেশন", "ফিক্সচার", "যন্ত্রপাতি", "অন্যান্য"];

function AssetDialog({ open, onOpenChange, editing, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; editing: AssetRow | null; onSaved: () => void }) {
  const { lang, t } = useI18n();
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
    if (!name.trim()) { toast.error(t("p7_Enter_name")); return; }
    const p = Number(price);
    if (p < 0 || isNaN(p)) { toast.error(t("p7_Invalid_price")); return; }
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
        note: `সম্পদ ক্রয় — ${name.trim()}`,
        ref_table: "assets",
        ref_id: result.data?.id ?? null,
        created_by: user.id,
      });
    }
    setBusy(false);
    toast.success(t("p7_Saved"));
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? (t("p7_Edit_asset")) : (t("p7_New_asset"))}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>{t("p7_Name")}</Label>
            <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={t("p7_e_g_Ceiling_fan")} />
          </div>
          <div className="grid gap-1.5">
            <Label>{t("p7_Category")}</Label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} list="asset-cats" placeholder={t("p7_Electronics_Furniture")} />
            <datalist id="asset-cats">
              {CATEGORY_SUGGESTIONS.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>{t("p7_Price")}</Label>
              <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>{t("p7_Qty")}</Label>
              <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>{t("p7_Date")}</Label>
              <Input type="date" value={pDate} onChange={(e) => setPDate(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>{t("p7_Paid_via_2")}</Label>
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
            <Label>{t("p7_Note")}</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("p7_Cancel")}</Button>
          <Button onClick={save} disabled={busy}>{busy ? "..." : t("p7_Save_2")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DisposeDialog({ open, onOpenChange, target, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; target: AssetRow | null; onSaved: () => void }) {
  const { lang, t } = useI18n();
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
    toast.success(t("p7_Updated"));
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("p7_Change_status")} — {target?.name}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>{t("p7_Status")}</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="damaged">{t("p7_Damaged")}</SelectItem>
                <SelectItem value="sold">{t("p7_Sold")}</SelectItem>
                <SelectItem value="disposed">{t("p7_Disposed")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>{t("p7_Received_value_if_sold")}</Label>
            <Input type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0" />
          </div>
          <div className="grid gap-1.5">
            <Label>{t("p7_Date")}</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("p7_Cancel")}</Button>
          <Button onClick={save} disabled={busy}>{busy ? "..." : t("p7_Update")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
export default GuardedAssets;
