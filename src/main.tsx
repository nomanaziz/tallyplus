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
import "@/styles.css";

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