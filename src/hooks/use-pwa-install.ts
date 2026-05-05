import { useEffect, useState, useCallback } from "react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function detectBrowser(): "chrome" | "edge" | "brave" | "safari" | "firefox" | "samsung" | "other" {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return "edge";
  if ((navigator as any).brave?.isBrave) return "brave";
  if (/SamsungBrowser/.test(ua)) return "samsung";
  if (/Firefox|FxiOS/.test(ua)) return "firefox";
  if (/Chrome\//.test(ua) && !/Edg\//.test(ua) && !/OPR\//.test(ua)) return "chrome";
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return "safari";
  return "other";
}

export function usePwaInstall() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [bipFired, setBipFired] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Detect already installed
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // iOS Safari
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) setInstalled(true);

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setBipFired(true);
      // Helpful diagnostic so we can confirm in the user's console
      // whether Chrome surfaced the install prompt at all.
      // eslint-disable-next-line no-console
      console.info("[pwa] beforeinstallprompt fired — native install available");
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      // eslint-disable-next-line no-console
      console.info("[pwa] appinstalled");
    };
    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferred) return "unavailable" as const;
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      setDeferred(null);
      return choice.outcome;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("[pwa] prompt() failed", err);
      setDeferred(null);
      return "unavailable" as const;
    }
  }, [deferred]);

  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isIos = /iphone|ipad|ipod/i.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  const browser = detectBrowser();
  const isDesktop =
    typeof navigator !== "undefined" && !/Mobi|Android|iPhone|iPad|iPod/i.test(ua);

  return {
    canInstall: !!deferred,
    installed,
    isIos,
    browser,
    isDesktop,
    /** beforeinstallprompt actually fired this session */
    bipFired,
    promptInstall,
  };
}
