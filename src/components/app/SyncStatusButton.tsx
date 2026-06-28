import { useEffect, useState } from "react";
import { Wifi, WifiOff, RefreshCw, Check, AlertTriangle } from "lucide-react";
import { useOnlineStatus } from "@/lib/useOnlineStatus";
import { flushQueue, getQueueSize, onQueueChange } from "@/lib/offlineQueue";
import { getConflictCount, onConflictsChange } from "@/lib/conflictLog";
import { SyncConflictsDialog } from "./SyncConflictsDialog";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Header sync indicator (reference: lpghisab.com).
 *  - green wifi      : online, nothing pending
 *  - orange + badge  : pending mutations (offline or unsynced)
 *  - blue spinning   : actively flushing
 *  - gray crossed    : offline, no queue
 * Click to force a sync flush.
 */
export function SyncStatusButton() {
  const online = useOnlineStatus();
  const { lang } = useI18n();
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [conflicts, setConflicts] = useState(0);
  const [conflictOpen, setConflictOpen] = useState(false);

  const tr = (bn: string, en: string) => (lang === "bn" ? bn : en);

  useEffect(() => {
    void getQueueSize().then(setPending);
    return onQueueChange(() => {
      void getQueueSize().then(setPending);
    });
  }, []);

  useEffect(() => {
    void getConflictCount().then(setConflicts);
    return onConflictsChange(() => {
      void getConflictCount().then(setConflicts);
    });
  }, []);

  const handleClick = async () => {
    if (conflicts > 0) {
      setConflictOpen(true);
      return;
    }
    if (syncing) return;
    if (!online) {
      toast.message(tr("ইন্টারনেট নেই", "No internet"), {
        description: tr(
          "অনলাইনে এলে স্বয়ংক্রিয়ভাবে sync হবে",
          "Will sync automatically when back online",
        ),
      });
      return;
    }
    if (pending === 0) {
      toast.success(tr("সব sync হয়ে আছে ✓", "Everything is in sync ✓"));
      return;
    }
    setSyncing(true);
    const res = await flushQueue();
    setSyncing(false);
    if (res.pushed > 0 && res.failed === 0) {
      toast.success(
        tr(
          `${res.pushed} টি পরিবর্তন cloud-এ সংরক্ষণ হয়েছে`,
          `${res.pushed} changes saved to cloud`,
        ),
      );
    } else if (res.failed > 0) {
      toast.error(
        tr("কিছু পরিবর্তন sync হয়নি — পরে আবার চেষ্টা হবে", "Some changes failed to sync — will retry"),
      );
    }
    if (res.conflicts > 0) {
      toast.error(
        tr(
          `${res.conflicts} টি conflict — review করুন`,
          `${res.conflicts} conflict${res.conflicts === 1 ? "" : "s"} — review`,
        ),
      );
      setConflictOpen(true);
    }
  };

  // Decide colors / icon
  let icon = <Wifi className="h-4 w-4" />;
  let ringClass = "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40";
  let label = tr("সব sync হয়ে আছে", "All synced");

  if (conflicts > 0) {
    icon = <AlertTriangle className="h-4 w-4" />;
    ringClass = "text-red-600 bg-red-50 dark:bg-red-950/40";
    label = tr(`${conflicts} টি sync conflict`, `${conflicts} sync conflict${conflicts === 1 ? "" : "s"}`);
  } else if (syncing) {
    icon = <RefreshCw className="h-4 w-4 animate-spin" />;
    ringClass = "text-sky-600 bg-sky-50 dark:bg-sky-950/40";
    label = tr("Sync হচ্ছে...", "Syncing...");
  } else if (pending > 0) {
    icon = <Wifi className="h-4 w-4" />;
    ringClass = "text-orange-600 bg-orange-50 dark:bg-orange-950/40";
    label = tr(
      `${pending} টি পরিবর্তন sync বাকি`,
      `${pending} change${pending === 1 ? "" : "s"} pending sync`,
    );
  } else if (!online) {
    icon = <WifiOff className="h-4 w-4" />;
    ringClass = "text-muted-foreground bg-muted";
    label = tr("অফলাইন — সব ঠিক আছে", "Offline — all clear");
  }

  return (
    <>
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={handleClick}
            aria-label={label}
            className={`relative inline-flex h-9 w-9 items-center justify-center rounded-full transition hover:brightness-95 ${ringClass}`}
          >
            {icon}
            {(conflicts > 0 || (pending > 0 && !syncing)) && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-600 px-1 text-[10px] font-bold leading-none text-white shadow">
                {(conflicts || pending) > 9 ? "9+" : (conflicts || pending)}
              </span>
            )}
            {!conflicts && !pending && online && !syncing && (
              <span className="absolute -right-0.5 -bottom-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-emerald-600 text-white shadow">
                <Check className="h-2 w-2" strokeWidth={4} />
              </span>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
    <SyncConflictsDialog open={conflictOpen} onOpenChange={setConflictOpen} />
    </>
  );
}