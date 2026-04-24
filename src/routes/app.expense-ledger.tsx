import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Coins, ArrowLeft, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/lib/shop";
import { useAuth } from "@/lib/auth";
import { useI18n, fmtMoney } from "@/lib/i18n";
import { expensesListQuery } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DataToolbar } from "@/components/app/DataToolbar";
import { EmptyState } from "@/components/app/EmptyState";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { icons } from "@/lib/icons";

type Expense = {
  id: string;
  category: string | null;
  amount: number;
  note: string | null;
  paid_via: string;
  created_at: string;
};

export const Route = createFileRoute("/app/expense-ledger")({
  component: ExpenseLedgerPage,
});

function ExpenseLedgerPage() {
  const { lang } = useI18n();
  const { current } = useShop();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data: raw = [], refetch } = useQuery(expensesListQuery(current?.id ?? null));
  const list = raw as unknown as Expense[];
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);

  const total = useMemo(() => list.reduce((s, e) => s + Number(e.amount), 0), [list]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? list.filter((e) => (e.category ?? "").toLowerCase().includes(q) || (e.note ?? "").toLowerCase().includes(q)) : list;
  }, [list, search]);

  const refresh = async () => { await qc.invalidateQueries({ queryKey: ["expenses"] }); await refetch(); };

  const onDelete = async (e: Expense) => {
    if (!confirm(lang === "bn" ? "ডিলিট করবেন?" : "Delete?")) return;
    const { error } = await supabase.from("expenses").update({ deleted_at: new Date().toISOString() }).eq("id", e.id);
    if (error) { toast.error(error.message); return; }
    toast.success(lang === "bn" ? "ডিলিট হয়েছে" : "Deleted");
    void refresh();
  };

  return (
    <div className="container px-4 py-4">
      <div className="mb-1 text-xs text-muted-foreground">Expense Ledger</div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => nav({ to: "/app/dashboard" })}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <img src={icons.expense} alt="" className="h-6 w-6" />
          <h1 className="text-xl font-extrabold md:text-2xl">{lang === "bn" ? "খরচের খাতা" : "Expense Ledger"}</h1>
        </div>
        <Button className="h-10 gap-2" onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="h-4 w-4" />
          {lang === "bn" ? "নতুন খরচ" : "New expense"}
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 sm:col-span-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{lang === "bn" ? "মোট খরচ" : "Total expenses"}</div>
          <div className="mt-1 text-3xl font-extrabold text-rose-700">{fmtMoney(total, lang)}</div>
        </div>
      </div>

      <div className="mt-4">
        <DataToolbar search={search} onSearch={setSearch} onRefresh={refresh} placeholder={lang === "bn" ? "ক্যাটাগরি/নোট" : "Category / note"} />
      </div>

      <div className="mt-4 rounded-xl border bg-card">
        {filtered.length === 0 ? (
          <EmptyState icon={<Coins className="h-6 w-6" />} title={lang === "bn" ? "কোনো খরচ নেই" : "No expenses"} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{lang === "bn" ? "তারিখ" : "Date"}</TableHead>
                <TableHead>{lang === "bn" ? "ক্যাটাগরি" : "Category"}</TableHead>
                <TableHead>{lang === "bn" ? "নোট" : "Note"}</TableHead>
                <TableHead className="text-right">{lang === "bn" ? "পরিমাণ" : "Amount"}</TableHead>
                <TableHead>{lang === "bn" ? "ধরন" : "Method"}</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-xs">{new Date(e.created_at).toLocaleDateString()}</TableCell>
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
                          <Pencil className="mr-2 h-4 w-4" /> {lang === "bn" ? "এডিট" : "Edit"}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => onDelete(e)}>
                          <Trash2 className="mr-2 h-4 w-4" /> {lang === "bn" ? "ডিলিট" : "Delete"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <ExpenseDialog open={open} onOpenChange={setOpen} editing={editing} onSaved={refresh} />
    </div>
  );
}

function ExpenseDialog({ open, onOpenChange, editing, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; editing: Expense | null; onSaved: () => void }) {
  const { lang } = useI18n();
  const { current } = useShop();
  const { user } = useAuth();
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [paidVia, setPaidVia] = useState<"cash" | "bkash" | "nagad" | "rocket" | "bank">("cash");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setCategory(editing?.category ?? "");
      setAmount(editing ? String(editing.amount) : "");
      setNote(editing?.note ?? "");
      setPaidVia(((editing?.paid_via as "cash" | "bkash" | "nagad" | "rocket" | "bank") ?? "cash"));
    }
  }, [open, editing]);

  const save = async () => {
    if (!current || !user) return;
    const amt = Number(amount);
    if (!amt || amt <= 0) { toast.error(lang === "bn" ? "পরিমাণ দিন" : "Enter amount"); return; }
    setBusy(true);
    const payload = { category: category.trim() || null, amount: amt, note: note.trim() || null, paid_via: paidVia, shop_id: current.id, created_by: user.id };
    const { error } = editing
      ? await supabase.from("expenses").update(payload).eq("id", editing.id)
      : await supabase.from("expenses").insert(payload);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(lang === "bn" ? "সেভ হয়েছে" : "Saved");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? (lang === "bn" ? "খরচ এডিট" : "Edit expense") : (lang === "bn" ? "নতুন খরচ" : "New expense")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>{lang === "bn" ? "ক্যাটাগরি" : "Category"}</Label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder={lang === "bn" ? "যেমন: ভাড়া, পরিবহন" : "Rent, transport..."} />
          </div>
          <div className="grid gap-1.5">
            <Label>{lang === "bn" ? "পরিমাণ" : "Amount"}</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>{lang === "bn" ? "পেমেন্ট মাধ্যম" : "Paid via"}</Label>
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
            <Label>{lang === "bn" ? "নোট" : "Note"}</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
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
