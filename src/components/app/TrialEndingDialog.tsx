import { useEffect, useState } from "react";
import { Link } from "@/lib/router";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertTriangle, Sparkles } from "lucide-react";

/**
 * One-popup-per-day reminder during the warn window before trial ends, plus
 * a one-time popup the moment it expires (auto-converts to Free silently).
 */
const KEY_WARN = "trial_popup_warn_on";
const KEY_EXPIRED = "trial_popup_expired_seen";

export function TrialEndingDialog() {
  const { lang, t } = useI18n();
  const { loading, isTrial, isExpired, isExpiringSoon, daysLeft } = useSubscriptionStatus();
  const [open, setOpen] = useState(false);
  const [variant, setVariant] = useState<"warn" | "expired">("warn");

  useEffect(() => {
    if (loading) return;
    const today = new Date().toISOString().slice(0, 10);
    try {
      if (isExpired) {
        if (localStorage.getItem(KEY_EXPIRED) !== "1") {
          setVariant("expired");
          setOpen(true);
          localStorage.setItem(KEY_EXPIRED, "1");
        }
        return;
      }
      if (isTrial && isExpiringSoon) {
        if (localStorage.getItem(KEY_WARN) !== today) {
          setVariant("warn");
          setOpen(true);
          localStorage.setItem(KEY_WARN, today);
        }
      }
    } catch { /* ignore storage errors */ }
  }, [loading, isTrial, isExpired, isExpiringSoon]);

  if (loading) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {variant === "expired" ? (
              <>
                <AlertTriangle className="h-5 w-5 text-destructive" />
                {t("p7_Free_trial_ended")}
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 text-amber-600" />
                {t("p7_Your_trial_is_ending_soon")}
              </>
            )}
          </DialogTitle>
          <DialogDescription className="pt-2 text-sm leading-relaxed">
            {variant === "expired"
              ? (t("p7_Your_free_trial_has_ended_You_"))
              : (lang === "bn"
                  ? `আপনার ফ্রি ট্রায়াল আর মাত্র ${daysLeft} দিন বাকি। মেয়াদ শেষ হলে আপনি automatic Free প্ল্যানে চলে যাবেন। সব ফিচার চালু রাখতে এখনই subscribe করুন।`
                  : `Your free trial ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}. After that you will be moved to the Free plan automatically. Subscribe now to keep all features.`)}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t("p7_Later")}
          </Button>
          <Button asChild>
            <Link to="/app/subscribe" onClick={() => setOpen(false)}>
              {t("p7_View_plans")}
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default TrialEndingDialog;