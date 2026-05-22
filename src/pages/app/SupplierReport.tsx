import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useI18n, fmtMoney } from "@/lib/i18n";
import { useShop } from "@/lib/shop";
import { supplierReportQuery, rangeToIso } from "@/lib/queries";
import { ReportShell, StatTile, EmptyState } from "@/components/app/ReportShell";
import { monthStartIso, todayIso, type DateRange } from "@/components/app/DateRangePicker";
import { printReport, type PrintRow } from "@/lib/print-report";
import { RequirePerm } from "@/components/app/RequirePerm";

function Page() {
  const { lang, t } = useI18n();
  const { current } = useShop();
  const [range, setRange] = useState<DateRange>({ start: monthStartIso(), end: todayIso() });
  const iso = rangeToIso(range.start, range.end);
  const { data, isFetching, refetch } = useQuery(supplierReportQuery(current?.id ?? null, iso));
  const rows: any[] = (data ?? []) as any[];

  const totals = useMemo(() => {
    let total = 0, paid = 0, due = 0;
    for (const r of rows) { total += r.total; paid += r.paid; due += r.due; }
    return { total, paid, due, count: rows.length };
  }, [rows]);

  const onPrint = () => {
    const printRows: PrintRow[] = [
      { kind: "section", label: t("p5_Summary") },
      { kind: "row", label: t("p5_Suppliers"), value: String(totals.count) },
      { kind: "row", label: t("p5_Total_purchase"), value: fmtMoney(totals.total, lang), tone: "danger" },
      { kind: "row", label: t("p5_Paid_3"), value: fmtMoney(totals.paid, lang) },
      { kind: "row", label: t("p5_Due_2"), value: fmtMoney(totals.due, lang), tone: "danger" },
      { kind: "divider" },
      { kind: "section", label: t("p5_Suppliers_2") },
      ...rows.map((r, i) => ({ kind: "row" as const, label: `${i + 1}. ${r.name}`, sub: r.phone, value: fmtMoney(r.total, lang) })),
    ];
    printReport({
      shopName: current?.name ?? "",
      shopAddress: (current as any)?.address ?? null,
      shopPhone: (current as any)?.phone ?? null,
      title: "সাপ্লায়ার রিপোর্ট",
      startDate: range.start,
      endDate: range.end,
      rows: printRows,
    });
  };

  return (
    <ReportShell
      breadcrumb="সাপ্লায়ার রিপোর্ট"
      titleBn="সাপ্লায়ার রিপোর্ট"
      titleEn="Supplier Report"
      range={range}
      onRangeChange={setRange}
      isFetching={isFetching}
      onRefresh={() => refetch()}
      onPrint={onPrint}
    >
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatTile label={t("p5_Suppliers_3")} value={String(totals.count)} />
        <StatTile label={t("p5_Total_3")} value={fmtMoney(totals.total, lang)} tone="danger" />
        <StatTile label={t("p5_Paid_3")} value={fmtMoney(totals.paid, lang)} tone="success" />
        <StatTile label={t("p5_Due_2")} value={fmtMoney(totals.due, lang)} tone="danger" />
      </div>

      {rows.length === 0 ? (
        <EmptyState text={t("p5_No_suppliers")} />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-background">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs">
              <tr>
                <th className="px-3 py-2 w-10">#</th>
                <th className="px-3 py-2">{t("p5_Name")}</th>
                <th className="px-3 py-2">{t("p5_Phone")}</th>
                <th className="px-3 py-2 text-right">{t("p5_Total")}</th>
                <th className="px-3 py-2 text-right">{t("p5_Paid_3")}</th>
                <th className="px-3 py-2 text-right">{t("p5_Due_2")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                  <td className="px-3 py-2 font-semibold">{r.name}</td>
                  <td className="px-3 py-2 text-xs">{r.phone}</td>
                  <td className="px-3 py-2 text-right font-semibold">{fmtMoney(r.total, lang)}</td>
                  <td className="px-3 py-2 text-right text-emerald-600">{fmtMoney(r.paid, lang)}</td>
                  <td className="px-3 py-2 text-right text-rose-600">{fmtMoney(r.due, lang)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ReportShell>
  );
}

export default function SupplierReport() {
  return <RequirePerm group="report"><Page /></RequirePerm>;
}