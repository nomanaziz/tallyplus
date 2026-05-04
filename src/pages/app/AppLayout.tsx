import { Outlet, useNavigate, useLocation } from "@/lib/router";
import { lazy, Suspense, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useShop, ShopProvider } from "@/lib/shop";
import { PermissionsProvider } from "@/lib/permissions-hook";
import { ensureDefaultCategories } from "@/lib/default-categories";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { AppSidebar } from "@/components/app/AppSidebar";
import { AppTopbar } from "@/components/app/AppTopbar";
import { ShopTypePicker } from "@/components/app/ShopTypePicker";
import { MobileBottomNav } from "@/components/app/MobileBottomNav";
import { MobileBackBar } from "@/components/app/MobileBackBar";
import { PromoPopupDialog } from "@/components/app/PromoPopupDialog";
import { SampleProductImportSheet } from "@/components/app/SampleProductImportSheet";

// SettingsSheet is heavy (329 lines + many imports) and only opens on demand.
// Lazy-load to keep the app shell bundle small.
const SettingsSheet = lazy(() =>
  import("@/components/app/SettingsSheet").then((m) => ({ default: m.SettingsSheet }))
);



function AppLayoutWithShop() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading, accountReady, isOwner, isAdmin } = useAuth();
  const [boot, setBoot] = useState<{
    checked: boolean;
    isPureConsumer: boolean;
    shops: import("@/lib/shop").Shop[];
  }>({ checked: false, isPureConsumer: false, shops: [] });

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

  useEffect(() => {
    if (loading || !accountReady || !user) return;
    if (isOwner || isAdmin) {
      setBoot((prev) => ({ ...prev, checked: true, isPureConsumer: false }));
    }
  }, [loading, accountReady, user, isOwner, isAdmin]);

  // ONE round-trip boot: replaces 4 parallel queries (consumer/profile/shop/member)
  // + ShopProvider's separate shops fetch. Major first-paint speedup.
  useEffect(() => {
    let cancelled = false;
    if (!user || !accountReady) { setBoot({ checked: false, isPureConsumer: false, shops: [] }); return; }
    (async () => {
      const { data, error } = await supabase.rpc("my_account_resolve");
      if (cancelled) return;
      if (error || !data) {
        // Fail open: continue, downstream guards still work.
        setBoot({ checked: true, isPureConsumer: false, shops: [] });
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
      setBoot({
        checked: true,
        isPureConsumer: !!d.is_consumer && !isOwnerOrMember,
        shops: Array.isArray(d.shops) ? d.shops : [],
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
        <AppLayout />
      </PermissionsProvider>
    </ShopProvider>
  );
}

function AppLayout() {
  const { t, lang } = useI18n();
  const { user, loading, ensureProfile } = useAuth();
  const { shops, current, refresh: refreshShops, loading: shopsLoading } = useShop();
  const nav = useNavigate();
  const [shopName, setShopName] = useState("");
  const [shopTypeCode, setShopTypeCode] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
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

  const createShop = async () => {
    if (!user || shopName.trim().length < 2) {
      toast.error(lang === "bn" ? "দোকানের নাম দিন" : "Enter shop name");
      return;
    }
    if (!shopTypeCode) {
      toast.error(lang === "bn" ? "দোকানের ধরন বাছাই করুন" : "Choose shop type");
      return;
    }
    setCreating(true);
    const { data: shopRow, error } = await supabase
      .from("shops")
      .insert({ owner_id: user.id, name: shopName.trim(), shop_type_code: shopTypeCode })
      .select("id")
      .single();
    setCreating(false);
    if (error) { toast.error(error.message); return; }
    // Seed default categories for this shop type
    const { data: typeRow } = await supabase
      .from("shop_types")
      .select("default_categories")
      .eq("code", shopTypeCode)
      .maybeSingle();
    const defaults = (typeRow?.default_categories as string[] | undefined) ?? [];
    if (shopRow?.id && defaults.length > 0) {
      await supabase
        .from("categories")
        .insert(defaults.map((name) => ({ shop_id: shopRow.id, name })));
    }
    setShopName("");
    setShopTypeCode(null);
    await refreshShops();
    toast.success(lang === "bn" ? "দোকান তৈরি হয়েছে" : "Shop created");
  };

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

  if (!shopsLoading && user && shops.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/30 to-background p-4">
        <div className="w-full max-w-sm rounded-3xl border bg-card p-6 shadow-xl">
          <div className="mb-4 flex items-center gap-2">
            <img src={logo} alt="" className="h-8 w-8 object-contain" />
            <span className="font-extrabold">{t("appName")}</span>
          </div>
          <h1 className="text-2xl font-bold">{t("setupShop")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {lang === "bn" ? "শুরু করতে আপনার দোকানের নাম দিন" : "Enter your shop name to begin"}
          </p>
          <div className="mt-6 space-y-3">
            <Label htmlFor="shop">{t("shopName")}</Label>
            <Input id="shop" value={shopName} onChange={(e) => setShopName(e.target.value)} className="h-12 text-base" placeholder={lang === "bn" ? "যেমন: আল্লাহর দান স্টোর" : "e.g. My Shop"} />
            <ShopTypePicker
              value={shopTypeCode}
              onChange={(code) => setShopTypeCode(code)}
              lang={lang as "bn" | "en"}
              label={lang === "bn" ? "দোকানের ধরন" : "Shop type"}
            />
            <Button onClick={createShop} disabled={creating} className="h-12 w-full text-base font-semibold">
              {creating ? "..." : t("create")}
            </Button>
          </div>
        </div>
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
      </div>
    </div>
  );
}
export default AppLayoutWithShop;
