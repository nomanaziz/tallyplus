import { get, set, createStore } from "idb-keyval";

/**
 * Shop-scoped read cache. Used by offline-first pages to render from
 * IndexedDB while offline, and to refresh-on-online.
 *
 * Pattern:
 *   const rows = await cachedQuery(`${shopId}:bottle_types`, () =>
 *     supabase.from("bottle_types").select("*").eq("shop_id", shopId)
 *   );
 */

const store = createStore("tallyplus-offline", "read-cache");

type CacheEntry<T> = {
  data: T;
  savedAt: number;
};

export type CachedQueryResult<T> = {
  data: T;
  fromCache: boolean;
  savedAt: number | null;
};

const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function isOnline(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

/**
 * Read-through cache. Tries network when online; falls back to cache on any
 * failure. When offline, returns cache immediately without hitting the network.
 */
export async function cachedQuery<T>(
  key: string,
  fetcher: () => Promise<{ data: T | null; error: unknown }>,
): Promise<CachedQueryResult<T>> {
  const cached = await get<CacheEntry<T>>(key, store).catch(() => undefined);

  if (!isOnline()) {
    return {
      data: (cached?.data ?? ([] as unknown as T)),
      fromCache: true,
      savedAt: cached?.savedAt ?? null,
    };
  }

  try {
    const res = await fetcher();
    if (res.error) throw res.error;
    const data = (res.data ?? ([] as unknown as T)) as T;
    await set(key, { data, savedAt: Date.now() }, store).catch(() => {});
    return { data, fromCache: false, savedAt: Date.now() };
  } catch {
    return {
      data: (cached?.data ?? ([] as unknown as T)),
      fromCache: true,
      savedAt: cached?.savedAt ?? null,
    };
  }
}

export async function readCache<T>(key: string): Promise<T | null> {
  const e = await get<CacheEntry<T>>(key, store).catch(() => undefined);
  if (!e) return null;
  if (Date.now() - e.savedAt > TTL_MS) return null;
  return e.data;
}

export async function writeCache<T>(key: string, data: T): Promise<void> {
  await set(key, { data, savedAt: Date.now() }, store).catch(() => {});
}