/**
 * Idle-time route preloading.
 * After the app is interactive, quietly fetch heavy route chunks in the
 * background so navigation feels instant. Uses requestIdleCallback when
 * available, otherwise falls back to a delayed setTimeout.
 *
 * IMPORTANT: keep the import paths in sync with src/lib/app-routes.tsx —
 * they MUST match exactly so Vite reuses the same lazy chunk instead of
 * downloading a duplicate.
 */

type Importer = () => Promise<unknown>;

// Most-used authenticated routes — preload these first.
const HIGH_PRIORITY: Importer[] = [
  () => import("@/pages/app/AppLayout"),
  () => import("@/pages/app/Dashboard"),
  () => import("@/pages/app/Sell"),
  () => import("@/pages/app/Products"),
  () => import("@/pages/app/Contacts"),
];

// Secondary — common but not critical.
const LOW_PRIORITY: Importer[] = [
  () => import("@/pages/app/Cashbox"),
  () => import("@/pages/app/Reports"),
  () => import("@/pages/app/Purchase"),
  () => import("@/pages/app/SalesLedger"),
  () => import("@/pages/app/QuickOrder"),
];

function runWhenIdle(fn: () => void, timeout = 2000) {
  if (typeof window === "undefined") return;
  const ric = (window as unknown as {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void;
  }).requestIdleCallback;
  if (typeof ric === "function") ric(fn, { timeout });
  else setTimeout(fn, 1500);
}

function chain(importers: Importer[]) {
  // Sequential to avoid network contention with the visible page.
  let p: Promise<unknown> = Promise.resolve();
  for (const imp of importers) {
    p = p.then(() => imp().catch(() => undefined));
  }
  return p;
}

let started = false;
export function startRoutePreloading() {
  if (started) return;
  started = true;
  runWhenIdle(() => {
    chain(HIGH_PRIORITY).then(() => runWhenIdle(() => chain(LOW_PRIORITY), 4000));
  });
}