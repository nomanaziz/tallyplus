import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Wallet, AlertCircle } from "lucide-react";
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
import { ensureDefaultRecurringExpenses } from "@/lib/default-recurring-expenses";

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

export function RecurringExpensesPanel() {
  const { lang, t: tr } = useI18n();
  const { current } = useShop();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RecExp | null>(null);
  const [payTarget, setPayTarget] = useState<DueRow | null>(null);

  // Seed defaults + auto-generate this month's dues on mount
  useEffect(() => {
    if (!current?.id) return;
    (async () => {
      await ensureDefaultRecurringExpenses(current.id, user?.id ?? null);
      await supabase.rpc("generate_recurring_dues_for_shop", { _shop_id: current.id });
      void tplQuery.refetch();
      void duesQuery.refetch();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, user?.id]);

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
    toast.success(tr("p7_Updated"));
    refresh();
  };

  const onDelete = async (r: RecExp) => {
    if (!confirm(tr("p7_Delete"))) return;
    const { error } = await supabase.from("recurring_expenses").update({ deleted_at: new Date().toISOString() }).eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    toast.success(tr("p7_Deleted"));
    refresh();
  };

  const tpls = tplQuery.data ?? [];
  const dues = duesQuery.data ?? [];
  const pendingDues = dues.filter((d) => d.status === "pending");
  const totalPending = pendingDues.reduce((s, d) => s + Number(d.bill_amount), 0);
  const totalMonthly = tpls.filter((t) => t.is_active).reduce((s, t) => s + calcMonthly(t), 0);

  return (
    <section>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          <h2 className="text-base font-bold">
            {lang === "bn" ? "নিয়মিত / মাসিক খরচ" : "Recurring expenses"}
          </h2>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }} className="gap-1">
          <Plus className="h-4 w-4" />
          {lang === "bn" ? "নতুন নিয়মিত খরচ" : "New recurring expense"}
        </Button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{tr("p7_This_month_pending")}</div>
          <div className="mt-1 text-2xl font-extrabold text-rose-700">{fmtMoney(totalPending, lang)}</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">{pendingDues.length} {tr("p7_bills")}</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{tr("p7_Estimated_monthly")}</div>
          <div className="mt-1 text-2xl font-extrabold text-amber-700">{fmtMoney(totalMonthly, lang)}</div>
        </div>
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{tr("p7_Active_2")}</div>
          <div className="mt-1 text-2xl font-extrabold text-sky-700">{tpls.filter((t) => t.is_active).length}</div>
        </div>
      </div>

      {/* Templates */}
      <h3 className="mt-4 mb-2 text-sm font-semibold text-muted-foreground">{tr("p7_Expense_chart")}</h3>
      <div className="rounded-xl border bg-card">
        {tpls.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            {tr("p7_No_recurring_expenses_yet")}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tr("p7_Name")}</TableHead>
                <TableHead>{tr("p7_Type")}</TableHead>
                <TableHead className="text-right">{tr("p7_Monthly_amount")}</TableHead>
                <TableHead>{tr("p7_Day")}</TableHead>
                <TableHead>{tr("p7_Active_3")}</TableHead>
                <TableHead className="text-right">{tr("p7_Action")}</TableHead>
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
                    {t.kind === "loan"
                      ? (tr("p7_Loan"))
                      : t.kind === "variable"
                        ? (lang === "bn" ? "পরিবর্তনশীল পরিমাণ" : "Variable amount")
                        : (lang === "bn" ? "নির্দিষ্ট পরিমাণ" : "Fixed amount")}
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

      {/* This month dues */}
      <h3 className="mt-4 mb-2 text-sm font-semibold text-muted-foreground">{tr("p7_This_month_s_bills")}</h3>
      <div className="rounded-xl border bg-card">
        {dues.length === 0 ? (
          <EmptyState icon={<AlertCircle className="h-6 w-6" />} title={tr("p7_No_bills_generated_yet")} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tr("p7_Name")}</TableHead>
                <TableHead>{tr("p7_Category")}</TableHead>
                <TableHead className="text-right">{tr("p7_Amount_4")}</TableHead>
                <TableHead>{tr("p7_Status")}</TableHead>
                <TableHead className="text-right">{tr("p7_Action")}</TableHead>
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
                      ? <Badge className="bg-emerald-600">{tr("p7_Paid")}</Badge>
                      : d.status === "skipped"
                      ? <Badge variant="secondary">{tr("p7_Skipped")}</Badge>
                      : <Badge variant="destructive">{tr("p7_Pending_2")}</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    {d.status === "pending" ? (
                      <Button size="sm" onClick={() => setPayTarget(d)}>{tr("p7_Pay")}</Button>
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

      <p className="mt-2 text-[11px] text-muted-foreground">
        {tr("p7_Bills_auto_generate_each_month")}
      </p>

      <RecExpDialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }} editing={editing} onSaved={refresh} />
      <PayDueDialog target={payTarget} onOpenChange={(v) => { if (!v) setPayTarget(null); }} onSaved={refresh} />
    </section>
  );
}

/* ---------- Template dialog ---------- */
function RecExpDialog({ open, onOpenChange, editing, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; editing: RecExp | null; onSaved: () => void }) {
  const { lang, t: tr } = useI18n();
  const { current } = useShop();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("rent");
  const [kind, setKind] = useState<Kind>("fixed");
  const [amount, setAmount] = useState("");
  const [day, setDay] = useState("1");
  const [note, setNote] = useState("");
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
    if (!name.trim()) { toast.error(tr("p7_Enter_a_name")); return; }
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
    toast.success(tr("p7_Saved"));
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? (tr("p7_Edit_recurring_expense")) : (tr("p7_New_recurring_expense"))}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>{tr("p7_Name")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={tr("p7_e_g_Shop_rent")} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1.5">
              <Label>{tr("p7_Category")}</Label>
              <Select value={category} onValueChange={(v) => { setCategory(v); if (v === "loan") setKind("loan"); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CAT_OPTIONS.map((o) => <SelectItem key={o.v} value={o.v}>{lang === "bn" ? o.bn : o.en}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>{tr("p7_Type")}</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as Kind)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">{lang === "bn" ? "নির্দিষ্ট পরিমাণ" : "Fixed amount"}</SelectItem>
                  <SelectItem value="variable">{lang === "bn" ? "পরিবর্তনশীল পরিমাণ" : "Variable amount"}</SelectItem>
                  <SelectItem value="loan">{tr("p7_Loan_EMI")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {kind !== "loan" ? (
            <div className="grid gap-1.5">
              <Label>{tr("p7_Monthly_amount")}</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
              {kind === "variable" && (
                <p className="text-[11px] text-muted-foreground">{tr("p7_You_can_change_the_amount_each")}</p>
              )}
            </div>
          ) : (
            <div className="space-y-3 rounded-md border bg-muted/30 p-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1.5">
                  <Label>{tr("p7_Principal")}</Label>
                  <Input type="number" value={principal} onChange={(e) => setPrincipal(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label>{tr("p7_Annual_rate")}</Label>
                  <Input type="number" value={rate} onChange={(e) => setRate(e.target.value)} />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label>{tr("p7_Payment_mode")}</Label>
                <Select value={loanMode} onValueChange={(v) => setLoanMode(v as LoanMode)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="interest_only">{tr("p7_Interest_only")}</SelectItem>
                    <SelectItem value="emi">{tr("p7_EMI_interest_principal")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {loanMode === "emi" && (
                <div className="grid gap-1.5">
                  <Label>{tr("p7_Term_months")}</Label>
                  <Input type="number" value={term} onChange={(e) => setTerm(e.target.value)} />
                </div>
              )}
              <div className="rounded bg-background px-3 py-2 text-xs">
                {tr("p7_Monthly_amount_2")} <strong className="text-base">{fmtMoney(previewMonthly, lang)}</strong>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1.5">
              <Label>{tr("p7_Day_of_month")}</Label>
              <Input type="number" min={1} max={28} value={day} onChange={(e) => setDay(e.target.value)} />
              <p className="text-[10px] text-muted-foreground">{tr("p7_1_28")}</p>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>{tr("p7_Note")}</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{tr("p7_Cancel")}</Button>
          <Button onClick={save} disabled={busy}>{busy ? "..." : tr("p7_Save_4")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Pay due dialog ---------- */
function PayDueDialog({ target, onOpenChange, onSaved }: { target: DueRow | null; onOpenChange: (v: boolean) => void; onSaved: () => void }) {
  const { lang, t: tr } = useI18n();
  const { current } = useShop();
  const { user } = useAuth();
  const [amount, setAmount] = useState("");
  const [paidVia, setPaidVia] = useState<"cash" | "bkash" | "nagad" | "rocket" | "bank">("cash");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (target) { setAmount(String(target.bill_amount)); setPaidVia("cash"); } }, [target]);

  const pay = async () => {
    if (!target || !current || !user) return;
    const amt = Number(amount);
    if (!amt || amt <= 0) { toast.error(tr("p7_Enter_amount_2")); return; }
    setBusy(true);
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
    const { error: dueErr } = await supabase
      .from("recurring_expense_dues")
      .update({ status: "paid", paid_at: new Date().toISOString(), paid_via: paidVia, bill_amount: amt, expense_id: exp.id })
      .eq("id", target.id);
    setBusy(false);
    if (dueErr) { toast.error(dueErr.message); return; }
    toast.success(tr("p7_Paid_2"));
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
          <DialogTitle>{tr("p7_Pay_bill")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="rounded-md bg-muted px-3 py-2 text-sm">
            <div className="font-semibold">{target?.recurring_expenses?.name}</div>
            <div className="text-xs text-muted-foreground">{target?.due_month?.slice(0, 7)}</div>
          </div>
          <div className="grid gap-1.5">
            <Label>{tr("p7_Amount_2")}</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
          </div>
          <div className="grid gap-1.5">
            <Label>{tr("p7_Paid_via")}</Label>
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
          <Button variant="ghost" onClick={skip} disabled={busy}>{tr("p7_Skip_this_month")}</Button>
          <Button onClick={pay} disabled={busy}>{busy ? "..." : tr("p7_Pay_2")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}