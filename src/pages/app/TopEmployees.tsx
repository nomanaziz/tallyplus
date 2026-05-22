import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useI18n, fmtMoney } from "@/lib/i18n";
import { useShop } from "@/lib/shop";
import { topEmployeesQuery, rangeToIso } from "@/lib/queries";
import { ReportShell, StatTile, EmptyState } from "@/components/app/ReportShell";
import { monthStartIso, todayIso, type DateRange } from "@/components/app/DateRangePicker";
import { printReport, type PrintRow } from "@/lib/print-report";
import { RequirePerm } from "@/components/app/RequirePerm";

function Page() {
  const { lang, t } = useI18n();
  const { current } = useShop();
  const [range, setRange] = useState<DateRange>({ start: monthStartIso(), end: todayIso() });
  const iso = rangeToIso(range.start, range.end);
  const { data, isFetching, refetch } = useQuery(topEmployeesQuery(current?.id ?? null, iso));
  const rows: any[] = (data ?? []) as any[];

  const totals = useMemo(() => {
    let total = 0, count = 0;
    for (const r of rows) { total += r.total; count += r.count; }
    return { total, count, employees: rows.length };
  }, [rows]);

  const onPrint = () => {
    const printRows: PrintRow[] = [
      { kind: "section", label: t("p5_Summary") },
      { kind: "row", label: t("p5_Employees"), value: String(totals.employees) },
      { kind: "row", label: t("p5_Total_sales"), value: fmtMoney(totals.total, lang), tone: "success" },
      { kind: "divider" },
      { kind: "section", label: t("p5_Top_employees") },
      ...rows.map((r, i) => ({ kind: "row" as const, label: `${i + 1}. ${r.name}`, sub: `${r.count} sales`, value: fmtMoney(r.total, lang) })),
    ];
    printReport({
      shopName: current?.name ?? "",
      shopAddress: (current as any)?.address ?? null,
      shopPhone: (current as any)?.phone ?? null,
      title: "সেরা কর্মচারী",
      startDate: range.start,
      endDate: range.end,
      rows: printRows,
    });
  };

  return (
    <ReportShell
      breadcrumb="সেরা কর্মচারী"
      titleBn="সেরা কর্মচারী"
      titleEn="Top Employees"
      range={range}
      onRangeChange={setRange}
      isFetching={isFetching}
      onRefresh={() => refetch()}
      onPrint={onPrint}
    >
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        <StatTile label={t("p5_Employees_2")} value={String(totals.employees)} />
        <StatTile label={t("p5_Sales_count")} value={String(totals.count)} />
        <StatTile label={t("p5_Total_5")} value={fmtMoney(totals.total, lang)} tone="success" />
      </div>

      {rows.length === 0 ? (
        <EmptyState text={t("p5_No_employee_sales")} />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-background">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs">
              <tr>
                <th className="px-3 py-2 w-10">#</th>
                <th className="px-3 py-2">{t("p5_Name")}</th>
                <th className="px-3 py-2 text-right">{t("p5_Sales")}</th>
                <th className="px-3 py-2 text-right">{t("p5_Total")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                  <td className="px-3 py-2 font-semibold">{r.name}</td>
                  <td className="px-3 py-2 text-right">{r.count}</td>
                  <td className="px-3 py-2 text-right font-semibold">{fmtMoney(r.total, lang)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ReportShell>
  );
}

export default function TopEmployees() {
  return <RequirePerm group="report"><Page /></RequirePerm>;
}