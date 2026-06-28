import { get, set, del, keys, createStore } from "idb-keyval";
import type { QueuedMutation } from "./offlineQueue";

/**
 * Step 4 — Conflict log.
 *
 * When `flushQueue` fails with a non-network error (RLS denial, unique
 * constraint, server validation, 409 conflict, etc.), the mutation is moved
 * here so it stops blocking the rest of the queue. The user can then review,
 * retry, or drop each conflict from the UI.
 */

export type ConflictEntry = QueuedMutation & {
  conflictedAt: number;
  reason: string;
};

const store = createStore("tallyplus-offline", "conflicts");
const EVENT = "tallyplus:conflicts-changed";

function emit() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT));
  }
}

export function onConflictsChange(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const h = () => cb();
  window.addEventListener(EVENT, h);
  return () => window.removeEventListener(EVENT, h);
}

export async function recordConflict(m: QueuedMutation, reason: string): Promise<void> {
  const entry: ConflictEntry = { ...m, conflictedAt: Date.now(), reason };
  await set(m.id, entry, store);
  emit();
}

export async function getConflictCount(): Promise<number> {
  try {
    const ks = await keys(store);
    return ks.length;
  } catch {
    return 0;
  }
}

export async function getAllConflicts(): Promise<ConflictEntry[]> {
  const ks = await keys(store);
  const items: ConflictEntry[] = [];
  for (const k of ks) {
    const v = await get<ConflictEntry>(k as string, store);
    if (v) items.push(v);
  }
  return items.sort((a, b) => b.conflictedAt - a.conflictedAt);
}

export async function dropConflict(id: string): Promise<void> {
  await del(id, store);
  emit();
}

export async function clearAllConflicts(): Promise<void> {
  const ks = await keys(store);
  for (const k of ks) await del(k as string, store);
  emit();
}