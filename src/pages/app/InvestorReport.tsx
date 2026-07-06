import { useMemo } from "react";
import { useNavigate, Link } from "@/lib/router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/lib/shop";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RequirePerm } from "@/components/app/RequirePerm";
import { ArrowLeft, FileText, Printer } from "lucide-react";
import { SOURCE_TYPE_LABEL } from "@/lib/investor-emi";

function bdt(n: number) {
  return new Intl.NumberFormat("bn-BD", { maximumFractionDigits: 0 }).format(n) + " ৳";
}

function InvestorReportInner() {
  const nav = useNavigate();
  const { current } = useShop();
  const shopId = current?.id ?? null;

  const invQ = useQuery({
    queryKey: ["r_investors", shopId],
    enabled: !!shopId,
    queryFn: async () => {
      const { data } = await supabase.from("investors").select("*").eq("shop_id", shopId!);
      return data ?? [];
    },
  });
  const loanQ = useQuery({
    queryKey: ["r_investor_loans", shopId],
    enabled: !!shopId,
    queryFn: async () => {
      const { data } = await supabase.from("investor_loans").select("*").eq("shop_id", shopId!);
      return data ?? [];
    },
  });
  const instQ = useQuery({
    queryKey: ["r_investor_installments", shopId],
    enabled: !!shopId,
    queryFn: async () => {
      const { data } = await supabase.from("investor_installments").select("*").eq("shop_id", shopId!);
      return data ?? [];
    },
  });
  const payQ = useQuery({
    queryKey: ["r_investor_payments", shopId],
    enabled: !!shopId,
    queryFn: async () => {
      const { data } = await supabase.from("investor_payments").select("*").eq("shop_id", shopId!);
      return data ?? [];
    },
  });

  const summary = useMemo(() => {
    const investors = invQ.data ?? [];
    const loans = loanQ.data ?? [];
    const insts = instQ.data ?? [];
    const pays = payQ.data ?? [];

    const today = new Date().toISOString().slice(0, 10);
    const monthKey = today.slice(0, 7);

    const paidByLoan = new Map<string, { amount: number; principal: number; interest: number }>();
    for (const p of pays as any[]) {
      const cur = paidByLoan.get(p.loan_id) ?? { amount: 0, principal: 0, interest: 0 };
      cur.amount += Number(p.amount);
      cur.principal += Number(p.principal_part);
      cur.interest += Number(p.interest_part);
      paidByLoan.set(p.loan_id, cur);
    }

    let totalTaken = 0, totalInterest = 0, totalPayable = 0, totalPaid = 0, totalPaidInterest = 0, totalPaidPrincipal = 0;
    let overdue = 0, dueThisMonth = 0;

    for (const l of loans as any[]) {
      totalTaken += Number(l.principal);
      totalInterest += Number(l.total_interest);
      totalPayable += Number(l.total_payable);
    }
    for (const p of pays as any[]) {
      totalPaid += Number(p.amount);
      totalPaidInterest += Number(p.interest_part);
      totalPaidPrincipal += Number(p.principal_part);
    }
    for (const i of insts as any[]) {
      const remaining = Number(i.total_due) - Number(i.paid_amount);
      if (remaining <= 0) continue;
      if (i.due_date < today) overdue += remaining;
      if (String(i.due_date).slice(0, 7) === monthKey) dueThisMonth += remaining;
    }

    const rows = investors.map((inv: any) => {
      const myLoans = (loans as any[]).filter((l) => l.investor_id === inv.id);
      let taken = 0, payable = 0, interest = 0, paid = 0;
      for (const l of myLoans) {
        taken += Number(l.principal);
        payable += Number(l.total_payable);
        interest += Number(l.total_interest);
        paid += paidByLoan.get(l.id)?.amount ?? 0;
      }
      return { inv, taken, payable, interest, paid, outstanding: payable - paid, loans: myLoans.length };
    });

    return {
      rows,
      totals: { totalTaken, totalInterest, totalPayable, totalPaid, totalPaidInterest, totalPaidPrincipal, outstanding: totalPayable - totalPaid, overdue, dueThisMonth },
    };
  }, [invQ.data, loanQ.data, instQ.data, payQ.data]);

  const { rows, totals } = summary;

  return (
    <div className="container px-4 py-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => nav({ to: "/app/investors" })}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <FileText className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-extrabold md:text-xl">বিনিয়োগকারী রিপোর্ট</h1>
        </div>
        <Button size="sm" variant="outline" onClick={() => window.print()}>
          <Printer className="mr-1 h-4 w-4" /> প্রিন্ট
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Card className="p-3"><div className="text-[11px] text-muted-foreground">মোট নেওয়া (মূল)</div><div className="text-lg font-bold text-primary">{bdt(totals.totalTaken)}</div></Card>
        <Card className="p-3"><div className="text-[11px] text-muted-foreground">মোট প্রদেয় সুদ</div><div className="text-lg font-bold text-amber-700">{bdt(totals.totalInterest)}</div></Card>
        <Card className="p-3"><div className="text-[11px] text-muted-foreground">মোট প্রদেয়</div><div className="text-lg font-bold">{bdt(totals.totalPayable)}</div></Card>
        <Card className="p-3"><div className="text-[11px] text-muted-foreground">বাকি</div><div className={"text-lg font-bold " + (totals.outstanding > 0 ? "text-rose-700" : "text-emerald-700")}>{bdt(totals.outstanding)}</div></Card>
        <Card className="p-3"><div className="text-[11px] text-muted-foreground">পরিশোধিত (মোট)</div><div className="text-lg font-bold text-emerald-700">{bdt(totals.totalPaid)}</div><div className="text-[10px] text-muted-foreground">মূল {bdt(totals.totalPaidPrincipal)} • সুদ {bdt(totals.totalPaidInterest)}</div></Card>
        <Card className="p-3"><div className="text-[11px] text-muted-foreground">চলতি মাসের কিস্তি</div><div className="text-lg font-bold text-primary">{bdt(totals.dueThisMonth)}</div></Card>
        <Card className="p-3"><div className="text-[11px] text-muted-foreground">Overdue (বকেয়া)</div><div className="text-lg font-bold text-rose-700">{bdt(totals.overdue)}</div></Card>
        <Card className="p-3"><div className="text-[11px] text-muted-foreground">Investor সংখ্যা</div><div className="text-lg font-bold">{rows.length}</div></Card>
      </div>

      <Card className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>নাম</TableHead>
              <TableHead>উৎস</TableHead>
              <TableHead className="text-right">Loan</TableHead>
              <TableHead className="text-right">নেওয়া</TableHead>
              <TableHead className="text-right">সুদ</TableHead>
              <TableHead className="text-right">মোট প্রদেয়</TableHead>
              <TableHead className="text-right">পরিশোধিত</TableHead>
              <TableHead className="text-right">বাকি</TableHead>
              <TableHead className="print:hidden"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-6">কোনো ডেটা নেই</TableCell></TableRow>
            ) : rows.map((r: any) => (
              <TableRow key={r.inv.id}>
                <TableCell className="font-medium">{r.inv.name}</TableCell>
                <TableCell className="text-xs">{SOURCE_TYPE_LABEL[r.inv.source_type] ?? r.inv.source_type}{r.inv.source_name ? ` — ${r.inv.source_name}` : ""}</TableCell>
                <TableCell className="text-right">{r.loans}</TableCell>
                <TableCell className="text-right">{bdt(r.taken)}</TableCell>
                <TableCell className="text-right text-amber-700">{bdt(r.interest)}</TableCell>
                <TableCell className="text-right font-semibold">{bdt(r.payable)}</TableCell>
                <TableCell className="text-right text-emerald-700">{bdt(r.paid)}</TableCell>
                <TableCell className={"text-right font-semibold " + (r.outstanding > 0 ? "text-rose-700" : "text-emerald-700")}>{bdt(r.outstanding)}</TableCell>
                <TableCell className="print:hidden">
                  <Button asChild size="sm" variant="outline">
                    <Link to={`/app/investors/${r.inv.id}`}>দেখুন</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

export default function InvestorReportPage() {
  return <RequirePerm group="expense"><InvestorReportInner /></RequirePerm>;
}