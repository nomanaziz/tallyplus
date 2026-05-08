import { Outlet, useNavigate, useLocation } from "@/lib/router";
import { lazy, Suspense, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useShop, ShopProvider } from "@/lib/shop";
import { PermissionsProvider } from "@/lib/permissions-hook";
import { ensureDefaultCategories } from "@/lib/default-categories";
import { useI18n } from "@/lib/i18n";
import { AppSidebar } from "@/components/app/AppSidebar";
import { AppTopbar } from "@/components/app/AppTopbar";
import { AddShopDialog } from "@/components/app/AddShopDialog";
import { MobileBottomNav } from "@/components/app/MobileBottomNav";
import { MobileBackBar } from "@/components/app/MobileBackBar";
import { PromoPopupDialog } from "@/components/app/PromoPopupDialog";
import { SampleProductImportSheet } from "@/components/app/SampleProductImportSheet";
import { TrialBanner } from "@/components/app/TrialBanner";
import { TrialEndingDialog } from "@/components/app/TrialEndingDialog";
import { AppTour } from "@/components/app/AppTour";

// SettingsSheet is heavy (329 lines + many imports) and only opens on demand.
// Lazy-load to keep the app shell bundle small.
const SettingsSheet = lazy(() =>
  import("@/components/app/SettingsSheet").then((m) => ({ default: m.SettingsSheet }))
);



function AppLayoutWithShop() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading, accountReady } = useAuth();
  const [boot, setBoot] = useState<{
    checked: boolean;
    isPureConsumer: boolean;
    shops: import("@/lib/shop").Shop[];
    ownsShop: boolean;
  }>({ checked: false, isPureConsumer: false, shops: [], ownsShop: false });

  useEffect(() => {
    if (location.pathname === "/app" || location.pathname === "/app/") {
      navigate({ to: "/app/dashboard", replace: true });
    }
  }, [location.pathname, navigate]);

  // If auth has finished loading and there is no signed-in user, bounce to
  // the home/login page. Without this guard a freshly-installed PWA whose
  // start_url used to point at /app/dashboard would sit on the spinner
  // forever waiting for `user` to arrive.
  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/", replace: true });
    }
  }, [loading, user, navigate]);

  // ONE round-trip boot: replaces 4 parallel queries (consumer/profile/shop/member)
  // + ShopProvider's separate shops fetch. Major first-paint speedup.
  useEffect(() => {
    let cancelled = false;
    if (!user || !accountReady) { setBoot({ checked: false, isPureConsumer: false, shops: [], ownsShop: false }); return; }
    (async () => {
      const { data, error } = await supabase.rpc("my_account_resolve");
      if (cancelled) return;
      if (error || !data) {
        const { data: rows } = await supabase
          .from("shops")
          .select("id,name,slug,logo_url,address,phone,currency,shop_type_code,owner_id")
          .eq("owner_id", user.id)
          .is("deleted_at", null)
          .order("created_at", { ascending: true });
        if (cancelled) return;
        const fallbackShops = Array.isArray(rows) ? rows as import("@/lib/shop").Shop[] : [];
        setBoot({
          checked: true,
          isPureConsumer: false,
          shops: fallbackShops,
          ownsShop: fallbackShops.length > 0,
        });
        return;
      }
      const d = data as {
        is_consumer?: boolean;
        has_profile?: boolean;
        owns_shop?: boolean;
        is_member?: boolean;
        shops?: import("@/lib/shop").Shop[];
      };
      const isOwnerOrMember = !!d.has_profile || !!d.owns_shop || !!d.is_member;
      let shops = Array.isArray(d.shops) ? d.shops : [];
      // Safety net: owner says they own a shop but the RPC returned no rows.
      // Re-query directly so we never wrongly drop the owner onto the
      // first-time setup screen.
      if (!!d.owns_shop && shops.length === 0) {
        console.warn("my_account_resolve returned 0 shops despite owns_shop=true; falling back to direct query");
        const { data: rows } = await supabase
          .from("shops")
          .select("id,name,slug,logo_url,address,phone,currency,shop_type_code,owner_id")
          .eq("owner_id", user.id)
          .is("deleted_at", null);
        if (cancelled) return;
        if (Array.isArray(rows)) shops = rows as import("@/lib/shop").Shop[];
      }
      setBoot({
        checked: true,
        isPureConsumer: !!d.is_consumer && !isOwnerOrMember,
        shops,
        ownsShop: !!d.owns_shop,
      });
      if (!!d.is_consumer && !isOwnerOrMember) {
        navigate({ to: "/customer/dashboard", replace: true });
      }
    })();
    return () => { cancelled = true; };
  }, [user, accountReady, navigate]);

  if (!user || !boot.checked || boot.isPureConsumer) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background text-sm text-muted-foreground">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <ShopProvider initialShops={boot.shops}>
      <PermissionsProvider>
        <AppLayout ownsShop={boot.ownsShop} />
      </PermissionsProvider>
    </ShopProvider>
  );
}

function AppLayout({ ownsShop }: { ownsShop: boolean }) {
  const { lang } = useI18n();
  const { user, loading, ensureProfile } = useAuth();
  const { shops, current, loading: shopsLoading } = useShop();
  const nav = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sampleImportOpen, setSampleImportOpen] = useState(false);

  // Auto-open sample-product import sheet if user opted in at signup time.
  useEffect(() => {
    if (!user || shopsLoading || shops.length === 0) return;
    try {
      if (localStorage.getItem("pending_sample_import") === "1") {
        localStorage.removeItem("pending_sample_import");
        setSampleImportOpen(true);
      }
    } catch { /* ignore */ }
  }, [user, shops.length, shopsLoading]);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/" });
  }, [loading, user, nav]);

  useEffect(() => {
    if (user) void ensureProfile();
  }, [user, ensureProfile]);

  // Silently seed the default category list for the current shop so that
  // every shopkeeper has the same predefined catalogue available in the
  // Product form dropdown without doing anything manually. Idempotent.
  useEffect(() => {
    if (!current?.id) return;
    void ensureDefaultCategories(current.id);
  }, [current?.id]);

  // Idle-prefetch ONLY the 3 most-used routes. Hover/touch will prefetch the rest
  // on demand (see router.tsx Link). Previously this preloaded 18 chunks which
  // saturated mobile bandwidth and slowed actual navigations.
  useEffect(() => {
    if (!user) return;
    const idle = (cb: () => void) => {
      type IdleWin = Window & { requestIdleCallback?: (cb: () => void) => number };
      const w = window as IdleWin;
      if (typeof w.requestIdleCallback === "function") w.requestIdleCallback(cb);
      else setTimeout(cb, 2500);
    };
    idle(() => {
      void import("@/pages/app/Dashboard");
      void import("@/pages/app/Sell");
      void import("@/pages/app/Products");
    });
  }, [user]);

  // While auth state is still resolving, show a lightweight splash instead
  // of bouncing back to /auth (which made login feel frozen on mobile).
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background text-sm text-muted-foreground">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <div>{lang === "bn" ? "লোড হচ্ছে..." : "Loading..."}</div>
      </div>
    );
  }

  // Auth resolved but no user — show a brief redirect splash so the screen
  // does not look frozen between the redirect and /auth painting.
  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background text-sm text-muted-foreground">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <div>{lang === "bn" ? "লগইন পেজে যাচ্ছি..." : "Redirecting to login..."}</div>
      </div>
    );
  }

  // Existing owner with no shops returned: do NOT show first-time setup
  // (avoids the long-standing bug where a refreshed owner is dropped here).
  // Show a soft splash; ShopProvider's refresh will catch up.
  if (!shopsLoading && shops.length === 0 && ownsShop) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background text-sm text-muted-foreground">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <div>{lang === "bn" ? "আপনার দোকান লোড হচ্ছে..." : "Loading your shop..."}</div>
      </div>
    );
  }

  // Genuine first-time onboarding: open the full Add Shop dialog so the
  // owner enters logo, type, division/district/area, address, phone,
  // and online-sell preference (not just name + type).
  if (!shopsLoading && shops.length === 0 && !ownsShop) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/30 to-background">
        <AddShopDialog open onOpenChange={() => { /* required: must complete setup */ }} />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="hidden md:block">
        <AppSidebar />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar />
        <TrialBanner />
        <TrialEndingDialog />
        <MobileBackBar />
        <main className="flex-1 overflow-auto pb-20 md:pb-0">
          <Outlet />
        </main>
        {/* Mobile bottom navigation */}
        <MobileBottomNav onProfile={() => setSettingsOpen(true)} />
        {/* Settings sheet opened from mobile profile button */}
        {settingsOpen && (
          <Suspense fallback={null}>
            <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
          </Suspense>
        )}
        <PromoPopupDialog />
        <SampleProductImportSheet
          open={sampleImportOpen}
          onOpenChange={setSampleImportOpen}
          onImported={() => setSampleImportOpen(false)}
        />
        <AppTour />
      </div>
    </div>
  );
}
export default AppLayoutWithShop;
