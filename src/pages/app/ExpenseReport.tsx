import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useI18n, fmtMoney } from "@/lib/i18n";
import { useShop } from "@/lib/shop";
import { expenseReportQuery, rangeToIso } from "@/lib/queries";
import { ReportShell, StatTile, EmptyState } from "@/components/app/ReportShell";
import { monthStartIso, todayIso, type DateRange } from "@/components/app/DateRangePicker";
import { printReport, type PrintRow } from "@/lib/print-report";
import { RequirePerm } from "@/components/app/RequirePerm";

function Page() {
  const { lang } = useI18n();
  const { current } = useShop();
  const [range, setRange] = useState<DateRange>({ start: monthStartIso(), end: todayIso() });
  const iso = rangeToIso(range.start, range.end);
  const { data, isFetching, refetch } = useQuery(expenseReportQuery(current?.id ?? null, iso));
  const rows: any[] = (data ?? []) as any[];

  const totals = useMemo(() => {
    let amount = 0, count = 0;
    for (const r of rows) { amount += r.amount; count += r.count; }
    return { amount, count, categories: rows.length };
  }, [rows]);

  const onPrint = () => {
    const printRows: PrintRow[] = [
      { kind: "section", label: lang === "bn" ? "সারাংশ" : "Summary" },
      { kind: "row", label: lang === "bn" ? "মোট ক্যাটাগরি" : "Categories", value: String(totals.categories) },
      { kind: "row", label: lang === "bn" ? "মোট এন্ট্রি" : "Entries", value: String(totals.count) },
      { kind: "row", label: lang === "bn" ? "মোট খরচ" : "Total expense", value: fmtMoney(totals.amount, lang), tone: "danger" },
      { kind: "divider" },
      { kind: "section", label: lang === "bn" ? "ক্যাটাগরিভিত্তিক" : "By category" },
      ...rows.map((r) => ({ kind: "row" as const, label: r.category, sub: `${r.count} entries`, value: fmtMoney(r.amount, lang), tone: "danger" as const })),
    ];
    printReport({
      shopName: current?.name ?? "",
      shopAddress: (current as any)?.address ?? null,
      shopPhone: (current as any)?.phone ?? null,
      title: "খরচের রিপোর্ট",
      startDate: range.start,
      endDate: range.end,
      rows: printRows,
    });
  };

  return (
    <ReportShell
      breadcrumb="খরচের রিপোর্ট"
      titleBn="খরচের রিপোর্ট"
      titleEn="Expense Report"
      range={range}
      onRangeChange={setRange}
      isFetching={isFetching}
      onRefresh={() => refetch()}
      onPrint={onPrint}
    >
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        <StatTile label={lang === "bn" ? "ক্যাটাগরি" : "Categories"} value={String(totals.categories)} />
        <StatTile label={lang === "bn" ? "মোট এন্ট্রি" : "Entries"} value={String(totals.count)} />
        <StatTile label={lang === "bn" ? "মোট খরচ" : "Total"} value={fmtMoney(totals.amount, lang)} tone="danger" />
      </div>

      {rows.length === 0 ? (
        <EmptyState text={lang === "bn" ? "এই সময়ে কোনো খরচ নেই" : "No expenses"} />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-background">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs">
              <tr>
                <th className="px-3 py-2">{lang === "bn" ? "ক্যাটাগরি" : "Category"}</th>
                <th className="px-3 py-2 text-right">{lang === "bn" ? "এন্ট্রি" : "Entries"}</th>
                <th className="px-3 py-2 text-right">{lang === "bn" ? "মোট" : "Amount"}</th>
                <th className="px-3 py-2 text-right">%</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.category} className="border-t">
                  <td className="px-3 py-2 font-semibold">{r.category}</td>
                  <td className="px-3 py-2 text-right">{r.count}</td>
                  <td className="px-3 py-2 text-right font-semibold text-rose-600">{fmtMoney(r.amount, lang)}</td>
                  <td className="px-3 py-2 text-right text-xs text-muted-foreground">
                    {totals.amount > 0 ? ((r.amount / totals.amount) * 100).toFixed(1) : "0"}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ReportShell>
  );
}

export default function ExpenseReport() {
  return <RequirePerm group="report"><Page /></RequirePerm>;
}