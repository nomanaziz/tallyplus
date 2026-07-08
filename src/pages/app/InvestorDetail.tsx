import { getNumLocale } from "@/lib/i18n";
import { useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "@/lib/router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/lib/shop";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RequirePerm } from "@/components/app/RequirePerm";
import { ArrowLeft, Plus, User, Phone, MapPin, Wallet, CheckCircle2, Clock, Trash2, TrendingUp, TrendingDown, RotateCcw, Pencil } from "lucide-react";
import { toast } from "sonner";
import { computeSchedule, computeLateFee, INTEREST_TYPES, SOURCE_TYPE_LABEL, type InterestType } from "@/lib/investor-emi";
import { PinConfirmDialog } from "@/components/app/PinConfirmDialog";

function bdt(n: number) {
  return new Intl.NumberFormat(getNumLocale(), { maximumFractionDigits: 0 }).format(n) + " ৳";
}

type Investor = { id: string; name: string; phone: string | null; address: string | null; source_type: string; source_name: string | null; note: string | null; is_active: boolean };
type Loan = { id: string; principal: number; taken_at: string; interest_type: string; interest_rate: number; tenure_months: number; installment_day: number; first_due_date: string; total_payable: number; total_interest: number; status: string; note: string | null; profit_share_pct: number; loss_share_pct: number; late_fee_amount: number; late_fee_percent: number; late_fee_grace_days: number };
type Installment = { id: string; loan_id: string; seq_no: number; due_date: string; principal_part: number; interest_part: number; total_due: number; paid_amount: number; paid_at: string | null; status: string };
type Payment = { id: string; loan_id: string; installment_id: string | null; amount: number; principal_part: number; interest_part: number; paid_at: string; method: string; note: string | null; expense_id: string | null; kind: string };

function InvestorDetailInner() {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { current } = useShop();
  const { user } = useAuth();
  const shopId = current?.id ?? null;

  const invQ = useQuery({
    queryKey: ["investor", id],
    enabled: !!id && !!shopId,
    queryFn: async () => {
      const { data, error } = await supabase.from("investors").select("*").eq("id", id!).eq("shop_id", shopId!).maybeSingle();
      if (error) throw error;
      return data as Investor | null;
    },
  });

  const loansQ = useQuery({
    queryKey: ["investor_loans_of", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("investor_loans").select("*").eq("investor_id", id!).order("taken_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Loan[];
    },
  });

  const loanIds = (loansQ.data ?? []).map((l) => l.id);

  const instQ = useQuery({
    queryKey: ["investor_installments_of", loanIds.join(",")],
    enabled: loanIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("investor_installments").select("*").in("loan_id", loanIds).order("seq_no");
      if (error) throw error;
      return (data ?? []) as Installment[];
    },
  });

  const payQ = useQuery({
    queryKey: ["investor_payments_of", loanIds.join(",")],
    enabled: loanIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("investor_payments").select("*").in("loan_id", loanIds).order("paid_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Payment[];
    },
  });

  const invalidateAll = () => {
    // refetchType:'all' — force refetch even for inactive queries (Investors
    // list page isn't mounted while we're on the detail page, so the default
    // 'active' mode would leave its stale cache showing zeros).
    qc.invalidateQueries({ queryKey: ["investor_loans_of", id], refetchType: "all" });
    qc.invalidateQueries({ queryKey: ["investor_installments_of", loanIds.join(",")], refetchType: "all" });
    qc.invalidateQueries({ queryKey: ["investor_payments_of", loanIds.join(",")], refetchType: "all" });
    qc.invalidateQueries({ queryKey: ["investor_loans", shopId], refetchType: "all" });
    qc.invalidateQueries({ queryKey: ["investor_payments", shopId], refetchType: "all" });
    qc.invalidateQueries({ queryKey: ["expenses"], refetchType: "all" });
  };

  const totals = useMemo(() => {
    const loans = loansQ.data ?? [];
    const pays = payQ.data ?? [];
    let taken = 0, payable = 0, interest = 0, paid = 0, paidInterest = 0, paidPrincipal = 0;
    for (const l of loans) { taken += Number(l.principal); payable += Number(l.total_payable); interest += Number(l.total_interest); }
    for (const p of pays) {
      // Repayment = installment + principal_return + loss_share.
      // loss_share reduces principal owed to partner (তারা নিজে লোকসান নিলো)।
      // profit_share = extra খরচ, principal-এর সাথে সম্পর্ক নেই — skip.
      if (p.kind === "installment" || p.kind === "principal_return" || p.kind === "loss_share") {
        paid += Number(p.amount);
        paidInterest += Number(p.interest_part);
        paidPrincipal += Number(p.principal_part);
      }
    }
    return { taken, payable, interest, paid, paidInterest, paidPrincipal, outstanding: payable - paid };
  }, [loansQ.data, payQ.data]);

  // --- Add loan dialog ---
  const [openLoan, setOpenLoan] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [loan, setLoan] = useState({
    principal: "",
    taken_at: today,
    interest_type: "flat" as InterestType,
    interest_rate: "",
    tenure_months: "12",
    installment_day: "5",
    first_due_date: today,
    note: "",
    profit_share_pct: "",
    loss_share_pct: "",
    late_fee_amount: "",
    late_fee_percent: "",
    late_fee_grace_days: "0",
  });
  const preview = useMemo(() => {
    const p = Number(loan.principal) || 0;
    const r = Number(loan.interest_rate) || 0;
    const t = Number(loan.tenure_months) || 0;
    if (!p || !t) return null;
    return computeSchedule({ principal: p, interestRate: r, interestType: loan.interest_type, tenureMonths: t, firstDueDate: loan.first_due_date });
  }, [loan]);

  const [savingLoan, setSavingLoan] = useState(false);
  const saveLoan = async () => {
    if (!current || !id) return;
    const p = Number(loan.principal);
    const isPS = loan.interest_type === "profit_share";
    const isOpen = loan.interest_type === "open";
    const t = isPS || isOpen ? 1 : Number(loan.tenure_months);
    if (!p || p <= 0) return toast.error("মূল টাকা দিন");
    if (!isPS && !isOpen && (!t || t <= 0)) return toast.error("কিস্তির সংখ্যা দিন");
    const day = Math.max(1, Math.min(28, Number(loan.installment_day) || 1));
    setSavingLoan(true);
    const { data: loanRow, error } = await supabase.from("investor_loans").insert({
      shop_id: current.id,
      investor_id: id,
      principal: p,
      taken_at: loan.taken_at,
      interest_type: loan.interest_type,
      interest_rate: isPS || isOpen ? 0 : (Number(loan.interest_rate) || 0),
      tenure_months: t,
      installment_day: day,
      first_due_date: loan.first_due_date,
      note: loan.note.trim() || null,
      profit_share_pct: isPS ? (Number(loan.profit_share_pct) || 0) : 0,
      loss_share_pct: isPS ? (Number(loan.loss_share_pct) || 0) : 0,
      late_fee_amount: isPS || isOpen ? 0 : (Number(loan.late_fee_amount) || 0),
      late_fee_percent: isPS || isOpen ? 0 : (Number(loan.late_fee_percent) || 0),
      late_fee_grace_days: isPS || isOpen ? 0 : (Number(loan.late_fee_grace_days) || 0),
    }).select("id").maybeSingle();
    setSavingLoan(false);
    if (error) return toast.error(error.message);
    // Mirror to cash flow: taking a loan brings money IN to the shop
    const invName = invQ.data?.name ?? "";
    await supabase.from("cash_movements").insert({
      shop_id: current.id,
      amount: p,
      direction: "in",
      note: `বিনিয়োগ গ্রহণ — ${invName}`,
      ref_table: "investor_loans",
      ref_id: loanRow?.id ?? null,
      created_by: user?.id ?? null,
    });
    toast.success("বিনিয়োগ যোগ হয়েছে — কিস্তির schedule তৈরি হয়েছে");
    setOpenLoan(false);
    setLoan({ ...loan, principal: "", interest_rate: "", note: "" });
    invalidateAll();
  };

  // --- Pay installment dialog ---
  const [payInst, setPayInst] = useState<Installment | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<"cash" | "bkash" | "nagad" | "bank">("cash");
  const [payDate, setPayDate] = useState(today);
  const [payNote, setPayNote] = useState("");
  const [savingPay, setSavingPay] = useState(false);

  const openPay = (inst: Installment) => {
    setPayInst(inst);
    setPayAmount(String(inst.total_due - inst.paid_amount));
    setPayMethod("cash");
    setPayDate(today);
    setPayNote("");
  };

  // --- Partner settle (profit/loss/principal return) dialog ---
  const [settleFor, setSettleFor] = useState<Loan | null>(null);
  const [settleKind, setSettleKind] = useState<"profit_share" | "loss_share" | "principal_return">("profit_share");
  const [settleBase, setSettleBase] = useState(""); // business profit/loss amount
  const [settleAmount, setSettleAmount] = useState(""); // final amount to move
  const [settleMethod, setSettleMethod] = useState<"cash" | "bkash" | "nagad" | "bank">("cash");
  const [settleDate, setSettleDate] = useState(today);
  const [settleNote, setSettleNote] = useState("");
  const [savingSettle, setSavingSettle] = useState(false);

  const openSettle = (l: Loan, kind: typeof settleKind) => {
    setSettleFor(l);
    setSettleKind(kind);
    setSettleBase("");
    setSettleAmount("");
    setSettleMethod("cash");
    setSettleDate(today);
    setSettleNote("");
  };

  // auto-compute settle amount from base × share%
  const settleComputed = useMemo(() => {
    if (!settleFor) return 0;
    const b = Number(settleBase) || 0;
    if (settleKind === "profit_share") return Math.round(b * Number(settleFor.profit_share_pct) / 100 * 100) / 100;
    if (settleKind === "loss_share") return Math.round(b * Number(settleFor.loss_share_pct) / 100 * 100) / 100;
    return 0;
  }, [settleFor, settleBase, settleKind]);

  const saveSettle = async () => {
    if (!settleFor || !current) return;
    const amt = Number(settleAmount) || (settleKind !== "principal_return" ? settleComputed : 0);
    if (!amt || amt <= 0) return toast.error("সঠিক পরিমাণ দিন");
    setSavingSettle(true);
    const invName = invQ.data?.name ?? "";
    const kindLabel = settleKind === "profit_share" ? "লাভের অংশ" : settleKind === "loss_share" ? "লোকসানের অংশ" : "মূল ফেরত";
    const direction: "in" | "out" = settleKind === "loss_share" ? "in" : "out";

    // 1) mirror to expense/income + cash flow
    let expenseId: string | null = null;
    if (direction === "out") {
      const { data: exp, error: eErr } = await supabase.from("expenses").insert({
        shop_id: current.id,
        category: settleKind === "profit_share" ? "Partner লাভের অংশ" : "Partner মূল ফেরত",
        amount: amt,
        note: `${invName}${settleNote ? " — " + settleNote : ""}`,
        paid_via: settleMethod as any,
        created_by: user?.id ?? null,
      }).select("id").maybeSingle();
      if (eErr) { setSavingSettle(false); return toast.error(eErr.message); }
      expenseId = exp?.id ?? null;
    }

    // 2) payment record
    const { data: pRow, error: pErr } = await supabase.from("investor_payments").insert({
      shop_id: current.id,
      loan_id: settleFor.id,
      installment_id: null,
      amount: amt,
      // loss_share ও principal_return — দুটোই partner-এর মূল টাকা কমায়।
      principal_part: (settleKind === "principal_return" || settleKind === "loss_share") ? amt : 0,
      interest_part: 0,
      paid_at: settleDate,
      method: settleMethod,
      expense_id: expenseId,
      note: `${kindLabel}${settleNote ? " — " + settleNote : ""}`,
      kind: settleKind,
    }).select("id").maybeSingle();
    if (pErr) { setSavingSettle(false); return toast.error(pErr.message); }

    // 3) cash flow mirror
    await supabase.from("cash_movements").insert({
      shop_id: current.id,
      amount: amt,
      direction,
      note: `${invName} — ${kindLabel}`,
      ref_table: "investor_payments",
      ref_id: pRow?.id ?? null,
      created_by: user?.id ?? null,
    });

    // 4) close loan if partner-এর মূল টাকা পূরণ (ফেরত + লোকসানে শেষ)
    if (settleKind === "principal_return" || settleKind === "loss_share") {
      const reducedBefore = (payQ.data ?? [])
        .filter((p) => p.loan_id === settleFor.id && (p.kind === "principal_return" || p.kind === "loss_share"))
        .reduce((s, p) => s + Number(p.amount), 0);
      if (reducedBefore + amt >= Number(settleFor.principal) - 0.01) {
        await supabase.from("investor_loans").update({ status: "closed" }).eq("id", settleFor.id);
      }
    }

    setSavingSettle(false);
    toast.success("সংরক্ষিত হয়েছে");
    setSettleFor(null);
    invalidateAll();
  };

  const savePay = async () => {
    if (!payInst || !current) return;
    const amt = Number(payAmount);
    if (!amt || amt <= 0) return toast.error("সঠিক টাকা দিন");
    // Cascade across current + subsequent unpaid installments of the same loan.
    // এতে user চাইলে আজকেই আগের বেশি কিস্তি দিয়ে দিতে পারেন।
    const loanInsts = (instQ.data ?? [])
      .filter((x) => x.loan_id === payInst.loan_id && x.status !== "paid")
      .sort((a, b) => a.seq_no - b.seq_no);
    const ordered: Installment[] = [
      payInst,
      ...loanInsts.filter((x) => x.id !== payInst.id && x.seq_no > payInst.seq_no),
    ];
    const totalRemaining = ordered.reduce((s, x) => s + (Number(x.total_due) - Number(x.paid_amount)), 0);
    if (amt > totalRemaining + 0.01) {
      return toast.error(`সর্বোচ্চ ${bdt(totalRemaining)} — এর বেশি বাকি নেই`);
    }

    setSavingPay(true);
    // 1) create ONE expense entry for the full amount
    const invName = invQ.data?.name ?? "";
    const { data: exp, error: expErr } = await supabase.from("expenses").insert({
      shop_id: current.id,
      category: "বিনিয়োগের কিস্তি",
      amount: amt,
      note: `${invName} — কিস্তি #${payInst.seq_no}${ordered.length > 1 ? "+" : ""}${payNote ? " — " + payNote : ""}`,
      paid_via: payMethod as any,
      created_by: user?.id ?? null,
    }).select("id").maybeSingle();
    if (expErr) { setSavingPay(false); return toast.error(expErr.message); }

    // 2) distribute across installments in order → one payment row per installment
    let leftover = amt;
    let firstPayId: string | null = null;
    for (const ins of ordered) {
      if (leftover <= 0.001) break;
      const remainingIns = Number(ins.total_due) - Number(ins.paid_amount);
      if (remainingIns <= 0.001) continue;
      const slice = Math.min(leftover, remainingIns);
      const rIn = Number(ins.total_due) > 0 ? Number(ins.interest_part) / Number(ins.total_due) : 0;
      const iPart = Math.round(slice * rIn * 100) / 100;
      const pPart = Math.round((slice - iPart) * 100) / 100;
      const { data: payRow, error: payErr } = await supabase.from("investor_payments").insert({
        shop_id: current.id,
        loan_id: ins.loan_id,
        installment_id: ins.id,
        amount: slice,
        principal_part: pPart,
        interest_part: iPart,
        paid_at: payDate,
        method: payMethod,
        expense_id: exp?.id ?? null,
        note: payNote.trim() || null,
      }).select("id").maybeSingle();
      if (payErr) { setSavingPay(false); return toast.error(payErr.message); }
      if (!firstPayId) firstPayId = payRow?.id ?? null;
      const newPaid = Number(ins.paid_amount) + slice;
      const status = newPaid >= Number(ins.total_due) - 0.01 ? "paid" : "partial";
      await supabase.from("investor_installments").update({
        paid_amount: newPaid,
        paid_at: status === "paid" ? payDate : ins.paid_at,
        status,
      }).eq("id", ins.id);
      leftover = Math.round((leftover - slice) * 100) / 100;
    }
    // Mirror ONE cash-out for the full amount (linked to first payment row)
    await supabase.from("cash_movements").insert({
      shop_id: current.id,
      amount: amt,
      direction: "out",
      note: `বিনিয়োগ পরিশোধ — ${invName} — কিস্তি #${payInst.seq_no}`,
      ref_table: "investor_payments",
      ref_id: firstPayId,
      created_by: user?.id ?? null,
    });

    // 3) close loan if fully paid
    const stillUnpaid = (instQ.data ?? []).filter(
      (x) => x.loan_id === payInst.loan_id && !ordered.some((o) => o.id === x.id),
    );
    if (stillUnpaid.length === 0 && Math.abs(amt - totalRemaining) < 0.01) {
      await supabase.from("investor_loans").update({ status: "closed" }).eq("id", payInst.loan_id);
    }

    setSavingPay(false);
    toast.success("পরিশোধ রেকর্ড হয়েছে ও খরচে যোগ হয়েছে");
    setPayInst(null);
    invalidateAll();
  };

  // --- Delete loan ---
  const [pinDel, setPinDel] = useState<null | { kind: "loan" | "pay"; id: string; expense_id?: string | null; loan_id?: string }>(null);

  const doDeleteLoan = async (loanId: string) => {
    const { error } = await supabase.from("investor_loans").delete().eq("id", loanId);
    if (error) return toast.error(error.message);
    toast.success("মুছে ফেলা হয়েছে");
    invalidateAll();
  };

  const doDeletePartnerPay = async (payId: string, expenseId: string | null, loanId: string) => {
    await supabase.from("cash_movements").delete().eq("ref_table", "investor_payments").eq("ref_id", payId);
    if (expenseId) await supabase.from("expenses").delete().eq("id", expenseId);
    const { error } = await supabase.from("investor_payments").delete().eq("id", payId);
    if (error) return toast.error(error.message);
    await supabase.from("investor_loans").update({ status: "open" }).eq("id", loanId).eq("status", "closed");
    toast.success("মুছে ফেলা হয়েছে");
    invalidateAll();
  };

  // --- Edit investor name/phone ---
  const [editInv, setEditInv] = useState(false);
  const [eName, setEName] = useState("");
  const [ePhone, setEPhone] = useState("");
  const [savingInv, setSavingInv] = useState(false);
  const openEditInv = () => {
    setEName(invQ.data?.name ?? "");
    setEPhone(invQ.data?.phone ?? "");
    setEditInv(true);
  };
  const saveInv = async () => {
    if (!id) return;
    if (!eName.trim()) return toast.error("নাম দিন");
    setSavingInv(true);
    const { error } = await supabase.from("investors").update({ name: eName.trim(), phone: ePhone.trim() || null }).eq("id", id);
    setSavingInv(false);
    if (error) return toast.error(error.message);
    toast.success("আপডেট হয়েছে");
    qc.invalidateQueries({ queryKey: ["investor", id] });
    qc.invalidateQueries({ queryKey: ["investors"], refetchType: "all" });
    setEditInv(false);
  };

  // --- Edit a single partner payment ---
  const [editPay, setEditPay] = useState<Payment | null>(null);
  const [ePayAmount, setEPayAmount] = useState("");
  const [ePayMethod, setEPayMethod] = useState<"cash" | "bkash" | "nagad" | "bank">("cash");
  const [ePayDate, setEPayDate] = useState(today);
  const [ePayNote, setEPayNote] = useState("");
  const [savingEditPay, setSavingEditPay] = useState(false);

  const openEditPay = (p: Payment) => {
    setEditPay(p);
    setEPayAmount(String(p.amount));
    setEPayMethod((p.method as any) || "cash");
    setEPayDate(p.paid_at);
    setEPayNote(p.note ?? "");
  };

  const saveEditPay = async () => {
    if (!editPay) return;
    const amt = Number(ePayAmount);
    if (!amt || amt <= 0) return toast.error("সঠিক পরিমাণ দিন");
    setSavingEditPay(true);
    const affectsPrincipal = editPay.kind === "principal_return" || editPay.kind === "loss_share";
    const { error } = await supabase.from("investor_payments").update({
      amount: amt,
      principal_part: affectsPrincipal ? amt : 0,
      paid_at: ePayDate,
      method: ePayMethod,
      note: ePayNote.trim() || null,
    }).eq("id", editPay.id);
    if (error) { setSavingEditPay(false); return toast.error(error.message); }
    // sync linked expense
    if (editPay.expense_id) {
      await supabase.from("expenses").update({ amount: amt, paid_via: ePayMethod as any }).eq("id", editPay.expense_id);
    }
    // sync linked cash movement
    await supabase.from("cash_movements").update({ amount: amt })
      .eq("ref_table", "investor_payments").eq("ref_id", editPay.id);
    setSavingEditPay(false);
    toast.success("সম্পাদিত হয়েছে");
    setEditPay(null);
    invalidateAll();
  };

  const inv = invQ.data;

  return (
    <div className="container px-4 py-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => nav({ to: "/app/investors" })}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <User className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-extrabold md:text-xl">{inv?.name ?? "…"}</h1>
          {inv && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={openEditInv} title="নাম/ফোন edit">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {inv && (
            <span className="rounded-md border px-2 py-0.5 text-xs text-muted-foreground">
              {SOURCE_TYPE_LABEL[inv.source_type] ?? inv.source_type}{inv.source_name ? ` • ${inv.source_name}` : ""}
            </span>
          )}
        </div>
        <Button size="sm" onClick={() => setOpenLoan(true)}>
          <Plus className="mr-1 h-4 w-4" /> নতুন বিনিয়োগ
        </Button>
      </div>

      {inv && (
        <Card className="p-3 text-sm text-muted-foreground flex flex-wrap gap-3">
          {inv.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{inv.phone}</span>}
          {inv.address && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{inv.address}</span>}
          {inv.note && <span>📝 {inv.note}</span>}
        </Card>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Card className="p-3"><div className="text-[11px] text-muted-foreground">মোট নেওয়া</div><div className="text-lg font-bold text-primary">{bdt(totals.taken)}</div></Card>
        <Card className="p-3"><div className="text-[11px] text-muted-foreground">মোট সুদ</div><div className="text-lg font-bold text-amber-700">{bdt(totals.interest)}</div></Card>
        <Card className="p-3"><div className="text-[11px] text-muted-foreground">পরিশোধিত</div><div className="text-lg font-bold text-emerald-700">{bdt(totals.paid)}</div><div className="text-[10px] text-muted-foreground">মূল {bdt(totals.paidPrincipal)} • সুদ {bdt(totals.paidInterest)}</div></Card>
        <Card className="p-3"><div className="text-[11px] text-muted-foreground">বাকি</div><div className={"text-lg font-bold " + (totals.outstanding > 0 ? "text-rose-700" : "text-foreground")}>{bdt(totals.outstanding)}</div></Card>
      </div>

      {(loansQ.data ?? []).length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">কোনো বিনিয়োগ যোগ করা হয়নি।</Card>
      ) : (
        <div className="space-y-3">
          {(loansQ.data ?? []).map((l) => {
            const insts = (instQ.data ?? []).filter((i) => i.loan_id === l.id);
            const paidCount = insts.filter((i) => i.status === "paid").length;
            const paidTotal = insts.reduce((s, i) => s + Number(i.paid_amount), 0);
            const isPS = l.interest_type === "profit_share";
            const isOpen = l.interest_type === "open";
            const loanPays = (payQ.data ?? []).filter((p) => p.loan_id === l.id);
            const psProfitPaid = loanPays.filter((p) => p.kind === "profit_share").reduce((s, p) => s + Number(p.amount), 0);
            const psLossIn = loanPays.filter((p) => p.kind === "loss_share").reduce((s, p) => s + Number(p.amount), 0);
            const psPrincipalReturned = loanPays.filter((p) => p.kind === "principal_return").reduce((s, p) => s + Number(p.amount), 0);
            const openReturned = loanPays.filter((p) => p.kind === "principal_return").reduce((s, p) => s + Number(p.amount), 0);
            const openOutstanding = Number(l.principal) - openReturned;
            return (
              <Card key={l.id} className="p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-primary" />
                    <span className="font-semibold">{bdt(Number(l.principal))}</span>
                    <span className="text-xs text-muted-foreground">
                      {l.taken_at} • {isPS
                        ? `Partner • লাভ ${l.profit_share_pct}% / লোকসান ${l.loss_share_pct}%`
                        : isOpen
                        ? "উন্মুক্ত • যখন সুবিধা তখন পরিশোধ"
                        : `${l.interest_type === "none" ? "সুদহীন" : `${l.interest_rate}% ${l.interest_type === "flat" ? "flat" : "reducing"}`} • ${l.tenure_months} মাস`}
                    </span>
                    <span className={"rounded-md border px-1.5 py-0.5 text-[10px] font-semibold " + (l.status === "closed" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-primary/30 bg-primary/10 text-primary")}>
                      {l.status === "closed" ? "সম্পূর্ণ শোধ" : "চলমান"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {isPS ? (
                      <>
                        <span className="text-emerald-700">মূল ফেরত: {bdt(psPrincipalReturned)}</span>
                        <span className="text-amber-700">লাভ প্রদান: {bdt(psProfitPaid)}</span>
                        <span className="text-rose-700">লোকসান আদায়: {bdt(psLossIn)}</span>
                      </>
                    ) : isOpen ? (
                      <>
                        <span className="text-emerald-700">পরিশোধিত: {bdt(openReturned)}</span>
                        <span className={openOutstanding > 0 ? "text-rose-700" : "text-muted-foreground"}>
                          বাকি: {bdt(Math.max(0, openOutstanding))}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-muted-foreground">মোট: {bdt(Number(l.total_payable))}</span>
                        <span className="text-emerald-700">শোধ: {bdt(paidTotal)} ({paidCount}/{insts.length})</span>
                      </>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-600" onClick={() => setPinDel({ kind: "loan", id: l.id })}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {isPS || isOpen ? (
                  <div className="mt-2 space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {isPS && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => openSettle(l, "profit_share")}>
                            <TrendingUp className="mr-1 h-3.5 w-3.5 text-emerald-600" /> লাভ প্রদান
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openSettle(l, "loss_share")}>
                            <TrendingDown className="mr-1 h-3.5 w-3.5 text-rose-600" /> লোকসান আদায়
                          </Button>
                        </>
                      )}
                      <Button size="sm" variant="outline" onClick={() => openSettle(l, "principal_return")}>
                        <RotateCcw className="mr-1 h-3.5 w-3.5" /> {isOpen ? "পরিশোধ (যেকোনো পরিমাণ)" : "মূল ফেরত"}
                      </Button>
                    </div>
                    {loanPays.length > 0 && (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>তারিখ</TableHead>
                              <TableHead>ধরন</TableHead>
                              <TableHead className="text-right">পরিমাণ</TableHead>
                              <TableHead>Method</TableHead>
                              <TableHead>নোট</TableHead>
                              <TableHead className="text-right">অ্যাকশন</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {loanPays.map((p) => (
                              <TableRow key={p.id}>
                                <TableCell>{p.paid_at}</TableCell>
                                <TableCell>{p.kind === "profit_share" ? "লাভের অংশ" : p.kind === "loss_share" ? "লোকসানের অংশ" : p.kind === "principal_return" ? "মূল ফেরত" : "কিস্তি"}</TableCell>
                                <TableCell className={"text-right font-semibold " + (p.kind === "loss_share" ? "text-emerald-700" : "text-rose-700")}>
                                  {p.kind === "loss_share" ? "+" : "-"}{bdt(Number(p.amount))}
                                </TableCell>
                                <TableCell>{p.method}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{p.note}</TableCell>
                                <TableCell className="text-right">
                                  <div className="inline-flex gap-1">
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditPay(p)}>
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-600" onClick={() => setPinDel({ kind: "pay", id: p.id, expense_id: p.expense_id, loan_id: p.loan_id })}>
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                ) : (
                <div className="mt-2 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">#</TableHead>
                        <TableHead>বকেয়ার তারিখ</TableHead>
                        <TableHead className="text-right">মূল</TableHead>
                        <TableHead className="text-right">সুদ</TableHead>
                        <TableHead className="text-right">মোট</TableHead>
                        <TableHead className="text-right">পরিশোধিত</TableHead>
                        <TableHead>পরিশোধের তারিখ</TableHead>
                        <TableHead>অবস্থা</TableHead>
                        <TableHead className="text-right">অ্যাকশন</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        const firstUnpaidSeq = insts
                          .filter((x) => x.status !== "paid")
                          .reduce((m, x) => (m === null || x.seq_no < m ? x.seq_no : m), null as number | null);
                        return insts.map((i) => {
                        const remaining = Number(i.total_due) - Number(i.paid_amount);
                        const isNext = firstUnpaidSeq !== null && i.seq_no === firstUnpaidSeq;
                        const locked = i.status !== "paid" && !isNext;
                        const lateInfo = i.status !== "paid" ? computeLateFee({
                          dueDate: i.due_date,
                          remainingDue: remaining,
                          amount: Number(l.late_fee_amount) || 0,
                          percent: Number(l.late_fee_percent) || 0,
                          graceDays: Number(l.late_fee_grace_days) || 0,
                        }) : { fee: 0, daysLate: 0 };
                        return (
                          <TableRow key={i.id}>
                            <TableCell>{i.seq_no}</TableCell>
                            <TableCell>{i.due_date}</TableCell>
                            <TableCell className="text-right">{bdt(Number(i.principal_part))}</TableCell>
                            <TableCell className="text-right">{bdt(Number(i.interest_part))}</TableCell>
                            <TableCell className="text-right font-semibold">{bdt(Number(i.total_due))}</TableCell>
                            <TableCell className="text-right text-emerald-700">{bdt(Number(i.paid_amount))}</TableCell>
                            <TableCell className="text-xs">{i.paid_at ? i.paid_at : <span className="text-muted-foreground">—</span>}</TableCell>
                            <TableCell>
                              {i.status === "paid" ? (
                                <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />শোধ</span>
                              ) : i.status === "partial" ? (
                                <span className="text-amber-700">আংশিক</span>
                              ) : locked ? (
                                <span className="text-xs text-muted-foreground">আগের কিস্তি শোধ বাকি</span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-muted-foreground"><Clock className="h-3.5 w-3.5" />বাকি</span>
                              )}
                              {lateInfo.fee > 0 && (
                                <div className="text-[10px] font-semibold text-rose-600">
                                  জরিমানা: {bdt(lateInfo.fee)} ({lateInfo.daysLate} দিন late)
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {i.status !== "paid" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={locked}
                                  title={locked ? `আগে কিস্তি #${firstUnpaidSeq} পরিশোধ করুন` : undefined}
                                  onClick={() => openPay(i)}
                                >
                                  পরিশোধ {bdt(remaining)}
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                        });
                      })()}
                    </TableBody>
                  </Table>
                </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Add loan dialog */}
      <Dialog open={openLoan} onOpenChange={setOpenLoan}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>নতুন বিনিয়োগ ({inv?.name})</DialogTitle></DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>মূল টাকা *</Label>
              <Input inputMode="decimal" value={loan.principal} onChange={(e) => setLoan({ ...loan, principal: e.target.value.replace(/[^0-9.]/g, "") })} />
            </div>
            <div>
              <Label>নেওয়ার তারিখ</Label>
              <Input type="date" value={loan.taken_at} onChange={(e) => setLoan({ ...loan, taken_at: e.target.value })} />
            </div>
            <div>
              <Label>সুদের ধরন</Label>
              <Select value={loan.interest_type} onValueChange={(v) => setLoan({ ...loan, interest_type: v as InterestType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INTEREST_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {loan.interest_type === "profit_share" ? (
              <>
                <div>
                  <Label>লাভের অংশ (%)</Label>
                  <Input inputMode="decimal" placeholder="যেমন 5" value={loan.profit_share_pct} onChange={(e) => setLoan({ ...loan, profit_share_pct: e.target.value.replace(/[^0-9.]/g, "") })} />
                </div>
                <div>
                  <Label>লোকসানের অংশ (%)</Label>
                  <Input inputMode="decimal" placeholder="যেমন 50" value={loan.loss_share_pct} onChange={(e) => setLoan({ ...loan, loss_share_pct: e.target.value.replace(/[^0-9.]/g, "") })} />
                </div>
                <div className="md:col-span-2 text-[11px] text-muted-foreground">
                  Partner-এর জন্য কোনো fixed কিস্তি নেই। ব্যবসার লাভ/লোকসান হলে "লাভ/লোকসান settle" থেকে হিসাব করে দিন।
                </div>
              </>
            ) : loan.interest_type === "open" ? (
              <div className="md:col-span-2 rounded-md border bg-muted/30 p-2 text-[12px] text-muted-foreground">
                উন্মুক্ত loan — কোনো নির্দিষ্ট কিস্তি বা সময় নেই। যখন সুবিধা তখন যেকোনো পরিমাণ পরিশোধ করা যাবে।
              </div>
            ) : (
              <>
                <div>
                  <Label>সুদের হার (বার্ষিক %)</Label>
                  <Input inputMode="decimal" disabled={loan.interest_type === "none"} value={loan.interest_rate} onChange={(e) => setLoan({ ...loan, interest_rate: e.target.value.replace(/[^0-9.]/g, "") })} />
                </div>
                <div>
                  <Label>কিস্তির সংখ্যা (মাস) *</Label>
                  <Input inputMode="numeric" value={loan.tenure_months} onChange={(e) => setLoan({ ...loan, tenure_months: e.target.value.replace(/[^0-9]/g, "") })} />
                </div>
                <div>
                  <Label>প্রতি মাসের কত তারিখে (১-২৮)</Label>
                  <Input inputMode="numeric" value={loan.installment_day} onChange={(e) => setLoan({ ...loan, installment_day: e.target.value.replace(/[^0-9]/g, "") })} />
                </div>
                <div className="md:col-span-2">
                  <Label>প্রথম কিস্তির তারিখ</Label>
                  <Input type="date" value={loan.first_due_date} onChange={(e) => setLoan({ ...loan, first_due_date: e.target.value })} />
                </div>
                <div>
                  <Label>জরিমানা — flat (৳/দেরি কিস্তি)</Label>
                  <Input inputMode="decimal" placeholder="০" value={loan.late_fee_amount} onChange={(e) => setLoan({ ...loan, late_fee_amount: e.target.value.replace(/[^0-9.]/g, "") })} />
                </div>
                <div>
                  <Label>জরিমানা — বকেয়ার %</Label>
                  <Input inputMode="decimal" placeholder="০" value={loan.late_fee_percent} onChange={(e) => setLoan({ ...loan, late_fee_percent: e.target.value.replace(/[^0-9.]/g, "") })} />
                </div>
                <div className="md:col-span-2">
                  <Label>Grace days (কত দিন পর থেকে জরিমানা)</Label>
                  <Input inputMode="numeric" placeholder="০" value={loan.late_fee_grace_days} onChange={(e) => setLoan({ ...loan, late_fee_grace_days: e.target.value.replace(/[^0-9]/g, "") })} />
                </div>
              </>
            )}
            <div className="md:col-span-2">
              <Label>নোট</Label>
              <Textarea rows={2} value={loan.note} onChange={(e) => setLoan({ ...loan, note: e.target.value })} />
            </div>
          </div>

          {preview && preview.rows.length > 0 && (
            <Card className="p-3 mt-2 bg-muted/30">
              <div className="flex flex-wrap gap-3 text-xs">
                <span>মাসিক কিস্তি: <b>{bdt(preview.emi)}</b></span>
                <span>মোট সুদ: <b className="text-amber-700">{bdt(preview.totalInterest)}</b></span>
                <span>মোট প্রদেয়: <b className="text-primary">{bdt(preview.totalPayable)}</b></span>
              </div>
              <div className="mt-2 max-h-40 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>তারিখ</TableHead>
                      <TableHead className="text-right">মূল</TableHead>
                      <TableHead className="text-right">সুদ</TableHead>
                      <TableHead className="text-right">মোট</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.rows.map((r) => (
                      <TableRow key={r.seq}>
                        <TableCell>{r.seq}</TableCell>
                        <TableCell>{r.dueDate}</TableCell>
                        <TableCell className="text-right">{bdt(r.principalPart)}</TableCell>
                        <TableCell className="text-right">{bdt(r.interestPart)}</TableCell>
                        <TableCell className="text-right font-semibold">{bdt(r.totalDue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenLoan(false)}>বাতিল</Button>
            <Button onClick={saveLoan} disabled={savingLoan}>সংরক্ষণ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay installment dialog */}
      <Dialog open={!!payInst} onOpenChange={(v) => !v && setPayInst(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>কিস্তি পরিশোধ #{payInst?.seq_no}</DialogTitle></DialogHeader>
          {payInst && (
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground">
                বকেয়ার তারিখ: {payInst.due_date} • মোট: {bdt(payInst.total_due)} • বাকি: {bdt(payInst.total_due - payInst.paid_amount)}
              </div>
              <div>
                <Label>পরিশোধের পরিমাণ</Label>
                <Input inputMode="decimal" value={payAmount} onChange={(e) => setPayAmount(e.target.value.replace(/[^0-9.]/g, ""))} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Method</Label>
                  <Select value={payMethod} onValueChange={(v) => setPayMethod(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">নগদ</SelectItem>
                      <SelectItem value="bkash">বিকাশ</SelectItem>
                      <SelectItem value="nagad">নগদ (Mobile)</SelectItem>
                      <SelectItem value="bank">ব্যাংক</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>তারিখ</Label>
                  <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>নোট</Label>
                <Input value={payNote} onChange={(e) => setPayNote(e.target.value)} />
              </div>
              <div className="text-[11px] text-muted-foreground">এই পরিশোধ স্বয়ংক্রিয়ভাবে ‘বিনিয়োগের কিস্তি’ ক্যাটাগরিতে খরচে যোগ হবে।</div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayInst(null)}>বাতিল</Button>
            <Button onClick={savePay} disabled={savingPay}>পরিশোধ সংরক্ষণ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Partner settle dialog */}
      <Dialog open={!!settleFor} onOpenChange={(v) => !v && setSettleFor(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {settleKind === "profit_share" ? "লাভের অংশ প্রদান" : settleKind === "loss_share" ? "লোকসানের অংশ আদায়" : "মূল টাকা ফেরত"}
            </DialogTitle>
          </DialogHeader>
          {settleFor && (
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground">
                মূল বিনিয়োগ: {bdt(Number(settleFor.principal))} • লাভ {settleFor.profit_share_pct}% / লোকসান {settleFor.loss_share_pct}%
              </div>
              {settleKind !== "principal_return" && (
                <div>
                  <Label>ব্যবসার মোট {settleKind === "profit_share" ? "লাভ" : "লোকসান"} (এই মাস/সময়ে)</Label>
                  <Input inputMode="decimal" value={settleBase} onChange={(e) => { const v = e.target.value.replace(/[^0-9.]/g, ""); setSettleBase(v); }} placeholder="ব্যবসার লাভ/লোকসানের পরিমাণ" />
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    Partner-এর অংশ = <b>{bdt(settleComputed)}</b> (auto)
                  </div>
                </div>
              )}
              <div>
                <Label>{settleKind === "principal_return" ? "ফেরতের পরিমাণ" : "আসল পরিমাণ (edit করা যাবে)"}</Label>
                <Input inputMode="decimal" value={settleAmount || (settleKind !== "principal_return" ? String(settleComputed || "") : "")} onChange={(e) => setSettleAmount(e.target.value.replace(/[^0-9.]/g, ""))} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Method</Label>
                  <Select value={settleMethod} onValueChange={(v) => setSettleMethod(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">নগদ</SelectItem>
                      <SelectItem value="bkash">বিকাশ</SelectItem>
                      <SelectItem value="nagad">নগদ (Mobile)</SelectItem>
                      <SelectItem value="bank">ব্যাংক</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>তারিখ</Label>
                  <Input type="date" value={settleDate} onChange={(e) => setSettleDate(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>নোট</Label>
                <Input value={settleNote} onChange={(e) => setSettleNote(e.target.value)} />
              </div>
              <div className="text-[11px] text-muted-foreground">
                {settleKind === "loss_share"
                  ? "Partner থেকে টাকা আসবে — dashboard cash flow-এ যোগ হবে।"
                  : "Shop থেকে টাকা যাবে — খরচ ও cash flow থেকে বিয়োগ হবে।"}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettleFor(null)}>বাতিল</Button>
            <Button onClick={saveSettle} disabled={savingSettle}>সংরক্ষণ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit partner payment dialog */}
      <Dialog open={!!editPay} onOpenChange={(v) => !v && setEditPay(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              সম্পাদনা — {editPay?.kind === "profit_share" ? "লাভের অংশ" : editPay?.kind === "loss_share" ? "লোকসানের অংশ" : editPay?.kind === "principal_return" ? "মূল ফেরত" : "কিস্তি"}
            </DialogTitle>
          </DialogHeader>
          {editPay && (
            <div className="space-y-3">
              <div>
                <Label>পরিমাণ</Label>
                <Input inputMode="decimal" value={ePayAmount} onChange={(e) => setEPayAmount(e.target.value.replace(/[^0-9.]/g, ""))} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Method</Label>
                  <Select value={ePayMethod} onValueChange={(v) => setEPayMethod(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">নগদ</SelectItem>
                      <SelectItem value="bkash">বিকাশ</SelectItem>
                      <SelectItem value="nagad">নগদ (Mobile)</SelectItem>
                      <SelectItem value="bank">ব্যাংক</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>তারিখ</Label>
                  <Input type="date" value={ePayDate} onChange={(e) => setEPayDate(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>নোট</Label>
                <Input value={ePayNote} onChange={(e) => setEPayNote(e.target.value)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPay(null)}>বাতিল</Button>
            <Button onClick={saveEditPay} disabled={savingEditPay}>সংরক্ষণ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit investor name/phone */}
      <Dialog open={editInv} onOpenChange={setEditInv}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>বিনিয়োগকারীর তথ্য edit</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>নাম *</Label>
              <Input value={eName} onChange={(e) => setEName(e.target.value)} />
            </div>
            <div>
              <Label>ফোন</Label>
              <Input value={ePhone} onChange={(e) => setEPhone(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditInv(false)}>বাতিল</Button>
            <Button onClick={saveInv} disabled={savingInv}>সংরক্ষণ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PIN-protected delete confirmation */}
      <PinConfirmDialog
        open={!!pinDel}
        title={pinDel?.kind === "loan" ? "বিনিয়োগ delete" : "পরিশোধ entry delete"}
        message={pinDel?.kind === "loan"
          ? "এই বিনিয়োগ ও এর সব কিস্তি/পরিশোধ মুছে যাবে। নিশ্চিত করতে PIN দিন।"
          : "এই entry ও সংশ্লিষ্ট খরচ/cash flow মুছে যাবে। নিশ্চিত করতে PIN দিন।"}
        onOpenChange={(v) => !v && setPinDel(null)}
        onConfirmed={async () => {
          if (!pinDel) return;
          if (pinDel.kind === "loan") await doDeleteLoan(pinDel.id);
          else await doDeletePartnerPay(pinDel.id, pinDel.expense_id ?? null, pinDel.loan_id ?? "");
          setPinDel(null);
        }}
      />
    </div>
  );
}

export default function InvestorDetailPage() {
  return <RequirePerm group="expense"><InvestorDetailInner /></RequirePerm>;
}