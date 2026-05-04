import { Link } from "@/lib/router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useShop } from "@/lib/shop";
import { useI18n, fmtMoney } from "@/lib/i18n";
import { dashboardSummaryQuery, dashboardOverviewQuery } from "@/lib/queries";
import { Package, Truck, Globe, Clock } from "lucide-react";
import { icons, AppIcon } from "@/lib/icons";
import { DashboardBannerCarousel } from "@/components/app/DashboardBannerCarousel";
import { IncomingTransfersBanner } from "@/components/app/IncomingTransfersBanner";
import { SECTIONS, type SidebarItem } from "@/components/app/AppSidebar";
import { usePermissions } from "@/lib/permissions-hook";



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
  const { isOwner, isAdmin, canGroup, loading: permLoading } = usePermissions();
  const [range, setRange] = useState<Range>("today");
  const start = rangeStart(range);
  const startIso = start ? start.toISOString() : "1970-01-01T00:00:00.000Z";
  const { data, isFetching, refetch } = useQuery(dashboardSummaryQuery(current?.id ?? null, startIso));
  const stats = data ?? { sales: 0, purchases: 0, expenses: 0, receivable: 0, payable: 0, stockValue: 0, balance: 0 };
  const { data: overview } = useQuery(dashboardOverviewQuery(current?.id ?? null));
  const loading = isFetching;
  const load = () => { void refetch(); };

  const tabs: { v: Range; bn: string; en: string }[] = [
    { v: "today", bn: "দিন", en: "Day" },
    { v: "month", bn: "মাস", en: "Month" },
    { v: "week", bn: "সপ্তাহ", en: "Week" },
    { v: "year", bn: "বছর", en: "Year" },
    { v: "all", bn: "সব", en: "All" },
  ];

  const isVisible = (it: SidebarItem) => {
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
              <AppIcon name="refresh" className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x">
          <Stat label={lang === "bn" ? "আজকের বিক্রি" : "Sales"} value={fmtMoney(stats.sales, lang)} tone="primary" />
          <Stat label={lang === "bn" ? "আজকের ক্রয়" : "Purchase"} value={fmtMoney(stats.purchases, lang)} tone="primary" />
          <Stat label={lang === "bn" ? "আজকের খরচ" : "Expense"} value={fmtMoney(stats.expenses, lang)} tone="danger" />
        </div>
        <div className="grid grid-cols-3 divide-x border-t">
          <div className="p-2.5 text-center">
            <div className="text-[11px] text-muted-foreground">{lang === "bn" ? "স্টক সংখ্যা" : "Stock"}</div>
            <div className="mt-0.5 text-sm font-bold">{(Math.round(stats.stockValue * 100) / 100).toFixed(0)}</div>
          </div>
          <div className="p-2.5 text-center">
            <div className="text-[11px] text-muted-foreground">{lang === "bn" ? "বাকি দিয়েছি" : "Receivable"}</div>
            <div className="mt-0.5 text-sm font-bold text-success">{fmtMoney(stats.receivable, lang)}</div>
          </div>
          <div className="p-2.5 text-center">
            <div className="text-[11px] text-muted-foreground">{lang === "bn" ? "বাকি নিয়েছি" : "Payable"}</div>
            <div className="mt-0.5 text-sm font-bold text-destructive">{fmtMoney(stats.payable, lang)}</div>
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x border-t md:hidden">
          <Link to="/app/online-shop/orders" className="p-2.5 text-center active:bg-accent">
            <div className="text-[11px] text-muted-foreground">{lang === "bn" ? "নতুন অর্ডার" : "New orders"}</div>
            <div className={`mt-0.5 text-sm font-bold ${(overview?.ordersPending ?? 0) > 0 ? "text-primary" : "text-muted-foreground"}`}>
              {overview?.ordersPending ?? 0}
            </div>
          </Link>
          <Link to="/app/customer-wishlist" className="p-2.5 text-center active:bg-accent">
            <div className="text-[11px] text-muted-foreground">{lang === "bn" ? "নতুন ফর্দ" : "New fordo"}</div>
            <div className={`mt-0.5 text-sm font-bold ${(overview?.fordoNew ?? 0) > 0 ? "text-success" : "text-muted-foreground"}`}>
              {overview?.fordoNew ?? 0}
            </div>
          </Link>
          <Link to="/app/products" className="p-2.5 text-center active:bg-accent">
            <div className="text-[11px] text-muted-foreground">{lang === "bn" ? "কম স্টক" : "Low stock"}</div>
            <div className={`mt-0.5 text-sm font-bold ${(overview?.productsLowStock ?? 0) > 0 ? "text-destructive" : "text-muted-foreground"}`}>
              {overview?.productsLowStock ?? 0}
            </div>
          </Link>
        </div>
      </div>

      {/* Admin-managed banner carousel */}
      <DashboardBannerCarousel />
      <div className="mt-3"><IncomingTransfersBanner /></div>

      {/* Desktop overview: extended KPI tiles + recent activity */}
      <div className="mt-5 hidden md:block">
        <DesktopOverview overview={overview} lang={lang} />
      </div>

      {/* Mobile-only: icon menu (sidebar handles desktop nav) */}
      <div className="mt-5 space-y-3 md:hidden">
        {menuSections.map((section) => (
          <Section
            key={section.id}
            title={lang === "bn" ? section.bn : section.en}
            items={section.items}
            lang={lang}
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
  lang: "bn" | "en";
}) {
  const o = overview;
  type IconC = React.ComponentType<{ className?: string }>;
  const tiles: Array<{ to: string; label: string; value: string | number; sub?: string; img?: IconC; icon?: IconC; tone: string }> = [
    { to: "/app/products", label: lang === "bn" ? "মোট পণ্য" : "Products", value: o?.productsTotal ?? "—", icon: Package, tone: "indigo" },
    { to: "/app/products", label: lang === "bn" ? "কম স্টক" : "Low stock", value: o?.productsLowStock ?? "—", img: icons.alert, tone: "amber" },
    { to: "/app/online-shop/products", label: lang === "bn" ? "অনলাইন পণ্য" : "Online products", value: o?.productsPublished ?? "—", icon: Globe, tone: "sky" },
    { to: "/app/online-shop/orders", label: lang === "bn" ? "নতুন অর্ডার" : "New orders", value: o?.ordersPending ?? "—", img: icons.pendingOrder, tone: "emerald" },
    { to: "/app/customer-wishlist", label: lang === "bn" ? "নতুন ফর্দ" : "New fordo", value: o?.fordoNew ?? "—", img: icons.wishlist, tone: "violet" },
    { to: "/app/warranty", label: lang === "bn" ? "ওয়ারেন্টি" : "Warranty", value: o?.warrantyActive ?? "—", img: icons.activeWarranty, tone: "rose" },
    { to: "/app/contacts", label: lang === "bn" ? "গ্রাহক" : "Customers", value: o?.customersCount ?? "—", img: icons.customer, tone: "blue" },
    { to: "/app/contacts", label: lang === "bn" ? "সরবরাহকারী" : "Suppliers", value: o?.suppliersCount ?? "—", icon: Truck, tone: "orange" },
    { to: "/app/access", label: lang === "bn" ? "কর্মচারী" : "Employees", value: o?.employeesCount ?? "—", img: icons.employee, tone: "teal" },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:grid-cols-6 xl:grid-cols-9">
        {tiles.map((t) => (
          <KpiTile key={t.label} {...t} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <PanelCard title={lang === "bn" ? "সাম্প্রতিক বিক্রি" : "Recent sales"} img={icons.transaction} to="/app/sales-ledger" lang={lang}>
          {(o?.recentSales ?? []).length === 0 ? (
            <Empty lang={lang} />
          ) : (
            <ul className="divide-y">
              {(o?.recentSales ?? []).map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{r.customer_name || (lang === "bn" ? "নগদ গ্রাহক" : "Walk-in")}</div>
                    <div className="text-[11px] text-muted-foreground">#{r.invoice_no ?? "—"} · {timeAgo(r.created_at, lang)}</div>
                  </div>
                  <div className="font-bold tabular-nums">{fmtMoney(r.total, lang)}</div>
                </li>
              ))}
            </ul>
          )}
        </PanelCard>

        <PanelCard title={lang === "bn" ? "নতুন অনলাইন অর্ডার" : "New online orders"} img={icons.pendingOrder} to="/app/online-shop/orders" lang={lang}>
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

        <PanelCard title={lang === "bn" ? "সাম্প্রতিক ফর্দ" : "Recent fordo"} img={icons.wishlist} to="/app/customer-wishlist" lang={lang}>
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

        <PanelCard title={lang === "bn" ? "কম স্টক পণ্য" : "Low-stock products"} img={icons.alert} to="/app/products" lang={lang}>
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

        <PanelCard title={lang === "bn" ? "মেয়াদোত্তীর্ণ হবে শীঘ্রই" : "Warranty expiring soon"} icon={Clock} to="/app/warranty" lang={lang}>
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

const TONES: Record<string, string> = {
  indigo: "bg-indigo-100 text-indigo-700",
  amber: "bg-amber-100 text-amber-700",
  sky: "bg-sky-100 text-sky-700",
  emerald: "bg-emerald-100 text-emerald-700",
  violet: "bg-violet-100 text-violet-700",
  rose: "bg-rose-100 text-rose-700",
  blue: "bg-blue-100 text-blue-700",
  orange: "bg-orange-100 text-orange-700",
  teal: "bg-teal-100 text-teal-700",
};

function KpiTile({
  to, label, value, sub, icon: Icon, img: Img, tone,
}: { to: string; label: string; value: string | number; sub?: string; icon?: React.ComponentType<{ className?: string }>; img?: React.ComponentType<{ className?: string }>; tone: string }) {
  return (
    <Link to={to as never} className="group rounded-xl border bg-card p-3 shadow-sm transition hover:border-primary/40 hover:shadow-md">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[11px] font-medium text-muted-foreground">{label}</span>
        {Img ? (
          <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${TONES[tone] ?? TONES.indigo}`}>
            <Img className="h-4 w-4" />
          </span>
        ) : Icon ? (
          <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${TONES[tone] ?? TONES.indigo}`}>
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
      </div>
      <div className="mt-1 text-lg font-bold tabular-nums">{value}</div>
      {sub ? <div className="text-[10px] text-muted-foreground">{sub}</div> : null}
    </Link>
  );
}

function PanelCard({
  title, icon: Icon, img: Img, to, lang, children,
}: { title: string; icon?: React.ComponentType<{ className?: string }>; img?: React.ComponentType<{ className?: string }>; to: string; lang: "bn" | "en"; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-3 shadow-sm">
      <div className="flex items-center justify-between border-b pb-2">
        <div className="flex items-center gap-2 text-sm font-bold">
          {Img ? <Img className="h-5 w-5 text-primary" /> : Icon ? <Icon className="h-4 w-4 text-primary" /> : null}
          {title}
        </div>
        <Link to={to as never} className="text-[11px] font-semibold text-primary hover:underline">
          {lang === "bn" ? "সব দেখুন →" : "View all →"}
        </Link>
      </div>
      <div className="pt-1">{children}</div>
    </div>
  );
}

function Empty({ lang }: { lang: "bn" | "en" }) {
  return (
    <div className="py-6 text-center text-xs text-muted-foreground">
      {lang === "bn" ? "কোনো তথ্য নেই" : "No data yet"}
    </div>
  );
}

function timeAgo(iso: string, lang: "bn" | "en") {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return lang === "bn" ? "এখনই" : "just now";
  if (m < 60) return `${m}${lang === "bn" ? " মি" : "m"}`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}${lang === "bn" ? " ঘ" : "h"}`;
  const d = Math.floor(h / 24);
  return `${d}${lang === "bn" ? " দি" : "d"}`;
}

function Section({
  title,
  items,
  lang,
}: {
  title: string;
  items: { to: string; icon: React.ComponentType<{ className?: string }>; bn: string; en: string }[];
  lang: "bn" | "en";
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
            <span className="text-[11px] font-semibold leading-tight">{lang === "bn" ? it.bn : it.en}</span>
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
