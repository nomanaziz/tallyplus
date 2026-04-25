import { Link, useLocation } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { icons } from "@/lib/icons";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePermissions } from "@/lib/permissions-hook";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { Download, Store } from "lucide-react";
import { toast } from "sonner";

type Item = { to: string; bn: string; en: string; icon: string; highlight?: boolean; perm?: string };

const ITEMS: Item[] = [
  { to: "/app/subscribe", bn: "সাবস্ক্রিপশন কিনুন", en: "Buy Subscription", icon: icons.buySubscription, highlight: true },
  { to: "/app/dashboard", bn: "হোম", en: "Home", icon: icons.home },
  { to: "/app/purchase", bn: "কেনা", en: "Purchase", icon: icons.purchase, perm: "purchase" },
  { to: "/app/sell", bn: "বেচা", en: "Sell", icon: icons.sell, perm: "sell" },
  { to: "/app/quick-order", bn: "দ্রুত ফর্দ", en: "Quick Order", icon: icons.quickSell, perm: "sell" },
  { to: "/app/cashbox", bn: "ক্যাশবক্স", en: "Cashbox", icon: icons.cashbox },
  { to: "/app/purchase-ledger", bn: "কেনার খাতা", en: "Purchase Ledger", icon: icons.purchaseList, perm: "purchase" },
  { to: "/app/sales-ledger", bn: "বেচার খাতা", en: "Sales Ledger", icon: icons.salesList, perm: "sell" },
  { to: "/app/due-ledger", bn: "বাকির খাতা", en: "Due Ledger", icon: icons.due, perm: "due" },
  { to: "/app/expense-ledger", bn: "খরচের খাতা", en: "Expense Ledger", icon: icons.expense, perm: "expense" },
  { to: "/app/contacts", bn: "যোগাযোগ", en: "Contacts", icon: icons.contact, perm: "contacts" },
  { to: "/app/training", bn: "অ্যাপ ট্রেনিং", en: "App Training", icon: icons.training },
  { to: "/app/affiliate", bn: "গ্রোথ পার্টনার", en: "Growth Partner", icon: icons.contact },
  { to: "/app/products", bn: "প্রোডাক্ট লিস্ট", en: "Product List", icon: icons.productList, perm: "products" },
  { to: "/app/stock", bn: "স্টকের হিসাব", en: "Stock", icon: icons.stock, perm: "stock" },
  { to: "/app/access", bn: "অ্যাপ অ্যাক্সেস", en: "App Access", icon: icons.access, perm: "__owner__" },
  { to: "/app/printer", bn: "প্রিন্টার", en: "Printer", icon: icons.printer, perm: "shop" },
  { to: "/app/reports", bn: "ব্যবসার রিপোর্ট", en: "Business Report", icon: icons.businessReport, perm: "report" },
  { to: "/app/marketing", bn: "মার্কেটিং", en: "Marketing", icon: icons.marketing, perm: "sms" },
  { to: "/app/online-shop", bn: "অনলাইন শপ", en: "Online Shop", icon: icons.onlineShop, perm: "online_shop" },
  { to: "/app/customer-wishlist", bn: "গ্রাহক ফর্দ", en: "Customer Wishlist", icon: icons.contact, perm: "contacts" },
  { to: "/app/expiring", bn: "মেয়াদোত্তীর্ণ পণ্য", en: "Expiring Products", icon: icons.expired, perm: "products" },
  { to: "/app/warranty", bn: "ওয়ারেন্টি পণ্য", en: "Warranty", icon: icons.warranty, perm: "products" },
  { to: "/app/recycle-bin", bn: "রিসাইকেল বিন", en: "Recycle Bin", icon: icons.recycle, perm: "__owner__" },
];

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { lang } = useI18n();
  const loc = useLocation();
  const { isOwner, isAdmin, canGroup, loading } = usePermissions();

  const visibleItems = ITEMS.filter((it) => {
    if (!it.perm) return true;
    if (loading) return true; // avoid layout flash; route guard will redirect if needed
    if (it.perm === "__owner__") return isOwner || isAdmin;
    return canGroup(it.perm);
  });

  return (
    <aside className="flex h-full w-52 flex-col border-r bg-sidebar">
      <div className="flex h-14 flex-none items-center gap-2 border-b px-3">
        <img src={logo} alt="" className="h-6 w-6" />
        <span className="text-sm font-extrabold tracking-tight">Tally Plus</span>
      </div>
      <ScrollArea className="flex-1">
        <nav className="flex flex-col gap-0.5 px-1.5 py-2">
          {visibleItems.map((it) => {
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
          })}
        </nav>
      </ScrollArea>
    </aside>
  );
}