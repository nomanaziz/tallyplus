import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";

export function SiteHeader() {
  const { t, lang, setLang } = useI18n();
  const { user } = useAuth();
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/85 backdrop-blur">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="Tally Plus" width={32} height={32} className="h-8 w-8" />
          <span className="text-lg font-extrabold tracking-tight">{t("appName")}</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          <Link to="/" activeProps={{ className: "text-primary font-semibold" }} className="hover:text-primary">{t("home")}</Link>
          <a href="/#features" className="hover:text-primary">{t("features")}</a>
          <a href="/#pricing" className="hover:text-primary">{t("pricing")}</a>
          <a href="/#contact" className="hover:text-primary">{t("contact")}</a>
        </nav>
        <div className="flex items-center gap-2">
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