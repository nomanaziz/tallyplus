import { useEffect, useState } from "react";
import { Link, useLocation } from "@/lib/router";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import logo from "@/assets/logo.png";
import { BrandWordmark } from "@/components/brand/BrandWordmark";
import {
  ChevronsLeft,
  ChevronsRight,
  Home,
  Store,
  ShoppingCart,
  ListChecks,
  ShoppingBag,
  Heart,
  Wrench,
  Wallet,
  BookOpen,
  BarChart3,
  PiggyBank,
  StickyNote,
  History,
  CreditCard,
  GraduationCap,
  UserCog,
  User,
  type LucideIcon,
} from "lucide-react";

type Item = { to: string; label: string; Icon: LucideIcon; highlight?: boolean };
type Section = { id: string; title: string; items: Item[] };

const SECTIONS: Section[] = [
  {
    id: "main",
    title: "মূল",
    items: [
      { to: "/customer/dashboard", label: "ড্যাশবোর্ড", Icon: Home },
      { to: "/customer/marketplace", label: "মার্কেটপ্লেস", Icon: Store, highlight: true },
    ],
  },
  {
    id: "shopping",
    title: "শপিং",
    items: [
      { to: "/customer/my-orders", label: "আমার অর্ডার", Icon: ShoppingCart },
      { to: "/customer/my-fordo", label: "ফর্দ", Icon: ListChecks },
      { to: "/customer/shopping", label: "শপিং", Icon: ShoppingBag },
      { to: "/customer/favorite-shops", label: "প্রিয় দোকান", Icon: Heart },
      { to: "/customer/my-services", label: "আমার সার্ভিস", Icon: Wrench },
    ],
  },
  {
    id: "money",
    title: "টাকা-পয়সা",
    items: [
      { to: "/customer/money", label: "টাকা", Icon: Wallet },
      { to: "/customer/cash-book", label: "ক্যাশ বুক", Icon: BookOpen },
      { to: "/customer/analytics", label: "বিশ্লেষণ", Icon: BarChart3 },
      { to: "/customer/budgets", label: "বাজেট", Icon: PiggyBank },
    ],
  },
  {
    id: "personal",
    title: "ব্যক্তিগত",
    items: [
      { to: "/customer/notes", label: "নোট", Icon: StickyNote },
      { to: "/customer/history", label: "ইতিহাস", Icon: History },
    ],
  },
  {
    id: "account",
    title: "অ্যাকাউন্ট",
    items: [
      { to: "/customer/subscription", label: "সাবস্ক্রিপশন", Icon: CreditCard },
      { to: "/customer/training", label: "ট্রেনিং", Icon: GraduationCap },
      { to: "/customer/profile", label: "প্রোফাইল", Icon: UserCog },
      { to: "/customer/me", label: "আমি", Icon: User },
    ],
  },
];

export function CustomerSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const loc = useLocation();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("customer-sidebar-collapsed") === "1";
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("customer-sidebar-collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  const renderItem = (it: Item) => {
    const active = loc.pathname === it.to || loc.pathname.startsWith(it.to + "/");
    const node = (
      <Link
        to={it.to as never}
        onClick={() => onNavigate?.()}
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
        <it.Icon className={cn("h-5 w-5 flex-none", active ? "stroke-[2.5] text-primary-foreground" : "text-muted-foreground")} />
        {!collapsed && <span className="truncate">{it.label}</span>}
      </Link>
    );
    if (!collapsed) return <div key={it.to}>{node}</div>;
    return (
      <Tooltip key={it.to} delayDuration={150}>
        <TooltipTrigger asChild>{node}</TooltipTrigger>
        <TooltipContent side="right" className="text-xs">{it.label}</TooltipContent>
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
            aria-label="Expand sidebar"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        )}
        <ScrollArea className="flex-1">
          <nav className={cn("flex flex-col gap-0.5 py-2", collapsed ? "px-1" : "px-1.5")}>
            {SECTIONS.map((section) => (
              <div key={section.id} className="mt-2 flex flex-col gap-0.5 border-t border-border/60 pt-2 first:mt-1 first:border-t-0 first:pt-0">
                {!collapsed && (
                  <div className="px-2 pb-0.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {section.title}
                    </span>
                  </div>
                )}
                {section.items.map(renderItem)}
              </div>
            ))}
          </nav>
        </ScrollArea>
      </aside>
    </TooltipProvider>
  );
}