import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";

export function SiteFooter() {
  const { t, lang } = useI18n();
  return (
    <footer className="border-t bg-secondary/30">
      <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground md:flex-row">
        <p>© {new Date().getFullYear()} {t("appName")}. {lang === "bn" ? "সর্বস্বত্ব সংরক্ষিত।" : "All rights reserved."}</p>
        <div className="flex gap-4">
          <Link to="/pricing" className="hover:text-foreground">{t("pricing")}</Link>
          <Link to="/auth" className="hover:text-foreground">{t("login")}</Link>
        </div>
      </div>
    </footer>
  );
}