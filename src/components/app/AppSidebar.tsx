import { Link, useLocation } from "@/lib/router";
import { useI18n } from "@/lib/i18n";
import { icons } from "@/lib/icons";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePermissions } from "@/lib/permissions-hook";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { Download } from "lucide-react";
import { toast } from "sonner";

export type SidebarItem = { to: string; bn: string; en: string; icon: string; highlight?: boolean; perm?: string };
export type SidebarSection = { id: string; bn: string; en: string; items: SidebarItem[] };

export const SECTIONS: SidebarSection[] = [
  {
    id: "main",
    bn: "মূল",
    en: "Main",
    items: [{ to: "/app/dashboard", bn: "হোম", en: "Home", icon: icons.home }],
  },
  {
    id: "transactions",
    bn: "লেনদেন",
    en: "Transactions",
    items: [
      { to: "/app/purchase", bn: "কেনা", en: "Purchase", icon: icons.purchase, perm: "purchase" },
      { to: "/app/sell", bn: "বেচা", en: "Sell", icon: icons.sell, perm: "sell" },
      { to: "/app/cashbox", bn: "ক্যাশবক্স", en: "Cashbox", icon: icons.cashbox },
    ],
  },
  {
    id: "ledgers",
    bn: "হিসাবের খাতা",
    en: "Ledgers",
    items: [
      { to: "/app/purchase-ledger", bn: "কেনার খাতা", en: "Purchase Ledger", icon: icons.purchaseList, perm: "purchase" },
      { to: "/app/sales-ledger", bn: "বেচার খাতা", en: "Sales Ledger", icon: icons.salesList, perm: "sell" },
      { to: "/app/due-ledger", bn: "বাকির খাতা", en: "Due Ledger", icon: icons.due, perm: "due" },
      { to: "/app/expense-ledger", bn: "খরচের খাতা", en: "Expense Ledger", icon: icons.expense, perm: "expense" },
      { to: "/app/owner-ledger", bn: "মালিকের লেনদেন", en: "Owner Ledger", icon: icons.cashbox, perm: "expense" },
      { to: "/app/assets", bn: "দোকানের সম্পদ", en: "Shop Assets", icon: icons.cashbox, perm: "expense" },
    ],
  },
  {
    id: "inventory",
    bn: "পণ্য ও স্টক",
    en: "Inventory",
    items: [
      { to: "/app/products", bn: "প্রোডাক্ট ও স্টক", en: "Products & Stock", icon: icons.productList, perm: "products" },
      { to: "/app/returns", bn: "প্রোডাক্ট রিটার্ন", en: "Product Return", icon: icons.salesList, perm: "returns" },
      { to: "/app/expiring", bn: "মেয়াদোত্তীর্ণ পণ্য", en: "Expiring Products", icon: icons.expired, perm: "products" },
      { to: "/app/warranty", bn: "ওয়ারেন্টি পণ্য", en: "Warranty", icon: icons.warranty, perm: "products" },
    ],
  },
  {
    id: "customers",
    bn: "গ্রাহক ও যোগাযোগ",
    en: "Customers",
    items: [
      { to: "/app/contacts", bn: "যোগাযোগ", en: "Contacts", icon: icons.contact, perm: "contacts" },
      { to: "/app/quick-order", bn: "দ্রুত ফর্দ", en: "Quick Order", icon: icons.quickSell, perm: "sell" },
      { to: "/app/customer-wishlist", bn: "গ্রাহক ফর্দ", en: "Customer Fordo", icon: icons.contact, perm: "contacts" },
      { to: "/app/fordo-history", bn: "ফর্দ ইতিহাস", en: "Fordo History", icon: icons.contact, perm: "contacts" },
      { to: "/app/marketing", bn: "মার্কেটিং", en: "Marketing", icon: icons.marketing, perm: "sms" },
      { to: "/app/online-shop", bn: "অনলাইন শপ", en: "Online Shop", icon: icons.onlineShop, perm: "online_shop" },
    ],
  },
  {
    id: "reports",
    bn: "রিপোর্ট ও সেটিংস",
    en: "Reports & Settings",
    items: [
      { to: "/app/reports", bn: "ব্যবসার রিপোর্ট", en: "Business Report", icon: icons.businessReport, perm: "report" },
      { to: "/app/owner-report", bn: "মালিকের রিপোর্ট", en: "Owner Report", icon: icons.businessReport, perm: "report" },
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
  const pwa = usePwaInstall();

  const isVisible = (it: SidebarItem) => {
    if (!it.perm) return true;
    if (loading) return true; // avoid layout flash; route guard will redirect if needed
    if (it.perm === "__owner__") return isOwner || isAdmin;
    return canGroup(it.perm);
  };

  const renderItem = (it: SidebarItem) => {
    const active = loc.pathname === it.to || loc.pathname.startsWith(it.to + "/");
    return (
      <Link
        key={it.to}
        to={it.to as never}
        onClick={onNavigate}
        className={cn(
          "group flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] leading-tight transition-colors",
          it.highlight && !active && "bg-primary/15 font-semibold hover:bg-primary/25",
          active && "bg-primary/25 font-semibold text-foreground",
          !active && !it.highlight && "hover:bg-sidebar-accent",
        )}
      >
        <img src={it.icon} alt="" className="h-5 w-5 flex-none" />
        <span className="truncate">{lang === "bn" ? it.bn : it.en}</span>
      </Link>
    );
  };

  return (
    <aside className="flex h-full w-52 flex-col border-r bg-sidebar">
      <div className="flex h-14 flex-none items-center gap-2 border-b px-3">
        <img src={logo} alt="" className="h-6 w-6 object-contain" />
        <span className="text-sm font-extrabold tracking-tight">Tally Plus</span>
      </div>
      <ScrollArea className="flex-1">
        <nav className="flex flex-col gap-0.5 px-1.5 py-2">
          {SECTIONS.map((section) => {
            const items = section.items.filter(isVisible);
            if (items.length === 0) return null;
            return (
              <div key={section.id} className="mt-2 flex flex-col gap-0.5 border-t border-border/60 pt-2 first:mt-1 first:border-t-0 first:pt-0">
                <div className="px-2 pb-0.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {lang === "bn" ? section.bn : section.en}
                  </span>
                </div>
                {items.map(renderItem)}
                {section.id === "more" && !pwa.installed && (
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
                    <Download className="h-5 w-5 flex-none" />
                    <span className="truncate">{lang === "bn" ? "অ্যাপ ইনস্টল করুন" : "Install App"}</span>
                  </button>
                )}
              </div>
            );
          })}
        </nav>
      </ScrollArea>
    </aside>
  );
}