import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useI18n, fmtMoney } from "@/lib/i18n";
import { useShop } from "@/lib/shop";
import { stockReportQuery, rangeToIso } from "@/lib/queries";
import { ReportShell, StatTile, EmptyState } from "@/components/app/ReportShell";
import { monthStartIso, todayIso, type DateRange } from "@/components/app/DateRangePicker";
import { printReport, type PrintRow } from "@/lib/print-report";
import { RequirePerm } from "@/components/app/RequirePerm";

function Page() {
  const { lang, t } = useI18n();
  const { current } = useShop();
  const [range, setRange] = useState<DateRange>({ start: monthStartIso(), end: todayIso() });
  const iso = rangeToIso(range.start, range.end);
  const { data, isFetching, refetch } = useQuery(stockReportQuery(current?.id ?? null, iso));
  const rows: any[] = (data ?? []) as any[];

  const totals = useMemo(() => {
    let inQty = 0, inAmt = 0, outQty = 0, outAmt = 0;
    for (const r of rows) { inQty += r.in_qty; inAmt += r.in_amt; outQty += Math.abs(r.out_qty); outAmt += Math.abs(r.out_amt); }
    return { inQty, inAmt, outQty, outAmt };
  }, [rows]);

  const onPrint = () => {
    const printRows: PrintRow[] = [
      { kind: "section", label: t("p5_Summary") },
      { kind: "row", label: t("p5_Total_in"), value: `${totals.inQty} • ${fmtMoney(totals.inAmt, lang)}`, tone: "success" },
      { kind: "row", label: t("p5_Total_out"), value: `${totals.outQty} • ${fmtMoney(totals.outAmt, lang)}`, tone: "danger" },
      { kind: "divider" },
      { kind: "section", label: t("p5_Per_product") },
      ...rows.map((r) => ({ kind: "row" as const, label: r.name, sub: `+${r.in_qty} / ${r.out_qty}`, value: fmtMoney(r.in_amt - r.out_amt, lang) })),
    ];
    printReport({
      shopName: current?.name ?? "",
      shopAddress: (current as any)?.address ?? null,
      shopPhone: (current as any)?.phone ?? null,
      title: "স্টকের রিপোর্ট",
      startDate: range.start,
      endDate: range.end,
      rows: printRows,
    });
  };

  return (
    <ReportShell
      breadcrumb="স্টকের রিপোর্ট"
      titleBn="স্টকের রিপোর্ট"
      titleEn="Stock Report"
      range={range}
      onRangeChange={setRange}
      isFetching={isFetching}
      onRefresh={() => refetch()}
      onPrint={onPrint}
    >
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatTile label={t("p5_In_qty")} value={String(totals.inQty)} tone="success" />
        <StatTile label={t("p5_In_amount")} value={fmtMoney(totals.inAmt, lang)} tone="success" />
        <StatTile label={t("p5_Out_qty")} value={String(totals.outQty)} tone="danger" />
        <StatTile label={t("p5_Out_amount")} value={fmtMoney(totals.outAmt, lang)} tone="danger" />
      </div>

      {rows.length === 0 ? (
        <EmptyState text={t("p5_No_stock_movements")} />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-background">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs">
              <tr>
                <th className="px-3 py-2">{t("p5_Product")}</th>
                <th className="px-3 py-2 text-right">{t("p5_In_qty_2")}</th>
                <th className="px-3 py-2 text-right">{t("p5_In_amt")}</th>
                <th className="px-3 py-2 text-right">{t("p5_Out_qty_2")}</th>
                <th className="px-3 py-2 text-right">{t("p5_Out_amt")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2 text-right text-emerald-600">{r.in_qty}</td>
                  <td className="px-3 py-2 text-right">{fmtMoney(r.in_amt, lang)}</td>
                  <td className="px-3 py-2 text-right text-rose-600">{Math.abs(r.out_qty)}</td>
                  <td className="px-3 py-2 text-right">{fmtMoney(Math.abs(r.out_amt), lang)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ReportShell>
  );
}

export default function StockReport() {
  return <RequirePerm group="report"><Page /></RequirePerm>;
}