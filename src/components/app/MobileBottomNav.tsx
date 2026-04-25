import { Link, useLocation } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Home, ShoppingCart, BarChart3, Menu as MenuIcon, Undo2 } from "lucide-react";

type Tab = { to: string; bn: string; en: string; Icon: typeof Home; matchPrefix?: string };

const TABS: Tab[] = [
  { to: "/app/dashboard", bn: "হোম", en: "Home", Icon: Home },
  { to: "/app/sell", bn: "বেচা", en: "Sell", Icon: ShoppingCart, matchPrefix: "/app/sell" },
  { to: "/app/returns", bn: "রিটার্ন", en: "Return", Icon: Undo2, matchPrefix: "/app/returns" },
  { to: "/app/reports", bn: "রিপোর্ট", en: "Report", Icon: BarChart3, matchPrefix: "/app/reports" },
];

export function MobileBottomNav({ onMenu }: { onMenu: () => void }) {
  const { lang } = useI18n();
  const loc = useLocation();

  const isActive = (t: Tab) => {
    if (t.matchPrefix) return loc.pathname.startsWith(t.matchPrefix);
    return loc.pathname === t.to || loc.pathname.startsWith(t.to + "/");
  };

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch justify-between border-t bg-background/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {TABS.map((t) => {
        const active = isActive(t);
        return (
          <Link
            key={t.to}
            to={t.to as never}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors",
              active ? "text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <t.Icon className={cn("h-5 w-5", active && "scale-110")} />
            <span className="truncate">{lang === "bn" ? t.bn : t.en}</span>
          </Link>
        );
      })}
      <button
        onClick={onMenu}
        className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
        aria-label={lang === "bn" ? "মেনু" : "Menu"}
      >
        <MenuIcon className="h-5 w-5" />
        <span>{lang === "bn" ? "মেনু" : "Menu"}</span>
      </button>
    </nav>
  );
}
