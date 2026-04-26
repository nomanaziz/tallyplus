import { useNavigate } from "@/lib/router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useI18n, fmtMoney } from "@/lib/i18n";
import { useShop } from "@/lib/shop";
import { businessReportQuery, rangeToIso } from "@/lib/queries";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { DateRangePicker, monthStartIso, todayIso, type DateRange } from "@/components/app/DateRangePicker";
import { RefreshCw, Printer, Plus, TrendingUp, ShoppingCart, Wallet, Receipt, BarChart3, Users, UserCog, PieChart, FileText, Truck, DollarSign, Boxes, Package, UserCircle2 } from "lucide-react";
import { printReport, type PrintRow } from "@/lib/print-report";

({
  head: () => ({ meta: [{ title: "ব্যবসার রিপোর্ট — Tally Plus" }] }),
  component: GuardedReportsPage,
});

import { RequirePerm } from "@/components/app/RequirePerm";
function GuardedReportsPage() {
  return <RequirePerm group="report"><ReportsPage /></RequirePerm>;
}

function ReportsPage() {
  const { lang } = useI18n();
  const { current } = useShop();
  const nav = useNavigate();
  const [range, setRange] = useState<DateRange>({ start: monthStartIso(), end: todayIso() });
  const iso = rangeToIso(range.start, range.end);
  const { data, isFetching, refetch } = useQuery(businessReportQuery(current?.id ?? null, iso));
  const s = data ?? { totalSales: 0, cashSales: 0, dueReceived: 0, cashPurchase: 0, duePaid: 0, otherIncome: 0, otherExpense: 0, receivable: 0, payable: 0, productProfit: 0 };
  const balance = s.totalSales + s.dueReceived + s.otherIncome - s.cashPurchase - s.duePaid - s.otherExpense;

  const onPrint = () => {
    const rows: PrintRow[] = [
      { kind: "section", label: lang === "bn" ? "আইটেম" : "Item" },
      { kind: "row", label: "নগদ বেচা", sub: "(কাস্টমার বাকি বাদে)", value: fmtMoney(s.cashSales, lang), tone: "success" },
      { kind: "row", label: "কাস্টমার থেকে বাকির টাকা পেয়েছেন", value: fmtMoney(s.dueReceived, lang), tone: "success" },
      { kind: "row", label: "অন্যান্য আয়", value: fmtMoney(s.otherIncome, lang), tone: "success" },
      { kind: "row", label: "নগদ কেনা", sub: "(সাপ্লায়ার বাকি বাদে)", value: fmtMoney(s.cashPurchase, lang), tone: "danger" },
      { kind: "row", label: "সাপ্লায়ারকে বাকির টাকা দিয়েছেন", value: fmtMoney(s.duePaid, lang), tone: "danger" },
      { kind: "row", label: "অন্যান্য খরচ", value: fmtMoney(s.otherExpense, lang), tone: "danger" },
      { kind: "divider" },
      { kind: "row", label: "সর্বমোট ব্যালেন্স", sub: "(মোট বিক্রি + কাস্টমারের বাকির টাকা + অন্যান্য আয়) - (মোট কেনা + সাপ্লায়ারকে বাকির টাকা + অন্যান্য খরচ)", value: fmtMoney(balance, lang), tone: balance >= 0 ? "success" : "danger" },
      { kind: "row", label: "মোট লাভ/ক্ষতি", sub: "(বিক্রিত পণ্যের বিক্রয় - ক্রয় মূল্য)", value: fmtMoney(s.productProfit, lang), tone: s.productProfit >= 0 ? "success" : "danger" },
    ];
    printReport({
      shopName: current?.name ?? "",
      shopAddress: (current as any)?.address ?? null,
      shopPhone: (current as any)?.phone ?? null,
      title: "ব্যবসার রিপোর্ট",
      startDate: range.start,
      endDate: range.end,
      rows,
    });
  };

  const subReports: { Icon: any; bn: string; en: string; to?: string }[] = [
    { Icon: Wallet, bn: "মালিকের লেনদেন", en: "Owner ledger", to: "/app/owner-ledger" },
    { Icon: Package, bn: "দোকানের সম্পদ", en: "Shop assets", to: "/app/assets" },
    { Icon: UserCircle2, bn: "মালিকের রিপোর্ট", en: "Owner report", to: "/app/owner-report" },
    { Icon: BarChart3, bn: "বিক্রির রিপোর্ট", en: "Sales report" },
    { Icon: ShoppingCart, bn: "ক্রয়ের রিপোর্ট", en: "Purchase report" },
    { Icon: Boxes, bn: "স্টকের রিপোর্ট", en: "Stock report" },
    { Icon: FileText, bn: "পণ্যের রিপোর্ট", en: "Product report" },
    { Icon: Users, bn: "সেরা কাস্টমার", en: "Top customers" },
    { Icon: UserCog, bn: "সেরা কর্মচারী", en: "Top employees" },
    { Icon: PieChart, bn: "লাভ-ক্ষতি রিপোর্ট", en: "Profit & loss" },
    { Icon: Receipt, bn: "খরচের রিপোর্ট", en: "Expense report" },
    { Icon: Truck, bn: "সাপ্লায়ার রিপোর্ট", en: "Supplier report" },
    { Icon: DollarSign, bn: "আয়ের রিপোর্ট", en: "Income report" },
  ];

  return (
    <div className="min-h-full bg-muted/30">
      <PageHeader
        breadcrumb="ব্যবসার রিপোর্ট"
        title={lang === "bn" ? "ব্যবসার রিপোর্ট" : "Business Report"}
        actions={
          <>
            <DateRangePicker value={range} onChange={setRange} />
            <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={"h-4 w-4 " + (isFetching ? "animate-spin" : "")} />
              <span className="ml-1 text-xs">{lang === "bn" ? "রিফ্রেশ" : "Refresh"}</span>
            </Button>
            <Button size="sm" className="bg-foreground text-background hover:bg-foreground/90" onClick={onPrint}>
              <Printer className="h-4 w-4" />
              <span className="ml-1 text-xs">{lang === "bn" ? "ডাউনলোড/প্রিন্ট" : "Download/Print"}</span>
            </Button>
          </>
        }
      />

      <div className="container space-y-3 px-3 py-3 md:space-y-4 md:px-4 md:py-4">
        {/* Section 1 — সাধারণ বিক্রি রিপোর্ট */}
        <div className="rounded-xl border bg-background p-3 md:p-4">
          <h2 className="mb-2 text-sm font-bold md:mb-3">{lang === "bn" ? "সাধারণ বিক্রি রিপোর্ট" : "General sales report"}</h2>
          {/* Mobile: 2-column compact tiles. Desktop: stacked rows like before. */}
          <div className="grid grid-cols-2 gap-2 md:hidden">
            <Tile label="মোট বিক্রি" value={fmtMoney(s.totalSales, lang)} tone="primary" />
            <Tile label="নগদ বেচা" sub="(কাস্টমার বাকি বাদে)" value={fmtMoney(s.cashSales, lang)} tone="success" />
            <Tile label="কাস্টমার থেকে বাকি পেয়েছেন" value={fmtMoney(s.dueReceived, lang)} tone="success" />
            <Tile label="নগদ কেনা" sub="(সাপ্লায়ার বাকি বাদে)" value={fmtMoney(s.cashPurchase, lang)} tone="danger" />
            <Tile label="সাপ্লায়ারকে বাকি দিয়েছেন" value={fmtMoney(s.duePaid, lang)} tone="danger" />
          </div>
          <div className="hidden gap-2 md:grid">
            <Row label="মোট বিক্রি" value={fmtMoney(s.totalSales, lang)} tone="primary" />
            <Row label="নগদ বেচা" sub="(কাস্টমার বাকি বাদে)" value={fmtMoney(s.cashSales, lang)} tone="success" />
            <Row label="কাস্টমার থেকে বাকির টাকা পেয়েছেন" value={fmtMoney(s.dueReceived, lang)} tone="success" />
            <Row label="নগদ কেনা" sub="(সাপ্লায়ার বাকি বাদে)" value={fmtMoney(s.cashPurchase, lang)} tone="danger" />
            <Row label="সাপ্লায়ারকে বাকির টাকা দিয়েছেন" value={fmtMoney(s.duePaid, lang)} tone="danger" />
          </div>
          <div className="my-2 border-t md:my-3" />
          <div className="grid gap-2">
            <Row big label="সর্বমোট ব্যালেন্স" sub="(মোট বিক্রি + কাস্টমারের বাকির টাকা + অন্যান্য আয়) - (মোট কেনা + সাপ্লায়ারকে বাকির টাকা + অন্যান্য খরচ)" value={fmtMoney(balance, lang)} tone={balance >= 0 ? "success" : "danger"} />
            <Row big label="পণ্য বিক্রি থেকে লাভ" sub="(বিক্রিত পণ্যের বিক্রয় - ক্রয় মূল্য)" value={fmtMoney(s.productProfit, lang)} tone={s.productProfit >= 0 ? "success" : "danger"} />
          </div>
        </div>

        {/* Section 2 — Other income / expense (always 2-col, compact on mobile) */}
        <div className="grid grid-cols-2 gap-2 md:gap-3">
          <div className="rounded-xl border bg-background p-3 md:p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-muted-foreground md:text-xs">{lang === "bn" ? "অন্যান্য আয়" : "Other income"}</div>
                <div className="mt-0.5 text-base font-extrabold text-emerald-600 md:text-2xl">{fmtMoney(s.otherIncome, lang)}</div>
              </div>
              <Button size="icon" className="h-8 w-8 shrink-0 bg-emerald-500 hover:bg-emerald-600 text-white md:h-9 md:w-9" aria-label={lang === "bn" ? "নতুন আয় যুক্ত করুন" : "Add income"}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="rounded-xl border bg-background p-3 md:p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-muted-foreground md:text-xs">{lang === "bn" ? "অন্যান্য খরচ" : "Other expense"}</div>
                <div className="mt-0.5 text-base font-extrabold text-rose-600 md:text-2xl">{fmtMoney(s.otherExpense, lang)}</div>
              </div>
              <Button size="icon" className="h-8 w-8 shrink-0 bg-rose-500 hover:bg-rose-600 text-white md:h-9 md:w-9" aria-label={lang === "bn" ? "নতুন খরচ যুক্ত করুন" : "Add expense"}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Section 3 — Total dues (always 2-col side-by-side) */}
        <div className="rounded-xl border bg-background p-3 md:p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-bold">{lang === "bn" ? "মোট বাকি" : "Total due"}</div>
            <div className="text-sm font-bold">{fmtMoney(s.receivable + s.payable, lang)}</div>
          </div>
          <div className="grid grid-cols-2 gap-2 md:gap-3">
            <div className="rounded-lg bg-emerald-100 p-3 text-center text-emerald-900 md:p-4">
              <div className="text-[11px] font-bold md:text-sm">{lang === "bn" ? "সাপ্লায়ারকে দিবো" : "Owe suppliers"}</div>
              <div className="mt-0.5 text-base font-extrabold md:text-xl">{fmtMoney(s.payable, lang)}</div>
            </div>
            <div className="rounded-lg bg-rose-100 p-3 text-center text-rose-900 md:p-4">
              <div className="text-[11px] font-bold md:text-sm">{lang === "bn" ? "কাস্টমার থেকে পাবো" : "Customers owe"}</div>
              <div className="mt-0.5 text-base font-extrabold md:text-xl">{fmtMoney(s.receivable, lang)}</div>
            </div>
          </div>
        </div>

        {/* Section 4 — All reports grid */}
        <div className="rounded-xl border bg-background p-4">
          <h3 className="mb-3 text-sm font-bold">{lang === "bn" ? "ব্যবসার সকল রিপোর্ট" : "All business reports"}</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {subReports.map((r) => (
              <button
                key={r.en}
                onClick={() => { if (r.to) nav({ to: r.to }); }}
                className="flex flex-col items-center gap-2 rounded-lg border bg-background p-4 text-center transition hover:bg-muted/50"
              >
                <r.Icon className="h-7 w-7 text-primary" />
                <span className="text-xs font-semibold">{lang === "bn" ? r.bn : r.en}</span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            {lang === "bn" ? "প্রত্যেকটি ব্যক্তিগত রিপোর্ট শীঘ্রই আসছে" : "Individual sub-reports coming soon"}
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, sub, value, tone = "primary", big = false }: { label: string; sub?: string; value: string; tone?: "primary" | "success" | "danger"; big?: boolean }) {
  const color = tone === "success" ? "text-emerald-600" : tone === "danger" ? "text-rose-600" : "text-primary";
  return (
    <div className={"flex items-start justify-between gap-3 rounded-md border px-3 py-3 " + (big ? "bg-muted/30" : "")}>
      <div className="min-w-0">
        <div className={"text-sm font-semibold " + (big ? "" : color)}>{label}</div>
        {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
      </div>
      <div className={"shrink-0 text-base font-extrabold " + color}>{value}</div>
    </div>
  );
}

function Tile({ label, sub, value, tone = "primary" }: { label: string; sub?: string; value: string; tone?: "primary" | "success" | "danger" }) {
  const color = tone === "success" ? "text-emerald-600" : tone === "danger" ? "text-rose-600" : "text-primary";
  return (
    <div className="flex flex-col gap-0.5 rounded-md border bg-background px-2.5 py-2">
      <div className="text-[10.5px] font-semibold leading-tight text-foreground">{label}</div>
      {sub && <div className="text-[9px] leading-tight text-muted-foreground">{sub}</div>}
      <div className={"mt-auto pt-1 text-sm font-extrabold " + color}>{value}</div>
    </div>
  );
}
export default GuardedReportsPage;
