import { get, set, del, keys, createStore } from "idb-keyval";
import { supabase } from "@/integrations/supabase/client";
import { recordConflict } from "./conflictLog";

export type QueueOp = "insert" | "update" | "delete";
export type QueuedMutation = {
  id: string;
  table: string;
  op: QueueOp;
  /**
   * For insert: the row payload.
   * For delete: a record with the eq filters (e.g. { id: "..." }).
   * For update: shape `{ set: {...fields}, match: {...filters} }`.
   */
  payload: Record<string, unknown>;
  /** For delete: which column(s) to match. Defaults to ["id"]. */
  matchOn?: string[];
  createdAt: number;
  retryCount: number;
  lastError?: string;
};

const store = createStore("tallyplus-offline", "mutations");
const QUEUE_EVENT = "tallyplus:queue-changed";

function emit() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(QUEUE_EVENT));
  }
}

export function onQueueChange(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener(QUEUE_EVENT, handler);
  return () => window.removeEventListener(QUEUE_EVENT, handler);
}

export async function enqueueMutation(
  m: Omit<QueuedMutation, "id" | "createdAt" | "retryCount">,
): Promise<QueuedMutation> {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const item: QueuedMutation = {
    id,
    createdAt: Date.now(),
    retryCount: 0,
    ...m,
  };
  await set(id, item, store);
  emit();
  return item;
}

export async function getQueueSize(): Promise<number> {
  try {
    const ks = await keys(store);
    return ks.length;
  } catch {
    return 0;
  }
}

export async function getAllPending(): Promise<QueuedMutation[]> {
  const ks = await keys(store);
  const items: QueuedMutation[] = [];
  for (const k of ks) {
    const v = await get<QueuedMutation>(k as string, store);
    if (v) items.push(v);
  }
  return items.sort((a, b) => a.createdAt - b.createdAt);
}

let flushing = false;

function isNetworkError(msg: string): boolean {
  return (
    /network|fetch|failed to fetch|load failed|timeout|networkerror/i.test(msg) ||
    msg === ""
  );
}

/** Try to push every queued mutation to Supabase. Stops on first auth/network failure. */
export async function flushQueue(): Promise<{ pushed: number; remaining: number; failed: number; conflicts: number }> {
  if (flushing) return { pushed: 0, remaining: await getQueueSize(), failed: 0, conflicts: 0 };
  flushing = true;
  let pushed = 0;
  let failed = 0;
  let conflicts = 0;
  try {
    const items = await getAllPending();
    for (const item of items) {
      try {
        if (item.op === "insert") {
          const { error } = await supabase.from(item.table as never).insert(item.payload as never);
          if (error) throw error;
        } else if (item.op === "update") {
          const set = (item.payload as { set?: Record<string, unknown> }).set ?? {};
          const match = (item.payload as { match?: Record<string, unknown> }).match ?? {};
          let q = supabase.from(item.table as never).update(set as never);
          for (const c of Object.keys(match)) {
            q = q.eq(c, match[c] as never);
          }
          const { error } = await q;
          if (error) throw error;
        } else if (item.op === "delete") {
          const cols = item.matchOn ?? ["id"];
          let q = supabase.from(item.table as never).delete();
          for (const c of cols) {
            q = q.eq(c, (item.payload as Record<string, unknown>)[c] as never);
          }
          const { error } = await q;
          if (error) throw error;
        }
        await del(item.id, store);
        pushed++;
      } catch (e) {
        const msg = (e as Error).message ?? "";
        if (isNetworkError(msg)) {
          // Transient — keep in queue, stop to preserve order, retry later
          item.retryCount++;
          item.lastError = msg;
          await set(item.id, item, store);
          failed++;
          break;
        }
        // Server rejected (RLS / constraint / 409) — move to conflict log so
        // the rest of the queue can proceed.
        await recordConflict({ ...item, lastError: msg }, msg || "server rejected");
        await del(item.id, store);
        conflicts++;
      }
    }
  } finally {
    flushing = false;
    emit();
  }
  return { pushed, remaining: await getQueueSize(), failed, conflicts };
}

/** Drop a queued mutation manually (e.g. user dismissed it). */
export async function dropMutation(id: string) {
  await del(id, store);
  emit();
}