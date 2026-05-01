import { useNavigate } from "@/lib/router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useI18n, fmtMoney } from "@/lib/i18n";
import { useShop } from "@/lib/shop";
import { combinedReportQuery, rangeToIso, type BusinessReportSummary } from "@/lib/queries";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { DateRangePicker, monthStartIso, todayIso, type DateRange } from "@/components/app/DateRangePicker";
import { Printer, Store, ArrowLeft, ChevronDown } from "lucide-react";
import { printReport, type PrintRow } from "@/lib/print-report";
import { useAuth } from "@/lib/auth";
import { SubscriptionGateDialog } from "@/components/app/SubscriptionGateDialog";



type Tab = "general" | "details";

type SectionKey = keyof BusinessReportSummary;

function CombinedReportPage() {
  const { lang } = useI18n();
  const { shops } = useShop();
  const nav = useNavigate();
  const { hasActiveSubscription, loading: authLoading } = useAuth();
  const [range, setRange] = useState<DateRange>({ start: monthStartIso(), end: todayIso() });
  const [selected, setSelected] = useState<string[]>([]);
  const [tab, setTab] = useState<Tab>("general");

  const shopIds = selected.length > 0 ? selected : shops.map((s) => s.id);
  const iso = rangeToIso(range.start, range.end);
  const { data } = useQuery(combinedReportQuery(shopIds, iso));

  if (authLoading) {
    return <div className="min-h-full bg-muted/30" />;
  }

  if (!hasActiveSubscription) {
    return (
      <div className="min-h-full bg-muted/30">
        <SubscriptionGateDialog
          open
          onClose={() => nav({ to: "/app/dashboard" })}
          onUnlock={() => nav({ to: "/app/subscribe" })}
        />
      </div>
    );
  }

  const totals = data?.totals;
  const balance = totals
    ? totals.totalSales + totals.dueReceived + totals.otherIncome - totals.cashPurchase - totals.duePaid - totals.otherExpense
    : 0;

  const sections: { key: SectionKey | "balance"; bn: string; en: string; tone: "success" | "danger" | "neutral" }[] = [
    { key: "totalSales", bn: "মোট বিক্রি", en: "Total Sales", tone: "success" },
    { key: "cashSales", bn: "নগদ বেচা (কাস্টমার বাকি বাদে)", en: "Cash Sales", tone: "success" },
    { key: "dueReceived", bn: "কাস্টমার থেকে বাকির টাকা পেয়েছেন", en: "Due Received", tone: "success" },
    { key: "cashPurchase", bn: "নগদ কেনা (সাপ্লায়ার বাকি বাদে)", en: "Cash Purchase", tone: "danger" },
    { key: "duePaid", bn: "সাপ্লায়ারকে বাকির টাকা দিয়েছেন", en: "Due Paid", tone: "danger" },
    { key: "balance", bn: "সর্বমোট ব্যালেন্স", en: "Total Balance", tone: balance >= 0 ? "success" : "danger" },
    { key: "productProfit", bn: "পণ্য বিক্রি থেকে লাভ", en: "Product Profit", tone: "success" },
    { key: "otherIncome", bn: "অন্যান্য আয়", en: "Other Income", tone: "success" },
    { key: "otherExpense", bn: "অন্যান্য খরচ", en: "Other Expense", tone: "danger" },
    { key: "payable", bn: "সাপ্লায়ারকে দিবো", en: "Total Payable", tone: "danger" },
    { key: "receivable", bn: "কাস্টমার থেকে পাবো", en: "Total Receivable", tone: "success" },
  ];

  const visibleShops = useMemo(() => shops.filter((s) => shopIds.includes(s.id)), [shops, shopIds]);

  const valueFor = (shopId: string, key: SectionKey | "balance"): number => {
    const r = data?.perShop[shopId];
    if (!r) return 0;
    if (key === "balance") {
      return r.totalSales + r.dueReceived + r.otherIncome - r.cashPurchase - r.duePaid - r.otherExpense;
    }
    return r[key];
  };
  const totalFor = (key: SectionKey | "balance"): number => {
    if (!totals) return 0;
    if (key === "balance") return balance;
    return totals[key];
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const cur = prev.length > 0 ? prev : shops.map((s) => s.id);
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      return next;
    });
  };

  const onPrint = () => {
    const rows: PrintRow[] = [];
    for (const sec of sections) {
      rows.push({ kind: "section", label: lang === "bn" ? sec.bn : sec.en });
      for (const s of visibleShops) {
        rows.push({
          kind: "row",
          label: s.name,
          value: fmtMoney(valueFor(s.id, sec.key), lang),
          tone: sec.tone === "neutral" ? undefined : sec.tone,
        });
      }
      rows.push({
        kind: "row",
        label: lang === "bn" ? "মোট" : "Total",
        value: fmtMoney(totalFor(sec.key), lang),
        tone: sec.tone === "neutral" ? undefined : sec.tone,
      });
      rows.push({ kind: "divider" });
    }
    printReport({
      shopName: lang === "bn" ? "সমন্বিত রিপোর্ট" : "Combined Report",
      shopAddress: null,
      shopPhone: null,
      title: lang === "bn" ? "সমন্বিত রিপোর্ট" : "Combined Report",
      startDate: range.start,
      endDate: range.end,
      rows,
    });
  };

  return (
    <div className="min-h-full bg-muted/30">
      <PageHeader
        breadcrumb={lang === "bn" ? "সমন্বিত রিপোর্ট" : "Combined Report"}
        title={
          <span className="flex items-center gap-2">
            <button
              onClick={() => nav({ to: "/app/dashboard" })}
              className="-ml-1 flex h-7 w-7 items-center justify-center rounded hover:bg-accent"
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            {lang === "bn" ? "সমন্বিত রিপোর্ট" : "Combined Report"}
          </span>
        }
        actions={
          <>
            <Button className="h-10 gap-2" onClick={onPrint}>
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">{lang === "bn" ? "ডাউনলোড/প্রিন্ট" : "Download/Print"}</span>
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-10 gap-2">
                  <Store className="h-4 w-4" />
                  <span className="hidden text-xs sm:inline">
                    {lang === "bn"
                      ? `${shopIds.length}টি দোকান`
                      : `${shopIds.length} shop${shopIds.length === 1 ? "" : "s"}`}
                  </span>
                  <span className="text-xs sm:hidden">{shopIds.length}</span>
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 p-2">
                <div className="mb-1 flex items-center justify-between px-1 pb-1">
                  <span className="text-xs font-semibold text-muted-foreground">
                    {lang === "bn" ? "দোকান নির্বাচন" : "Select shops"}
                  </span>
                  <button
                    className="text-xs font-semibold text-primary hover:underline"
                    onClick={() => setSelected([])}
                  >
                    {lang === "bn" ? "সব" : "All"}
                  </button>
                </div>
                <div className="max-h-72 space-y-1 overflow-y-auto">
                  {shops.map((s) => {
                    const checked = shopIds.includes(s.id);
                    return (
                      <label
                        key={s.id}
                        className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
                      >
                        <Checkbox checked={checked} onCheckedChange={() => toggle(s.id)} />
                        <span className="truncate">{s.name}</span>
                      </label>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>

            <DateRangePicker value={range} onChange={setRange} />
          </>
        }
      />

      <div className="container px-3 py-4 sm:px-4">
        {/* Tabs */}
        <div className="mb-4 inline-flex rounded-lg border bg-background p-1 text-sm">
          <button
            onClick={() => setTab("general")}
            className={
              "rounded-md px-4 py-1.5 font-semibold transition " +
              (tab === "general" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent")
            }
          >
            {lang === "bn" ? "সাধারণ রিপোর্ট" : "General Report"}
          </button>
          <button
            onClick={() => setTab("details")}
            className={
              "rounded-md px-4 py-1.5 font-semibold transition " +
              (tab === "details" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent")
            }
          >
            {lang === "bn" ? "বিস্তারিত রিপোর্ট" : "Details Report"}
          </button>
        </div>

        {visibleShops.length === 0 ? (
          <div className="rounded-xl border bg-background p-8 text-center text-sm text-muted-foreground">
            {lang === "bn" ? "কোনো দোকান পাওয়া যায়নি" : "No shops found"}
          </div>
        ) : tab === "general" ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {sections.map((sec) => (
              <SectionCard
                key={sec.key}
                title={lang === "bn" ? sec.bn : sec.en}
                tone={sec.tone}
                shops={visibleShops}
                values={Object.fromEntries(visibleShops.map((s) => [s.id, valueFor(s.id, sec.key)]))}
                total={totalFor(sec.key)}
                lang={lang}
              />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-background">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-xs">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">
                    {lang === "bn" ? "মেট্রিক" : "Metric"}
                  </th>
                  {visibleShops.map((s) => (
                    <th key={s.id} className="px-3 py-2 text-right font-semibold">
                      {s.name}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right font-extrabold">
                    {lang === "bn" ? "সর্বমোট" : "Total"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sections.map((sec) => (
                  <tr key={sec.key} className="border-t">
                    <td className="px-3 py-2 font-medium">{lang === "bn" ? sec.bn : sec.en}</td>
                    {visibleShops.map((s) => (
                      <td
                        key={s.id}
                        className={
                          "px-3 py-2 text-right tabular-nums " +
                          (sec.tone === "success" ? "text-emerald-600" : sec.tone === "danger" ? "text-rose-600" : "")
                        }
                      >
                        {fmtMoney(valueFor(s.id, sec.key), lang)}
                      </td>
                    ))}
                    <td
                      className={
                        "px-3 py-2 text-right font-bold tabular-nums " +
                        (sec.tone === "success" ? "text-emerald-600" : sec.tone === "danger" ? "text-rose-600" : "")
                      }
                    >
                      {fmtMoney(totalFor(sec.key), lang)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionCard({
  title,
  tone,
  shops,
  values,
  total,
  lang,
}: {
  title: string;
  tone: "success" | "danger" | "neutral";
  shops: { id: string; name: string }[];
  values: Record<string, number>;
  total: number;
  lang: "bn" | "en";
}) {
  const toneCls =
    tone === "success" ? "text-emerald-600" : tone === "danger" ? "text-rose-600" : "text-foreground";
  return (
    <div className="rounded-xl border bg-background p-4">
      <h3 className="mb-3 text-sm font-bold">{title}</h3>
      <div className="space-y-1.5">
        {shops.map((s) => (
          <div key={s.id} className="flex items-center justify-between text-sm">
            <span className="truncate text-muted-foreground">{s.name}</span>
            <span className={"font-medium tabular-nums " + toneCls}>{fmtMoney(values[s.id] ?? 0, lang)}</span>
          </div>
        ))}
        <div className="my-2 border-t" />
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold">{lang === "bn" ? "মোট" : "Total"}</span>
          <span className={"text-base font-extrabold tabular-nums " + toneCls}>{fmtMoney(total, lang)}</span>
        </div>
      </div>
    </div>
  );
}
export default CombinedReportPage;
