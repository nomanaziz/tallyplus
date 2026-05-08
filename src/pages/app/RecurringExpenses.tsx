import { useNavigate, Link } from "@/lib/router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Plus, Pencil, Pause, Play, Trash2, Wallet, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/lib/shop";
import { useAuth } from "@/lib/auth";
import { useI18n, fmtMoney } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/app/EmptyState";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Kind = "fixed" | "variable" | "loan";
type LoanMode = "interest_only" | "emi";
type RecExp = {
  id: string;
  shop_id: string;
  name: string;
  category: string;
  kind: Kind;
  amount: number;
  day_of_month: number;
  is_active: boolean;
  loan_principal: number | null;
  loan_annual_interest_rate: number | null;
  loan_term_months: number | null;
  loan_mode: LoanMode | null;
  note: string | null;
};
type DueRow = {
  id: string;
  recurring_expense_id: string;
  due_month: string;
  bill_amount: number;
  status: "pending" | "paid" | "skipped";
  paid_at: string | null;
  paid_via: string | null;
  recurring_expenses?: { name: string; category: string; kind: Kind } | null;
};

const CAT_OPTIONS: { v: string; bn: string; en: string }[] = [
  { v: "rent", bn: "দোকান ভাড়া", en: "Rent" },
  { v: "utility", bn: "বিদ্যুৎ / পানি / গ্যাস", en: "Utility" },
  { v: "salary", bn: "কর্মচারী বেতন", en: "Salary" },
  { v: "loan", bn: "ব্যাংক লোন / কিস্তি", en: "Loan / EMI" },
  { v: "internet", bn: "ইন্টারনেট / ফোন", en: "Internet / Phone" },
  { v: "other", bn: "অন্যান্য", en: "Other" },
];

function calcMonthly(t: { kind: Kind; amount: number; loan_principal?: number | null; loan_annual_interest_rate?: number | null; loan_term_months?: number | null; loan_mode?: LoanMode | null }) {
  if (t.kind !== "loan") return Number(t.amount || 0);
  const p = Number(t.loan_principal || 0);
  const ar = Number(t.loan_annual_interest_rate || 0);
  if (p <= 0) return 0;
  if (t.loan_mode === "emi" && (t.loan_term_months ?? 0) > 0) {
    const r = ar / 100 / 12;
    const n = Number(t.loan_term_months);
    if (r === 0) return Math.round((p / n) * 100) / 100;
    const pw = Math.pow(1 + r, n);
    return Math.round(((p * r * pw) / (pw - 1)) * 100) / 100;
  }
  return Math.round(p * (ar / 100 / 12) * 100) / 100;
}

function RecurringExpensesPage() {
  const { lang } = useI18n();
  const { current } = useShop();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RecExp | null>(null);
  const [payTarget, setPayTarget] = useState<DueRow | null>(null);

  // Auto-generate this month's dues on page open
  useEffect(() => {
    if (!current?.id) return;
    void supabase.rpc("generate_recurring_dues_for_shop", { _shop_id: current.id });
  }, [current?.id]);

  const tplQuery = useQuery({
    queryKey: ["recurring_expenses", current?.id],
    enabled: !!current?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recurring_expenses")
        .select("*")
        .eq("shop_id", current!.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as RecExp[];
    },
  });

  const monthStart = useMemo(() => {
    const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d.toISOString().slice(0, 10);
  }, []);

  const duesQuery = useQuery({
    queryKey: ["recurring_dues", current?.id, monthStart],
    enabled: !!current?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recurring_expense_dues")
        .select("*, recurring_expenses(name, category, kind)")
        .eq("shop_id", current!.id)
        .eq("due_month", monthStart)
        .order("status");
      if (error) throw error;
      return (data ?? []) as unknown as DueRow[];
    },
  });

  const refresh = () => { void tplQuery.refetch(); void duesQuery.refetch(); };

  const onPause = async (r: RecExp) => {
    const { error } = await supabase.from("recurring_expenses").update({ is_active: !r.is_active }).eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    toast.success(lang === "bn" ? "আপডেট হয়েছে" : "Updated");
    refresh();
  };

  const onDelete = async (r: RecExp) => {
    if (!confirm(lang === "bn" ? "ডিলিট করবেন?" : "Delete?")) return;
    const { error } = await supabase.from("recurring_expenses").update({ deleted_at: new Date().toISOString() }).eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    toast.success(lang === "bn" ? "ডিলিট হয়েছে" : "Deleted");
    refresh();
  };

  const tpls = tplQuery.data ?? [];
  const dues = duesQuery.data ?? [];
  const pendingDues = dues.filter((d) => d.status === "pending");
  const totalPending = pendingDues.reduce((s, d) => s + Number(d.bill_amount), 0);
  const totalMonthly = tpls.filter((t) => t.is_active).reduce((s, t) => s + calcMonthly(t), 0);

  return (
    <div className="container px-4 py-4">
      <div className="mb-1 text-xs text-muted-foreground">Recurring Expenses</div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => nav({ to: "/app/dashboard" })}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Wallet className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-extrabold md:text-2xl">{lang === "bn" ? "মাসিক খরচ চার্ট" : "Monthly Expense Chart"}</h1>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }} className="gap-1">
          <Plus className="h-4 w-4" /> {lang === "bn" ? "নতুন মাসিক খরচ" : "New monthly expense"}
        </Button>
      </div>

      {/* KPI */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{lang === "bn" ? "এই মাসের বাকি bill" : "This month pending"}</div>
          <div className="mt-1 text-3xl font-extrabold text-rose-700">{fmtMoney(totalPending, lang)}</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">{pendingDues.length} {lang === "bn" ? "টি বিল" : "bills"}</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{lang === "bn" ? "মাসিক মোট নির্ধারিত" : "Estimated monthly"}</div>
          <div className="mt-1 text-3xl font-extrabold text-amber-700">{fmtMoney(totalMonthly, lang)}</div>
        </div>
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{lang === "bn" ? "চালু আছে" : "Active"}</div>
          <div className="mt-1 text-3xl font-extrabold text-sky-700">{tpls.filter((t) => t.is_active).length}</div>
        </div>
      </div>

      {/* This month dues */}
      <h2 className="mt-6 mb-2 text-sm font-bold">{lang === "bn" ? "এই মাসের বিল" : "This month's bills"}</h2>
      <div className="rounded-xl border bg-card">
        {dues.length === 0 ? (
          <EmptyState icon={<AlertCircle className="h-6 w-6" />} title={lang === "bn" ? "এই মাসের কোনো বিল এখনো তৈরি হয়নি" : "No bills generated yet"} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{lang === "bn" ? "নাম" : "Name"}</TableHead>
                <TableHead>{lang === "bn" ? "ক্যাটাগরি" : "Category"}</TableHead>
                <TableHead className="text-right">{lang === "bn" ? "টাকা" : "Amount"}</TableHead>
                <TableHead>{lang === "bn" ? "অবস্থা" : "Status"}</TableHead>
                <TableHead className="text-right">{lang === "bn" ? "অ্যাকশন" : "Action"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dues.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.recurring_expenses?.name ?? "—"}</TableCell>
                  <TableCell className="text-xs">{d.recurring_expenses?.category}</TableCell>
                  <TableCell className="text-right font-bold tabular-nums">{fmtMoney(Number(d.bill_amount), lang)}</TableCell>
                  <TableCell>
                    {d.status === "paid"
                      ? <Badge className="bg-emerald-600">{lang === "bn" ? "পরিশোধিত" : "Paid"}</Badge>
                      : d.status === "skipped"
                      ? <Badge variant="secondary">{lang === "bn" ? "বাদ" : "Skipped"}</Badge>
                      : <Badge variant="destructive">{lang === "bn" ? "বাকি" : "Pending"}</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    {d.status === "pending" ? (
                      <Button size="sm" onClick={() => setPayTarget(d)}>{lang === "bn" ? "পরিশোধ করুন" : "Pay"}</Button>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">{d.paid_at ? new Date(d.paid_at).toLocaleDateString() : "—"}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Templates */}
      <h2 className="mt-6 mb-2 text-sm font-bold">{lang === "bn" ? "মাসিক খরচের তালিকা (চার্ট)" : "Recurring expense chart"}</h2>
      <div className="rounded-xl border bg-card">
        {tpls.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            {lang === "bn" ? "এখনো কোনো মাসিক খরচ যোগ করা হয়নি। প্রথমে \"নতুন মাসিক খরচ\" দিয়ে ভাড়া, বেতন, বিদ্যুৎ ইত্যাদি যোগ করুন।" : "No recurring expenses yet."}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{lang === "bn" ? "নাম" : "Name"}</TableHead>
                <TableHead>{lang === "bn" ? "ধরন" : "Type"}</TableHead>
                <TableHead className="text-right">{lang === "bn" ? "মাসিক টাকা" : "Monthly amount"}</TableHead>
                <TableHead>{lang === "bn" ? "তারিখ" : "Day"}</TableHead>
                <TableHead>{lang === "bn" ? "অবস্থা" : "Active"}</TableHead>
                <TableHead className="text-right">{lang === "bn" ? "অ্যাকশন" : "Action"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tpls.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">
                    <div>{t.name}</div>
                    <div className="text-[11px] text-muted-foreground">{t.category}</div>
                  </TableCell>
                  <TableCell className="text-xs capitalize">
                    {t.kind === "loan" ? (lang === "bn" ? "লোন" : "Loan") : t.kind === "variable" ? (lang === "bn" ? "পরিবর্তনশীল" : "Variable") : (lang === "bn" ? "ফিক্সড" : "Fixed")}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{fmtMoney(calcMonthly(t), lang)}</TableCell>
                  <TableCell className="text-xs">{t.day_of_month}</TableCell>
                  <TableCell>
                    <Switch checked={t.is_active} onCheckedChange={() => onPause(t)} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(t); setOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(t)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <p className="mt-3 text-[11px] text-muted-foreground">
        {lang === "bn" ? "টিপস: প্রত্যেক মাসে নির্ধারিত তারিখে এই বিলগুলো automatic আপনার খরচের বইতে \"বাকি\" হিসেবে উঠবে। আপনি শুধু \"পরিশোধ করুন\" চাপলেই ক্যাশবক্স থেকে টাকা কেটে নেওয়া হবে।" : "Bills are auto-generated each month on the configured day; pay them with one tap and cashbox is debited."}
      </p>

      <RecExpDialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }} editing={editing} onSaved={refresh} />
      <PayDueDialog target={payTarget} onOpenChange={(v) => { if (!v) setPayTarget(null); }} onSaved={refresh} />
    </div>
  );
}

/* ---------- Template dialog ---------- */
function RecExpDialog({ open, onOpenChange, editing, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; editing: RecExp | null; onSaved: () => void }) {
  const { lang } = useI18n();
  const { current } = useShop();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("rent");
  const [kind, setKind] = useState<Kind>("fixed");
  const [amount, setAmount] = useState("");
  const [day, setDay] = useState("1");
  const [note, setNote] = useState("");
  // loan
  const [principal, setPrincipal] = useState("");
  const [rate, setRate] = useState("");
  const [term, setTerm] = useState("");
  const [loanMode, setLoanMode] = useState<LoanMode>("interest_only");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? "");
    setCategory(editing?.category ?? "rent");
    setKind(editing?.kind ?? "fixed");
    setAmount(editing ? String(editing.amount ?? "") : "");
    setDay(String(editing?.day_of_month ?? 1));
    setNote(editing?.note ?? "");
    setPrincipal(editing?.loan_principal ? String(editing.loan_principal) : "");
    setRate(editing?.loan_annual_interest_rate ? String(editing.loan_annual_interest_rate) : "");
    setTerm(editing?.loan_term_months ? String(editing.loan_term_months) : "");
    setLoanMode((editing?.loan_mode as LoanMode) ?? "interest_only");
  }, [open, editing]);

  const previewMonthly = useMemo(() => calcMonthly({
    kind, amount: Number(amount || 0),
    loan_principal: Number(principal || 0),
    loan_annual_interest_rate: Number(rate || 0),
    loan_term_months: Number(term || 0),
    loan_mode: loanMode,
  }), [kind, amount, principal, rate, term, loanMode]);

  const save = async () => {
    if (!current || !user) return;
    if (!name.trim()) { toast.error(lang === "bn" ? "নাম দিন" : "Enter a name"); return; }
    const d = Math.max(1, Math.min(28, Number(day || 1)));
    const payload = {
      shop_id: current.id, created_by: user.id,
      name: name.trim(), category, kind, day_of_month: d, note: note.trim() || null,
      amount: 0,
      loan_principal: null as number | null,
      loan_annual_interest_rate: null as number | null,
      loan_term_months: null as number | null,
      loan_mode: null as LoanMode | null,
    };
    if (kind === "loan") {
      payload.loan_principal = Number(principal || 0);
      payload.loan_annual_interest_rate = Number(rate || 0);
      payload.loan_term_months = term ? Number(term) : null;
      payload.loan_mode = loanMode;
      payload.amount = previewMonthly;
    } else {
      payload.amount = Number(amount || 0);
    }
    setBusy(true);
    const { error } = editing
      ? await supabase.from("recurring_expenses").update(payload).eq("id", editing.id)
      : await supabase.from("recurring_expenses").insert(payload);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(lang === "bn" ? "সেভ হয়েছে" : "Saved");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? (lang === "bn" ? "মাসিক খরচ এডিট" : "Edit recurring expense") : (lang === "bn" ? "নতুন মাসিক খরচ" : "New recurring expense")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>{lang === "bn" ? "নাম" : "Name"}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={lang === "bn" ? "যেমন: দোকান ভাড়া" : "e.g. Shop rent"} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1.5">
              <Label>{lang === "bn" ? "ক্যাটাগরি" : "Category"}</Label>
              <Select value={category} onValueChange={(v) => { setCategory(v); if (v === "loan") setKind("loan"); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CAT_OPTIONS.map((o) => <SelectItem key={o.v} value={o.v}>{lang === "bn" ? o.bn : o.en}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>{lang === "bn" ? "ধরন" : "Type"}</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as Kind)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">{lang === "bn" ? "ফিক্সড (একই টাকা)" : "Fixed"}</SelectItem>
                  <SelectItem value="variable">{lang === "bn" ? "পরিবর্তনশীল (যেমন বিদ্যুৎ)" : "Variable"}</SelectItem>
                  <SelectItem value="loan">{lang === "bn" ? "লোন / কিস্তি" : "Loan / EMI"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {kind !== "loan" ? (
            <div className="grid gap-1.5">
              <Label>{lang === "bn" ? "মাসিক টাকা" : "Monthly amount"}</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
              {kind === "variable" && (
                <p className="text-[11px] text-muted-foreground">{lang === "bn" ? "প্রতি মাসে পরিশোধের সময় টাকা পরিবর্তন করতে পারবেন।" : "You can change the amount each month before paying."}</p>
              )}
            </div>
          ) : (
            <div className="space-y-3 rounded-md border bg-muted/30 p-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1.5">
                  <Label>{lang === "bn" ? "মূল লোন" : "Principal"}</Label>
                  <Input type="number" value={principal} onChange={(e) => setPrincipal(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label>{lang === "bn" ? "বার্ষিক সুদ %" : "Annual rate %"}</Label>
                  <Input type="number" value={rate} onChange={(e) => setRate(e.target.value)} />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label>{lang === "bn" ? "পরিশোধের ধরন" : "Payment mode"}</Label>
                <Select value={loanMode} onValueChange={(v) => setLoanMode(v as LoanMode)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="interest_only">{lang === "bn" ? "শুধু সুদ প্রতি মাসে" : "Interest only"}</SelectItem>
                    <SelectItem value="emi">{lang === "bn" ? "EMI (সুদ + আসল)" : "EMI (interest + principal)"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {loanMode === "emi" && (
                <div className="grid gap-1.5">
                  <Label>{lang === "bn" ? "মেয়াদ (মাস)" : "Term (months)"}</Label>
                  <Input type="number" value={term} onChange={(e) => setTerm(e.target.value)} />
                </div>
              )}
              <div className="rounded bg-background px-3 py-2 text-xs">
                {lang === "bn" ? "প্রতি মাসে কাটবে:" : "Monthly amount:"} <strong className="text-base">{fmtMoney(previewMonthly, lang)}</strong>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1.5">
              <Label>{lang === "bn" ? "মাসের কত তারিখে" : "Day of month"}</Label>
              <Input type="number" min={1} max={28} value={day} onChange={(e) => setDay(e.target.value)} />
              <p className="text-[10px] text-muted-foreground">{lang === "bn" ? "১–২৮" : "1–28"}</p>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>{lang === "bn" ? "নোট" : "Note"}</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{lang === "bn" ? "বাতিল" : "Cancel"}</Button>
          <Button onClick={save} disabled={busy}>{busy ? "..." : lang === "bn" ? "সেভ করুন" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Pay due dialog ---------- */
function PayDueDialog({ target, onOpenChange, onSaved }: { target: DueRow | null; onOpenChange: (v: boolean) => void; onSaved: () => void }) {
  const { lang } = useI18n();
  const { current } = useShop();
  const { user } = useAuth();
  const [amount, setAmount] = useState("");
  const [paidVia, setPaidVia] = useState<"cash" | "bkash" | "nagad" | "rocket" | "bank">("cash");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (target) { setAmount(String(target.bill_amount)); setPaidVia("cash"); } }, [target]);

  const pay = async () => {
    if (!target || !current || !user) return;
    const amt = Number(amount);
    if (!amt || amt <= 0) { toast.error(lang === "bn" ? "টাকার পরিমাণ দিন" : "Enter amount"); return; }
    setBusy(true);
    // 1. Insert into expenses
    const { data: exp, error: expErr } = await supabase
      .from("expenses")
      .insert({
        shop_id: current.id,
        category: target.recurring_expenses?.name ?? "Recurring",
        amount: amt,
        note: `${target.recurring_expenses?.name ?? ""} (${target.due_month?.slice(0, 7)})`,
        paid_via: paidVia,
        created_by: user.id,
      })
      .select("id")
      .single();
    if (expErr || !exp) { setBusy(false); toast.error(expErr?.message ?? "Failed"); return; }
    // 2. Mark due as paid
    const { error: dueErr } = await supabase
      .from("recurring_expense_dues")
      .update({ status: "paid", paid_at: new Date().toISOString(), paid_via: paidVia, bill_amount: amt, expense_id: exp.id })
      .eq("id", target.id);
    setBusy(false);
    if (dueErr) { toast.error(dueErr.message); return; }
    toast.success(lang === "bn" ? "পরিশোধিত হয়েছে" : "Paid");
    onOpenChange(false);
    onSaved();
  };

  const skip = async () => {
    if (!target) return;
    setBusy(true);
    const { error } = await supabase
      .from("recurring_expense_dues")
      .update({ status: "skipped" })
      .eq("id", target.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{lang === "bn" ? "বিল পরিশোধ" : "Pay bill"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="rounded-md bg-muted px-3 py-2 text-sm">
            <div className="font-semibold">{target?.recurring_expenses?.name}</div>
            <div className="text-xs text-muted-foreground">{target?.due_month?.slice(0, 7)}</div>
          </div>
          <div className="grid gap-1.5">
            <Label>{lang === "bn" ? "টাকার পরিমাণ" : "Amount"}</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
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
        </div>
        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <Button variant="ghost" onClick={skip} disabled={busy}>{lang === "bn" ? "এই মাসে বাদ দিন" : "Skip this month"}</Button>
          <Button onClick={pay} disabled={busy}>{busy ? "..." : lang === "bn" ? "পরিশোধ করুন" : "Pay"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default RecurringExpensesPage;
export { Link };