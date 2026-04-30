import { createRootRoute, HeadContent, Link, Outlet, Scripts } from "@tanstack/react-router";
import { StrictMode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nProvider } from "@/lib/i18n";
import { ThemeProvider } from "@/lib/theme";
import { AuthProvider } from "@/lib/auth";
import { RefCaptureProvider } from "@/lib/referral";
import { Toaster } from "@/components/ui/sonner";
import { InstallAppPrompt } from "@/components/app/InstallAppPrompt";
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

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Tally Plus — দোকানের হিসাব এক ক্লিকেই" },
      { name: "description", content: "POS, স্টক, বাকি, খরচ ও রিপোর্ট — মোবাইলে, বাংলায়, অফলাইনেও।" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: GlobalNotFound,
});

function GlobalNotFound() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 64, margin: 0 }}>404</h1>
      <p style={{ marginTop: 8, opacity: 0.7 }}>পেজটি খুঁজে পাওয়া যায়নি</p>
      <Link to="/" style={{ marginTop: 16, color: "#16a34a", textDecoration: "underline" }}>হোমে ফিরুন</Link>
    </div>
  );
}

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn">
      <head>
        <HeadContent />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="64x64" href="/favicon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Tiro+Bangla:ital@0;1&family=Hind+Siliguri:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <ThemeProvider>
            <AuthProvider>
              <RefCaptureProvider>
                <Outlet />
                <Toaster richColors position="top-center" />
                <InstallAppPrompt />
              </RefCaptureProvider>
            </AuthProvider>
          </ThemeProvider>
        </I18nProvider>
      </QueryClientProvider>
    </StrictMode>
  );
}