import { Link } from "@/lib/router";
import { useI18n } from "@/lib/i18n";
import { ArrowLeft, Languages } from "lucide-react";
import { ColorThemeButton } from "@/components/app/ColorThemePicker";

export function SiteFooter() {
  const { t, lang, setLang } = useI18n();
  return (
    <footer className="border-t bg-secondary/30">
      <div className="container mx-auto flex flex-col items-center justify-between gap-6 px-4 py-8 text-sm text-muted-foreground md:flex-row">
        <div className="flex flex-col items-center gap-2 md:items-start">
          <Link to="/" className="inline-flex items-center gap-1 font-semibold text-foreground hover:text-primary">
            <ArrowLeft className="h-3.5 w-3.5" />
            {lang === "bn" ? `${t("appName")} হোমে ফিরুন` : `Back to ${t("appName")}`}
          </Link>
          <p>© {new Date().getFullYear()} {t("appName")}. {lang === "bn" ? "সর্বস্বত্ব সংরক্ষিত।" : "All rights reserved."}</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          <a href="/#features" className="hover:text-foreground">{t("features")}</a>
          <a href="/#pricing" className="hover:text-foreground">{t("pricing")}</a>
          <a href="/#contact" className="hover:text-foreground">{t("contact")}</a>
          <Link to="/privacy" className="hover:text-foreground">
            {lang === "bn" ? "প্রাইভেসি পলিসি" : "Privacy Policy"}
          </Link>
          <Link to="/terms" className="hover:text-foreground">
            {lang === "bn" ? "শর্তাবলী" : "Terms & Conditions"}
          </Link>
          <Link to="/auth" className="hover:text-foreground">{t("login")}</Link>
          <span className="hidden h-4 w-px bg-border md:inline-block" />
          <ColorThemeButton
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border hover:bg-accent hover:text-foreground"
          />
          <button
            type="button"
            onClick={() => setLang(lang === "bn" ? "en" : "bn")}
            className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold hover:bg-accent hover:text-foreground"
            aria-label="Toggle language"
          >
            <Languages className="h-3.5 w-3.5" />
            {lang === "bn" ? "English" : "বাংলা"}
          </button>
        </div>
      </div>
    </footer>
  );
}