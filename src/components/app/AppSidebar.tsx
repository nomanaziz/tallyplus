import { Link, useLocation } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { icons } from "@/lib/icons";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";
import { ScrollArea } from "@/components/ui/scroll-area";

type Item = { to: string; bn: string; en: string; icon: string; highlight?: boolean };

const ITEMS: Item[] = [
  { to: "/app/subscribe", bn: "সাবস্ক্রিপশন কিনুন", en: "Buy Subscription", icon: icons.buySubscription, highlight: true },
  { to: "/app/dashboard", bn: "হোম", en: "Home", icon: icons.home },
  { to: "/app/purchase", bn: "কেনা", en: "Purchase", icon: icons.purchase },
  { to: "/app/sell", bn: "বেচা", en: "Sell", icon: icons.sell },
  { to: "/app/cashbox", bn: "ক্যাশবক্স", en: "Cashbox", icon: icons.cashbox },
  // Ledgers group
  { to: "/app/purchase-ledger", bn: "কেনার খাতা", en: "Purchase Ledger", icon: icons.purchaseList },
  { to: "/app/sales-ledger", bn: "বেচার খাতা", en: "Sales Ledger", icon: icons.salesList },
  { to: "/app/due-ledger", bn: "বাকির খাতা", en: "Due Ledger", icon: icons.due },
  { to: "/app/expense-ledger", bn: "খরচের খাতা", en: "Expense Ledger", icon: icons.expense },
  { to: "/app/contacts", bn: "যোগাযোগ", en: "Contacts", icon: icons.contact },
  { to: "/app/training", bn: "অ্যাপ ট্রেনিং", en: "App Training", icon: icons.training },
  // Business group
  { to: "/app/products", bn: "প্রোডাক্ট লিস্ট", en: "Product List", icon: icons.productList },
  { to: "/app/stock", bn: "স্টকের হিসাব", en: "Stock", icon: icons.stock },
  { to: "/app/access", bn: "অ্যাপ অ্যাক্সেস", en: "App Access", icon: icons.access },
  { to: "/app/printer", bn: "প্রিন্টার", en: "Printer", icon: icons.printer },
  { to: "/app/reports", bn: "ব্যবসার রিপোর্ট", en: "Business Report", icon: icons.businessReport },
  // Other group
  { to: "/app/marketing", bn: "মার্কেটিং", en: "Marketing", icon: icons.marketing },
  { to: "/app/online-shop", bn: "অনলাইন শপ", en: "Online Shop", icon: icons.onlineShop },
  { to: "/app/expiring", bn: "মেয়াদোত্তীর্ণ পণ্য", en: "Expiring Products", icon: icons.expired },
  { to: "/app/warranty", bn: "ওয়ারেন্টি পণ্য", en: "Warranty", icon: icons.warranty },
  { to: "/app/recycle-bin", bn: "রিসাইকেল বিন", en: "Recycle Bin", icon: icons.recycle },
];

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { lang } = useI18n();
  const loc = useLocation();

  return (
    <aside className="flex h-full w-60 flex-col border-r bg-sidebar">
      <div className="flex h-14 flex-none items-center gap-2 border-b px-4">
        <img src={logo} alt="" className="h-7 w-7" />
        <span className="text-base font-extrabold tracking-tight">Tally Plus</span>
      </div>
      <ScrollArea className="flex-1">
        <nav className="flex flex-col gap-0.5 px-2 py-2">
          {ITEMS.map((it) => {
            const active = loc.pathname === it.to || loc.pathname.startsWith(it.to + "/");
            return (
              <Link
                key={it.to}
                to={it.to as never}
                onClick={onNavigate}
                className={cn(
                  "group flex items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors",
                  it.highlight && !active && "bg-primary/15 font-semibold hover:bg-primary/25",
                  active && "bg-primary/25 font-semibold text-foreground",
                  !active && !it.highlight && "hover:bg-sidebar-accent",
                )}
              >
                <img src={it.icon} alt="" className="h-6 w-6 flex-none" />
                <span className="truncate">{lang === "bn" ? it.bn : it.en}</span>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>
    </aside>
  );
}