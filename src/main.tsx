import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, useRoutes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nProvider } from "@/lib/i18n";
import { ThemeProvider } from "@/lib/theme";
import { AuthProvider } from "@/lib/auth";
import { RefCaptureProvider } from "@/lib/referral";
import { Toaster } from "@/components/ui/sonner";
import { InstallAppPrompt } from "@/components/app/InstallAppPrompt";
import { OfflineBanner } from "@/components/app/OfflineBanner";
import { appRoutes } from "@/lib/app-routes";
import { startRoutePreloading } from "@/lib/preload-routes";
import "@/styles.css";

// Register a minimal service worker so desktop browsers (Chrome, Edge) show
// the install icon in the address bar. The SW does no caching — every
// request is passed through to the network — which keeps preview builds
// fresh while still satisfying installability criteria.
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  const isInIframe = (() => {
    try { return window.self !== window.top; } catch { return true; }
  })();
  const host = window.location.hostname;
  const isPreviewHost = host.includes("id-preview--") || host.includes("lovableproject.com");

  if (isInIframe || isPreviewHost) {
    // Inside the Lovable editor preview iframe — make sure no SW is installed
    // AND clear any caches left behind by a previously-installed SW. Stale
    // cached index.html can reference asset hashes that no longer exist on
    // the new deploy, causing "Failed to fetch dynamically imported module".
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    }).catch(() => { /* ignore */ });
    if ("caches" in window) {
      caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => { /* ignore */ });
    }
  } else {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => { /* ignore */ });
    });
  }
}

// Self-heal: if a lazy chunk fails to load (typically because the user has
// a stale index.html from a previous deploy referencing old hashed assets),
// hard-reload once to fetch the latest HTML + chunks.
if (typeof window !== "undefined") {
  const RELOAD_KEY = "__chunk_reload_at";
  window.addEventListener("error", (e) => {
    const msg = String((e as ErrorEvent).message || "");
    if (msg.includes("Failed to fetch dynamically imported module") || msg.includes("Importing a module script failed")) {
      const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
      if (Date.now() - last > 10_000) {
        sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
        window.location.reload();
      }
    }
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000,
      gcTime: 30 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: "always",
      retry: 1,
    },
  },
});

function AppRoutes() {
  return useRoutes(appRoutes);
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <ThemeProvider>
            <AuthProvider>
              <RefCaptureProvider>
                <AppRoutes />
                <Toaster richColors position="top-center" />
                <InstallAppPrompt />
                <OfflineBanner />
              </RefCaptureProvider>
            </AuthProvider>
          </ThemeProvider>
        </I18nProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
);

// After initial paint, quietly preload heavy routes in the background.
startRoutePreloading();