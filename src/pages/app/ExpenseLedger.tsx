import { useNavigate } from "@/lib/router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Coins, ArrowLeft, MoreVertical, Pencil, Trash2, Home, Truck, Zap, User, MoreHorizontal, Plus, CalendarClock } from "lucide-react";
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
import { DateRangePicker } from "@/components/app/DateRangePicker";
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
const PRESET_CATS: { key: CatKey; bn: string; en: string; icon: React.ReactNode }[] = [
  { key: "rent", bn: "দোকান ভাড়া", en: "Rent", icon: <Home className="h-4 w-4" /> },
  { key: "transport", bn: "পরিবহন", en: "Transport", icon: <Truck className="h-4 w-4" /> },
  { key: "utility", bn: "ইউটিলিটি", en: "Utility", icon: <Zap className="h-4 w-4" /> },
  { key: "salary", bn: "বেতন", en: "Salary", icon: <User className="h-4 w-4" /> },
  { key: "other", bn: "অন্যান্য", en: "Other", icon: <MoreHorizontal className="h-4 w-4" /> },
];

function ExpenseLedgerPage() {
  const { lang, t } = useI18n();
  const { current } = useShop();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data: raw = [], refetch } = useQuery(expensesListQuery(current?.id ?? null));
  const list = raw as unknown as Expense[];
  const [search, setSearch] = useState("");
  const today0 = new Date();
  const firstOfMonth0 = new Date(today0.getFullYear(), today0.getMonth(), 1);
  const [from, setFrom] = useState(firstOfMonth0.toISOString().slice(0, 10));
  const [to, setTo] = useState(today0.toISOString().slice(0, 10));
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [presetCat, setPresetCat] = useState<string | null>(null);
  const [showRecurring, setShowRecurring] = useState(false);
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const fromTs = new Date(from + "T00:00:00").getTime();
    const toTs = new Date(to + "T23:59:59").getTime();
    return list.filter((e) => {
      const ts = new Date(e.created_at).getTime();
      if (ts < fromTs || ts > toTs) return false;
      if (!q) return true;
      return (e.category ?? "").toLowerCase().includes(q) || (e.note ?? "").toLowerCase().includes(q);
    });
  }, [list, search, from, to]);
  const total = useMemo(() => filtered.reduce((s, e) => s + Number(e.amount), 0), [filtered]);
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
      {/* Compact header row: back, title, total, add button */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => nav({ to: "/app/dashboard" })}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <AppIcon name="expense" className="h-5 w-5" />
          <h1 className="text-lg font-extrabold md:text-xl">{t("p5_Expense_Book")}</h1>
          <span className="ml-2 rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">
            {t("p5_Total_expenses")}: {fmtMoney(total, lang)}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={showRecurring ? "default" : "outline"}
            onClick={() => setShowRecurring((v) => !v)}
            className="gap-1"
          >
            <CalendarClock className="h-4 w-4" /> {lang === "bn" ? "নিয়মিত খরচ" : "Recurring"}
          </Button>
          <Button size="sm" onClick={() => { setEditing(null); setPresetCat(null); setOpen(true); }} className="gap-1">
            <Plus className="h-4 w-4" /> {lang === "bn" ? "খরচ যোগ করুন" : "Add Expense"}
          </Button>
        </div>
      </div>

      {showRecurring && (
        <div className="mt-4">
          <RecurringExpensesPanel />
        </div>
      )}

      <div className="mt-4">
        <DataToolbar search={search} onSearch={setSearch} onRefresh={refresh} placeholder={t("p5_Category_note")} />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <DateRangePicker
            value={{ start: from, end: to }}
            onChange={(v) => { setFrom(v.start); setTo(v.end); }}
            lang={lang === "bn" ? "bn" : "en"}
          />
        </div>
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
        presetCats={PRESET_CATS.map((c) => (lang === "bn" ? c.bn : c.en))}
        customCats={customCats}
        onAddCustomCategory={addCustomCategory}
        onSaved={refresh}
      />
    </div>
  );
}

function ExpenseDialog({ open, onOpenChange, editing, defaultCategory, presetCats = [], customCats = [], onAddCustomCategory, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; editing: Expense | null; defaultCategory?: string | null; presetCats?: string[]; customCats?: string[]; onAddCustomCategory?: () => void; onSaved: () => void }) {
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
            <Select
              value={category || "__none__"}
              onValueChange={(v) => {
                if (v === "__new__") { onAddCustomCategory?.(); return; }
                setCategory(v === "__none__" ? "" : v);
              }}
            >
              <SelectTrigger><SelectValue placeholder={t("p5_Rent_transport")} /></SelectTrigger>
              <SelectContent>
                {Array.from(new Set([...presetCats, ...customCats, ...(category && ![...presetCats, ...customCats].includes(category) ? [category] : [])])).map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
                {onAddCustomCategory && (
                  <SelectItem value="__new__" className="font-semibold text-primary">
                    + {lang === "bn" ? "নতুন ক্যাটাগরি যুক্ত করুন" : "Add new category"}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
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
