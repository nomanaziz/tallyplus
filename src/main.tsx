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
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    }).catch(() => { /* ignore */ });
  } else {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => { /* ignore */ });
    });
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000,
      gcTime: 30 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
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