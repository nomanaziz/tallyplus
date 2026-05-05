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
  const { lang } = useI18n();
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
        toast.success(lang === "bn" ? "অ্যাপ ইনস্টল হচ্ছে…" : "Installing…");
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
              {lang === "bn" ? "অ্যাপ ইনস্টল করুন" : "Install the app"}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {lang === "bn" ? "এক ক্লিকে হোম স্ক্রিনে যোগ করুন" : "Add to home screen in one tap"}
            </div>
          </div>
          <Button size="sm" onClick={onInstall} className="flex-none">
            {lang === "bn" ? "ইনস্টল" : "Install"}
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
            <DialogTitle>{lang === "bn" ? "iPhone-এ ইনস্টল করুন" : "Install on iPhone"}</DialogTitle>
            <DialogDescription>
              {lang === "bn" ? "Safari ব্রাউজার থেকে নিচের ধাপগুলো অনুসরণ করুন" : "Follow these steps in Safari"}
            </DialogDescription>
          </DialogHeader>
          <ol className="space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <Share className="mt-0.5 h-5 w-5 flex-none text-primary" />
              <span>{lang === "bn" ? "নিচের Share বাটন ট্যাপ করুন" : "Tap the Share button at the bottom"}</span>
            </li>
            <li className="flex items-start gap-2">
              <Plus className="mt-0.5 h-5 w-5 flex-none text-primary" />
              <span>{lang === "bn" ? "“Add to Home Screen” সিলেক্ট করুন" : "Choose “Add to Home Screen”"}</span>
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
  const { lang } = useI18n();
  const pwa = usePwaInstall();
  const [iosOpen, setIosOpen] = useState(false);
  const [desktop, setDesktop] = useState<DesktopGuidance>({ open: false, reason: "no-bip" });

  if (pwa.installed) return null;

  const onClick = async () => {
    if (pwa.canInstall) {
      const outcome = await pwa.promptInstall();
      if (outcome === "accepted") {
        toast.success(lang === "bn" ? "অ্যাপ ইনস্টল হচ্ছে…" : "Installing…");
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
        aria-label={lang === "bn" ? "অ্যাপ ইনস্টল" : "Install app"}
        title={lang === "bn" ? "অ্যাপ ইনস্টল" : "Install app"}
        className={className ?? "flex h-9 items-center gap-1.5 rounded-full px-2 text-sm font-medium text-muted-foreground hover:bg-accent"}
      >
        <Download className="h-4 w-4" />
        <span className="inline md:inline">{lang === "bn" ? "অ্যাপ ইনস্টল" : "Install app"}</span>
      </button>
      <Dialog open={iosOpen} onOpenChange={setIosOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{lang === "bn" ? "iPhone-এ ইনস্টল করুন" : "Install on iPhone"}</DialogTitle>
            <DialogDescription>
              {lang === "bn" ? "Safari ব্রাউজার থেকে নিচের ধাপগুলো অনুসরণ করুন" : "Follow these steps in Safari"}
            </DialogDescription>
          </DialogHeader>
          <ol className="space-y-3 text-sm">
            <li className="flex items-start gap-2"><Share className="mt-0.5 h-5 w-5 flex-none text-primary" /><span>{lang === "bn" ? "নিচের Share বাটন ট্যাপ করুন" : "Tap the Share button at the bottom"}</span></li>
            <li className="flex items-start gap-2"><Plus className="mt-0.5 h-5 w-5 flex-none text-primary" /><span>{lang === "bn" ? "“Add to Home Screen” সিলেক্ট করুন" : "Choose “Add to Home Screen”"}</span></li>
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
  const { lang } = useI18n();
  const isFirefox = browser === "firefox" || reason === "unsupported";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MonitorDown className="h-5 w-5 text-primary" />
            {lang === "bn" ? "ডেস্কটপে ইনস্টল করুন" : "Install on Desktop"}
          </DialogTitle>
          <DialogDescription>
            {lang === "bn"
              ? "আপনার ব্রাউজার অনুযায়ী নিচের ধাপগুলো অনুসরণ করুন"
              : "Follow the steps for your browser"}
          </DialogDescription>
        </DialogHeader>

        {isFirefox ? (
          <div className="space-y-3 text-sm">
            <div className="rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
              {lang === "bn"
                ? "Firefox ডেস্কটপে PWA ইনস্টল সাপোর্ট করে না। দয়া করে Chrome / Edge / Brave দিয়ে এই পেজটি খুলে আবার চেষ্টা করুন।"
                : "Firefox does not support installing PWAs on desktop. Please open this page in Chrome / Edge / Brave and try again."}
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-sm">
            <div className="rounded-lg border bg-muted/40 p-3 text-[13px]">
              <div className="mb-1 flex items-center gap-1.5 font-bold">
                <Info className="h-4 w-4 text-primary" />
                {lang === "bn" ? "কেন \"Install\" আইকন এখনই দেখাচ্ছে না?" : "Why is the install icon not showing yet?"}
              </div>
              <p className="text-muted-foreground">
                {lang === "bn"
                  ? "Chrome কিছু সময় (১–২ মিনিট) সাইট ব্যবহার না হলে install আইকন দেখায় না। নিচের যেকোনো একটা পদ্ধতি কাজ করবে:"
                  : "Chrome only shows the address-bar install icon after a short engagement period. Either of the methods below will work right now:"}
              </p>
            </div>

            <div>
              <div className="font-bold">{lang === "bn" ? "পদ্ধতি ১ — মেনু থেকে (সবচেয়ে নিশ্চিত)" : "Method 1 — From the browser menu (most reliable)"}</div>
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
              <div className="font-bold">{lang === "bn" ? "পদ্ধতি ২ — অ্যাড্রেস বার আইকন" : "Method 2 — Address bar icon"}</div>
              <ol className="ml-5 mt-1 list-decimal space-y-1 text-muted-foreground">
                <li>
                  {lang === "bn"
                    ? "অ্যাড্রেস বারের ডান পাশে একটি ছোট মনিটর/ডাউনলোড আইকন দেখুন (⊕ বা ⤓)"
                    : "Look for a small monitor / download icon (⊕ or ⤓) on the right of the address bar"}
                </li>
                <li>{lang === "bn" ? "আইকনে ক্লিক → \"Install\"" : 'Click the icon → "Install"'}</li>
                <li className="text-[12px] opacity-80">
                  {lang === "bn"
                    ? "যদি আইকন না দেখায়: পেইজে কয়েক সেকেন্ড স্ক্রল/ক্লিক করুন, তারপর পেইজটি একবার রিলোড করুন।"
                    : "If you don't see the icon: scroll/click around for a few seconds, then reload the page."}
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
