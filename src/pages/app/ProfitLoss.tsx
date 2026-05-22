import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useI18n, fmtMoney } from "@/lib/i18n";
import { useShop } from "@/lib/shop";
import { businessReportQuery, rangeToIso } from "@/lib/queries";
import { ReportShell, StatTile } from "@/components/app/ReportShell";
import { monthStartIso, todayIso, type DateRange } from "@/components/app/DateRangePicker";
import { printReport, type PrintRow } from "@/lib/print-report";
import { RequirePerm } from "@/components/app/RequirePerm";

function Page() {
  const { lang, t } = useI18n();
  const { current } = useShop();
  const [range, setRange] = useState<DateRange>({ start: monthStartIso(), end: todayIso() });
  const iso = rangeToIso(range.start, range.end);
  const { data, isFetching, refetch } = useQuery(businessReportQuery(current?.id ?? null, iso));
  const s = data ?? { totalSales: 0, cashSales: 0, dueReceived: 0, cashPurchase: 0, duePaid: 0, otherIncome: 0, otherExpense: 0, receivable: 0, payable: 0, productProfit: 0 };

  const grossProfit = s.productProfit;
  const netProfit = grossProfit + s.otherIncome - s.otherExpense;

  const onPrint = () => {
    const rows: PrintRow[] = [
      { kind: "section", label: t("p5_Income") },
      { kind: "row", label: t("p5_Total_sales"), value: fmtMoney(s.totalSales, lang), tone: "success" },
      { kind: "row", label: t("p5_Other_income"), value: fmtMoney(s.otherIncome, lang), tone: "success" },
      { kind: "section", label: t("p5_Cost") },
      { kind: "row", label: t("p5_Other_expense"), value: fmtMoney(s.otherExpense, lang), tone: "danger" },
      { kind: "divider" },
      { kind: "row", label: t("p5_Gross_profit"), value: fmtMoney(grossProfit, lang), tone: grossProfit >= 0 ? "success" : "danger" },
      { kind: "row", label: t("p5_Net_profit"), value: fmtMoney(netProfit, lang), tone: netProfit >= 0 ? "success" : "danger" },
    ];
    printReport({
      shopName: current?.name ?? "",
      shopAddress: (current as any)?.address ?? null,
      shopPhone: (current as any)?.phone ?? null,
      title: "লাভ-ক্ষতি রিপোর্ট",
      startDate: range.start,
      endDate: range.end,
      rows,
    });
  };

  return (
    <ReportShell
      breadcrumb="লাভ-ক্ষতি রিপোর্ট"
      titleBn="লাভ-ক্ষতি রিপোর্ট"
      titleEn="Profit & Loss"
      range={range}
      onRangeChange={setRange}
      isFetching={isFetching}
      onRefresh={() => refetch()}
      onPrint={onPrint}
    >
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatTile label={t("p5_Total_sales")} value={fmtMoney(s.totalSales, lang)} tone="success" />
        <StatTile label={t("p5_Other_income")} value={fmtMoney(s.otherIncome, lang)} tone="success" />
        <StatTile label={t("p5_Other_expense")} value={fmtMoney(s.otherExpense, lang)} tone="danger" />
        <StatTile label={t("p5_Product_profit")} value={fmtMoney(grossProfit, lang)} tone={grossProfit >= 0 ? "success" : "danger"} />
      </div>

      <div className={"rounded-xl border-2 p-6 " + (netProfit >= 0 ? "border-emerald-300 bg-emerald-50" : "border-rose-300 bg-rose-50")}>
        <div className="text-sm font-semibold text-muted-foreground">{t("p5_Net_Profit_Loss")}</div>
        <div className="mt-1 text-[11px] text-muted-foreground">
          {t("p5_Product_profit_Other_income_Ot")}
        </div>
        <div className={"mt-3 text-4xl font-extrabold " + (netProfit >= 0 ? "text-emerald-700" : "text-rose-600")}>
          {fmtMoney(netProfit, lang)}
        </div>
      </div>

      <div className="rounded-xl border bg-background p-4">
        <h3 className="mb-3 text-sm font-bold">{t("p5_Breakdown")}</h3>
        <div className="space-y-2 text-sm">
          <Row label={t("p5_Total_sales")} value={fmtMoney(s.totalSales, lang)} tone="success" />
          <Row label={t("p5_Cash_sales")} value={fmtMoney(s.cashSales, lang)} tone="success" />
          <Row label={t("p5_Due_received")} value={fmtMoney(s.dueReceived, lang)} tone="success" />
          <Row label={t("p5_Cash_purchase")} value={fmtMoney(s.cashPurchase, lang)} tone="danger" />
          <Row label={t("p5_Supplier_due_paid")} value={fmtMoney(s.duePaid, lang)} tone="danger" />
          <Row label={t("p5_Other_income")} value={fmtMoney(s.otherIncome, lang)} tone="success" />
          <Row label={t("p5_Other_expense")} value={fmtMoney(s.otherExpense, lang)} tone="danger" />
        </div>
      </div>
    </ReportShell>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone: "success" | "danger" }) {
  const c = tone === "success" ? "text-emerald-600" : "text-rose-600";
  return (
    <div className="flex items-center justify-between rounded-md border px-3 py-2">
      <span className="font-semibold">{label}</span>
      <span className={"font-extrabold " + c}>{value}</span>
    </div>
  );
}

export default function ProfitLoss() {
  return <RequirePerm group="report"><Page /></RequirePerm>;
}