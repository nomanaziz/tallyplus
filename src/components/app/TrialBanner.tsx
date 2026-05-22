import { useEffect, useState } from "react";
import { Link } from "@/lib/router";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Sparkles, X } from "lucide-react";

const DISMISS_KEY = "trial_banner_dismissed_on";

export function TrialBanner() {
  const { t } = useI18n();
  const { loading, isTrial, isExpired, daysLeft, isExpiringSoon } = useSubscriptionStatus();
  const [dismissedToday, setDismissedToday] = useState(false);

  useEffect(() => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      setDismissedToday(localStorage.getItem(DISMISS_KEY) === today);
    } catch { /* ignore */ }
  }, []);

  if (loading) return null;
  // Hide nothing-special states (paid plan, no banner needed)
  if (!isTrial && !isExpired) return null;

  // Expired → always show (red) until they subscribe
  if (isExpired) {
    return (
      <div className="border-b border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="font-medium">
              {t("trialEnded")}
            </span>
          </div>
          <Button asChild size="sm" variant="destructive">
            <Link to="/app/subscribe">{t("subscribeNow")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Trial active — urgent (≤ warn days)
  if (isExpiringSoon) {
    return (
      <div className="border-b border-amber-300/60 bg-amber-50 px-4 py-2.5 text-sm dark:border-amber-700/60 dark:bg-amber-950/40">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="font-medium">
              {t("trialDaysLeft", { n: daysLeft ?? 0 })}
            </span>
          </div>
          <Button asChild size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
            <Link to="/app/subscribe">{t("subscribeNow")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Normal trial — small dismissible green pill
  if (dismissedToday) return null;
  return (
    <div className="border-b border-emerald-300/60 bg-emerald-50 px-4 py-2 text-sm dark:border-emerald-800/60 dark:bg-emerald-950/30">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200">
          <Sparkles className="h-4 w-4 shrink-0" />
          <span>
            {t("trialActive", { n: daysLeft ?? 0 })}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button asChild size="sm" variant="outline" className="border-emerald-600 text-emerald-700 hover:bg-emerald-100 dark:text-emerald-200">
            <Link to="/app/subscribe">{t("viewPlans")}</Link>
          </Button>
          <button
            type="button"
            aria-label="Dismiss"
            className="rounded p-1 text-emerald-700 hover:bg-emerald-100 dark:text-emerald-200 dark:hover:bg-emerald-900/40"
            onClick={() => {
              try {
                localStorage.setItem(DISMISS_KEY, new Date().toISOString().slice(0, 10));
              } catch { /* ignore */ }
              setDismissedToday(true);
            }}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default TrialBanner;