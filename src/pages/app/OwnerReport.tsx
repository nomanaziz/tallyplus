import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useI18n, fmtMoney } from "@/lib/i18n";
import { useShop } from "@/lib/shop";
import { ownerReportQuery, rangeToIso } from "@/lib/queries";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { DateRangePicker, monthStartIso, todayIso, type DateRange } from "@/components/app/DateRangePicker";
import { RefreshCw, Printer } from "lucide-react";
import { printReport, type PrintRow } from "@/lib/print-report";
import { RequirePerm } from "@/components/app/RequirePerm";



function Guarded() {
  return <RequirePerm group="report"><OwnerReportPage /></RequirePerm>;
}

function OwnerReportPage() {
  const { lang, t } = useI18n();
  const { current } = useShop();
  const [range, setRange] = useState<DateRange>({ start: monthStartIso(), end: todayIso() });
  const iso = rangeToIso(range.start, range.end);
  const { data, isFetching, refetch } = useQuery(ownerReportQuery(current?.id ?? null, iso));
  const r = data ?? {
    totalInvest: 0, totalWithdraw: 0, netCapital: 0,
    activeAssetValue: 0, assetLoss: 0,
    productProfit: 0, otherIncome: 0, otherExpense: 0, netProfit: 0, ownerEquity: 0,
  };

  const onPrint = () => {
    const rows: PrintRow[] = [
      { kind: "section", label: t("p5_Capital") },
      { kind: "row", label: "মোট বিনিয়োগ", value: fmtMoney(r.totalInvest, lang), tone: "success" },
      { kind: "row", label: "মোট উত্তোলন", value: fmtMoney(r.totalWithdraw, lang), tone: "danger" },
      { kind: "row", label: "নিট মূলধন", value: fmtMoney(r.netCapital, lang), tone: r.netCapital >= 0 ? "success" : "danger" },
      { kind: "section", label: t("p5_Assets") },
      { kind: "row", label: "সচল সম্পদ মূল্য", value: fmtMoney(r.activeAssetValue, lang), tone: "success" },
      { kind: "row", label: "নষ্ট/বিক্রিত ক্ষতি", value: fmtMoney(r.assetLoss, lang), tone: "danger" },
      { kind: "section", label: t("p5_Business_result") },
      { kind: "row", label: "পণ্য বিক্রি থেকে লাভ", value: fmtMoney(r.productProfit, lang), tone: r.productProfit >= 0 ? "success" : "danger" },
      { kind: "row", label: "অন্যান্য আয়", value: fmtMoney(r.otherIncome, lang), tone: "success" },
      { kind: "row", label: "অন্যান্য খরচ", value: fmtMoney(r.otherExpense, lang), tone: "danger" },
      { kind: "divider" },
      { kind: "row", label: "নিট লাভ", value: fmtMoney(r.netProfit, lang), tone: r.netProfit >= 0 ? "success" : "danger" },
      { kind: "row", label: "মালিকের অবস্থান (Equity)", sub: "নিট মূলধন + নিট লাভ - সম্পদ ক্ষতি", value: fmtMoney(r.ownerEquity, lang), tone: r.ownerEquity >= 0 ? "success" : "danger" },
    ];
    printReport({
      shopName: current?.name ?? "",
      shopAddress: (current as any)?.address ?? null,
      shopPhone: (current as any)?.phone ?? null,
      title: "মালিকের রিপোর্ট",
      startDate: range.start,
      endDate: range.end,
      rows,
    });
  };

  return (
    <div className="min-h-full bg-muted/30">
      <PageHeader
        breadcrumb="মালিকের রিপোর্ট"
        title={t("p5_Owner_Report")}
        actions={
          <>
            <DateRangePicker value={range} onChange={setRange} />
            <Button variant="outline" className="h-10 gap-2" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={"h-4 w-4 " + (isFetching ? "animate-spin" : "")} />
              {t("p5_Refresh")}
            </Button>
            <Button className="h-10 gap-2" onClick={onPrint}>
              <Printer className="h-4 w-4" />
              {t("p5_Download_Print")}
            </Button>
          </>
        }
      />

      <div className="container space-y-3 px-3 py-3 md:space-y-4 md:px-4 md:py-4">
        {/* Capital */}
        <Section title={t("p5_Capital")}>
          <Line label={t("p5_Total_invest")} value={fmtMoney(r.totalInvest, lang)} tone="success" />
          <Line label={t("p5_Total_withdraw")} value={fmtMoney(r.totalWithdraw, lang)} tone="danger" />
          <Line label={t("p5_Net_capital")} value={fmtMoney(r.netCapital, lang)} tone={r.netCapital >= 0 ? "success" : "danger"} bold />
        </Section>

        {/* Assets */}
        <Section title={t("p5_Assets")}>
          <Line label={t("p5_Active_asset_value")} value={fmtMoney(r.activeAssetValue, lang)} tone="success" />
          <Line label={t("p5_Loss_disposed")} value={fmtMoney(r.assetLoss, lang)} tone="danger" />
        </Section>

        {/* Business */}
        <Section title={t("p5_Business_result")}>
          <Line label={t("p5_Product_profit_2")} value={fmtMoney(r.productProfit, lang)} tone={r.productProfit >= 0 ? "success" : "danger"} />
          <Line label={t("p5_Other_income")} value={fmtMoney(r.otherIncome, lang)} tone="success" />
          <Line label={t("p5_Other_expense")} value={fmtMoney(r.otherExpense, lang)} tone="danger" />
          <Line label={t("p5_Net_profit")} value={fmtMoney(r.netProfit, lang)} tone={r.netProfit >= 0 ? "success" : "danger"} bold />
        </Section>

        {/* Owner equity */}
        <div className="rounded-xl border bg-card p-4 shadow-sm ring-1 ring-primary/20">
          <div className="text-sm font-bold text-muted-foreground">{t("p5_Owner_equity")}</div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {t("p5_Net_capital_Net_profit_Asset_l")}
          </div>
          <div className={"mt-2 text-3xl font-extrabold " + (r.ownerEquity >= 0 ? "text-emerald-700" : "text-rose-600")}>
            {fmtMoney(r.ownerEquity, lang)}
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-background p-4">
      <h3 className="mb-2 text-sm font-bold">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Line({ label, value, tone = "primary", bold = false }: { label: string; value: string; tone?: "primary" | "success" | "danger"; bold?: boolean }) {
  const color = tone === "success" ? "text-emerald-600" : tone === "danger" ? "text-rose-600" : "text-primary";
  return (
    <div className={"flex items-center justify-between gap-3 rounded-md border px-3 py-2 " + (bold ? "bg-muted/30" : "")}>
      <div className={"text-sm " + (bold ? "font-bold" : "font-semibold")}>{label}</div>
      <div className={"shrink-0 text-base font-extrabold " + color}>{value}</div>
    </div>
  );
}
export default Guarded;
