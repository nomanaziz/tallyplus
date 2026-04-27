import { Link } from "@/lib/router";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Menu, Store, Home as HomeIcon, ScrollText } from "lucide-react";
import logo from "@/assets/logo.png";

export function SiteHeader() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const marketLabel = lang === "bn" ? "মার্কেটপ্লেস" : "Marketplace";
  const fordoLabel = lang === "bn" ? "ফর্দ" : "Fordo";
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/85 backdrop-blur">
      <div className="container mx-auto flex h-16 md:h-20 items-center justify-between px-3 md:px-4 gap-2">
        <Link to="/" className="flex items-center gap-2 md:gap-3 min-w-0">
          <img src={logo} alt="Tally Plus" width={40} height={40} className="h-7 w-7 md:h-10 md:w-10 object-contain flex-none" />
          <span className="text-lg md:text-3xl font-extrabold leading-none tracking-tight truncate">{t("appName")}</span>
        </Link>
        <nav className="hidden items-center gap-1 text-sm font-medium md:flex">
          <Link
            to="/"
            activeProps={{ className: "bg-primary/10 text-primary" }}
            className="inline-flex items-center gap-2 rounded-full px-3 py-2 hover:bg-accent"
          >
            <HomeIcon className="h-4 w-4" />
            <span>{t("home")}</span>
          </Link>
          <Link
            to="/shop"
            activeProps={{ className: "bg-primary/10 text-primary" }}
            className="inline-flex items-center gap-2 rounded-full px-3 py-2 hover:bg-accent"
          >
            <Store className="h-4 w-4" />
            <span>{marketLabel}</span>
          </Link>
          <Link
            to="/customer/my-fordo"
            activeProps={{ className: "bg-primary/10 text-primary" }}
            className="inline-flex items-center gap-2 rounded-full px-3 py-2 hover:bg-accent"
          >
            <ScrollText className="h-4 w-4" />
            <span>{fordoLabel}</span>
          </Link>
        </nav>
        <div className="flex items-center gap-1.5 md:gap-2">
          {user ? (
            <Button asChild size="sm" className="hidden md:inline-flex"><Link to="/app">{t("dashboard")}</Link></Button>
          ) : (
            <Button asChild size="sm" className="hidden md:inline-flex"><Link to="/auth">{t("login")}</Link></Button>
          )}

          {/* Mobile hamburger */}
          <Sheet>
            <SheetTrigger asChild>
              <button
                className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-md border hover:bg-accent"
                aria-label={lang === "bn" ? "মেনু" : "Menu"}
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-0 flex flex-col">
              <SheetHeader className="border-b px-4 py-3 text-left">
                <SheetTitle className="flex items-center gap-2">
                  <img src={logo} alt="" className="h-7 w-7 object-contain" />
                  <span>{t("appName")}</span>
                </SheetTitle>
              </SheetHeader>
              <nav className="flex-1 overflow-y-auto p-3 space-y-1 text-sm font-medium">
                <SheetClose asChild>
                  <Link to="/" className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-accent">
                    <HomeIcon className="h-4 w-4 text-primary" />
                    <span>{t("home")}</span>
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    to="/shop"
                    className="flex items-center gap-3 rounded-md border border-primary/30 bg-primary/5 px-3 py-2.5 text-primary hover:bg-primary/10"
                  >
                    <Store className="h-4 w-4" />
                    <span className="font-semibold">{marketLabel}</span>
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    to="/customer/my-fordo"
                    className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-accent"
                  >
                    <ScrollText className="h-4 w-4 text-primary" />
                    <span>{fordoLabel}</span>
                  </Link>
                </SheetClose>
              </nav>
              <div className="border-t p-3">
                <SheetClose asChild>
                  {user ? (
                    <Button asChild className="w-full"><Link to="/app">{t("dashboard")}</Link></Button>
                  ) : (
                    <Button asChild className="w-full"><Link to="/auth">{t("login")}</Link></Button>
                  )}
                </SheetClose>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}