import { Link } from "@/lib/router";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ColorThemeButton } from "@/components/app/ColorThemePicker";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Menu, Store, Home as HomeIcon, Sparkles, Tag, Phone } from "lucide-react";
import logo from "@/assets/logo.png";

export function SiteHeader() {
  const { t, lang, setLang } = useI18n();
  const { user } = useAuth();
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/85 backdrop-blur">
      <div className="container mx-auto flex h-16 md:h-20 items-center justify-between px-3 md:px-4 gap-2">
        <Link to="/" className="flex items-center gap-2 md:gap-3 min-w-0">
          <img src={logo} alt="Tally Plus" width={64} height={64} className="h-10 w-10 md:h-16 md:w-16 object-contain flex-none" />
          <span className="text-lg md:text-3xl font-extrabold leading-none tracking-tight truncate">{t("appName")}</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          <Link to="/" activeProps={{ className: "text-primary font-semibold" }} className="hover:text-primary">{t("home")}</Link>
          <Link to="/shop" activeProps={{ className: "text-primary font-semibold" }} className="hover:text-primary">{lang === "bn" ? "মার্কেটপ্লেস" : "Marketplace"}</Link>
          <a href="/#features" className="hover:text-primary">{t("features")}</a>
          <a href="/#pricing" className="hover:text-primary">{t("pricing")}</a>
          <a href="/#contact" className="hover:text-primary">{t("contact")}</a>
        </nav>
        <div className="flex items-center gap-1.5 md:gap-2">
          {/* Mobile-only marketplace shortcut */}
          <Button
            asChild
            size="sm"
            variant="outline"
            className="md:hidden h-9 px-2.5 gap-1.5"
          >
            <Link to="/shop" aria-label={lang === "bn" ? "মার্কেটপ্লেস" : "Marketplace"}>
              <Store className="h-4 w-4" />
              <span className="text-xs font-semibold">{lang === "bn" ? "মার্কেট" : "Market"}</span>
            </Link>
          </Button>
          <ColorThemeButton className="hidden md:flex h-8 w-8 items-center justify-center rounded-full hover:bg-accent" />
          <button
            onClick={() => setLang(lang === "bn" ? "en" : "bn")}
            className="hidden md:inline-block rounded-md border px-2 py-1 text-xs font-semibold hover:bg-accent"
            aria-label="Toggle language"
          >
            {lang === "bn" ? "EN" : "বাং"}
          </button>
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
                    <HomeIcon className="h-4 w-4 text-muted-foreground" />
                    <span>{t("home")}</span>
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    to="/shop"
                    className="flex items-center gap-3 rounded-md border border-primary/30 bg-primary/5 px-3 py-2.5 text-primary hover:bg-primary/10"
                  >
                    <Store className="h-4 w-4" />
                    <span className="font-semibold">{lang === "bn" ? "মার্কেটপ্লেস" : "Marketplace"}</span>
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <a href="/#features" className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-accent">
                    <Sparkles className="h-4 w-4 text-muted-foreground" />
                    <span>{t("features")}</span>
                  </a>
                </SheetClose>
                <SheetClose asChild>
                  <a href="/#pricing" className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-accent">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <span>{t("pricing")}</span>
                  </a>
                </SheetClose>
                <SheetClose asChild>
                  <a href="/#contact" className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-accent">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{t("contact")}</span>
                  </a>
                </SheetClose>
              </nav>
              <div className="border-t p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <ColorThemeButton className="flex h-9 w-9 items-center justify-center rounded-full border hover:bg-accent" />
                  <button
                    onClick={() => setLang(lang === "bn" ? "en" : "bn")}
                    className="rounded-md border px-3 py-1.5 text-xs font-semibold hover:bg-accent"
                  >
                    {lang === "bn" ? "English" : "বাংলা"}
                  </button>
                </div>
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