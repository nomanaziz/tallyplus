import { Link } from "@/lib/router";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ColorThemeButton } from "@/components/app/ColorThemePicker";
import logo from "@/assets/logo.png";

export function SiteHeader() {
  const { t, lang, setLang } = useI18n();
  const { user } = useAuth();
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/85 backdrop-blur">
      <div className="container mx-auto flex h-20 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-3">
          <img src={logo} alt="Tally Plus" width={64} height={64} className="h-14 w-14 md:h-16 md:w-16 object-contain" />
          <span className="text-2xl md:text-3xl font-extrabold leading-none tracking-tight">{t("appName")}</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          <Link to="/" activeProps={{ className: "text-primary font-semibold" }} className="hover:text-primary">{t("home")}</Link>
          <Link to="/shop" activeProps={{ className: "text-primary font-semibold" }} className="hover:text-primary">{lang === "bn" ? "মার্কেটপ্লেস" : "Marketplace"}</Link>
          <a href="/#features" className="hover:text-primary">{t("features")}</a>
          <a href="/#pricing" className="hover:text-primary">{t("pricing")}</a>
          <a href="/#contact" className="hover:text-primary">{t("contact")}</a>
        </nav>
        <div className="flex items-center gap-2">
          <ColorThemeButton className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-accent" />
          <button
            onClick={() => setLang(lang === "bn" ? "en" : "bn")}
            className="rounded-md border px-2 py-1 text-xs font-semibold hover:bg-accent"
            aria-label="Toggle language"
          >
            {lang === "bn" ? "EN" : "বাং"}
          </button>
          {user ? (
            <Button asChild size="sm"><Link to="/app">{t("dashboard")}</Link></Button>
          ) : (
            <Button asChild size="sm"><Link to="/auth">{t("login")}</Link></Button>
          )}
        </div>
      </div>
    </header>
  );
}