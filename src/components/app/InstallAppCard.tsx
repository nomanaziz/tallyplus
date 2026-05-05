import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Smartphone, X } from "lucide-react";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { toast } from "sonner";

const DISMISS_KEY = "tallyplus:install-card-dismissed";
const DISMISS_DAYS = 7;

function isDismissed(): boolean {
  try {
    const v = localStorage.getItem(DISMISS_KEY);
    if (!v) return false;
    const t = Number(v);
    if (!Number.isFinite(t)) return false;
    return Date.now() - t < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

/**
 * Soft, dismissible card encouraging users to install the PWA so the app
 * keeps working offline.
 */
export function InstallAppCard() {
  const pwa = usePwaInstall();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(isDismissed());
  }, []);

  if (pwa.installed || dismissed) return null;

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  const handleInstall = async () => {
    if (pwa.canInstall) {
      const outcome = await pwa.promptInstall();
      if (outcome === "accepted") {
        toast.success("✓ অ্যাপ install শুরু হয়েছে");
      }
      return;
    }
    if (pwa.isIos) {
      toast.message("Safari-তে: Share বাটন → 'Add to Home Screen'", {
        duration: 6000,
      });
      return;
    }
    if (pwa.isDesktop) {
      toast.message("Chrome/Edge: Address bar-এর Install icon ক্লিক করুন", {
        description: "অথবা মেনু (⋮) → 'Install Tally Plus'",
        duration: 6000,
      });
      return;
    }
    toast.message("ব্রাউজার মেনু থেকে 'Add to Home Screen' / 'Install app' বেছে নিন", {
      duration: 6000,
    });
  };

  return (
    <Card className="relative overflow-hidden border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4">
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute right-2 top-2 rounded p-1 text-muted-foreground hover:bg-muted"
        aria-label="বন্ধ করুন"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-primary text-primary-foreground shadow">
          <Smartphone className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold">অফলাইনেও কাজ করতে অ্যাপ install করুন</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            ইন্টারনেট না থাকলেও cached ডেটা দেখা যাবে এবং ব্যক্তিগত হিসাব / ফর্দ যোগ করা যাবে — পরে auto-sync হবে।
          </p>
          <div className="mt-3">
            <Button size="sm" onClick={handleInstall}>
              <Download className="mr-1 h-4 w-4" /> এখনই Install করুন
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}