import { Outlet, Link, createRootRouteWithContext, HeadContent, Scripts } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nProvider } from "@/lib/i18n";
import { AuthProvider } from "@/lib/auth";
import { RefCaptureProvider } from "@/lib/referral";
import { Toaster } from "@/components/ui/sonner";
import { InstallAppPrompt } from "@/components/app/InstallAppPrompt";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">পেজ পাওয়া যায়নি</h2>
        <p className="mt-2 text-sm text-muted-foreground">আপনি যে পেজটি খুঁজছেন সেটি নেই।</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            হোমে ফিরুন
          </Link>
        </div>
      </div>
    </div>
  );
}

interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Tally Plus — দোকানের হিসাব এক ক্লিকেই" },
      { name: "description", content: "POS, স্টক, বাকি, খরচ ও রিপোর্ট — মোবাইলে, বাংলায়, অফলাইনেও।" },
      { property: "og:title", content: "Tally Plus — দোকানের হিসাব এক ক্লিকেই" },
      { property: "og:description", content: "POS, স্টক, বাকি, খরচ ও রিপোর্ট — মোবাইলে, বাংলায়, অফলাইনেও।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Tally Plus — দোকানের হিসাব এক ক্লিকেই" },
      { name: "twitter:description", content: "POS, স্টক, বাকি, খরচ ও রিপোর্ট — মোবাইলে, বাংলায়, অফলাইনেও।" },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/899a7f72-54d4-4456-89b0-bd30133bb570/id-preview-3f1b3ef5--e4d92826-ce92-461c-958d-c7f5ac77bccc.lovable.app-1777094700226.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/899a7f72-54d4-4456-89b0-bd30133bb570/id-preview-3f1b3ef5--e4d92826-ce92-461c-958d-c7f5ac77bccc.lovable.app-1777094700226.png" },
      { name: "theme-color", content: "#16a34a" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "Tally Plus" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icon-192.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AuthProvider>
          <RefCaptureProvider>
            <Outlet />
            <Toaster richColors position="top-center" />
            <InstallAppPrompt />
          </RefCaptureProvider>
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}
