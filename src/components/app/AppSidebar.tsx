import { Link, useLocation } from "@/lib/router";
import { useI18n } from "@/lib/i18n";
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

export type SidebarItem = { to: string; bn: string; en: string; icon: LucideIcon; highlight?: boolean; perm?: string; module?: string };
export type SidebarSection = { id: string; bn: string; en: string; items: SidebarItem[] };

export const SECTIONS: SidebarSection[] = [
  {
    id: "main",
    bn: "মূল",
    en: "Main",
    items: [{ to: "/app/dashboard", bn: "ড্যাশবোর্ড", en: "Dashboard", icon: icons.home }],
  },
  {
    id: "transactions",
    bn: "লেনদেন",
    en: "Transactions",
    items: [
      { to: "/app/lpg", bn: "LPG / বোতল", en: "LPG / Bottle", icon: Flame, module: "lpg", highlight: true },
      { to: "/app/purchase", bn: "ক্রয়", en: "Purchase", icon: icons.purchase, perm: "purchase", module: "purchase" },
      { to: "/app/sell", bn: "বিক্রয়", en: "Sell", icon: icons.sell, perm: "sell", module: "sales" },
      { to: "/app/quick-order", bn: "দ্রুত বিক্রি", en: "Quick Sell", icon: icons.quickSell, perm: "sell", module: "sales" },
      { to: "/app/cashbox", bn: "ক্যাশবক্স", en: "Cashbox", icon: icons.cashbox, module: "cashbook" },
    ],
  },
  {
    id: "ledgers",
    bn: "হিসাবের বই",
    en: "Books",
    items: [
      { to: "/app/purchase-ledger", bn: "ক্রয়ের বই", en: "Purchase Book", icon: icons.purchaseList, perm: "purchase", module: "purchase" },
      { to: "/app/sales-ledger", bn: "বিক্রয়ের বই", en: "Sales Book", icon: icons.salesList, perm: "sell", module: "sales" },
      { to: "/app/due-ledger", bn: "বাকির বই", en: "Due Book", icon: icons.due, perm: "due" },
      { to: "/app/expense-ledger", bn: "খরচের বই", en: "Expense Book", icon: icons.expense, perm: "expense", module: "expense" },
      { to: "/app/owner-ledger", bn: "মালিকের বই", en: "Owner Book", icon: icons.cashbox, perm: "expense", module: "cashbook" },
      { to: "/app/assets", bn: "দোকানের সম্পদ", en: "Shop Assets", icon: icons.cashbox, perm: "expense", module: "cashbook" },
    ],
  },
  {
    id: "inventory",
    bn: "পণ্য ও স্টক",
    en: "Inventory",
    items: [
      { to: "/app/products", bn: "প্রোডাক্ট ও স্টক", en: "Products & Stock", icon: icons.productList, perm: "products", module: "products" },
      { to: "/app/services", bn: "সার্ভিস", en: "Services", icon: icons.training, perm: "services", module: "services" },
      { to: "/app/returns", bn: "প্রোডাক্ট রিটার্ন", en: "Product Return", icon: icons.salesList, perm: "returns", module: "products" },
      { to: "/app/expiring", bn: "মেয়াদোত্তীর্ণ পণ্য", en: "Expiring Products", icon: icons.expired, perm: "products", module: "products" },
      { to: "/app/warranty", bn: "ওয়ারেন্টি পণ্য", en: "Warranty", icon: icons.warranty, perm: "products", module: "products" },
    ],
  },
  {
    id: "customers",
    bn: "গ্রাহক ও যোগাযোগ",
    en: "Customers",
    items: [
      { to: "/app/contacts", bn: "কাস্টমার ও স্টাফ", en: "Customer & Staff", icon: icons.contact, perm: "contacts", module: "contacts" },
      { to: "/app/customer-wishlist", bn: "গ্রাহক ফর্দ", en: "Customer Fordo", icon: icons.contact, perm: "contacts", module: "contacts" },
      { to: "/app/fordo-history", bn: "ফর্দ ইতিহাস", en: "Fordo History", icon: icons.contact, perm: "contacts", module: "contacts" },
      { to: "/app/marketing", bn: "মার্কেটিং", en: "Marketing", icon: icons.marketing, perm: "sms", module: "contacts" },
      { to: "/app/online-shop", bn: "অনলাইন শপ", en: "Online Shop", icon: icons.onlineShop, perm: "online_shop", module: "online_shop" },
    ],
  },
  {
    id: "reports",
    bn: "রিপোর্ট ও সেটিংস",
    en: "Reports & Settings",
    items: [
      { to: "/app/reports", bn: "ব্যবসার রিপোর্ট", en: "Business Report", icon: icons.businessReport, perm: "report", module: "reports" },
      { to: "/app/owner-report", bn: "মালিকের রিপোর্ট", en: "Owner Report", icon: icons.businessReport, perm: "report", module: "reports" },
      { to: "/app/usage-limits", bn: "ব্যবহারের সীমা", en: "Usage Limits", icon: icons.businessReport },
      { to: "/app/printer", bn: "প্রিন্টার", en: "Printer", icon: icons.printer, perm: "shop" },
      { to: "/app/access", bn: "অ্যাপ অ্যাক্সেস", en: "App Access", icon: icons.access, perm: "__owner__" },
      { to: "/app/recycle-bin", bn: "রিসাইকেল বিন", en: "Recycle Bin", icon: icons.recycle, perm: "__owner__" },
    ],
  },
  {
    id: "more",
    bn: "অন্যান্য",
    en: "Others",
    items: [
      { to: "/app/training", bn: "অ্যাপ ট্রেনিং", en: "App Training", icon: icons.training },
      { to: "/app/affiliate", bn: "গ্রোথ পার্টনার", en: "Growth Partner", icon: icons.contact },
      { to: "/app/subscribe", bn: "সাবস্ক্রিপশন কিনুন", en: "Buy Subscription", icon: icons.buySubscription },
    ],
  },
];

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { lang } = useI18n();
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
    // Module gate: if the item declares a module and it's not enabled, hide it.
    if (it.module && !modulesLoading && !enabledModules.has(it.module)) return false;
    if (!it.perm) return true;
    if (loading) return true;
    if (it.perm === "__owner__") return isOwner || isAdmin;
    return canGroup(it.perm);
  };

  const renderItem = (it: SidebarItem) => {
    const active = loc.pathname === it.to || loc.pathname.startsWith(it.to + "/");
    const tourKey =
      it.to === "/app/profile" ? "profile" :
      it.to === "/app/products" ? "products" :
      it.to === "/app/purchase" ? "purchase" :
      it.to === "/app/sell" ? "sell" : undefined;
    const node = (
      <Link
        to={it.to as never}
        onClick={onNavigate}
        data-tour={tourKey}
        className={cn(
          "group flex items-center gap-2.5 rounded-md py-1.5 text-[13px] leading-tight transition-colors",
          collapsed ? "justify-center px-1" : "px-2",
          it.highlight && !active && "bg-primary/15 font-semibold hover:bg-primary/25",
          active && "bg-primary/25 font-semibold text-foreground",
          !active && !it.highlight && "hover:bg-sidebar-accent",
        )}
      >
        <span className={cn(
          "flex h-7 w-7 flex-none items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm",
          active && "ring-2 ring-primary/40",
        )}>
          <it.icon className="h-4 w-4 icon-inherit" />
        </span>
        {!collapsed && <span className="truncate">{lang === "bn" ? it.bn : it.en}</span>}
      </Link>
    );
    if (!collapsed) return <div key={it.to}>{node}</div>;
    return (
      <Tooltip key={it.to} delayDuration={150}>
        <TooltipTrigger asChild>{node}</TooltipTrigger>
        <TooltipContent side="right" className="text-xs">
          {lang === "bn" ? it.bn : it.en}
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
              title={lang === "bn" ? "মেনু সংকুচিত করুন" : "Collapse menu"}
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
            title={lang === "bn" ? "মেনু খুলুন" : "Expand menu"}
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
                        {lang === "bn" ? section.bn : section.en}
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
                                toast.info(lang === "bn" ? "ব্রাউজার মেনু থেকে 'Install app'" : "Use browser → Install app");
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
                          {lang === "bn" ? "অ্যাপ ইনস্টল করুন" : "Install App"}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <button
                        type="button"
                        onClick={async () => {
                          if (pwa.canInstall) {
                            const outcome = await pwa.promptInstall();
                            if (outcome === "accepted") {
                              toast.success(lang === "bn" ? "অ্যাপ ইনস্টল হচ্ছে…" : "Installing app…");
                            }
                          } else if (pwa.isIos) {
                            toast.info(
                              lang === "bn"
                                ? "Safari Share → 'Add to Home Screen' সিলেক্ট করুন"
                                : "Tap Safari Share → 'Add to Home Screen'",
                              { duration: 6000 },
                            );
                          } else {
                            toast.info(
                              lang === "bn"
                                ? "ব্রাউজার মেনু থেকে 'Install app' সিলেক্ট করুন"
                                : "Use browser menu → 'Install app'",
                              { duration: 6000 },
                            );
                          }
                        }}
                        className="group flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] leading-tight text-emerald-700 transition-colors hover:bg-sidebar-accent dark:text-emerald-400"
                      >
                        <span className="flex h-7 w-7 flex-none items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
                          <Download className="h-4 w-4 icon-inherit" />
                        </span>
                        <span className="truncate">{lang === "bn" ? "অ্যাপ ইনস্টল করুন" : "Install App"}</span>
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
              startTour(lang === "bn" ? "bn" : "en");
            }}
            className={cn(
              "flex items-center gap-2 rounded-md text-[12px] text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors",
              collapsed ? "h-8 w-8 justify-center" : "w-full px-2 py-1.5",
            )}
            title={lang === "bn" ? "টুর আবার দেখুন" : "Restart tour"}
          >
            <HelpCircle className="h-4 w-4" />
            {!collapsed && <span>{lang === "bn" ? "টুর আবার দেখুন" : "Restart tour"}</span>}
          </button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
