import { useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { isTourCompleted, startTour } from "@/lib/tour";

/**
 * Auto-starts the onboarding tour for first-time users.
 * Mounted once inside AppLayout. Safe no-op for returning users.
 */
export function AppTour() {
  const { lang, t } = useI18n();
  useEffect(() => {
    if (isTourCompleted()) return;
    // Wait a tick so sidebar items are mounted in the DOM.
    const id = window.setTimeout(() => {
      const tourLang = t("p7_en");
      startTour(tourLang);
    }, 800);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}