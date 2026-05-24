/**
 * Offline-first wrapper for the Supabase JS client.
 *
 * Installed once at module init via `installOfflineLayer(client)`. After
 * installation, every `supabase.from(table).insert/update/delete/upsert(...)`
 * call automatically:
 *
 *   - When ONLINE: passes through to the real client unchanged.
 *   - When OFFLINE (or the network write fails with a transport error):
 *       1. Records the mutation into the persistent offline queue
 *          (see `src/lib/offlineQueue.ts`) so it auto-syncs on reconnect.
 *       2. Optimistically returns a synthetic success result so the calling
 *          code (toast, list update, navigation) keeps working.
 *       3. For `.insert(...).select().single()` style chains, synthesises a
 *          row using `crypto.randomUUID()` for `id` plus the payload, so the
 *          UI can immediately render the new row.
 *
 * Reads (`.select(...)`) are NOT intercepted here — they continue to use the
 * existing `cachedQuery` / `cacheQueryFn` helpers and the service-worker
 * Supabase REST cache.
 */
import { enqueueMutation } from "./offlineQueue";
import { toast } from "sonner";

type AnyRecord = Record<string, unknown>;
type Filter = { col: string; val: unknown; op: "eq" | "in" | "is" };

function isOnline(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

function isNetworkError(e: unknown): boolean {
  const msg = (e as Error)?.message ?? "";
  return (
    /network|fetch|failed to fetch|load failed|timeout|networkerror/i.test(msg) ||
    msg === ""
  );
}

function newId(): string {
  try {
    return (globalThis.crypto as { randomUUID?: () => string })?.randomUUID?.() ?? `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  } catch {
    return `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

function offlineToast() {
  toast.message("ইন্টারনেট নেই — পরিবর্তন offline-এ সংরক্ষণ হয়েছে", {
    description: "ইন্টারনেট ফিরলে cloud-এ auto-sync হবে",
    id: "offline-write", // dedupe burst writes
  });
}

/**
 * Wraps a write builder (insert / update / delete / upsert) so it remains a
 * fully-chainable PostgrestFilterBuilder while also tracking filters and
 * intercepting the final await.
 */
function wrapWriteBuilder(args: {
  table: string;
  op: "insert" | "update" | "delete" | "upsert";
  /** For insert/upsert: the rows. For update: the SET values. For delete: undefined. */
  payload: unknown;
  realBuilder: PromiseLike<unknown> & AnyRecord;
  /** Whether `returning` was requested (i.e. .select() appeared in the chain). */
  wantsReturn?: boolean;
}): PromiseLike<unknown> & AnyRecord {
  const filters: Filter[] = [];
  let wantsReturn = args.wantsReturn ?? false;
  let wantsSingle = false;
  let wantsMaybeSingle = false;
  let real = args.realBuilder;

  const handler: ProxyHandler<typeof real> = {
    get(target, prop) {
      // Final await/then — run the offline-aware resolver
      if (prop === "then") {
        return (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
          resolveWrite({
            table: args.table,
            op: args.op,
            payload: args.payload,
            filters,
            wantsReturn,
            wantsSingle,
            wantsMaybeSingle,
            realBuilder: target,
          }).then(resolve, reject);
      }

      const orig = (target as AnyRecord)[prop as string];

      // Track chain methods so we can replay filters offline
      if (typeof orig === "function") {
        return (...callArgs: unknown[]) => {
          // Track filter calls
          if (prop === "eq" || prop === "is") {
            filters.push({ col: callArgs[0] as string, val: callArgs[1], op: prop });
          } else if (prop === "in") {
            filters.push({ col: callArgs[0] as string, val: callArgs[1], op: "in" });
          } else if (prop === "match") {
            const m = (callArgs[0] ?? {}) as AnyRecord;
            for (const k of Object.keys(m)) {
              filters.push({ col: k, val: m[k], op: "eq" });
            }
          } else if (prop === "select") {
            wantsReturn = true;
          } else if (prop === "single") {
            wantsSingle = true;
          } else if (prop === "maybeSingle") {
            wantsMaybeSingle = true;
          }

          const next = (orig as (...a: unknown[]) => unknown).apply(target, callArgs);
          // Most chain calls return the same/next builder — keep wrapping
          if (next && typeof next === "object") {
            real = next as typeof real;
            return new Proxy(real, handler);
          }
          return next;
        };
      }

      return orig;
    },
  };

  return new Proxy(real, handler) as PromiseLike<unknown> & AnyRecord;
}

async function resolveWrite(ctx: {
  table: string;
  op: "insert" | "update" | "delete" | "upsert";
  payload: unknown;
  filters: Filter[];
  wantsReturn: boolean;
  wantsSingle: boolean;
  wantsMaybeSingle: boolean;
  realBuilder: PromiseLike<unknown>;
}): Promise<{ data: unknown; error: unknown; count?: number | null; status?: number }> {
  const online = isOnline();

  if (online) {
    try {
      const res = (await ctx.realBuilder) as {
        data: unknown;
        error: unknown;
        count?: number | null;
        status?: number;
      };
      // If supabase returned a non-network error, propagate as-is
      if (res?.error && isNetworkError(res.error)) {
        // fall through to queue
      } else {
        return res;
      }
    } catch (e) {
      if (!isNetworkError(e)) throw e;
      // fall through to queue
    }
  }

  // ===== Offline / network-failed path: enqueue + synthesise result =====
  return queueAndSynthesise(ctx);
}

async function queueAndSynthesise(ctx: {
  table: string;
  op: "insert" | "update" | "delete" | "upsert";
  payload: unknown;
  filters: Filter[];
  wantsReturn: boolean;
  wantsSingle: boolean;
  wantsMaybeSingle: boolean;
}): Promise<{ data: unknown; error: null; count: null; status: 200 }> {
  const match: AnyRecord = {};
  const matchOn: string[] = [];
  for (const f of ctx.filters) {
    if (f.op === "eq" || f.op === "is") {
      match[f.col] = f.val;
      matchOn.push(f.col);
    }
    // .in() filters are not safely replayable as eq — skip; queue handler
    // will still apply available eq matches, which is correct for the common
    // `.update().eq("id", x)` and `.delete().eq("id", x)` patterns.
  }

  let synthData: unknown = null;

  if (ctx.op === "insert" || ctx.op === "upsert") {
    const rows = Array.isArray(ctx.payload) ? ctx.payload : [ctx.payload];
    const enriched = rows.map((r) => {
      const row = { ...(r as AnyRecord) };
      if (row.id == null) row.id = newId();
      if (row.created_at == null) row.created_at = new Date().toISOString();
      return row;
    });
    // Queue each row separately so the server-side insert payload matches
    for (const r of enriched) {
      await enqueueMutation({
        table: ctx.table,
        op: "insert", // upsert offline → treat as insert; conflict resolves on flush
        payload: r,
      });
    }
    if (ctx.wantsReturn) {
      synthData = ctx.wantsSingle || ctx.wantsMaybeSingle ? enriched[0] : enriched;
    }
  } else if (ctx.op === "update") {
    await enqueueMutation({
      table: ctx.table,
      op: "update",
      payload: { set: ctx.payload as AnyRecord, match },
    });
    if (ctx.wantsReturn) {
      const merged = { ...match, ...(ctx.payload as AnyRecord) };
      synthData = ctx.wantsSingle || ctx.wantsMaybeSingle ? merged : [merged];
    }
  } else if (ctx.op === "delete") {
    await enqueueMutation({
      table: ctx.table,
      op: "delete",
      payload: match,
      matchOn: matchOn.length ? matchOn : ["id"],
    });
  }

  offlineToast();

  return { data: synthData, error: null, count: null, status: 200 };
}

/**
 * Install the offline layer on a Supabase client. Idempotent.
 */
export function installOfflineLayer<T extends { from: (table: string) => unknown }>(client: T): T {
  const installed = (client as unknown as { __offlineInstalled?: boolean }).__offlineInstalled;
  if (installed) return client;
  (client as unknown as { __offlineInstalled?: boolean }).__offlineInstalled = true;

  const realFrom = client.from.bind(client);

  (client as unknown as { from: (t: string) => unknown }).from = (table: string) => {
    const qb = realFrom(table) as AnyRecord;
    return new Proxy(qb, {
      get(target, prop) {
        const orig = (target as AnyRecord)[prop as string];
        if (prop === "insert" || prop === "upsert") {
          return (payload: unknown, opts?: unknown) => {
            const real = (orig as (...a: unknown[]) => unknown).call(target, payload, opts) as PromiseLike<unknown> & AnyRecord;
            return wrapWriteBuilder({
              table,
              op: prop as "insert" | "upsert",
              payload,
              realBuilder: real,
            });
          };
        }
        if (prop === "update") {
          return (values: unknown, opts?: unknown) => {
            const real = (orig as (...a: unknown[]) => unknown).call(target, values, opts) as PromiseLike<unknown> & AnyRecord;
            return wrapWriteBuilder({
              table,
              op: "update",
              payload: values,
              realBuilder: real,
            });
          };
        }
        if (prop === "delete") {
          return (opts?: unknown) => {
            const real = (orig as (...a: unknown[]) => unknown).call(target, opts) as PromiseLike<unknown> & AnyRecord;
            return wrapWriteBuilder({
              table,
              op: "delete",
              payload: undefined,
              realBuilder: real,
            });
          };
        }
        // .select() / .rpc() etc. pass through unchanged
        return typeof orig === "function" ? (orig as (...a: unknown[]) => unknown).bind(target) : orig;
      },
    });
  };

  return client;
}