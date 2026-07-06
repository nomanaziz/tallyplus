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
import { ArrowLeft, Plus, User, Phone, MapPin, Wallet, CheckCircle2, Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { computeSchedule, INTEREST_TYPES, SOURCE_TYPE_LABEL, type InterestType } from "@/lib/investor-emi";

function bdt(n: number) {
  return new Intl.NumberFormat("bn-BD", { maximumFractionDigits: 0 }).format(n) + " ৳";
}

type Investor = { id: string; name: string; phone: string | null; address: string | null; source_type: string; source_name: string | null; note: string | null; is_active: boolean };
type Loan = { id: string; principal: number; taken_at: string; interest_type: string; interest_rate: number; tenure_months: number; installment_day: number; first_due_date: string; total_payable: number; total_interest: number; status: string; note: string | null };
type Installment = { id: string; loan_id: string; seq_no: number; due_date: string; principal_part: number; interest_part: number; total_due: number; paid_amount: number; paid_at: string | null; status: string };
type Payment = { id: string; loan_id: string; installment_id: string | null; amount: number; principal_part: number; interest_part: number; paid_at: string; method: string; note: string | null; expense_id: string | null };

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
    for (const p of pays) { paid += Number(p.amount); paidInterest += Number(p.interest_part); paidPrincipal += Number(p.principal_part); }
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
    const t = Number(loan.tenure_months);
    if (!p || p <= 0) return toast.error("মূল টাকা দিন");
    if (!t || t <= 0) return toast.error("কিস্তির সংখ্যা দিন");
    const day = Math.max(1, Math.min(28, Number(loan.installment_day) || 1));
    setSavingLoan(true);
    const { data: loanRow, error } = await supabase.from("investor_loans").insert({
      shop_id: current.id,
      investor_id: id,
      principal: p,
      taken_at: loan.taken_at,
      interest_type: loan.interest_type,
      interest_rate: Number(loan.interest_rate) || 0,
      tenure_months: t,
      installment_day: day,
      first_due_date: loan.first_due_date,
      note: loan.note.trim() || null,
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

  const savePay = async () => {
    if (!payInst || !current) return;
    const amt = Number(payAmount);
    if (!amt || amt <= 0) return toast.error("সঠিক টাকা দিন");
    const remaining = payInst.total_due - payInst.paid_amount;
    if (amt > remaining + 0.01) return toast.error(`সর্বোচ্চ ${bdt(remaining)}`);
    // split by ratio of interest/principal in this installment
    const rIn = payInst.total_due > 0 ? payInst.interest_part / payInst.total_due : 0;
    const interestPart = Math.round(amt * rIn * 100) / 100;
    const principalPart = Math.round((amt - interestPart) * 100) / 100;

    setSavingPay(true);
    // 1) create expense entry
    const invName = invQ.data?.name ?? "";
    const { data: exp, error: expErr } = await supabase.from("expenses").insert({
      shop_id: current.id,
      category: "বিনিয়োগের কিস্তি",
      amount: amt,
      note: `${invName} — কিস্তি #${payInst.seq_no}${payNote ? " — " + payNote : ""}`,
      paid_via: payMethod as any,
      created_by: user?.id ?? null,
    }).select("id").maybeSingle();
    if (expErr) { setSavingPay(false); return toast.error(expErr.message); }

    // 2) insert payment
    const { data: payRow, error: payErr } = await supabase.from("investor_payments").insert({
      shop_id: current.id,
      loan_id: payInst.loan_id,
      installment_id: payInst.id,
      amount: amt,
      principal_part: principalPart,
      interest_part: interestPart,
      paid_at: payDate,
      method: payMethod,
      expense_id: exp?.id ?? null,
      note: payNote.trim() || null,
    }).select("id").maybeSingle();
    if (payErr) { setSavingPay(false); return toast.error(payErr.message); }
    // Mirror to cash flow: repaying an installment takes money OUT of the shop
    await supabase.from("cash_movements").insert({
      shop_id: current.id,
      amount: amt,
      direction: "out",
      note: `বিনিয়োগ পরিশোধ — ${invName} — কিস্তি #${payInst.seq_no}`,
      ref_table: "investor_payments",
      ref_id: payRow?.id ?? null,
      created_by: user?.id ?? null,
    });

    // 3) update installment status
    const newPaid = Number(payInst.paid_amount) + amt;
    const status = newPaid >= payInst.total_due - 0.01 ? "paid" : "partial";
    await supabase.from("investor_installments").update({
      paid_amount: newPaid,
      paid_at: status === "paid" ? payDate : payInst.paid_at,
      status,
    }).eq("id", payInst.id);

    // 4) close loan if all installments paid
    const remainingInst = (instQ.data ?? []).filter((x) => x.loan_id === payInst.loan_id && x.id !== payInst.id && x.status !== "paid");
    if (remainingInst.length === 0 && status === "paid") {
      await supabase.from("investor_loans").update({ status: "closed" }).eq("id", payInst.loan_id);
    }

    setSavingPay(false);
    toast.success("পরিশোধ রেকর্ড হয়েছে ও খরচে যোগ হয়েছে");
    setPayInst(null);
    invalidateAll();
  };

  // --- Delete loan ---
  const deleteLoan = async (loanId: string) => {
    if (!confirm("এই বিনিয়োগ ও এর সব কিস্তি/পরিশোধ মুছে ফেলবেন?")) return;
    const { error } = await supabase.from("investor_loans").delete().eq("id", loanId);
    if (error) return toast.error(error.message);
    toast.success("মুছে ফেলা হয়েছে");
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
            return (
              <Card key={l.id} className="p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-primary" />
                    <span className="font-semibold">{bdt(Number(l.principal))}</span>
                    <span className="text-xs text-muted-foreground">
                      {l.taken_at} • {l.interest_type === "none" ? "সুদহীন" : `${l.interest_rate}% ${l.interest_type === "flat" ? "flat" : "reducing"}`} • {l.tenure_months} মাস
                    </span>
                    <span className={"rounded-md border px-1.5 py-0.5 text-[10px] font-semibold " + (l.status === "closed" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-primary/30 bg-primary/10 text-primary")}>
                      {l.status === "closed" ? "সম্পূর্ণ শোধ" : "চলমান"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">মোট: {bdt(Number(l.total_payable))}</span>
                    <span className="text-emerald-700">শোধ: {bdt(paidTotal)} ({paidCount}/{insts.length})</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-600" onClick={() => deleteLoan(l.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

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
                        <TableHead>অবস্থা</TableHead>
                        <TableHead className="text-right">অ্যাকশন</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {insts.map((i) => {
                        const remaining = Number(i.total_due) - Number(i.paid_amount);
                        return (
                          <TableRow key={i.id}>
                            <TableCell>{i.seq_no}</TableCell>
                            <TableCell>{i.due_date}</TableCell>
                            <TableCell className="text-right">{bdt(Number(i.principal_part))}</TableCell>
                            <TableCell className="text-right">{bdt(Number(i.interest_part))}</TableCell>
                            <TableCell className="text-right font-semibold">{bdt(Number(i.total_due))}</TableCell>
                            <TableCell className="text-right text-emerald-700">{bdt(Number(i.paid_amount))}</TableCell>
                            <TableCell>
                              {i.status === "paid" ? (
                                <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />শোধ</span>
                              ) : i.status === "partial" ? (
                                <span className="text-amber-700">আংশিক</span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-muted-foreground"><Clock className="h-3.5 w-3.5" />বাকি</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {i.status !== "paid" && (
                                <Button size="sm" variant="outline" onClick={() => openPay(i)}>
                                  পরিশোধ {bdt(remaining)}
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add loan dialog */}
      <Dialog open={openLoan} onOpenChange={setOpenLoan}>
        <DialogContent className="max-w-2xl">
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
        <DialogContent>
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
    </div>
  );
}

export default function InvestorDetailPage() {
  return <RequirePerm group="expense"><InvestorDetailInner /></RequirePerm>;
}