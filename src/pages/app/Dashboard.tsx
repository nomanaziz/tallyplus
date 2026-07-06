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
          <div className="p-2.5 text-center">
            <div className="text-[11px] text-muted-foreground">{tr("dash_stockCount")}</div>
            <div className="mt-0.5 text-sm font-bold">{(Math.round(stats.stockValue * 100) / 100).toFixed(0)}</div>
          </div>
          <div className="p-2.5 text-center">
            <div className="text-[11px] text-muted-foreground">{tr("dash_receivable")}</div>
            <div className="mt-0.5 text-sm font-bold text-success">{fmtMoney(stats.receivable, lang)}</div>
          </div>
          <div className="p-2.5 text-center">
            <div className="text-[11px] text-muted-foreground">{tr("dash_payable")}</div>
            <div className="mt-0.5 text-sm font-bold text-destructive">{fmtMoney(stats.payable, lang)}</div>
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
      </div>

      {/* Admin-managed banner carousel */}
      <DashboardBannerCarousel />
      <div className="mt-3"><IncomingTransfersBanner /></div>

      {/* Mobile-only: icon menu (sidebar handles desktop nav) */}
      <div className="mt-5 space-y-3 md:hidden">
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

function DesktopOverview({
  overview,
  lang,
}: {
  overview: import("@/lib/queries").DashboardOverview | undefined;
  lang: Lang;
}) {
  const { t } = useI18n();
  const o = overview;
  type IconC = React.ComponentType<{ className?: string }>;
  const tiles: Array<{ to: string; label: string; value: string | number; sub?: string; img?: IconC; icon?: IconC; tone: string }> = [
    { to: "/app/products", label: t("dash_products"), value: o?.productsTotal ?? "—", icon: Package, tone: "indigo" },
    { to: "/app/products", label: t("dash_lowStock"), value: o?.productsLowStock ?? "—", img: icons.alert, tone: "amber" },
    { to: "/app/online-shop/products", label: t("dash_onlineProducts"), value: o?.productsPublished ?? "—", icon: Globe, tone: "sky" },
    { to: "/app/online-shop/orders", label: t("dash_newOrders"), value: o?.ordersPending ?? "—", img: icons.pendingOrder, tone: "emerald" },
    { to: "/app/customer-wishlist", label: t("dash_newFordo"), value: o?.fordoNew ?? "—", img: icons.wishlist, tone: "violet" },
    { to: "/app/warranty", label: t("dash_warranty"), value: o?.warrantyActive ?? "—", img: icons.activeWarranty, tone: "rose" },
    { to: "/app/contacts", label: t("dash_customers"), value: o?.customersCount ?? "—", img: icons.customer, tone: "blue" },
    { to: "/app/contacts", label: t("dash_suppliers"), value: o?.suppliersCount ?? "—", icon: Truck, tone: "orange" },
    { to: "/app/access", label: t("dash_employees"), value: o?.employeesCount ?? "—", img: icons.employee, tone: "teal" },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-9">
        {tiles.map((t) => (
          <KpiTile key={t.label} {...t} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <PanelCard title={t("recentSales")} img={icons.transaction} to="/app/sales-ledger" lang={lang}>
          {(o?.recentSales ?? []).length === 0 ? (
            <Empty lang={lang} />
          ) : (
            <ul className="divide-y">
              {(o?.recentSales ?? []).map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{r.customer_name || t("walkInCustomer")}</div>
                    <div className="text-[11px] text-muted-foreground">#{r.invoice_no ?? "—"} · {timeAgo(r.created_at, lang)}</div>
                  </div>
                  <div className="font-bold tabular-nums">{fmtMoney(r.total, lang)}</div>
                </li>
              ))}
            </ul>
          )}
        </PanelCard>

        <PanelCard title={t("newOnlineOrders")} img={icons.pendingOrder} to="/app/online-shop/orders" lang={lang}>
          {(o?.recentOrders ?? []).length === 0 ? (
            <Empty lang={lang} />
          ) : (
            <ul className="divide-y">
              {(o?.recentOrders ?? []).map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{r.customer_name || "—"}</div>
                    <div className="text-[11px] text-muted-foreground">{r.status} · {timeAgo(r.created_at, lang)}</div>
                  </div>
                  <div className="font-bold tabular-nums">{fmtMoney(r.total, lang)}</div>
                </li>
              ))}
            </ul>
          )}
        </PanelCard>

        <PanelCard title={t("recentFordo")} img={icons.wishlist} to="/app/customer-wishlist" lang={lang}>
          {(o?.recentWishlists ?? []).length === 0 ? (
            <Empty lang={lang} />
          ) : (
            <ul className="divide-y">
              {(o?.recentWishlists ?? []).map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{r.customer_name || "—"}</div>
                    <div className="text-[11px] text-muted-foreground">{r.status} · {timeAgo(r.created_at, lang)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </PanelCard>

        <PanelCard title={t("lowStockProducts")} img={icons.alert} to="/app/products" lang={lang}>
          {(o?.lowStockProducts ?? []).length === 0 ? (
            <Empty lang={lang} />
          ) : (
            <ul className="divide-y">
              {(o?.lowStockProducts ?? []).map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <div className="truncate font-medium">{r.name}</div>
                  <div className="text-xs">
                    <span className="font-bold text-destructive">{r.stock}</span>
                    <span className="text-muted-foreground"> / {r.low_stock_alert}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </PanelCard>

        <PanelCard title={t("warrantyExpiring")} icon={Clock} to="/app/warranty" lang={lang}>
          {(o?.expiringWarranty ?? []).length === 0 ? (
            <Empty lang={lang} />
          ) : (
            <ul className="divide-y">
              {(o?.expiringWarranty ?? []).map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <div className="truncate font-medium">{r.name}</div>
                  <div className="text-[11px] text-muted-foreground">{new Date(r.warranty_end_date).toLocaleDateString()}</div>
                </li>
              ))}
            </ul>
          )}
        </PanelCard>
      </div>
    </div>
  );
}

type ToneStyle = { card: string; border: string; badge: string; link: string };
const TONES: Record<string, ToneStyle> = {
  indigo:  { card: "bg-gradient-to-br from-indigo-50 to-indigo-100/60 dark:from-indigo-950/40 dark:to-indigo-900/20",  border: "border-l-4 border-l-indigo-500",  badge: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-200",   link: "text-indigo-700 dark:text-indigo-300" },
  amber:   { card: "bg-gradient-to-br from-amber-50 to-amber-100/60 dark:from-amber-950/40 dark:to-amber-900/20",       border: "border-l-4 border-l-amber-500",   badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-200",      link: "text-amber-700 dark:text-amber-300" },
  sky:     { card: "bg-gradient-to-br from-sky-50 to-sky-100/60 dark:from-sky-950/40 dark:to-sky-900/20",                border: "border-l-4 border-l-sky-500",     badge: "bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-200",              link: "text-sky-700 dark:text-sky-300" },
  emerald: { card: "bg-gradient-to-br from-emerald-50 to-emerald-100/60 dark:from-emerald-950/40 dark:to-emerald-900/20", border: "border-l-4 border-l-emerald-500", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-200", link: "text-emerald-700 dark:text-emerald-300" },
  violet:  { card: "bg-gradient-to-br from-violet-50 to-violet-100/60 dark:from-violet-950/40 dark:to-violet-900/20",     border: "border-l-4 border-l-violet-500",  badge: "bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-200",   link: "text-violet-700 dark:text-violet-300" },
  rose:    { card: "bg-gradient-to-br from-rose-50 to-rose-100/60 dark:from-rose-950/40 dark:to-rose-900/20",             border: "border-l-4 border-l-rose-500",    badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-200",          link: "text-rose-700 dark:text-rose-300" },
  blue:    { card: "bg-gradient-to-br from-blue-50 to-blue-100/60 dark:from-blue-950/40 dark:to-blue-900/20",             border: "border-l-4 border-l-blue-500",    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-200",          link: "text-blue-700 dark:text-blue-300" },
  orange:  { card: "bg-gradient-to-br from-orange-50 to-orange-100/60 dark:from-orange-950/40 dark:to-orange-900/20",     border: "border-l-4 border-l-orange-500",  badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/60 dark:text-orange-200",  link: "text-orange-700 dark:text-orange-300" },
  teal:    { card: "bg-gradient-to-br from-teal-50 to-teal-100/60 dark:from-teal-950/40 dark:to-teal-900/20",             border: "border-l-4 border-l-teal-500",    badge: "bg-teal-100 text-teal-700 dark:bg-teal-900/60 dark:text-teal-200",          link: "text-teal-700 dark:text-teal-300" },
};

function KpiTile({
  to, label, value, sub, icon: Icon, img: Img, tone,
}: { to: string; label: string; value: string | number; sub?: string; icon?: React.ComponentType<{ className?: string }>; img?: React.ComponentType<{ className?: string }>; tone: string }) {
  const tone_ = TONES[tone] ?? TONES.indigo;
  const { t } = useI18n();
  return (
    <Link
      to={to as never}
      className={`group flex flex-col gap-2 rounded-xl border ${tone_.border} ${tone_.card} p-3 shadow-sm transition hover:shadow-md hover:-translate-y-0.5 min-h-[130px]`}
    >
      {(Img || Icon) && (
        <span className={`flex h-9 w-9 flex-none items-center justify-center rounded-lg ${tone_.badge}`}>
          {Img ? <Img className="h-5 w-5 icon-inherit" /> : Icon ? <Icon className="h-5 w-5 icon-inherit" /> : null}
        </span>
      )}
      <div className="text-[28px] leading-none font-extrabold tabular-nums text-foreground">{value}</div>
      <div className="line-clamp-2 min-h-[2.4em] text-[12px] font-semibold leading-tight text-foreground/85">
        {label}
      </div>
      {sub ? <div className="text-[10px] text-foreground/60">{sub}</div> : null}
      <div className={`mt-auto text-[11px] font-medium ${tone_.link} group-hover:underline`}>
        {t("viewDetails")} →
      </div>
    </Link>
  );
}

function PanelCard({
  title, icon: Icon, img: Img, to, lang, children,
}: { title: string; icon?: React.ComponentType<{ className?: string }>; img?: React.ComponentType<{ className?: string }>; to: string; lang: Lang; children: React.ReactNode }) {
  const { t } = useI18n();
  void lang;
  return (
    <div className="rounded-xl border bg-card p-3 shadow-sm">
      <div className="flex items-center justify-between border-b pb-2">
        <div className="flex items-center gap-2 text-sm font-bold">
          {Img ? <Img className="h-5 w-5 text-primary" /> : Icon ? <Icon className="h-4 w-4 text-primary" /> : null}
          {title}
        </div>
        <Link to={to as never} className="text-[11px] font-semibold text-primary hover:underline">
          {t("viewAll")}
        </Link>
      </div>
      <div className="pt-1">{children}</div>
    </div>
  );
}

function Empty({ lang }: { lang: Lang }) {
  const { t } = useI18n();
  void lang;
  return (
    <div className="py-6 text-center text-xs text-muted-foreground">
      {t("noData")}
    </div>
  );
}

function timeAgo(iso: string, lang: Lang) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  const justNow: Record<Lang, string> = { bn: "এখনই", en: "just now", hi: "अभी", ta: "இப்போது", te: "ఇప్పుడే", ur: "ابھی", ar: "الآن" };
  const min: Record<Lang, string> = { bn: " মি", en: "m", hi: "मि", ta: "நி", te: "ని", ur: "م", ar: "د" };
  const hr:  Record<Lang, string> = { bn: " ঘ", en: "h", hi: "घं", ta: "ம", te: "గ", ur: "گھ", ar: "س" };
  const day: Record<Lang, string> = { bn: " দি", en: "d", hi: "दि", ta: "நா", te: "రో", ur: "د", ar: "ي" };
  if (m < 1) return justNow[lang];
  if (m < 60) return `${m}${min[lang]}`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}${hr[lang]}`;
  const d = Math.floor(h / 24);
  return `${d}${day[lang]}`;
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
    <div className="rounded-xl border bg-card p-3 shadow-sm">
      <div className="px-1 pb-2 text-sm font-bold">{title}</div>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
        {items.map((it) => (
          <Link
            key={it.to}
            to={it.to as never}
            className="group flex flex-col items-center gap-1 rounded-lg p-2 text-center hover:bg-accent"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <it.icon className="h-6 w-6 icon-inherit" />
            </span>
            <span className="text-[11px] font-semibold leading-tight">{t(it.tKey)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "primary" | "danger" | "default" }) {
  const cls = tone === "primary" ? "text-primary" : tone === "danger" ? "text-destructive" : "text-foreground";
  return (
    <div className="p-2.5 text-center">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-sm font-bold ${cls}`}>{value}</div>
    </div>
  );
}
export default Dashboard;
