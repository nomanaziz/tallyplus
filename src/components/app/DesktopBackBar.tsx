import { useMemo } from "react";
import { useLocation, useNavigate, useRouter, Link } from "@/lib/router";
import { ArrowLeft, ChevronLeft, ChevronRight, Home } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { SECTIONS } from "./AppSidebar";

// Desktop-only breadcrumb + prev/next navigator shown on every /app/* page
// except the dashboard. Lets users step back/forward through the sidebar
// items of the current section.
export function DesktopBackBar() {
  const loc = useLocation();
  const nav = useNavigate();
  const router = useRouter();
  const { t } = useI18n();

  const ctx = useMemo(() => {
    for (const s of SECTIONS) {
      const idx = s.items.findIndex((it) => loc.pathname === it.to || loc.pathname.startsWith(it.to + "/"));
      if (idx >= 0) return { section: s, idx, item: s.items[idx] };
    }
    return null;
  }, [loc.pathname]);

  if (loc.pathname === "/app/dashboard" || loc.pathname === "/app" || loc.pathname === "/app/") return null;

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) router.history.back();
    else nav({ to: "/app/dashboard" });
  };

  const prev = ctx && ctx.idx > 0 ? ctx.section.items[ctx.idx - 1] : null;
  const next = ctx && ctx.idx < ctx.section.items.length - 1 ? ctx.section.items[ctx.idx + 1] : null;

  return (
    <div className="sticky top-14 z-20 hidden h-10 items-center gap-1 border-b bg-background/95 px-3 backdrop-blur md:flex">
      <button
        onClick={goBack}
        className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-accent"
        aria-label={t("back")}
        title={t("back")}
      >
        <ArrowLeft className="h-4 w-4" />
      </button>
      <Link
        to="/app/dashboard"
        className="flex h-8 items-center gap-1 rounded-full px-2 text-xs font-medium text-muted-foreground hover:bg-accent"
        title={t("nav_dashboard")}
      >
        <Home className="h-3.5 w-3.5" />
      </Link>
      {ctx && (
        <div className="ml-1 flex min-w-0 items-center gap-1 text-xs">
          <span className="text-muted-foreground">/</span>
          <span className="truncate text-muted-foreground">{t(ctx.section.tKey)}</span>
          <span className="text-muted-foreground">/</span>
          <span className="truncate font-semibold text-foreground">{t(ctx.item.tKey)}</span>
        </div>
      )}
      <div className="ml-auto flex items-center gap-1">
        {prev ? (
          <Link
            to={prev.to as never}
            className="flex h-8 items-center gap-1 rounded-full border px-2 text-xs font-medium hover:bg-accent"
            title={t(prev.tKey)}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span className="max-w-32 truncate">{t(prev.tKey)}</span>
          </Link>
        ) : (
          <span className="h-8" />
        )}
        {next ? (
          <Link
            to={next.to as never}
            className="flex h-8 items-center gap-1 rounded-full border px-2 text-xs font-medium hover:bg-accent"
            title={t(next.tKey)}
          >
            <span className="max-w-32 truncate">{t(next.tKey)}</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}