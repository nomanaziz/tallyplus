import { useEffect, useState } from "react";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Download, Share, X, Plus } from "lucide-react";

const DISMISS_KEY = "pwa-install-dismissed-at";
const HIDE_DAYS = 7;
const SHOW_DELAY_MS = 8000;

export function InstallAppPrompt() {
  const { lang } = useI18n();
  const { canInstall, installed, isIos, promptInstall } = usePwaInstall();
  const [show, setShow] = useState(false);
  const [iosOpen, setIosOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (installed) return;
    if (!canInstall && !isIos) return;
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (Date.now() - dismissedAt < HIDE_DAYS * 86400_000) return;
    const t = setTimeout(() => setShow(true), SHOW_DELAY_MS);
    return () => clearTimeout(t);
  }, [canInstall, installed, isIos]);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShow(false);
  };

  const onInstall = async () => {
    if (isIos && !canInstall) {
      setIosOpen(true);
      return;
    }
    await promptInstall();
    setShow(false);
  };

  if (installed) return null;

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
    </>
  );
}

export function InstallAppButton({ className }: { className?: string }) {
  const { lang } = useI18n();
  const { canInstall, installed, isIos, promptInstall } = usePwaInstall();
  const [iosOpen, setIosOpen] = useState(false);

  if (installed) return null;
  if (!canInstall && !isIos) return null;

  const onClick = async () => {
    if (isIos && !canInstall) { setIosOpen(true); return; }
    await promptInstall();
  };

  return (
    <>
      <button
        onClick={onClick}
        className={className ?? "flex h-9 items-center gap-1.5 rounded-full px-2 text-sm font-medium text-muted-foreground hover:bg-accent"}
      >
        <Download className="h-4 w-4" />
        <span className="hidden md:inline">{lang === "bn" ? "অ্যাপ ইনস্টল" : "Install app"}</span>
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
    </>
  );
}
