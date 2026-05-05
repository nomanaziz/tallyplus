import { useEffect, useRef, useState } from "react";
import { WifiOff, RefreshCw, CheckCircle2 } from "lucide-react";
import { useOnlineStatus } from "@/lib/useOnlineStatus";
import { flushQueue, getQueueSize, onQueueChange } from "@/lib/offlineQueue";
import { toast } from "sonner";

/**
 * Slim top banner: shows offline state and pending-sync state. Mounted once
 * globally in main.tsx.
 */
export function OfflineBanner() {
  const online = useOnlineStatus();
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const wasOfflineRef = useRef(false);

  // Track queue size
  useEffect(() => {
    void getQueueSize().then(setPending);
    return onQueueChange(() => {
      void getQueueSize().then(setPending);
    });
  }, []);

  // When coming back online, flush
  useEffect(() => {
    if (!online) {
      wasOfflineRef.current = true;
      return;
    }
    if (wasOfflineRef.current || pending > 0) {
      void (async () => {
        const size = await getQueueSize();
        if (size === 0) {
          wasOfflineRef.current = false;
          return;
        }
        setSyncing(true);
        const res = await flushQueue();
        setSyncing(false);
        if (res.pushed > 0 && res.failed === 0) {
          toast.success(`✓ ${res.pushed} টি offline পরিবর্তন cloud-এ সংরক্ষণ হয়েছে`);
        } else if (res.failed > 0) {
          toast.error("কিছু পরিবর্তন sync হয়নি — পরে আবার চেষ্টা হবে");
        }
        wasOfflineRef.current = false;
      })();
    }
  }, [online, pending]);

  if (online && pending === 0 && !syncing) return null;

  let bg = "bg-amber-500";
  let icon = <WifiOff className="h-4 w-4" />;
  let text = "ইন্টারনেট নেই — offline mode চলছে";

  if (online && (syncing || pending > 0)) {
    bg = "bg-sky-600";
    icon = <RefreshCw className="h-4 w-4 animate-spin" />;
    text = `${pending} টি পরিবর্তন cloud-এ sync হচ্ছে...`;
  }

  if (!online && pending > 0) {
    text = `ইন্টারনেট নেই — ${pending} টি পরিবর্তন offline-এ অপেক্ষমাণ`;
  }

  return (
    <div
      className={`fixed inset-x-0 top-0 z-[60] flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-semibold text-white shadow ${bg}`}
      role="status"
      aria-live="polite"
    >
      {icon}
      <span>{text}</span>
      {online && pending === 0 && !syncing && <CheckCircle2 className="h-4 w-4" />}
    </div>
  );
}