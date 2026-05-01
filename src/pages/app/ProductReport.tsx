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
  const { lang } = useI18n();
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
      { kind: "section", label: lang === "bn" ? "সারাংশ" : "Summary" },
      { kind: "row", label: lang === "bn" ? "মোট পণ্য বিক্রি (qty)" : "Total qty", value: String(totals.qty) },
      { kind: "row", label: lang === "bn" ? "মোট রাজস্ব" : "Revenue", value: fmtMoney(totals.revenue, lang), tone: "success" },
      { kind: "row", label: lang === "bn" ? "মোট লাভ" : "Profit", value: fmtMoney(totals.profit, lang), tone: totals.profit >= 0 ? "success" : "danger" },
      { kind: "divider" },
      { kind: "section", label: lang === "bn" ? "পণ্যভিত্তিক বিক্রি" : "Per product" },
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
        <StatTile label={lang === "bn" ? "ভিন্ন পণ্য" : "Distinct"} value={String(totals.count)} />
        <StatTile label={lang === "bn" ? "মোট বিক্রি qty" : "Total qty"} value={String(totals.qty)} />
        <StatTile label={lang === "bn" ? "মোট রাজস্ব" : "Revenue"} value={fmtMoney(totals.revenue, lang)} tone="success" />
        <StatTile label={lang === "bn" ? "মোট লাভ" : "Profit"} value={fmtMoney(totals.profit, lang)} tone={totals.profit >= 0 ? "success" : "danger"} />
      </div>

      {rows.length === 0 ? (
        <EmptyState text={lang === "bn" ? "এই সময়ে কোনো পণ্য বিক্রি নেই" : "No products sold"} />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-background">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs">
              <tr>
                <th className="px-3 py-2 w-10">#</th>
                <th className="px-3 py-2">{lang === "bn" ? "পণ্য" : "Product"}</th>
                <th className="px-3 py-2 text-right">{lang === "bn" ? "বিক্রি qty" : "Qty"}</th>
                <th className="px-3 py-2 text-right">{lang === "bn" ? "রাজস্ব" : "Revenue"}</th>
                <th className="px-3 py-2 text-right">{lang === "bn" ? "লাভ" : "Profit"}</th>
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