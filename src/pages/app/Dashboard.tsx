import { Link } from "@/lib/router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useShop } from "@/lib/shop";
import { useI18n, fmtMoney, type TKey } from "@/lib/i18n";
import { dashboardSummaryQuery, dashboardOverviewQuery } from "@/lib/queries";
import { AppIcon } from "@/lib/icons";
import { DashboardBannerCarousel } from "@/components/app/DashboardBannerCarousel";
import { IncomingTransfersBanner } from "@/components/app/IncomingTransfersBanner";
import { InstallAppCard } from "@/components/app/InstallAppCard";
import { SECTIONS, type SidebarItem } from "@/components/app/AppSidebar";
import { usePermissions } from "@/lib/permissions-hook";
import { useEnabledModules } from "@/lib/modules";



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
  const { lang, t: tr } = useI18n();
  const { current } = useShop();
  const { isOwner, isAdmin, canGroup, loading: permLoading } = usePermissions();
  const { enabled: enabledModules, loading: modulesLoading } = useEnabledModules(current?.id ?? null);
  const [range, setRange] = useState<Range>("today");
  const start = rangeStart(range);
  const startIso = start ? start.toISOString() : "1970-01-01T00:00:00.000Z";
  const { data, isFetching, refetch } = useQuery(dashboardSummaryQuery(current?.id ?? null, startIso));
  const stats = data ?? { sales: 0, purchases: 0, expenses: 0, receivable: 0, payable: 0, stockValue: 0, balance: 0 };
  const { data: overview } = useQuery(dashboardOverviewQuery(current?.id ?? null));
  const loading = isFetching;
  const load = () => { void refetch(); };

  const tabs: { v: Range; tKey: TKey }[] = [
    { v: "today", tKey: "tab_day" },
    { v: "month", tKey: "tab_month" },
    { v: "week", tKey: "tab_week" },
    { v: "year", tKey: "tab_year" },
    { v: "all", tKey: "tab_all" },
  ];

  const isVisible = (it: SidebarItem) => {
    if (it.module && (modulesLoading || !enabledModules.has(it.module))) return false;
    if (!it.perm) return true;
    if (permLoading) return true;
    if (it.perm === "__owner__") return isOwner || isAdmin;
    return canGroup(it.perm);
  };
  // Skip the "main" (Home) section since we're already on Home
  const menuSections = SECTIONS.filter((s) => s.id !== "main")
    .map((s) => ({ ...s, items: s.items.filter(isVisible) }))
    .filter((s) => s.items.length > 0);

  return (
    <div className="w-full px-3 py-4 sm:px-4 xl:px-6 2xl:px-10">
      <div className="mb-3">
        <InstallAppCard />
      </div>
      {/* Compact summary card — hishabee style */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <div className="text-sm font-semibold">
            {tr("balance")}:{" "}
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
                {tr(t.tKey)}
              </button>
            ))}
            <div className="hidden md:contents">
              {tabs.slice(2).map((t) => (
                <button
                  key={t.v}
                  onClick={() => setRange(t.v)}
                  className={`rounded-md px-2.5 py-1 font-semibold transition-colors ${range === t.v ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                >
                  {tr(t.tKey)}
                </button>
              ))}
            </div>
            <button onClick={load} disabled={loading} aria-label="refresh" className="ml-0.5 inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-background">
              <AppIcon name="refresh" className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x">
          <Stat label={tr("dash_sales")} value={fmtMoney(stats.sales, lang)} tone="primary" />
          <Stat label={tr("dash_purchase")} value={fmtMoney(stats.purchases, lang)} tone="primary" />
          <Stat label={tr("dash_expense")} value={fmtMoney(stats.expenses, lang)} tone="danger" />
        </div>
        <div className="grid grid-cols-3 divide-x border-t">
          <div className="p-3 text-center md:p-4">
            <div className="text-xs md:text-sm text-muted-foreground">{tr("dash_stockCount")}</div>
            <div className="mt-1 text-base font-bold md:text-xl">{(Math.round(stats.stockValue * 100) / 100).toFixed(0)}</div>
          </div>
          <div className="p-3 text-center md:p-4">
            <div className="text-xs md:text-sm text-muted-foreground">{tr("dash_receivable")}</div>
            <div className="mt-1 text-base font-bold text-success md:text-xl">{fmtMoney(stats.receivable, lang)}</div>
          </div>
          <div className="p-3 text-center md:p-4">
            <div className="text-xs md:text-sm text-muted-foreground">{tr("dash_payable")}</div>
            <div className="mt-1 text-base font-bold text-destructive md:text-xl">{fmtMoney(stats.payable, lang)}</div>
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x border-t md:hidden">
          <Link to="/app/online-shop/orders" className="p-2.5 text-center active:bg-accent">
            <div className="text-[11px] text-muted-foreground">{tr("dash_newOrders")}</div>
            <div className={`mt-0.5 text-sm font-bold ${(overview?.ordersPending ?? 0) > 0 ? "text-primary" : "text-muted-foreground"}`}>
              {overview?.ordersPending ?? 0}
            </div>
          </Link>
          <Link to="/app/customer-wishlist" className="p-2.5 text-center active:bg-accent">
            <div className="text-[11px] text-muted-foreground">{tr("dash_newFordo")}</div>
            <div className={`mt-0.5 text-sm font-bold ${(overview?.fordoNew ?? 0) > 0 ? "text-success" : "text-muted-foreground"}`}>
              {overview?.fordoNew ?? 0}
            </div>
          </Link>
          <Link to="/app/products" className="p-2.5 text-center active:bg-accent">
            <div className="text-[11px] text-muted-foreground">{tr("dash_lowStock")}</div>
            <div className={`mt-0.5 text-sm font-bold ${(overview?.productsLowStock ?? 0) > 0 ? "text-destructive" : "text-muted-foreground"}`}>
              {overview?.productsLowStock ?? 0}
            </div>
          </Link>
        </div>
        {/* Desktop-only: extended KPI rows inside the same summary card */}
        <div className="hidden border-t md:grid md:grid-cols-6 md:divide-x lg:grid-cols-9">
          <StatLink to="/app/online-shop/orders" label={tr("dash_newOrders")} value={overview?.ordersPending ?? 0} tone={(overview?.ordersPending ?? 0) > 0 ? "primary" : "muted"} />
          <StatLink to="/app/customer-wishlist" label={tr("dash_newFordo")} value={overview?.fordoNew ?? 0} tone={(overview?.fordoNew ?? 0) > 0 ? "success" : "muted"} />
          <StatLink to="/app/products" label={tr("dash_lowStock")} value={overview?.productsLowStock ?? 0} tone={(overview?.productsLowStock ?? 0) > 0 ? "danger" : "muted"} />
          <StatLink to="/app/products" label={tr("dash_products")} value={overview?.productsTotal ?? 0} tone="default" />
          <StatLink to="/app/online-shop/products" label={tr("dash_onlineProducts")} value={overview?.productsPublished ?? 0} tone="default" />
          <StatLink to="/app/warranty" label={tr("dash_warranty")} value={overview?.warrantyActive ?? 0} tone="default" />
          <StatLink to="/app/contacts" label={tr("dash_customers")} value={overview?.customersCount ?? 0} tone="default" />
          <StatLink to="/app/contacts" label={tr("dash_suppliers")} value={overview?.suppliersCount ?? 0} tone="default" />
          <StatLink to="/app/access" label={tr("dash_employees")} value={overview?.employeesCount ?? 0} tone="default" />
        </div>
      </div>

      {/* Admin-managed banner carousel */}
      <DashboardBannerCarousel />
      <div className="mt-3"><IncomingTransfersBanner /></div>

      {/* Quick-menu grid — shown on both mobile and desktop so the
          dashboard doesn't feel empty. Sidebar still available on desktop. */}
      <div className="mt-5 space-y-3">
        {menuSections.map((section) => (
          <Section
            key={section.id}
            title={tr(section.tKey)}
            items={section.items}
            t={tr}
          />
        ))}
      </div>
    </div>
  );
}


function Section({
  title,
  items,
  t,
}: {
  title: string;
  items: { to: string; icon: React.ComponentType<{ className?: string }>; tKey: TKey }[];
  t: (k: TKey) => string;
}) {
  return (
    <div className="rounded-xl border bg-card p-3 shadow-sm md:p-4">
      <div className="px-1 pb-2 text-sm font-bold md:text-base">{title}</div>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-8 md:gap-3 lg:grid-cols-10 xl:grid-cols-12">
        {items.map((it) => (
          <Link
            key={it.to}
            to={it.to as never}
            className="group flex flex-col items-center gap-1 rounded-lg p-2 text-center hover:bg-accent"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm md:h-12 md:w-12">
              <it.icon className="h-6 w-6 icon-inherit md:h-7 md:w-7" />
            </span>
            <span className="text-[11px] font-semibold leading-tight md:text-[13px]">{t(it.tKey)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "primary" | "danger" | "default" }) {
  const cls = tone === "primary" ? "text-primary" : tone === "danger" ? "text-destructive" : "text-foreground";
  return (
    <div className="p-3 text-center md:p-4">
      <div className="text-xs md:text-sm text-muted-foreground">{label}</div>
      <div className={`mt-1 text-base font-bold md:text-2xl ${cls}`}>{value}</div>
    </div>
  );
}

function StatLink({
  to, label, value, tone,
}: {
  to: string;
  label: string;
  value: string | number;
  tone: "primary" | "danger" | "success" | "muted" | "default";
}) {
  const cls =
    tone === "primary" ? "text-primary" :
    tone === "danger" ? "text-destructive" :
    tone === "success" ? "text-success" :
    tone === "muted" ? "text-muted-foreground" :
    "text-foreground";
  return (
    <Link to={to as never} className="p-2.5 text-center hover:bg-accent">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-sm font-bold ${cls}`}>{value}</div>
    </Link>
  );
}
export default Dashboard;
