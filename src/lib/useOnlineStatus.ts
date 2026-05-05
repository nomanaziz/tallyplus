import { useEffect, useState } from "react";

/**
 * Reactive online/offline state. Listens to navigator events and falls back
 * to a periodic probe when offline so we can detect a returning network
 * even if the OS event was missed.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    let probe: number | undefined;
    if (!navigator.onLine) {
      probe = window.setInterval(() => {
        if (navigator.onLine) {
          setOnline(true);
          if (probe) window.clearInterval(probe);
        }
      }, 4000);
    }
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      if (probe) window.clearInterval(probe);
    };
  }, []);

  return online;
}