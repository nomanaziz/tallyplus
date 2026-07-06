import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Wallet, PlusCircle, ListPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/lib/shop";
import { useAuth } from "@/lib/auth";
import { useI18n, fmtMoney } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ensureDefaultRecurringExpenses, DEFAULT_RECURRING_EXPENSES } from "@/lib/default-recurring-expenses";

const DEFAULT_NAMES = new Set(DEFAULT_RECURRING_EXPENSES.map((d) => d.name));
const isDefaultTpl = (t: { name: string }) => DEFAULT_NAMES.has(t.name);

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
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addingAll, setAddingAll] = useState(false);

  // Seed defaults on mount. No auto-generated dues — recurring items are
  // just templates; user clicks "Add" or "Add all" to push them into the
  // regular expenses ledger.
  useEffect(() => {
    if (!current?.id) return;
    (async () => {
      await ensureDefaultRecurringExpenses(current.id, user?.id ?? null);
      void tplQuery.refetch();
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

  const refresh = () => { void tplQuery.refetch(); };

  const onDelete = async (r: RecExp) => {
    if (!confirm(tr("p7_Delete"))) return;
    const { error } = await supabase.from("recurring_expenses").update({ deleted_at: new Date().toISOString() }).eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    toast.success(tr("p7_Deleted"));
    refresh();
  };

  const tpls = tplQuery.data ?? [];
  const totalMonthly = tpls.reduce((s, t) => s + calcMonthly(t), 0);

  const addOne = async (t: RecExp) => {
    if (!current || !user) return;
    const amt = calcMonthly(t);
    if (amt <= 0) { toast.error(lang === "bn" ? "পরিমাণ ঠিক করে দিন" : "Set an amount first"); return; }
    setAddingId(t.id);
    const { error } = await supabase.from("expenses").insert({
      shop_id: current.id, created_by: user.id,
      category: t.name, amount: amt, note: t.note || null,
      paid_via: "cash", created_at: new Date().toISOString(),
    });
    setAddingId(null);
    if (error) { toast.error(error.message); return; }
    toast.success(lang === "bn" ? `যোগ হয়েছে: ${t.name}` : `Added: ${t.name}`);
  };

  const addAll = async () => {
    if (!current || !user) return;
    const rows = tpls
      .map((t) => ({ t, amt: calcMonthly(t) }))
      .filter((r) => r.amt > 0)
      .map(({ t, amt }) => ({
        shop_id: current.id, created_by: user.id,
        category: t.name, amount: amt, note: t.note || null,
        paid_via: "cash" as const, created_at: new Date().toISOString(),
      }));
    if (rows.length === 0) { toast.error(lang === "bn" ? "যোগ করার মতো কিছু নেই" : "Nothing to add"); return; }
    if (!confirm(lang === "bn"
      ? `সব ${rows.length}টি নিয়মিত খরচ খরচের খাতায় যোগ হবে। নিশ্চিত?`
      : `Add all ${rows.length} recurring items to expenses?`)) return;
    setAddingAll(true);
    const { error } = await supabase.from("expenses").insert(rows);
    setAddingAll(false);
    if (error) { toast.error(error.message); return; }
    toast.success(lang === "bn" ? `${rows.length}টি খরচ যোগ হয়েছে` : `${rows.length} expenses added`);
  };

  return (
    <section>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          <h2 className="text-base font-bold">
            {lang === "bn" ? "নিয়মিত / মাসিক খরচ" : "Recurring expenses"}
          </h2>
          <Badge variant="secondary" className="text-[10px]">
            {lang === "bn" ? "টেমপ্লেট" : "Templates"}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="default"
            onClick={addAll}
            disabled={addingAll || tpls.length === 0}
            className="gap-1"
          >
            <ListPlus className="h-4 w-4" />
            {addingAll
              ? (lang === "bn" ? "যোগ হচ্ছে..." : "Adding...")
              : (lang === "bn" ? "সব যোগ করো" : "Add all")}
          </Button>
          <Button size="sm" variant="outline" onClick={() => { setEditing(null); setOpen(true); }} className="gap-1">
            <Plus className="h-4 w-4" />
            {lang === "bn" ? "নতুন টেমপ্লেট" : "New template"}
          </Button>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        {lang === "bn"
          ? `এগুলা শুধু টেমপ্লেট। "সব যোগ করো" চাপলে সব নিয়মিত খরচ একসাথে খরচের খাতায় যাবে, অথবা প্রতিটির পাশে "যোগ" চেপে আলাদা আলাদা যোগ করতে পারেন। মাসিক আনুমানিক: ${fmtMoney(totalMonthly, lang)}`
          : `These are just templates. Click "Add all" to push every item into the expense ledger at once, or "Add" per row. Monthly estimate: ${fmtMoney(totalMonthly, lang)}`}
      </p>

      {/* Templates */}
      <div className="mt-3 rounded-xl border bg-card">
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
                <TableHead className="text-right">{tr("p7_Action")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tpls.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-1.5">
                      <span>{t.name}</span>
                      {isDefaultTpl(t) && (
                        <Badge variant="secondary" className="h-4 px-1.5 text-[9px]">
                          {lang === "bn" ? "নির্দিষ্ট" : "fixed"}
                        </Badge>
                      )}
                    </div>
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
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="mr-1 h-8 gap-1"
                      disabled={addingId === t.id}
                      onClick={() => addOne(t)}
                    >
                      <PlusCircle className="h-3.5 w-3.5" />
                      {addingId === t.id ? "..." : (lang === "bn" ? "যোগ" : "Add")}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(t); setOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {!isDefaultTpl(t) && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(t)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <RecExpDialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }} editing={editing} onSaved={refresh} />
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
  const locked = !!editing && isDefaultTpl(editing);

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
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={tr("p7_e_g_Shop_rent")} readOnly={locked} disabled={locked} />
            {locked && (
              <p className="text-[11px] text-muted-foreground">
                {lang === "bn" ? "নির্দিষ্ট ক্যাটাগরির নাম পরিবর্তন করা যাবে না।" : "Fixed category name can't be changed."}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1.5">
              <Label>{tr("p7_Category")}</Label>
              <Select value={category} disabled={locked} onValueChange={(v) => { setCategory(v); if (v === "loan") setKind("loan"); }}>
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