import { useNavigate } from "@/lib/router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Coins, ArrowLeft, MoreVertical, Pencil, Trash2, Home, Truck, Zap, User, MoreHorizontal, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/lib/shop";
import { useAuth } from "@/lib/auth";
import { useI18n, fmtMoney, fmtDate } from "@/lib/i18n";
import { expensesListQuery } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DataToolbar } from "@/components/app/DataToolbar";
import { EmptyState } from "@/components/app/EmptyState";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataPagination } from "@/components/app/DataPagination";
import { usePagination } from "@/hooks/use-pagination";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { icons, AppIcon } from "@/lib/icons";
import { RecurringExpensesPanel } from "@/components/app/RecurringExpensesPanel";

type Expense = {
  id: string;
  category: string | null;
  amount: number;
  note: string | null;
  paid_via: string;
  created_at: string;
};



type CatKey = "rent" | "transport" | "utility" | "salary" | "other";
const PRESET_CATS: { key: CatKey; bn: string; en: string; icon: React.ReactNode; color: string }[] = [
  { key: "rent", bn: "দোকান ভাড়া", en: "Rent", icon: <Home className="h-6 w-6" />, color: "bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100" },
  { key: "transport", bn: "পরিবহন", en: "Transport", icon: <Truck className="h-6 w-6" />, color: "bg-sky-50 border-sky-300 text-sky-800 hover:bg-sky-100" },
  { key: "utility", bn: "ইউটিলিটি", en: "Utility", icon: <Zap className="h-6 w-6" />, color: "bg-violet-50 border-violet-300 text-violet-800 hover:bg-violet-100" },
  { key: "salary", bn: "বেতন", en: "Salary", icon: <User className="h-6 w-6" />, color: "bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100" },
  { key: "other", bn: "অন্যান্য", en: "Other", icon: <MoreHorizontal className="h-6 w-6" />, color: "bg-slate-50 border-slate-300 text-slate-800 hover:bg-slate-100" },
];

function ExpenseLedgerPage() {
  const { lang, t } = useI18n();
  const { current } = useShop();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data: raw = [], refetch } = useQuery(expensesListQuery(current?.id ?? null));
  const list = raw as unknown as Expense[];
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [presetCat, setPresetCat] = useState<string | null>(null);
  const customKey = current?.id ? `expense-custom-cats:${current.id}` : "";
  const [customCats, setCustomCats] = useState<string[]>(() => {
    if (typeof window === "undefined" || !customKey) return [];
    try { return JSON.parse(localStorage.getItem(customKey) || "[]"); } catch { return []; }
  });
  useEffect(() => {
    if (typeof window === "undefined" || !customKey) return;
    try { setCustomCats(JSON.parse(localStorage.getItem(customKey) || "[]")); } catch { /* ignore */ }
  }, [customKey]);
  const addCustomCategory = () => {
    const name = window.prompt(lang === "bn" ? "নতুন ক্যাটাগরির নাম লিখুন" : "Enter new category name");
    if (!name || !name.trim()) return;
    const next = Array.from(new Set([...customCats, name.trim()]));
    setCustomCats(next);
    if (customKey) localStorage.setItem(customKey, JSON.stringify(next));
  };

  const total = useMemo(() => list.reduce((s, e) => s + Number(e.amount), 0), [list]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? list.filter((e) => (e.category ?? "").toLowerCase().includes(q) || (e.note ?? "").toLowerCase().includes(q)) : list;
  }, [list, search]);
  const pg = usePagination(filtered, 25);

  const refresh = async () => { await qc.invalidateQueries({ queryKey: ["expenses"] }); await refetch(); };

  const onDelete = async (e: Expense) => {
    if (!confirm(t("p5_Delete_2"))) return;
    const { error } = await supabase.from("expenses").update({ deleted_at: new Date().toISOString() }).eq("id", e.id);
    if (error) { toast.error(error.message); return; }
    toast.success(t("p5_Deleted_2"));
    void refresh();
  };

  return (
    <div className="container px-4 py-4">
      <div className="mb-1 text-xs text-muted-foreground">Expense Book</div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => nav({ to: "/app/dashboard" })}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <AppIcon name="expense" className="h-6 w-6" />
          <h1 className="text-xl font-extrabold md:text-2xl">{t("p5_Expense_Book")}</h1>
        </div>
      </div>

      {/* Preset category tiles */}
      <div className="mt-4">
        <div className="mb-2 text-sm font-semibold text-muted-foreground">
          {lang === "bn" ? "খরচের ধরন বাছাই করে নতুন খরচ যোগ করুন" : "Pick a category to add an expense"}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {PRESET_CATS.map((c) => (
            <button
              key={c.key}
              onClick={() => {
                setEditing(null);
                setPresetCat(lang === "bn" ? c.bn : c.en);
                setOpen(true);
              }}
              className={"flex flex-col items-center justify-center gap-2 rounded-xl border-2 px-3 py-4 font-semibold shadow-sm transition active:scale-[0.98] " + c.color}
            >
              {c.icon}
              <span className="text-xs">{lang === "bn" ? c.bn : c.en}</span>
            </button>
          ))}
          {customCats.map((name) => (
            <button
              key={name}
              onClick={() => { setEditing(null); setPresetCat(name); setOpen(true); }}
              className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-primary/30 bg-primary/5 px-3 py-4 font-semibold text-primary shadow-sm transition active:scale-[0.98] hover:bg-primary/10"
            >
              <MoreHorizontal className="h-6 w-6" />
              <span className="text-xs line-clamp-1">{name}</span>
            </button>
          ))}
          <button
            onClick={addCustomCategory}
            className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/40 bg-background px-3 py-4 font-semibold text-muted-foreground transition active:scale-[0.98] hover:bg-accent"
          >
            <Plus className="h-6 w-6" />
            <span className="text-xs">{lang === "bn" ? "নতুন ক্যাটাগরি" : "New category"}</span>
          </button>
        </div>
      </div>

      {/* Monthly recurring expenses chart embedded */}
      <div className="mt-6">
        <RecurringExpensesPanel />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 sm:col-span-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("p5_Total_expenses")}</div>
          <div className="mt-1 text-3xl font-extrabold text-rose-700">{fmtMoney(total, lang)}</div>
        </div>
      </div>

      <div className="mt-4">
        <DataToolbar search={search} onSearch={setSearch} onRefresh={refresh} placeholder={t("p5_Category_note")} />
      </div>

      <div className="mt-4 rounded-xl border bg-card">
        {filtered.length === 0 ? (
          <EmptyState icon={<Coins className="h-6 w-6" />} title={t("p5_No_expenses_2")} />
        ) : (
          <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("p5_Date")}</TableHead>
                <TableHead>{t("p5_Category")}</TableHead>
                <TableHead>{t("p5_Note")}</TableHead>
                <TableHead className="text-right">{t("p5_Amount")}</TableHead>
                <TableHead>{t("p5_Method")}</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pg.paged.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-xs">{fmtDate(e.created_at)}</TableCell>
                  <TableCell className="font-medium">{e.category ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{e.note ?? "—"}</TableCell>
                  <TableCell className="text-right font-semibold text-rose-600">{fmtMoney(Number(e.amount), lang)}</TableCell>
                  <TableCell className="capitalize text-xs">{e.paid_via}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditing(e); setOpen(true); }}>
                          <Pencil className="mr-2 h-4 w-4" /> {t("p5_Edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => onDelete(e)}>
                          <Trash2 className="mr-2 h-4 w-4" /> {t("p5_Delete_3")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
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

      <ExpenseDialog
        open={open}
        onOpenChange={(v) => { setOpen(v); if (!v) setPresetCat(null); }}
        editing={editing}
        defaultCategory={presetCat}
        onSaved={refresh}
      />
    </div>
  );
}

function ExpenseDialog({ open, onOpenChange, editing, defaultCategory, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; editing: Expense | null; defaultCategory?: string | null; onSaved: () => void }) {
  const { lang, t } = useI18n();
  const { current } = useShop();
  const { user } = useAuth();
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [paidVia, setPaidVia] = useState<"cash" | "bkash" | "nagad" | "rocket" | "bank">("cash");
  const [txDate, setTxDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setCategory(editing?.category ?? defaultCategory ?? "");
      setAmount(editing ? String(editing.amount) : "");
      setNote(editing?.note ?? "");
      setPaidVia(((editing?.paid_via as "cash" | "bkash" | "nagad" | "rocket" | "bank") ?? "cash"));
      setTxDate((editing?.created_at ?? new Date().toISOString()).slice(0, 10));
    }
  }, [open, editing, defaultCategory]);

  const save = async () => {
    if (!current || !user) return;
    const amt = Number(amount);
    if (!amt || amt <= 0) { toast.error(t("p5_Enter_amount")); return; }
    setBusy(true);
    const createdAt = new Date(txDate + "T00:00:00").toISOString();
    const payload = { category: category.trim() || null, amount: amt, note: note.trim() || null, paid_via: paidVia, shop_id: current.id, created_by: user.id, created_at: createdAt };
    const { error } = editing
      ? await supabase.from("expenses").update(payload).eq("id", editing.id)
      : await supabase.from("expenses").insert(payload);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t("p5_Saved"));
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing
              ? (t("p5_Edit_expense"))
              : category
                ? (lang === "bn" ? `নতুন খরচ — ${category}` : `New expense — ${category}`)
                : (t("p5_New_expense"))}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>{t("p5_Category")}</Label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder={t("p5_Rent_transport")} />
          </div>
          <div className="grid gap-1.5">
            <Label>{t("p5_Amount")}</Label>
            <Input type="number" autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>{t("p5_Date")}</Label>
            <Input type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>{t("p5_Paid_via")}</Label>
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
          <div className="grid gap-1.5">
            <Label>{t("p5_Note")}</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("p5_Cancel")}</Button>
          <Button onClick={save} disabled={busy}>{busy ? "..." : t("p5_Save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ExpenseLedgerPage;
