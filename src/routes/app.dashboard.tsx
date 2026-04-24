import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useShop } from "@/lib/shop";
import { useI18n, fmtMoney } from "@/lib/i18n";
import { dashboardSummaryQuery } from "@/lib/queries";
import { icons } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { TrendingUp, ShoppingCart, DollarSign, Package, Wallet, Receipt, RefreshCw } from "lucide-react";
import heroBanner from "@/assets/hero-shop.jpg";

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
  const start = rangeStart(range);
  const startIso = start ? start.toISOString() : "1970-01-01T00:00:00.000Z";
  const { data, isFetching, refetch } = useQuery(dashboardSummaryQuery(current?.id ?? null, startIso));
  const stats = data ?? { sales: 0, purchases: 0, expenses: 0, receivable: 0, payable: 0, stockValue: 0, balance: 0 };
  const loading = isFetching;
  const load = () => { void refetch(); };

  const tabs: { v: Range; bn: string; en: string }[] = [
    { v: "today", bn: "আজকের", en: "Today" },
    { v: "week", bn: "সপ্তাহের", en: "Week" },
    { v: "month", bn: "মাসের", en: "Month" },
    { v: "year", bn: "বছরের", en: "Year" },
    { v: "all", bn: "অল টাইম", en: "All Time" },
  ];

  const tiles = [
    { Icon: TrendingUp, color: "text-success", bn: "আজকের বিক্রি", en: "Today's Sales", v: stats.sales },
    { Icon: ShoppingCart, color: "text-primary", bn: "আজকের ক্রয়", en: "Today's Purchase", v: stats.purchases },
    { Icon: DollarSign, color: "text-destructive", bn: "আজকের খরচ", en: "Today's Expense", v: stats.expenses },
    { Icon: Package, color: "text-foreground", bn: "মোট মজুদ", en: "Total Stock", v: stats.stockValue, isStock: true },
    { Icon: Wallet, color: "text-success", bn: "মোট পাবো", en: "Total Receivable", v: stats.receivable },
    { Icon: Receipt, color: "text-destructive", bn: "মোট দিবো", en: "Total Payable", v: stats.payable },
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
    { to: "/app/expiring", icon: icons.expired, bn: "মেয়াদোত্তীর্ণ পণ্য", en: "Expiring" },
    { to: "/app/warranty", icon: icons.warranty, bn: "ওয়ারেন্টি পণ্য", en: "Warranty" },
    { to: "/app/recycle-bin", icon: icons.recycle, bn: "রিসাইকেল বিন", en: "Recycle Bin" },
  ];

  return (
    <div className="container px-4 py-4">
      <div className="mb-3 text-xs text-muted-foreground">Home</div>

      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-extrabold">{lang === "bn" ? "ড্যাশবোর্ড" : "Dashboard"}</h1>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">{lang === "bn" ? "মোবাইল ভিউ" : "Mobile view"}</span>
          <Switch />
        </div>
      </div>

      {/* Balance + range tabs row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 rounded-lg border border-success/40 bg-success/10 px-3 py-1.5 text-sm font-semibold text-foreground">
          <Wallet className="h-4 w-4 text-success" />
          {lang === "bn" ? "ব্যালেন্স:" : "Balance:"} {fmtMoney(stats.balance, lang)}
        </div>
        <div className="flex flex-wrap items-center gap-1 rounded-lg border bg-card p-1 text-xs">
          {tabs.map((t) => (
            <button
              key={t.v}
              onClick={() => setRange(t.v)}
              className={`rounded-md px-3 py-1.5 font-semibold transition-colors ${range === t.v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
            >
              {lang === "bn" ? t.bn : t.en}
            </button>
          ))}
          <button onClick={load} disabled={loading} className="ml-1 inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 font-semibold text-muted-foreground hover:bg-accent">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            {lang === "bn" ? "রিফ্রেশ" : "Refresh"}
          </button>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
        {tiles.map((x) => (
          <div key={x.bn} className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-muted-foreground">{lang === "bn" ? x.bn : x.en}</div>
                <div className="mt-1 text-xl font-extrabold">
                  {x.isStock ? (Math.round(x.v * 100) / 100).toFixed(2) : fmtMoney(x.v, lang)}
                </div>
              </div>
              <x.Icon className={`h-5 w-5 ${x.color}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Hero banner */}
      <div className="mt-5 overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-primary/80">
        <div className="grid items-center md:grid-cols-2">
          <div className="p-6 md:p-10">
            <h2 className="text-2xl font-extrabold leading-tight md:text-4xl">
              {lang === "bn" ? <>এক ক্লিকেই হিসাব পরিষ্কার <br /> সময় বাঁচে, ব্যবসাও বাড়ে</> : <>Accounts cleared in one click <br /> Save time, grow business</>}
            </h2>
            <Button asChild className="mt-5 rounded-full bg-foreground px-6 text-background hover:bg-foreground/90">
              <Link to="/app/sell">{lang === "bn" ? "ট্যাপ করুন" : "Tap here"}</Link>
            </Button>
          </div>
          <img src={heroBanner} alt="" className="h-full w-full object-cover" loading="lazy" />
        </div>
      </div>

      {/* 3 main action buttons */}
      <div className="mt-5 grid grid-cols-3 gap-3">
        {[
          { to: "/app/purchase", icon: icons.purchase, bn: "কেনা", en: "Purchase" },
          { to: "/app/sell", icon: icons.sell, bn: "বেচা", en: "Sell" },
          { to: "/app/quick-sell", icon: icons.quickSell, bn: "দ্রুত বেচা", en: "Quick Sell" },
        ].map((a) => (
          <Link key={a.to} to={a.to} className="flex flex-col items-center justify-center gap-2 rounded-2xl border bg-card p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
            <img src={a.icon} alt="" className="h-12 w-12" />
            <span className="text-sm font-bold">{lang === "bn" ? a.bn : a.en}</span>
          </Link>
        ))}
      </div>

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