// Auto-discovered prefetch map.
// We use Vite's import.meta.glob so that adding/removing a page file under
// src/pages can NEVER break the build with "Could not resolve" errors here —
// this file no longer hard-codes paths.

type Importer = () => Promise<unknown>;

// Glob all page modules at build time. Keys look like "/src/pages/app/Sell.tsx".
const PAGE_MODULES = import.meta.glob("../pages/**/*.{ts,tsx}") as Record<string, Importer>;

// Convert a file path like "/src/pages/app/online-shop/Sell.tsx" into a URL
// path like "/app/online-shop/sell". Capitalised filenames map to lowercase
// URL segments, "Index" maps to the parent path.
function fileToUrlPath(file: string): string | null {
  const m = file.match(/\/pages\/(.+)\.(tsx?|ts)$/);
  if (!m) return null;
  const parts = m[1].split("/");
  const last = parts[parts.length - 1];
  // Drop "Index" — it represents the parent path.
  if (last === "Index") parts.pop();
  const segs = parts.map((p) => p.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase());
  const url = "/" + segs.join("/");
  return url === "/" ? "/" : url.replace(/\/+$/, "");
}

// Build a flat lookup of url -> importer for the leaf page.
const URL_TO_IMPORTER: Record<string, Importer> = {};
for (const [file, importer] of Object.entries(PAGE_MODULES)) {
  const url = fileToUrlPath(file);
  if (!url) continue;
  URL_TO_IMPORTER[url] = importer;
}

// Public alias kept for any older callers expecting ROUTE_IMPORTERS.
export const ROUTE_IMPORTERS: Record<string, Importer[]> = Object.fromEntries(
  Object.entries(URL_TO_IMPORTER).map(([k, v]) => [k, [v]]),
);

// Strip query/hash and any trailing slash to canonicalize.
function canonical(path: string): string {
  let p = path.split("?")[0].split("#")[0];
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  return p || "/";
}

// Match a concrete URL against route patterns containing :param segments.
function matchPattern(pattern: string, url: string): boolean {
  const p = pattern.split("/").filter(Boolean);
  const u = url.split("/").filter(Boolean);
  if (p.length !== u.length) return false;
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(":")) continue;
    if (p[i] !== u[i]) return false;
  }
  return true;
}

// Track URLs we already kicked off so repeated hovers do not spam imports.
const started = new Set<string>();

export function prefetchRoute(rawPath: string): void {
  if (!rawPath || typeof rawPath !== "string") return;
  const url = canonical(rawPath);
  if (started.has(url)) return;
  // exact hit
  let importers = ROUTE_IMPORTERS[url];
  if (!importers) {
    // pattern match (e.g. /shop/p/:id)
    for (const pat of Object.keys(ROUTE_IMPORTERS)) {
      if (pat.includes(":") && matchPattern(pat, url)) { importers = ROUTE_IMPORTERS[pat]; break; }
    }
  }
  if (!importers) return;
  started.add(url);
  for (const fn of importers) { try { void fn(); } catch { /* ignore */ } }
}
