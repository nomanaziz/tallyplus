import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Wallet, Receipt, Printer } from "lucide-react";
import { fmtMoney, useI18n } from "@/lib/i18n";
import type { CashBookData, CashBookLine } from "@/lib/cash-book-queries";
import { bnMonthLabel } from "@/lib/cash-book-queries";
import { printReport, type PrintRow } from "@/lib/print-report";

export type MonthCursor = { year: number; month0: number };

export function MonthSwitcher({ value, onChange }: { value: MonthCursor; onChange: (v: MonthCursor) => void }) {
  const { lang, t } = useI18n();
  const now = new Date();
  const isCurrent = value.year === now.getFullYear() && value.month0 === now.getMonth();

  const shift = (delta: number) => {
    const d = new Date(value.year, value.month0 + delta, 1);
    onChange({ year: d.getFullYear(), month0: d.getMonth() });
  };
  const setThisMonth = () => onChange({ year: now.getFullYear(), month0: now.getMonth() });
  const setLastMonth = () => {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    onChange({ year: d.getFullYear(), month0: d.getMonth() });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center rounded-lg border bg-card">
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-r-none" onClick={() => shift(-1)} aria-label="prev">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-[140px] px-3 text-center text-sm font-semibold">
          {bnMonthLabel(value.year, value.month0, lang)}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-l-none"
          onClick={() => shift(1)}
          disabled={value.year > now.getFullYear() || (value.year === now.getFullYear() && value.month0 >= now.getMonth())}
          aria-label="next"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <Button variant={isCurrent ? "default" : "outline"} size="sm" onClick={setThisMonth} className="h-9">
        {t("p2a_thisMonth")}
      </Button>
      <Button variant="outline" size="sm" onClick={setLastMonth} className="h-9">
        {t("p2a_lastMonth")}
      </Button>
    </div>
  );
}

export function CashBookView({
  data,
  loading,
  ownerName,
  subtitle,
}: {
  data: CashBookData | null;
  loading: boolean;
  ownerName: string;
  subtitle?: string;
}) {
  const { lang, t } = useI18n();

  const onPrint = () => {
    if (!data) return;
    const rows: PrintRow[] = [
      { kind: "section", label: t("p2a_debitIncome") },
      ...data.debits.map((l) => ({ kind: "row" as const, label: l.label, sub: l.sub, value: fmtMoney(l.amount, lang), tone: "success" as const })),
      { kind: "row", label: t("p2a_totalDebit"), value: fmtMoney(data.totalDebit, lang), tone: "success" },
      { kind: "divider" },
      { kind: "section", label: t("p2a_creditExpense") },
      ...data.credits.map((l) => ({ kind: "row" as const, label: l.label, sub: l.sub, value: fmtMoney(l.amount, lang), tone: "danger" as const })),
      { kind: "row", label: t("p2a_totalCredit"), value: fmtMoney(data.totalCredit, lang), tone: "danger" },
      { kind: "divider" },
      { kind: "row", label: t("p2a_netCashOnHand"), value: fmtMoney(data.cashOnHand, lang), tone: data.cashOnHand >= 0 ? "success" : "danger" },
    ];
    printReport({
      shopName: ownerName,
      title: (t("p2a_cashBookDash")) + data.monthLabel,
      startDate: data.rangeStart,
      endDate: data.rangeStart, // single month
      rows,
    });
  };

  return (
    <div className="container space-y-4 px-4 py-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <StatCard label={t("p2a_totalIncome")} value={data?.totalDebit ?? 0} icon={<TrendingUp className="h-4 w-4" />} tone="success" />
        <StatCard label={t("p2a_totalExpense")} value={data?.totalCredit ?? 0} icon={<TrendingDown className="h-4 w-4" />} tone="danger" />
        <StatCard label={t("p2a_cashOnHand")} value={data?.cashOnHand ?? 0} icon={<Wallet className="h-4 w-4" />} tone={(data?.cashOnHand ?? 0) >= 0 ? "primary" : "danger"} />
        <StatCard label={t("p2a_transactionsTotal")} value={data?.txCount ?? 0} icon={<Receipt className="h-4 w-4" />} tone="muted" isCount />
      </div>

      {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}

      {/* Two-column ledger */}
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2">
          <LedgerColumn
            title={t("p2a_debitIncome2")}
            tone="success"
            lines={data?.debits ?? []}
            total={data?.totalDebit ?? 0}
            loading={loading}
            empty={t("p2a_noIncomeMonth")}
          />
          <div className="border-t md:border-l md:border-t-0">
            <LedgerColumn
              title={t("p2a_creditExpense2")}
              tone="danger"
              lines={data?.credits ?? []}
              total={data?.totalCredit ?? 0}
              loading={loading}
              empty={t("p2a_noExpenseMonth")}
            />
          </div>
        </div>
        <div className={`flex items-center justify-between gap-3 border-t px-4 py-3 sm:px-6 ${data && data.cashOnHand >= 0 ? "bg-emerald-500/10" : "bg-rose-500/10"}`}>
          <div className="text-sm font-bold uppercase tracking-wide">
            {t("p2a_cashOnHandNet")}
          </div>
          <div className={`text-xl font-extrabold tabular-nums ${data && data.cashOnHand >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}>
            {fmtMoney(data?.cashOnHand ?? 0, lang)}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={onPrint} disabled={!data}>
          <Printer className="mr-2 h-4 w-4" /> {t("p2a_print")}
        </Button>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, tone, isCount }: { label: string; value: number; icon: React.ReactNode; tone: "success" | "danger" | "primary" | "muted"; isCount?: boolean }) {
  const { lang, t } = useI18n();
  const toneCls =
    tone === "success"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "danger"
      ? "text-rose-600 dark:text-rose-400"
      : tone === "primary"
      ? "text-primary"
      : "text-foreground";
  return (
    <Card className="p-3 sm:p-4">
      <div className="flex items-center justify-between gap-1 text-[11px] text-muted-foreground sm:text-xs">
        <span className="truncate">{label}</span>
        <span className={toneCls}>{icon}</span>
      </div>
      <div className={`mt-1 text-base font-bold sm:text-xl ${toneCls}`}>
        {isCount ? new Intl.NumberFormat(t("p2a_localeFull")).format(value) : fmtMoney(value, lang)}
      </div>
    </Card>
  );
}

function LedgerColumn({
  title,
  tone,
  lines,
  total,
  loading,
  empty,
}: {
  title: string;
  tone: "success" | "danger";
  lines: CashBookLine[];
  total: number;
  loading: boolean;
  empty: string;
}) {
  const { lang, t } = useI18n();
  const headBg = tone === "success" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white";
  const amountCls = tone === "success" ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400";
  return (
    <div>
      <div className={`px-4 py-2.5 text-center text-sm font-bold ${headBg}`}>{title}</div>
      <div className="grid grid-cols-[1fr_auto] border-b bg-muted/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:px-6">
        <span>{t("p2a_particular")}</span>
        <span className="text-right">{t("p2a_amountMoney")}</span>
      </div>
      {loading ? (
        <div className="space-y-2 px-4 py-3 sm:px-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-7 animate-pulse rounded bg-muted" />
          ))}
        </div>
      ) : lines.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm text-muted-foreground sm:px-6">{empty}</div>
      ) : (
        <ul className="divide-y">
          {lines.map((l, i) => (
            <li key={`${l.label}-${i}`} className="grid grid-cols-[1fr_auto] items-baseline gap-3 px-4 py-2.5 sm:px-6">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{l.label}</div>
                {l.sub && <div className="truncate text-[11px] text-muted-foreground">{l.sub}</div>}
              </div>
              <div className={`text-right text-sm font-semibold tabular-nums ${amountCls}`}>{fmtMoney(l.amount, lang)}</div>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center justify-between border-t bg-muted/30 px-4 py-2.5 sm:px-6">
        <span className="text-sm font-bold">{t("p2a_total")}</span>
        <span className={`text-base font-extrabold tabular-nums ${amountCls}`}>{fmtMoney(total, lang)}</span>
      </div>
    </div>
  );
}

export function useDefaultMonth(): MonthCursor {
  return useMemo(() => {
    const d = new Date();
    return { year: d.getFullYear(), month0: d.getMonth() };
  }, []);
}