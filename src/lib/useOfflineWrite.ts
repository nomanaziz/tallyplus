import { supabase } from "@/integrations/supabase/client";
import { enqueueMutation, type QueueOp } from "./offlineQueue";
import { toast } from "sonner";

/**
 * Try to write to Supabase. If the device is offline OR the write fails with
 * a network error, queue it for later sync.
 *
 * Returns `{ queued: true }` when stored offline, otherwise `{ queued: false, data }`.
 */
export async function writeWithOffline(args: {
  table: string;
  op: QueueOp;
  payload: Record<string, unknown>;
  matchOn?: string[];
  /** Toast shown to the user when queued (offline). */
  offlineMessage?: string;
}): Promise<{ queued: boolean; data?: unknown; error?: string }> {
  const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

  if (isOnline) {
    try {
      if (args.op === "insert") {
        const { data, error } = await supabase
          .from(args.table as never)
          .insert(args.payload as never)
          .select();
        if (error) throw error;
        return { queued: false, data };
      } else {
        const cols = args.matchOn ?? ["id"];
        let q = supabase.from(args.table as never).delete();
        for (const c of cols) {
          q = q.eq(c, (args.payload as Record<string, unknown>)[c] as never);
        }
        const { error } = await q;
        if (error) throw error;
        return { queued: false };
      }
    } catch (e) {
      const msg = (e as Error).message ?? "";
      // Network-style failure → fall through to queue
      if (
        /network|fetch|failed to fetch|load failed|timeout/i.test(msg) ||
        msg === ""
      ) {
        // queue below
      } else {
        return { queued: false, error: msg };
      }
    }
  }

  await enqueueMutation({
    table: args.table,
    op: args.op,
    payload: args.payload,
    matchOn: args.matchOn,
  });
  toast.message(
    args.offlineMessage ?? "ইন্টারনেট নেই — পরিবর্তন offline-এ সংরক্ষণ হয়েছে",
    { description: "ইন্টারনেট ফিরলে cloud-এ auto-sync হবে" },
  );
  return { queued: true };
}