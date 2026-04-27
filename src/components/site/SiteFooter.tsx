import { Link } from "@/lib/router";
import { useI18n } from "@/lib/i18n";
import { ArrowLeft } from "lucide-react";

export function SiteFooter() {
  const { t, lang } = useI18n();
  return (
    <footer className="border-t bg-secondary/30">
      <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground md:flex-row">
        <div className="flex flex-col items-center gap-2 md:items-start">
          <Link to="/" className="inline-flex items-center gap-1 font-semibold text-foreground hover:text-primary">
            <ArrowLeft className="h-3.5 w-3.5" />
            {lang === "bn" ? `${t("appName")} হোমে ফিরুন` : `Back to ${t("appName")}`}
          </Link>
          <p>© {new Date().getFullYear()} {t("appName")}. {lang === "bn" ? "সর্বস্বত্ব সংরক্ষিত।" : "All rights reserved."}</p>
        </div>
        <div className="flex flex-wrap gap-4">
          <a href="/#features" className="hover:text-foreground">{t("features")}</a>
          <a href="/#pricing" className="hover:text-foreground">{t("pricing")}</a>
          <a href="/#contact" className="hover:text-foreground">{t("contact")}</a>
          <Link to="/auth" className="hover:text-foreground">{t("login")}</Link>
        </div>
      </div>
    </footer>
  );
}