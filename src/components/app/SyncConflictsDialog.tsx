import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, Trash2, RefreshCw } from "lucide-react";
import {
  getAllConflicts,
  dropConflict,
  clearAllConflicts,
  onConflictsChange,
  type ConflictEntry,
} from "@/lib/conflictLog";
import { enqueueMutation, flushQueue } from "@/lib/offlineQueue";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

/**
 * Step 4 — Conflict review UI.
 * Shows mutations that the server rejected (RLS / constraint / 409 etc.)
 * so the user can retry or drop them.
 */
export function SyncConflictsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { lang } = useI18n();
  const tr = (bn: string, en: string) => (lang === "bn" ? bn : en);
  const [items, setItems] = useState<ConflictEntry[]>([]);

  const refresh = () => void getAllConflicts().then(setItems);

  useEffect(() => {
    if (!open) return;
    refresh();
    return onConflictsChange(refresh);
  }, [open]);

  const retry = async (item: ConflictEntry) => {
    await dropConflict(item.id);
    await enqueueMutation({
      table: item.table,
      op: item.op,
      payload: item.payload,
      matchOn: item.matchOn,
    });
    const res = await flushQueue();
    if (res.pushed > 0) toast.success(tr("Sync হয়েছে ✓", "Synced ✓"));
    else if (res.conflicts > 0) toast.error(tr("আবার ব্যর্থ হয়েছে", "Failed again"));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            {tr("Sync সমস্যা", "Sync conflicts")}
            <Badge variant="secondary">{items.length}</Badge>
          </DialogTitle>
          <DialogDescription>
            {tr(
              "নিচের পরিবর্তনগুলো server গ্রহণ করেনি। আবার চেষ্টা করুন বা বাদ দিন।",
              "These changes were rejected by the server. Retry or drop them.",
            )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {tr("কোনো conflict নেই ✓", "No conflicts ✓")}
            </p>
          ) : (
            <ul className="space-y-2">
              {items.map((it) => (
                <li
                  key={it.id}
                  className="rounded-lg border bg-card p-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="uppercase">
                        {it.op}
                      </Badge>
                      <span className="font-mono text-xs">{it.table}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(it.conflictedAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-destructive">{it.reason}</p>
                  <pre className="mt-2 max-h-24 overflow-auto rounded bg-muted p-2 text-[10px] leading-tight">
                    {JSON.stringify(it.payload, null, 2)}
                  </pre>
                  <div className="mt-2 flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => retry(it)}
                    >
                      <RefreshCw className="mr-1 h-3 w-3" />
                      {tr("আবার চেষ্টা", "Retry")}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void dropConflict(it.id)}
                    >
                      <Trash2 className="mr-1 h-3 w-3" />
                      {tr("বাদ দিন", "Drop")}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>

        {items.length > 0 && (
          <DialogFooter>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => void clearAllConflicts()}
            >
              {tr("সব বাদ দিন", "Drop all")}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}