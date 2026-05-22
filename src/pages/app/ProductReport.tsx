import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useI18n, fmtMoney } from "@/lib/i18n";
import { useShop } from "@/lib/shop";
import { productReportQuery, rangeToIso } from "@/lib/queries";
import { ReportShell, StatTile, EmptyState } from "@/components/app/ReportShell";
import { monthStartIso, todayIso, type DateRange } from "@/components/app/DateRangePicker";
import { printReport, type PrintRow } from "@/lib/print-report";
import { RequirePerm } from "@/components/app/RequirePerm";

function Page() {
  const { lang, t } = useI18n();
  const { current } = useShop();
  const [range, setRange] = useState<DateRange>({ start: monthStartIso(), end: todayIso() });
  const iso = rangeToIso(range.start, range.end);
  const { data, isFetching, refetch } = useQuery(productReportQuery(current?.id ?? null, iso));
  const rows: any[] = (data ?? []) as any[];

  const totals = useMemo(() => {
    let qty = 0, revenue = 0, profit = 0;
    for (const r of rows) { qty += r.qty; revenue += r.revenue; profit += r.profit; }
    return { qty, revenue, profit, count: rows.length };
  }, [rows]);

  const onPrint = () => {
    const printRows: PrintRow[] = [
      { kind: "section", label: t("p5_Summary") },
      { kind: "row", label: t("p5_Total_qty"), value: String(totals.qty) },
      { kind: "row", label: t("p5_Revenue"), value: fmtMoney(totals.revenue, lang), tone: "success" },
      { kind: "row", label: t("p5_Profit"), value: fmtMoney(totals.profit, lang), tone: totals.profit >= 0 ? "success" : "danger" },
      { kind: "divider" },
      { kind: "section", label: t("p5_Per_product_2") },
      ...rows.map((r) => ({ kind: "row" as const, label: r.name, sub: `qty: ${r.qty}`, value: fmtMoney(r.revenue, lang) })),
    ];
    printReport({
      shopName: current?.name ?? "",
      shopAddress: (current as any)?.address ?? null,
      shopPhone: (current as any)?.phone ?? null,
      title: "পণ্যের রিপোর্ট",
      startDate: range.start,
      endDate: range.end,
      rows: printRows,
    });
  };

  return (
    <ReportShell
      breadcrumb="পণ্যের রিপোর্ট"
      titleBn="পণ্যের রিপোর্ট"
      titleEn="Product Report"
      range={range}
      onRangeChange={setRange}
      isFetching={isFetching}
      onRefresh={() => refetch()}
      onPrint={onPrint}
    >
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatTile label={t("p5_Distinct")} value={String(totals.count)} />
        <StatTile label={t("p5_Total_qty_2")} value={String(totals.qty)} />
        <StatTile label={t("p5_Revenue")} value={fmtMoney(totals.revenue, lang)} tone="success" />
        <StatTile label={t("p5_Profit")} value={fmtMoney(totals.profit, lang)} tone={totals.profit >= 0 ? "success" : "danger"} />
      </div>

      {rows.length === 0 ? (
        <EmptyState text={t("p5_No_products_sold")} />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-background">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs">
              <tr>
                <th className="px-3 py-2 w-10">#</th>
                <th className="px-3 py-2">{t("p5_Product")}</th>
                <th className="px-3 py-2 text-right">{t("p5_Qty")}</th>
                <th className="px-3 py-2 text-right">{t("p5_Revenue_2")}</th>
                <th className="px-3 py-2 text-right">{t("p5_Profit_2")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2 text-right">{r.qty}</td>
                  <td className="px-3 py-2 text-right font-semibold">{fmtMoney(r.revenue, lang)}</td>
                  <td className={"px-3 py-2 text-right font-semibold " + (r.profit >= 0 ? "text-emerald-600" : "text-rose-600")}>{fmtMoney(r.profit, lang)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ReportShell>
  );
}

export default function ProductReport() {
  return <RequirePerm group="report"><Page /></RequirePerm>;
}