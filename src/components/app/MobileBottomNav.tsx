import { Link, useLocation } from "@/lib/router";
import { useI18n, type TKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Home, ShoppingCart, BarChart3, User as UserIcon, Undo2 } from "lucide-react";

type Tab = { to: string; tKey: TKey; Icon: typeof Home; matchPrefix?: string };

const TABS: Tab[] = [
  { to: "/app/dashboard", tKey: "navHome", Icon: Home },
  { to: "/app/sell", tKey: "navSell", Icon: ShoppingCart, matchPrefix: "/app/sell" },
  { to: "/app/returns", tKey: "navReturn", Icon: Undo2, matchPrefix: "/app/returns" },
  { to: "/app/reports", tKey: "navReport", Icon: BarChart3, matchPrefix: "/app/reports" },
];

export function MobileBottomNav({ onProfile }: { onProfile: () => void }) {
  const { t } = useI18n();
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
            <span className="truncate">{t.tKey ? "" : ""}{useI18nLabel(t.tKey)}</span>
          </Link>
        );
      })}
      <button
        onClick={onProfile}
        className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
        aria-label={t("navProfile")}
      >
        <UserIcon className="h-5 w-5" />
        <span>{t("navProfile")}</span>
      </button>
    </nav>
  );
}
