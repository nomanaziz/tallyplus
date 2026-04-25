import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useShop, ShopProvider } from "@/lib/shop";
import { PermissionsProvider } from "@/lib/permissions-hook";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { AppSidebar } from "@/components/app/AppSidebar";
import { AppTopbar } from "@/components/app/AppTopbar";
import { ShopTypePicker } from "@/components/app/ShopTypePicker";

export const Route = createFileRoute("/app")({
  head: () => ({ meta: [{ title: "ড্যাশবোর্ড — Tally Plus" }] }),
  beforeLoad: ({ location }) => {
    if (location.pathname === "/app" || location.pathname === "/app/") {
      throw redirect({ to: "/app/dashboard" });
    }
  },
  component: AppLayoutWithShop,
});

function AppLayoutWithShop() {
  return (
    <ShopProvider>
      <PermissionsProvider>
        <AppLayout />
      </PermissionsProvider>
    </ShopProvider>
  );
}

function AppLayout() {
  const { t, lang } = useI18n();
  const { user, loading, ensureProfile } = useAuth();
  const { shops, refresh: refreshShops, loading: shopsLoading } = useShop();
  const nav = useNavigate();
  const [shopName, setShopName] = useState("");
  const [shopTypeCode, setShopTypeCode] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [loading, user, nav]);

  useEffect(() => {
    if (user) void ensureProfile();
  }, [user, ensureProfile]);

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
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        {lang === "bn" ? "লোড হচ্ছে..." : "Loading..."}
      </div>
    );
  }

  if (!shopsLoading && user && shops.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/30 to-background p-4">
        <div className="w-full max-w-sm rounded-3xl border bg-card p-6 shadow-xl">
          <div className="mb-4 flex items-center gap-2">
            <img src={logo} alt="" className="h-8 w-8" />
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
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}