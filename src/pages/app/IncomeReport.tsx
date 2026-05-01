import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useI18n, fmtMoney } from "@/lib/i18n";
import { useShop } from "@/lib/shop";
import { incomeReportQuery, rangeToIso } from "@/lib/queries";
import { ReportShell, StatTile, EmptyState } from "@/components/app/ReportShell";
import { monthStartIso, todayIso, type DateRange } from "@/components/app/DateRangePicker";
import { printReport, type PrintRow } from "@/lib/print-report";
import { RequirePerm } from "@/components/app/RequirePerm";

function Page() {
  const { lang } = useI18n();
  const { current } = useShop();
  const [range, setRange] = useState<DateRange>({ start: monthStartIso(), end: todayIso() });
  const iso = rangeToIso(range.start, range.end);
  const { data, isFetching, refetch } = useQuery(incomeReportQuery(current?.id ?? null, iso));
  const rows: any[] = (data ?? []) as any[];

  const totals = useMemo(() => {
    let amount = 0;
    for (const r of rows) amount += Number(r.amount ?? 0);
    return { amount, count: rows.length };
  }, [rows]);

  const onPrint = () => {
    const printRows: PrintRow[] = [
      { kind: "section", label: lang === "bn" ? "সারাংশ" : "Summary" },
      { kind: "row", label: lang === "bn" ? "মোট এন্ট্রি" : "Entries", value: String(totals.count) },
      { kind: "row", label: lang === "bn" ? "মোট আয়" : "Total income", value: fmtMoney(totals.amount, lang), tone: "success" },
      { kind: "divider" },
      { kind: "section", label: lang === "bn" ? "আয়ের তালিকা" : "Income entries" },
      ...rows.map((r) => ({
        kind: "row" as const,
        label: r.source ?? "—",
        sub: new Date(r.created_at).toLocaleDateString(),
        value: fmtMoney(Number(r.amount ?? 0), lang),
        tone: "success" as const,
      })),
    ];
    printReport({
      shopName: current?.name ?? "",
      shopAddress: (current as any)?.address ?? null,
      shopPhone: (current as any)?.phone ?? null,
      title: "আয়ের রিপোর্ট",
      startDate: range.start,
      endDate: range.end,
      rows: printRows,
    });
  };

  return (
    <ReportShell
      breadcrumb="আয়ের রিপোর্ট"
      titleBn="আয়ের রিপোর্ট"
      titleEn="Income Report"
      range={range}
      onRangeChange={setRange}
      isFetching={isFetching}
      onRefresh={() => refetch()}
      onPrint={onPrint}
    >
      <div className="grid grid-cols-2 gap-2 md:grid-cols-2">
        <StatTile label={lang === "bn" ? "মোট এন্ট্রি" : "Entries"} value={String(totals.count)} />
        <StatTile label={lang === "bn" ? "মোট আয়" : "Total income"} value={fmtMoney(totals.amount, lang)} tone="success" />
      </div>

      {rows.length === 0 ? (
        <EmptyState text={lang === "bn" ? "এই সময়ে কোনো আয় নেই" : "No income entries"} />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-background">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs">
              <tr>
                <th className="px-3 py-2">{lang === "bn" ? "তারিখ" : "Date"}</th>
                <th className="px-3 py-2">{lang === "bn" ? "উৎস" : "Source"}</th>
                <th className="px-3 py-2">{lang === "bn" ? "মাধ্যম" : "Via"}</th>
                <th className="px-3 py-2">{lang === "bn" ? "নোট" : "Note"}</th>
                <th className="px-3 py-2 text-right">{lang === "bn" ? "পরিমাণ" : "Amount"}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="px-3 py-2 font-semibold">{r.source ?? "—"}</td>
                  <td className="px-3 py-2 text-xs">{r.paid_via ?? "—"}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{r.note ?? ""}</td>
                  <td className="px-3 py-2 text-right font-semibold text-emerald-600">{fmtMoney(Number(r.amount ?? 0), lang)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ReportShell>
  );
}

export default function IncomeReport() {
  return <RequirePerm group="report"><Page /></RequirePerm>;
}