import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useI18n, fmtMoney } from "@/lib/i18n";
import { useShop } from "@/lib/shop";
import { topCustomersQuery, rangeToIso } from "@/lib/queries";
import { ReportShell, StatTile, EmptyState } from "@/components/app/ReportShell";
import { monthStartIso, todayIso, type DateRange } from "@/components/app/DateRangePicker";
import { printReport, type PrintRow } from "@/lib/print-report";
import { RequirePerm } from "@/components/app/RequirePerm";

function Page() {
  const { lang } = useI18n();
  const { current } = useShop();
  const [range, setRange] = useState<DateRange>({ start: monthStartIso(), end: todayIso() });
  const iso = rangeToIso(range.start, range.end);
  const { data, isFetching, refetch } = useQuery(topCustomersQuery(current?.id ?? null, iso));
  const rows: any[] = (data ?? []) as any[];

  const totals = useMemo(() => {
    let total = 0, due = 0, orders = 0;
    for (const r of rows) { total += r.total; due += r.due; orders += r.orders; }
    return { total, due, orders, count: rows.length };
  }, [rows]);

  const onPrint = () => {
    const printRows: PrintRow[] = [
      { kind: "section", label: lang === "bn" ? "সারাংশ" : "Summary" },
      { kind: "row", label: lang === "bn" ? "মোট কাস্টমার" : "Customers", value: String(totals.count) },
      { kind: "row", label: lang === "bn" ? "মোট অর্ডার" : "Orders", value: String(totals.orders) },
      { kind: "row", label: lang === "bn" ? "মোট বিক্রি" : "Total", value: fmtMoney(totals.total, lang), tone: "success" },
      { kind: "divider" },
      { kind: "section", label: lang === "bn" ? "সেরা কাস্টমার তালিকা" : "Top customers" },
      ...rows.map((r, i) => ({ kind: "row" as const, label: `${i + 1}. ${r.name}`, sub: r.phone, value: fmtMoney(r.total, lang) })),
    ];
    printReport({
      shopName: current?.name ?? "",
      shopAddress: (current as any)?.address ?? null,
      shopPhone: (current as any)?.phone ?? null,
      title: "সেরা কাস্টমার",
      startDate: range.start,
      endDate: range.end,
      rows: printRows,
    });
  };

  return (
    <ReportShell
      breadcrumb="সেরা কাস্টমার"
      titleBn="সেরা কাস্টমার"
      titleEn="Top Customers"
      range={range}
      onRangeChange={setRange}
      isFetching={isFetching}
      onRefresh={() => refetch()}
      onPrint={onPrint}
    >
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatTile label={lang === "bn" ? "মোট কাস্টমার" : "Customers"} value={String(totals.count)} />
        <StatTile label={lang === "bn" ? "মোট অর্ডার" : "Orders"} value={String(totals.orders)} />
        <StatTile label={lang === "bn" ? "মোট বিক্রি" : "Total"} value={fmtMoney(totals.total, lang)} tone="success" />
        <StatTile label={lang === "bn" ? "মোট বাকি" : "Total due"} value={fmtMoney(totals.due, lang)} tone="danger" />
      </div>

      {rows.length === 0 ? (
        <EmptyState text={lang === "bn" ? "এই সময়ে কোনো কাস্টমার নেই" : "No customers"} />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-background">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs">
              <tr>
                <th className="px-3 py-2 w-10">#</th>
                <th className="px-3 py-2">{lang === "bn" ? "নাম" : "Name"}</th>
                <th className="px-3 py-2">{lang === "bn" ? "ফোন" : "Phone"}</th>
                <th className="px-3 py-2 text-right">{lang === "bn" ? "অর্ডার" : "Orders"}</th>
                <th className="px-3 py-2 text-right">{lang === "bn" ? "মোট" : "Total"}</th>
                <th className="px-3 py-2 text-right">{lang === "bn" ? "বাকি" : "Due"}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                  <td className="px-3 py-2 font-semibold">{r.name}</td>
                  <td className="px-3 py-2 text-xs">{r.phone}</td>
                  <td className="px-3 py-2 text-right">{r.orders}</td>
                  <td className="px-3 py-2 text-right font-semibold">{fmtMoney(r.total, lang)}</td>
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

export default function TopCustomers() {
  return <RequirePerm group="report"><Page /></RequirePerm>;
}