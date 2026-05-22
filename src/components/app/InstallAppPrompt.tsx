import { useEffect, useState } from "react";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Download, Share, X, Plus, MonitorDown, Info } from "lucide-react";
import { toast } from "sonner";

const DISMISS_KEY = "pwa-install-dismissed-at";
const HIDE_DAYS = 7;
const SHOW_DELAY_MS = 8000;

type DesktopGuidance = {
  open: boolean;
  reason: "no-bip" | "unsupported";
};

export function InstallAppPrompt() {
  const { lang, t } = useI18n();
  const pwa = usePwaInstall();
  const [show, setShow] = useState(false);
  const [iosOpen, setIosOpen] = useState(false);
  const [desktop, setDesktop] = useState<DesktopGuidance>({ open: false, reason: "no-bip" });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (pwa.installed) return;
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (Date.now() - dismissedAt < HIDE_DAYS * 86400_000) return;
    const t = setTimeout(() => setShow(true), SHOW_DELAY_MS);
    return () => clearTimeout(t);
  }, [pwa.canInstall, pwa.installed, pwa.isIos]);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShow(false);
  };

  const onInstall = async () => {
    if (pwa.canInstall) {
      const outcome = await pwa.promptInstall();
      if (outcome === "accepted") {
        toast.success(t("p7_Installing"));
      }
      setShow(false);
      return;
    }
    if (pwa.isIos) { setIosOpen(true); return; }
    setDesktop({ open: true, reason: pwa.browser === "firefox" ? "unsupported" : "no-bip" });
  };

  if (pwa.installed) return null;

  return (
    <>
      {show && (
        <div
          className="fixed inset-x-3 bottom-20 z-50 mx-auto flex max-w-md items-center gap-3 rounded-xl border bg-card p-3 shadow-xl md:bottom-6"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-primary/10">
            <Download className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold">
              {t("p7_Install_the_app")}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {t("p7_Add_to_home_screen_in_one_tap")}
            </div>
          </div>
          <Button size="sm" onClick={onInstall} className="flex-none">
            {t("p7_Install")}
          </Button>
          <button
            onClick={dismiss}
            aria-label="Close"
            className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <Dialog open={iosOpen} onOpenChange={setIosOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("p7_Install_on_iPhone")}</DialogTitle>
            <DialogDescription>
              {t("p7_Follow_these_steps_in_Safari")}
            </DialogDescription>
          </DialogHeader>
          <ol className="space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <Share className="mt-0.5 h-5 w-5 flex-none text-primary" />
              <span>{t("p7_Tap_the_Share_button_at_the_bo")}</span>
            </li>
            <li className="flex items-start gap-2">
              <Plus className="mt-0.5 h-5 w-5 flex-none text-primary" />
              <span>{t("p7_Choose_Add_to_Home_Screen")}</span>
            </li>
          </ol>
        </DialogContent>
      </Dialog>
      <DesktopInstallDialog
        open={desktop.open}
        onOpenChange={(v) => setDesktop({ ...desktop, open: v })}
        reason={desktop.reason}
        browser={pwa.browser}
      />
    </>
  );
}

export function InstallAppButton({ className }: { className?: string }) {
  const { lang, t } = useI18n();
  const pwa = usePwaInstall();
  const [iosOpen, setIosOpen] = useState(false);
  const [desktop, setDesktop] = useState<DesktopGuidance>({ open: false, reason: "no-bip" });

  if (pwa.installed) return null;

  const onClick = async () => {
    if (pwa.canInstall) {
      const outcome = await pwa.promptInstall();
      if (outcome === "accepted") {
        toast.success(t("p7_Installing"));
      }
      return;
    }
    if (pwa.isIos) { setIosOpen(true); return; }
    setDesktop({ open: true, reason: pwa.browser === "firefox" ? "unsupported" : "no-bip" });
  };

  return (
    <>
      <button
        onClick={onClick}
        type="button"
        aria-label={t("p7_Install_app")}
        title={t("p7_Install_app")}
        className={className ?? "flex h-9 items-center gap-1.5 rounded-full px-2 text-sm font-medium text-muted-foreground hover:bg-accent"}
      >
        <Download className="h-4 w-4" />
        <span className="inline md:inline">{t("p7_Install_app")}</span>
      </button>
      <Dialog open={iosOpen} onOpenChange={setIosOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("p7_Install_on_iPhone")}</DialogTitle>
            <DialogDescription>
              {t("p7_Follow_these_steps_in_Safari")}
            </DialogDescription>
          </DialogHeader>
          <ol className="space-y-3 text-sm">
            <li className="flex items-start gap-2"><Share className="mt-0.5 h-5 w-5 flex-none text-primary" /><span>{t("p7_Tap_the_Share_button_at_the_bo")}</span></li>
            <li className="flex items-start gap-2"><Plus className="mt-0.5 h-5 w-5 flex-none text-primary" /><span>{t("p7_Choose_Add_to_Home_Screen")}</span></li>
          </ol>
        </DialogContent>
      </Dialog>
      <DesktopInstallDialog
        open={desktop.open}
        onOpenChange={(v) => setDesktop({ ...desktop, open: v })}
        reason={desktop.reason}
        browser={pwa.browser}
      />
    </>
  );
}

function DesktopInstallDialog({
  open,
  onOpenChange,
  reason,
  browser,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  reason: "no-bip" | "unsupported";
  browser: ReturnType<typeof usePwaInstall>["browser"];
}) {
  const { lang, t } = useI18n();
  const isFirefox = browser === "firefox" || reason === "unsupported";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MonitorDown className="h-5 w-5 text-primary" />
            {t("p7_Install_on_Desktop")}
          </DialogTitle>
          <DialogDescription>
            {t("p7_Follow_the_steps_for_your_brow")}
          </DialogDescription>
        </DialogHeader>

        {isFirefox ? (
          <div className="space-y-3 text-sm">
            <div className="rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
              {t("p7_Firefox_does_not_support_insta")}
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-sm">
            <div className="rounded-lg border bg-muted/40 p-3 text-[13px]">
              <div className="mb-1 flex items-center gap-1.5 font-bold">
                <Info className="h-4 w-4 text-primary" />
                {t("p7_Why_is_the_install_icon_not_sh")}
              </div>
              <p className="text-muted-foreground">
                {t("p7_Chrome_only_shows_the_address_")}
              </p>
            </div>

            <div>
              <div className="font-bold">{t("p7_Method_1_From_the_browser_menu")}</div>
              <ol className="ml-5 mt-1 list-decimal space-y-1 text-muted-foreground">
                <li>{lang === "bn" ? "ডান-উপরের ⋮ (তিন ডট) মেনুতে ক্লিক করুন" : 'Click the ⋮ (three-dot) menu at the top right'}</li>
                <li>
                  {lang === "bn"
                    ? <>সিলেক্ট করুন <strong>Cast, save, and share → Install page as app</strong>{" "}<span className="opacity-70">(Chrome 128+)</span>{" "}<br />অথবা <strong>Apps → Install this site</strong>{" "}/<strong> Install Tally Plus…</strong></>
                    : <>Choose <strong>Cast, save, and share → Install page as app</strong>{" "}<span className="opacity-70">(Chrome 128+)</span>{" "}<br />or <strong>Apps → Install this site</strong>{" "}/<strong> Install Tally Plus…</strong></>}
                </li>
                <li>{lang === "bn" ? "\"Install\" বাটনে ক্লিক করুন" : 'Click "Install"'}</li>
              </ol>
            </div>

            <div>
              <div className="font-bold">{t("p7_Method_2_Address_bar_icon")}</div>
              <ol className="ml-5 mt-1 list-decimal space-y-1 text-muted-foreground">
                <li>
                  {t("p7_Look_for_a_small_monitor_downl")}
                </li>
                <li>{lang === "bn" ? "আইকনে ক্লিক → \"Install\"" : 'Click the icon → "Install"'}</li>
                <li className="text-[12px] opacity-80">
                  {t("p7_If_you_don_t_see_the_icon_scro")}
                </li>
              </ol>
            </div>

            <div>
              <div className="font-bold">Safari (Mac)</div>
              <ol className="ml-5 mt-1 list-decimal space-y-1 text-muted-foreground">
                <li>{lang === "bn" ? "File মেনু → \"Add to Dock\" সিলেক্ট করুন" : 'File menu → "Add to Dock"'}</li>
              </ol>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
