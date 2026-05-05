// Minimal service worker — required for desktop browsers to show the
// "install app" icon in the address bar. We do NOT cache anything to avoid
// serving stale content; every request is a passthrough to the network.
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Clean up any old caches from previous SW versions
      const names = await caches.keys();
      await Promise.all(names.map((n) => caches.delete(n)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  // Network-only passthrough — required to satisfy installability criteria
  // without introducing a cache that could serve stale builds.
  event.respondWith(fetch(event.request).catch(() => Response.error()));
});