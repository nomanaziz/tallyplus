import { Link, useLocation } from "@/lib/router";
import { useI18n, type TKey } from "@/lib/i18n";
import { icons } from "@/lib/icons";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";
import { BrandWordmark } from "@/components/brand/BrandWordmark";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePermissions } from "@/lib/permissions-hook";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { Download, ChevronsLeft, ChevronsRight, Flame } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { resetTour, startTour } from "@/lib/tour";
import { HelpCircle } from "lucide-react";
import { useShop } from "@/lib/shop";
import { useEnabledModules } from "@/lib/modules";

export type SidebarItem = { to: string; tKey: TKey; icon: LucideIcon; highlight?: boolean; perm?: string; module?: string };
export type SidebarSection = { id: string; tKey: TKey; items: SidebarItem[] };

export const SECTIONS: SidebarSection[] = [
  {
    id: "main",
    tKey: "sec_main",
    items: [{ to: "/app/dashboard", tKey: "nav_dashboard", icon: icons.home }],
  },
  {
    id: "transactions",
    tKey: "sec_transactions",
    items: [
      { to: "/app/lpg", tKey: "nav_lpg", icon: Flame, module: "lpg", highlight: true },
      { to: "/app/sell", tKey: "nav_sell", icon: icons.sell, perm: "sell", module: "sales" },
      { to: "/app/quick-order", tKey: "nav_quickSell", icon: icons.quickSell, perm: "sell", module: "sales" },
      { to: "/app/purchase", tKey: "nav_purchase", icon: icons.purchase, perm: "purchase", module: "purchase" },
      { to: "/app/cashbox", tKey: "nav_cashbox", icon: icons.cashbox, module: "cashbook" },
    ],
  },
  {
    id: "ledgers",
    tKey: "sec_books",
    items: [
      { to: "/app/sales-ledger", tKey: "nav_salesBook", icon: icons.salesList, perm: "sell", module: "sales" },
      { to: "/app/purchase-ledger", tKey: "nav_purchaseBook", icon: icons.purchaseList, perm: "purchase", module: "purchase" },
      { to: "/app/due-ledger", tKey: "nav_dueBook", icon: icons.due, perm: "due" },
      { to: "/app/expense-ledger", tKey: "nav_expenseBook", icon: icons.expense, perm: "expense", module: "expense" },
      { to: "/app/owner-ledger", tKey: "nav_ownerBook", icon: icons.cashbox, perm: "expense", module: "cashbook" },
      { to: "/app/investors", tKey: "nav_investors", icon: icons.contact, perm: "expense" },
      { to: "/app/assets", tKey: "nav_shopAssets", icon: icons.cashbox, perm: "expense", module: "cashbook" },
    ],
  },
  {
    id: "inventory",
    tKey: "sec_inventory",
    items: [
      { to: "/app/products", tKey: "nav_productsStock", icon: icons.productList, perm: "products", module: "products" },
      { to: "/app/services", tKey: "nav_services", icon: icons.training, perm: "services", module: "services" },
      { to: "/app/returns", tKey: "nav_productReturn", icon: icons.salesList, perm: "returns", module: "products" },
      { to: "/app/expiring", tKey: "nav_expiringProducts", icon: icons.expired, perm: "products", module: "products" },
      { to: "/app/warranty", tKey: "nav_warranty", icon: icons.warranty, perm: "products", module: "products" },
    ],
  },
  {
    id: "customers",
    tKey: "sec_customers",
    items: [
      { to: "/app/contacts", tKey: "nav_customerStaff", icon: icons.contact, perm: "contacts", module: "contacts" },
      { to: "/app/customer-wishlist", tKey: "nav_customerFordo", icon: icons.contact, perm: "contacts", module: "contacts" },
      { to: "/app/fordo-history", tKey: "nav_fordoHistory", icon: icons.contact, perm: "contacts", module: "contacts" },
      { to: "/app/marketing", tKey: "nav_marketing", icon: icons.marketing, perm: "sms", module: "contacts" },
      { to: "/app/sms", tKey: "nav_sms", icon: icons.marketing, perm: "sms", module: "contacts" },
      { to: "/app/online-shop", tKey: "nav_onlineShop", icon: icons.onlineShop, perm: "online_shop", module: "online_shop" },
    ],
  },
  {
    id: "reports",
    tKey: "sec_reportsSettings",
    items: [
      { to: "/app/reports", tKey: "nav_businessReport", icon: icons.businessReport, perm: "report", module: "reports" },
      { to: "/app/owner-report", tKey: "nav_ownerReport", icon: icons.businessReport, perm: "report", module: "reports" },
      { to: "/app/usage-limits", tKey: "nav_usageLimits", icon: icons.businessReport },
      { to: "/app/printer", tKey: "nav_printer", icon: icons.printer, perm: "shop" },
      { to: "/app/access", tKey: "nav_appAccess", icon: icons.access, perm: "__owner__" },
      { to: "/app/recycle-bin", tKey: "nav_recycleBin", icon: icons.recycle, perm: "__owner__" },
    ],
  },
  {
    id: "more",
    tKey: "sec_others",
    items: [
      { to: "/app/training", tKey: "nav_appTraining", icon: icons.training },
      { to: "/app/affiliate", tKey: "nav_growthPartner", icon: icons.contact },
      { to: "/app/subscribe", tKey: "nav_buySubscription", icon: icons.buySubscription },
    ],
  },
];

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useI18n();
  const loc = useLocation();
  const { isOwner, isAdmin, canGroup, loading } = usePermissions();
  const { current } = useShop();
  const { enabled: enabledModules, loading: modulesLoading } = useEnabledModules(current?.id ?? null);
  const pwa = usePwaInstall();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("app-sidebar-collapsed") === "1";
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("app-sidebar-collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  const isVisible = (it: SidebarItem) => {
    // Module gate: hide items whose module is not enabled for this shop.
    // While modules are still loading, hide module-gated items so opt-in
    // modules like LPG don't briefly appear on shops that never enabled them.
    if (it.module && (modulesLoading || !enabledModules.has(it.module))) return false;
    if (!it.perm) return true;
    if (loading) return true;
    if (it.perm === "__owner__") return isOwner || isAdmin;
    return canGroup(it.perm);
  };

  const renderItem = (it: SidebarItem) => {
    const active = loc.pathname === it.to || loc.pathname.startsWith(it.to + "/");
    const isQuickSell = it.to === "/app/quick-order";
    const tourKey =
      it.to === "/app/profile" ? "profile" :
      it.to === "/app/products" ? "products" :
      it.to === "/app/purchase" ? "purchase" :
      it.to === "/app/sell" ? "sell" : undefined;
    const node = (
      <Link
        to={it.to as never}
        onClick={(e) => {
          if (isQuickSell) {
            e.preventDefault();
            window.dispatchEvent(new CustomEvent("open-quick-sell"));
          }
          onNavigate?.();
        }}
        data-tour={tourKey}
        className={cn(
          "group relative flex items-center gap-3 rounded-lg text-[13px] leading-tight transition-colors",
          collapsed ? "h-9 justify-center px-1" : "h-9 px-3",
          active
            ? "bg-primary text-primary-foreground font-bold shadow-md ring-1 ring-primary/40 before:absolute before:left-0 before:top-1/2 before:h-6 before:-translate-y-1/2 before:w-1 before:rounded-r-full before:bg-primary-foreground/70"
            : it.highlight
              ? "font-semibold text-primary hover:bg-primary/10"
              : "text-foreground/80 hover:bg-accent/60",
        )}
      >
        <it.icon className={cn("h-5 w-5 flex-none", active ? "stroke-[2.5] text-primary-foreground" : "text-muted-foreground")} />
        {!collapsed && <span className="truncate">{t(it.tKey)}</span>}
      </Link>
    );
    if (!collapsed) return <div key={it.to}>{node}</div>;
    return (
      <Tooltip key={it.to} delayDuration={150}>
        <TooltipTrigger asChild>{node}</TooltipTrigger>
        <TooltipContent side="right" className="text-xs">
          {t(it.tKey)}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <TooltipProvider>
      <aside className={cn("flex h-full flex-col border-r bg-sidebar transition-[width] duration-200", collapsed ? "w-14" : "w-52")}>
        <div className={cn("flex h-14 flex-none items-center border-b", collapsed ? "justify-center px-1" : "gap-2 px-3")}>
          <img src={logo} alt="" className="h-6 w-6 flex-none object-contain" />
          {!collapsed && <BrandWordmark className="text-sm font-extrabold tracking-tight" />}
          {!collapsed && (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="ml-auto flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
              title={t("collapseMenu")}
              aria-label="Collapse sidebar"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
          )}
        </div>
        {collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="mx-auto my-1 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
            title={t("expandMenu")}
            aria-label="Expand sidebar"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        )}
        <ScrollArea className="flex-1">
          <nav className={cn("flex flex-col gap-0.5 py-2", collapsed ? "px-1" : "px-1.5")}>
            {SECTIONS.map((section) => {
              const items = section.items.filter(isVisible);
              if (items.length === 0) return null;
              const showInstall = section.id === "more" && !pwa.installed;
              return (
                <div key={section.id} className="mt-2 flex flex-col gap-0.5 border-t border-border/60 pt-2 first:mt-1 first:border-t-0 first:pt-0">
                  {!collapsed && (
                    <div className="px-2 pb-0.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {t(section.tKey)}
                      </span>
                    </div>
                  )}
                  {items.map(renderItem)}
                  {showInstall && (
                    collapsed ? (
                      <Tooltip delayDuration={150}>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={async () => {
                              if (pwa.canInstall) {
                                await pwa.promptInstall();
                              } else {
                                toast.info(t("useBrowserInstall"));
                              }
                            }}
                            className="flex justify-center rounded-md px-1 py-1.5 text-emerald-700 hover:bg-sidebar-accent dark:text-emerald-400"
                          >
                            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
                              <Download className="h-4 w-4 icon-inherit" />
                            </span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="text-xs">
                          {t("installApp")}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <button
                        type="button"
                        onClick={async () => {
                          if (pwa.canInstall) {
                            const outcome = await pwa.promptInstall();
                            if (outcome === "accepted") {
                              toast.success(t("installingApp"));
                            }
                          } else if (pwa.isIos) {
                            toast.info(t("useSafariShare"), { duration: 6000 });
                          } else {
                            toast.info(t("useBrowserInstall"), { duration: 6000 });
                          }
                        }}
                        className="group flex h-9 items-center gap-3 rounded-lg px-3 text-[13px] leading-tight text-emerald-700 transition-colors hover:bg-accent/60 dark:text-emerald-400"
                      >
                        <Download className="h-5 w-5 flex-none" />
                        <span className="truncate">{t("installApp")}</span>
                      </button>
                    )
                  )}
                </div>
              );
            })}
          </nav>
        </ScrollArea>
        <div className={cn("flex-none border-t p-2", collapsed ? "flex justify-center" : "")}>
          <button
            type="button"
            onClick={() => {
              resetTour();
              startTour("bn");
            }}
            className={cn(
              "flex items-center gap-2 rounded-md text-[12px] text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors",
              collapsed ? "h-8 w-8 justify-center" : "w-full px-2 py-1.5",
            )}
            title={t("restartTour")}
          >
            <HelpCircle className="h-4 w-4" />
            {!collapsed && <span>{t("restartTour")}</span>}
          </button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
