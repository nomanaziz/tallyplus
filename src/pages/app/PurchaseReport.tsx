import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useI18n, fmtMoney } from "@/lib/i18n";
import { useShop } from "@/lib/shop";
import { purchaseReportQuery, rangeToIso } from "@/lib/queries";
import { ReportShell, StatTile, EmptyState } from "@/components/app/ReportShell";
import { monthStartIso, todayIso, type DateRange } from "@/components/app/DateRangePicker";
import { printReport, type PrintRow } from "@/lib/print-report";
import { RequirePerm } from "@/components/app/RequirePerm";

function Page() {
  const { lang } = useI18n();
  const { current } = useShop();
  const [range, setRange] = useState<DateRange>({ start: monthStartIso(), end: todayIso() });
  const iso = rangeToIso(range.start, range.end);
  const { data, isFetching, refetch } = useQuery(purchaseReportQuery(current?.id ?? null, iso));
  const rows: any[] = (data ?? []) as any[];

  const totals = useMemo(() => {
    let total = 0, paid = 0, due = 0;
    for (const r of rows) { total += Number(r.total ?? 0); paid += Number(r.paid ?? 0); due += Number(r.due ?? 0); }
    return { total, paid, due, count: rows.length };
  }, [rows]);

  const onPrint = () => {
    const printRows: PrintRow[] = [
      { kind: "section", label: lang === "bn" ? "সারাংশ" : "Summary" },
      { kind: "row", label: lang === "bn" ? "মোট ইনভয়েস" : "Total invoices", value: String(totals.count) },
      { kind: "row", label: lang === "bn" ? "মোট ক্রয়" : "Total purchase", value: fmtMoney(totals.total, lang), tone: "danger" },
      { kind: "row", label: lang === "bn" ? "প্রদান" : "Paid", value: fmtMoney(totals.paid, lang) },
      { kind: "row", label: lang === "bn" ? "বাকি" : "Due", value: fmtMoney(totals.due, lang), tone: "danger" },
      { kind: "divider" },
      { kind: "section", label: lang === "bn" ? "ক্রয় তালিকা" : "Purchases" },
      ...rows.map((r) => ({
        kind: "row" as const,
        label: `${r.invoice_no ?? r.id} • ${r.suppliers?.name ?? "—"}`,
        sub: new Date(r.created_at).toLocaleDateString(),
        value: fmtMoney(Number(r.total ?? 0), lang),
      })),
    ];
    printReport({
      shopName: current?.name ?? "",
      shopAddress: (current as any)?.address ?? null,
      shopPhone: (current as any)?.phone ?? null,
      title: "ক্রয়ের রিপোর্ট",
      startDate: range.start,
      endDate: range.end,
      rows: printRows,
    });
  };

  return (
    <ReportShell
      breadcrumb="ক্রয়ের রিপোর্ট"
      titleBn="ক্রয়ের রিপোর্ট"
      titleEn="Purchase Report"
      range={range}
      onRangeChange={setRange}
      isFetching={isFetching}
      onRefresh={() => refetch()}
      onPrint={onPrint}
    >
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatTile label={lang === "bn" ? "মোট ইনভয়েস" : "Invoices"} value={String(totals.count)} />
        <StatTile label={lang === "bn" ? "মোট ক্রয়" : "Total purchase"} value={fmtMoney(totals.total, lang)} tone="danger" />
        <StatTile label={lang === "bn" ? "প্রদান" : "Paid"} value={fmtMoney(totals.paid, lang)} tone="success" />
        <StatTile label={lang === "bn" ? "বাকি" : "Due"} value={fmtMoney(totals.due, lang)} tone="danger" />
      </div>

      {rows.length === 0 ? (
        <EmptyState text={lang === "bn" ? "এই সময়ে কোনো ক্রয় নেই" : "No purchases in this period"} />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-background">
          <div className="hidden md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs">
                <tr>
                  <th className="px-3 py-2">{lang === "bn" ? "ইনভয়েস" : "Invoice"}</th>
                  <th className="px-3 py-2">{lang === "bn" ? "সাপ্লায়ার" : "Supplier"}</th>
                  <th className="px-3 py-2 text-right">{lang === "bn" ? "আইটেম" : "Items"}</th>
                  <th className="px-3 py-2 text-right">{lang === "bn" ? "মোট" : "Total"}</th>
                  <th className="px-3 py-2 text-right">{lang === "bn" ? "প্রদান" : "Paid"}</th>
                  <th className="px-3 py-2 text-right">{lang === "bn" ? "বাকি" : "Due"}</th>
                  <th className="px-3 py-2">{lang === "bn" ? "তারিখ" : "Date"}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2 font-mono text-xs">{r.invoice_no ?? r.id.slice(0, 8)}</td>
                    <td className="px-3 py-2">{r.suppliers?.name ?? "—"}</td>
                    <td className="px-3 py-2 text-right">{r.item_count}</td>
                    <td className="px-3 py-2 text-right font-semibold">{fmtMoney(Number(r.total ?? 0), lang)}</td>
                    <td className="px-3 py-2 text-right text-emerald-600">{fmtMoney(Number(r.paid ?? 0), lang)}</td>
                    <td className="px-3 py-2 text-right text-rose-600">{fmtMoney(Number(r.due ?? 0), lang)}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="divide-y md:hidden">
            {rows.map((r) => (
              <div key={r.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="font-mono text-xs">{r.invoice_no ?? r.id.slice(0, 8)}</div>
                  <div className="font-bold">{fmtMoney(Number(r.total ?? 0), lang)}</div>
                </div>
                <div className="text-sm">{r.suppliers?.name ?? "—"}</div>
                <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                  <span>{new Date(r.created_at).toLocaleDateString()}</span>
                  <span className="text-rose-600">বাকি: {fmtMoney(Number(r.due ?? 0), lang)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </ReportShell>
  );
}

export default function PurchaseReport() {
  return <RequirePerm group="report"><Page /></RequirePerm>;
}