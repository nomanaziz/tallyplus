// Offline-capable service worker for Tally Plus.
//
// Strategy:
//   - HTML navigations: NetworkFirst with offline fallback to cached index.html
//   - Built JS/CSS chunks (immutable hashed assets): CacheFirst
//   - Icons, manifest, font/image assets: StaleWhileRevalidate
//   - Supabase REST GET requests: NetworkFirst (cache used as offline fallback)
//   - Everything else: passthrough to network
//
// Cache names include a version stamp so deploys can invalidate old caches.

const VERSION = "v3";
const HTML_CACHE = `tp-html-${VERSION}`;
const ASSET_CACHE = `tp-assets-${VERSION}`;
const STATIC_CACHE = `tp-static-${VERSION}`;
const API_CACHE = `tp-api-${VERSION}`;

const APP_SHELL = ["/", "/index.html", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(HTML_CACHE);
        await cache.addAll(APP_SHELL);
      } catch {
        /* tolerate missing files in dev */
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((n) => ![HTML_CACHE, ASSET_CACHE, STATIC_CACHE, API_CACHE].includes(n))
          .map((n) => caches.delete(n)),
      );
      await self.clients.claim();
    })(),
  );
});

function isHashedAsset(url) {
  return /\/assets\/.+\.[a-f0-9]{6,}\.(?:js|css|woff2?|ttf|otf)$/i.test(url.pathname);
}

function isStaticAsset(url) {
  return (
    /\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|otf)$/i.test(url.pathname) ||
    url.pathname === "/manifest.webmanifest"
  );
}

function isSupabaseRest(url) {
  return /\.supabase\.co$/.test(url.hostname) && url.pathname.startsWith("/rest/");
}

async function networkFirst(request, cacheName, opts) {
  const cache = await caches.open(cacheName);
  const timeoutMs = opts?.timeoutMs ?? 5000;
  try {
    const networkPromise = fetch(request);
    const res = await Promise.race([
      networkPromise,
      new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), timeoutMs)),
    ]);
    if (res && res.ok && (request.method === "GET")) {
      cache.put(request, res.clone()).catch(() => {});
    }
    return res;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (opts?.fallback) return opts.fallback();
    throw new Error("offline");
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res && res.ok) cache.put(request, res.clone()).catch(() => {});
  return res;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then((res) => {
      if (res && res.ok) cache.put(request, res.clone()).catch(() => {});
      return res;
    })
    .catch(() => cached);
  return cached || fetchPromise;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return; // POST/PATCH/DELETE: passthrough (handled by app's offline queue)

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }

  // Navigation requests → NetworkFirst with offline fallback to cached shell
  if (req.mode === "navigate") {
    event.respondWith(
      networkFirst(req, HTML_CACHE, {
        timeoutMs: 4000,
        fallback: async () => {
          const cache = await caches.open(HTML_CACHE);
          const shell = (await cache.match("/index.html")) || (await cache.match("/"));
          return (
            shell ||
            new Response(
              "<h1>Offline</h1><p>ইন্টারনেট নেই — কোনো cached version পাওয়া যায়নি।</p>",
              { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
            )
          );
        },
      }),
    );
    return;
  }

  // Same-origin hashed build assets → CacheFirst (immutable)
  if (url.origin === self.location.origin && isHashedAsset(url)) {
    event.respondWith(cacheFirst(req, ASSET_CACHE));
    return;
  }

  // Static assets (icons, fonts, manifest) → SWR
  if (url.origin === self.location.origin && isStaticAsset(url)) {
    event.respondWith(staleWhileRevalidate(req, STATIC_CACHE));
    return;
  }

  // Supabase REST GETs → NetworkFirst, cache as offline fallback
  if (isSupabaseRest(url)) {
    event.respondWith(networkFirst(req, API_CACHE, { timeoutMs: 6000 }));
    return;
  }

  // Everything else: passthrough
});