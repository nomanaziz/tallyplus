import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useShop } from "@/lib/shop";
import { useI18n, fmtMoney } from "@/lib/i18n";
import { dashboardSummaryQuery } from "@/lib/queries";
import { icons } from "@/lib/icons";
import { RefreshCw } from "lucide-react";
import { QuickSellSheet } from "@/components/app/QuickSellSheet";
import { DashboardBannerCarousel } from "@/components/app/DashboardBannerCarousel";

export const Route = createFileRoute("/app/dashboard")({
  head: () => ({ meta: [{ title: "ড্যাশবোর্ড — Tally Plus" }] }),
  component: Dashboard,
});

type Range = "today" | "week" | "month" | "year" | "all";

function rangeStart(r: Range): Date | null {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (r === "today") return d;
  if (r === "week") { d.setDate(d.getDate() - 7); return d; }
  if (r === "month") { d.setMonth(d.getMonth() - 1); return d; }
  if (r === "year") { d.setFullYear(d.getFullYear() - 1); return d; }
  return null;
}

function Dashboard() {
  const { lang } = useI18n();
  const { current } = useShop();
  const [range, setRange] = useState<Range>("today");
  const [quickOpen, setQuickOpen] = useState(false);
  const start = rangeStart(range);
  const startIso = start ? start.toISOString() : "1970-01-01T00:00:00.000Z";
  const { data, isFetching, refetch } = useQuery(dashboardSummaryQuery(current?.id ?? null, startIso));
  const stats = data ?? { sales: 0, purchases: 0, expenses: 0, receivable: 0, payable: 0, stockValue: 0, balance: 0 };
  const loading = isFetching;
  const load = () => { void refetch(); };

  const tabs: { v: Range; bn: string; en: string }[] = [
    { v: "today", bn: "দিন", en: "Day" },
    { v: "month", bn: "মাস", en: "Month" },
    { v: "week", bn: "সপ্তাহ", en: "Week" },
    { v: "year", bn: "বছর", en: "Year" },
    { v: "all", bn: "সব", en: "All" },
  ];

  const ledgers = [
    { to: "/app/purchase-ledger", icon: icons.purchaseList, bn: "কেনার খাতা", en: "Purchase Ledger" },
    { to: "/app/sales-ledger", icon: icons.salesList, bn: "বেচার খাতা", en: "Sales Ledger" },
    { to: "/app/due-ledger", icon: icons.due, bn: "বাকির খাতা", en: "Due Ledger" },
    { to: "/app/expense-ledger", icon: icons.expense, bn: "খরচের খাতা", en: "Expense Ledger" },
  ];
  const business = [
    { to: "/app/contacts", icon: icons.contact, bn: "যোগাযোগ", en: "Contacts" },
    { to: "/app/products", icon: icons.productList, bn: "প্রোডাক্ট লিস্ট", en: "Products" },
    { to: "/app/stock", icon: icons.stock, bn: "স্টকের হিসাব", en: "Stock" },
    { to: "/app/reports", icon: icons.businessReport, bn: "ব্যবসার রিপোর্ট", en: "Business Report" },
  ];
  const others = [
    { to: "/app/cashbox", icon: icons.cashbox, bn: "ক্যাশবক্স", en: "Cashbox" },
    { to: "/app/training", icon: icons.training, bn: "অ্যাপ ট্রেনিং", en: "Training" },
    { to: "/app/access", icon: icons.access, bn: "অ্যাপ অ্যাক্সেস", en: "App Access" },
    { to: "/app/printer", icon: icons.printer, bn: "প্রিন্টার", en: "Printer" },
    { to: "/app/marketing", icon: icons.marketing, bn: "মার্কেটিং", en: "Marketing" },
    { to: "/app/online-shop", icon: icons.onlineShop, bn: "অনলাইন শপ", en: "Online Shop" },
    { to: "/app/customer-wishlist", icon: icons.contact, bn: "গ্রাহক ফর্দ", en: "Customer Wishlist" },
    { to: "/app/expiring", icon: icons.expired, bn: "মেয়াদোত্তীর্ণ পণ্য", en: "Expiring" },
    { to: "/app/warranty", icon: icons.warranty, bn: "ওয়ারেন্টি পণ্য", en: "Warranty" },
    { to: "/app/recycle-bin", icon: icons.recycle, bn: "রিসাইকেল বিন", en: "Recycle Bin" },
  ];

  return (
    <div className="container px-4 py-4">
      {/* Compact summary card — hishabee style */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <div className="text-sm font-semibold">
            {lang === "bn" ? "ব্যালেন্স" : "Balance"}:{" "}
            <span className={stats.balance < 0 ? "text-destructive" : "text-success"}>
              {fmtMoney(stats.balance, lang)}
            </span>
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-muted p-0.5 text-[11px]">
            {tabs.slice(0, 2).map((t) => (
              <button
                key={t.v}
                onClick={() => setRange(t.v)}
                className={`rounded-md px-2.5 py-1 font-semibold transition-colors ${range === t.v ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                {lang === "bn" ? t.bn : t.en}
              </button>
            ))}
            <div className="hidden md:contents">
              {tabs.slice(2).map((t) => (
                <button
                  key={t.v}
                  onClick={() => setRange(t.v)}
                  className={`rounded-md px-2.5 py-1 font-semibold transition-colors ${range === t.v ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                >
                  {lang === "bn" ? t.bn : t.en}
                </button>
              ))}
            </div>
            <button onClick={load} disabled={loading} aria-label="refresh" className="ml-0.5 inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-background">
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x">
          <Stat label={lang === "bn" ? "আজকের বিক্রি" : "Sales"} value={fmtMoney(stats.sales, lang)} tone="primary" />
          <Stat label={lang === "bn" ? "আজকের খরচ" : "Expense"} value={fmtMoney(stats.expenses, lang)} tone="danger" />
          <Stat label={lang === "bn" ? "স্টক সংখ্যা" : "Stock"} value={(Math.round(stats.stockValue * 100) / 100).toFixed(0)} tone="default" />
        </div>
        <div className="grid grid-cols-2 divide-x border-t">
          <div className="p-2.5 text-center">
            <div className="text-[11px] text-muted-foreground">{lang === "bn" ? "বাকি দিয়েছি" : "Receivable"}</div>
            <div className="mt-0.5 text-sm font-bold text-success">{fmtMoney(stats.receivable, lang)}</div>
          </div>
          <div className="p-2.5 text-center">
            <div className="text-[11px] text-muted-foreground">{lang === "bn" ? "বাকি নিয়েছি" : "Payable"}</div>
            <div className="mt-0.5 text-sm font-bold text-destructive">{fmtMoney(stats.payable, lang)}</div>
          </div>
        </div>
      </div>

      {/* Admin-managed banner carousel */}
      <DashboardBannerCarousel />

      {/* 3 main action buttons */}
      <div className="mt-5 grid grid-cols-3 gap-3">
        <Link to="/app/purchase" search={{}} className="flex flex-col items-center justify-center gap-2 rounded-2xl border bg-card p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
          <img src={icons.purchase} alt="" className="h-12 w-12" />
          <span className="text-sm font-bold">{lang === "bn" ? "কেনা" : "Purchase"}</span>
        </Link>
        <Link to="/app/sell" search={{}} className="flex flex-col items-center justify-center gap-2 rounded-2xl border bg-card p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
          <img src={icons.sell} alt="" className="h-12 w-12" />
          <span className="text-sm font-bold">{lang === "bn" ? "বেচা" : "Sell"}</span>
        </Link>
        <button type="button" onClick={() => setQuickOpen(true)} className="flex flex-col items-center justify-center gap-2 rounded-2xl border bg-card p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
          <img src={icons.quickSell} alt="" className="h-12 w-12" />
          <span className="text-sm font-bold">{lang === "bn" ? "দ্রুত বেচা" : "Quick Sell"}</span>
        </button>
      </div>
      <QuickSellSheet open={quickOpen} onOpenChange={setQuickOpen} />

      {/* Khata + Business + Others */}
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <Section title={lang === "bn" ? "খাতাসমূহ" : "Ledgers"} items={ledgers} lang={lang} />
        <Section title={lang === "bn" ? "আপনার ব্যবসার জন্য" : "For your business"} items={business} lang={lang} />
      </div>
      <div className="mt-3">
        <Section title={lang === "bn" ? "অন্যান্য" : "Others"} items={others} lang={lang} cols={9} />
      </div>
    </div>
  );
}

function Section({
  title,
  items,
  lang,
  cols,
}: {
  title: string;
  items: { to: string; icon: string; bn: string; en: string }[];
  lang: "bn" | "en";
  cols?: number;
}) {
  const gridCls = cols ? `grid-cols-3 md:grid-cols-${cols}` : "grid-cols-4";
  return (
    <div className="rounded-xl border bg-card p-3 shadow-sm">
      <div className="px-1 pb-2 text-sm font-bold">{title}</div>
      <div className={`grid gap-2 ${gridCls}`}>
        {items.map((it) => (
          <Link
            key={it.to}
            to={it.to as never}
            className="group flex flex-col items-center gap-1 rounded-lg p-2 text-center hover:bg-accent"
          >
            <img src={it.icon} alt="" className="h-9 w-9" />
            <span className="text-[11px] font-semibold leading-tight">{lang === "bn" ? it.bn : it.en}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}