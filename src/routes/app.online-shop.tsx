import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, bnNum } from "@/lib/i18n";
import { useShop } from "@/lib/shop";
import { PageHeader } from "@/components/app/PageHeader";
import { DashboardBannerCarousel } from "@/components/app/DashboardBannerCarousel";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Globe, Copy, QrCode, MessageCircle, Settings, ShoppingBag, ClipboardList,
  Palette, AtSign, Truck, Star, Megaphone, ShieldCheck, AlertTriangle,
  Tag, Package, TrendingUp, Eye, ExternalLink,
} from "lucide-react";
import { StoreSettingsDialog } from "@/components/app/online-shop/StoreSettingsDialog";
import { ShopPolicyDialog } from "@/components/app/online-shop/ShopPolicyDialog";
import { QrCodeDialog } from "@/components/app/online-shop/QrCodeDialog";

export const Route = createFileRoute("/app/online-shop")({
  head: () => ({ meta: [{ title: "অনলাইন শপ — Tally Plus" }] }),
  component: OnlineShopDashboard,
});

type ShopRow = {
  id: string;
  name: string;
  username: string | null;
  marketplace_enabled: boolean;
  logo_url: string | null;
  cover_url: string | null;
  tagline: string | null;
  address: string | null;
  phone: string | null;
  about: string | null;
  terms_and_conditions: string | null;
  return_policy: string | null;
  shipping_policy: string | null;
  facebook_url: string | null;
  whatsapp_number: string | null;
  meta_description: string | null;
};

function OnlineShopDashboard() {
  const { lang } = useI18n();
  const { current } = useShop();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  const shopId = current?.id ?? null;

  const { data: shop, refetch } = useQuery<ShopRow | null>({
    queryKey: ["shop-online", shopId],
    enabled: !!shopId,
    queryFn: async () => {
      const { data } = await supabase
        .from("shops")
        .select("id,name,username,marketplace_enabled,logo_url,cover_url,tagline,address,phone,about,terms_and_conditions,return_policy,shipping_policy,facebook_url,whatsapp_number,meta_description")
        .eq("id", shopId!)
        .maybeSingle();
      return (data as ShopRow | null) ?? null;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["online-shop-stats", shopId],
    enabled: !!shopId,
    queryFn: async () => {
      const [{ count: products }, { count: visits }] = await Promise.all([
        supabase.from("marketplace_listings").select("id", { count: "exact", head: true }).eq("shop_id", shopId!).eq("is_published", true),
        supabase.from("shop_visits").select("id", { count: "exact", head: true }).eq("shop_id", shopId!),
      ]);
      return { activeOrders: 0, products: products ?? 0, earning: 0, visits: visits ?? 0 };
    },
  });

  const username = shop?.username ?? null;
  const publicUrl = useMemo(() => {
    if (!username || typeof window === "undefined") return "";
    return `${window.location.origin}/${username}`;
  }, [username]);

  const copyLink = async () => {
    if (!publicUrl) {
      toast.error(lang === "bn" ? "প্রথমে username সেট করুন" : "Set a username first");
      setSettingsOpen(true);
      return;
    }
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success(lang === "bn" ? "লিংক কপি হয়েছে" : "Link copied");
    } catch {
      toast.error(lang === "bn" ? "কপি করতে পারিনি" : "Failed to copy");
    }
  };

  const openWebsite = () => {
    if (!publicUrl) {
      toast.error(lang === "bn" ? "প্রথমে username সেট করুন" : "Set a username first");
      setSettingsOpen(true);
      return;
    }
    window.open(publicUrl, "_blank", "noopener");
  };

  const openQr = () => {
    if (!publicUrl) {
      toast.error(lang === "bn" ? "প্রথমে username সেট করুন" : "Set a username first");
      setSettingsOpen(true);
      return;
    }
    setQrOpen(true);
  };

  const comingSoon = () =>
    toast.info(lang === "bn" ? "শীঘ্রই আসছে" : "Coming soon");

  const tiles: Array<{
    icon: typeof Settings;
    bn: string;
    en: string;
    onClick: () => void;
    color: string;
    to?: string;
  }> = [
    { icon: MessageCircle, bn: "মেসেজ", en: "Message", color: "text-pink-500", onClick: comingSoon },
    { icon: Settings, bn: "স্টোর সেটিংস", en: "Store Settings", color: "text-blue-500", onClick: () => undefined, to: "/app/online-shop/settings" },
    { icon: ShoppingBag, bn: "অনলাইন প্রোডাক্ট", en: "Online Product", color: "text-emerald-500", onClick: () => undefined, to: "/app/online-shop/products" },
    { icon: ClipboardList, bn: "অর্ডার লিস্ট", en: "Order List", color: "text-amber-500", onClick: () => undefined, to: "/app/online-shop/orders" },
    { icon: Palette, bn: "থিম", en: "Themes", color: "text-purple-500", onClick: () => undefined, to: "/app/online-shop/themes" },
    { icon: AtSign, bn: "Username পরিবর্তন", en: "Change Username", color: "text-cyan-500", onClick: () => undefined, to: "/app/online-shop/settings" },
    { icon: Truck, bn: "ডেলিভারি", en: "Delivery", color: "text-orange-500", onClick: () => undefined, to: "/app/online-shop/delivery" },
    { icon: Star, bn: "ফিচার্ড পণ্য", en: "Featured Products", color: "text-yellow-500", onClick: () => undefined, to: "/app/online-shop/featured" },
    { icon: Megaphone, bn: "মার্কেটিং ও SEO", en: "Marketing & SEO", color: "text-fuchsia-500", onClick: () => undefined, to: "/app/online-shop/marketing" },
    { icon: ShieldCheck, bn: "শপ পলিসি", en: "Shop Policy", color: "text-teal-500", onClick: () => undefined, to: "/app/online-shop/policy" },
    { icon: AlertTriangle, bn: "ফ্রড চেক", en: "Fraud Check", color: "text-red-500", onClick: () => undefined, to: "/app/online-shop/fraud-check" },
    { icon: Tag, bn: "প্রোমো কোড", en: "Promo Code", color: "text-rose-500", onClick: () => undefined, to: "/app/online-shop/promo-codes" },
  ];

  // No auto-open dialog — Settings is now its own page

  return (
    <div className="container px-4 py-4">
      <PageHeader
        breadcrumb="Online-shop"
        title={lang === "bn" ? "অনলাইন শপ" : "Online Shop"}
      />

      <div className="mt-4 overflow-hidden rounded-xl">
        <DashboardBannerCarousel />
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={ClipboardList} label={lang === "bn" ? "অ্যাক্টিভ অর্ডার" : "Active Order"} value={bnNumIf(lang, stats?.activeOrders ?? 0)} accent="amber" />
        <StatCard icon={Package} label={lang === "bn" ? "অনলাইন প্রোডাক্ট" : "Online Product"} value={bnNumIf(lang, stats?.products ?? 0)} accent="emerald" />
        <StatCard icon={TrendingUp} label={lang === "bn" ? "মোট আয়" : "Total Earning"} value={`৳ ${bnNumIf(lang, stats?.earning ?? 0)}`} accent="blue" />
        <StatCard icon={Eye} label={lang === "bn" ? "ওয়েবসাইট ভিজিট" : "Website Visit"} value={bnNumIf(lang, stats?.visits ?? 0)} accent="violet" />
      </div>

      {/* Quick actions */}
      <div className="mt-3 grid grid-cols-3 gap-3">
        <ActionCard icon={Globe} label={lang === "bn" ? "ওয়েবসাইট" : "Website"} onClick={openWebsite} />
        <ActionCard icon={Copy} label={lang === "bn" ? "লিংক কপি" : "Copy Link"} onClick={copyLink} />
        <ActionCard icon={QrCode} label={lang === "bn" ? "QR কোড" : "QR Code"} onClick={openQr} />
      </div>

      {/* Username banner */}
      {shop && (
        <div className="mt-3 flex flex-col items-start justify-between gap-2 rounded-xl border bg-muted/40 px-4 py-3 sm:flex-row sm:items-center">
          <div className="min-w-0 text-sm">
            <span className="text-muted-foreground">{lang === "bn" ? "আপনার দোকানের লিংক:" : "Your store URL:"}</span>{" "}
            {username ? (
              <a href={publicUrl} target="_blank" rel="noopener" className="break-all font-semibold text-primary hover:underline">
                {publicUrl} <ExternalLink className="inline h-3 w-3" />
              </a>
            ) : (
              <span className="font-semibold text-destructive">{lang === "bn" ? "এখনো সেট করা হয়নি" : "Not set yet"}</span>
            )}
          </div>
          <Button size="sm" variant="outline" onClick={() => setSettingsOpen(true)}>
            {lang === "bn" ? "এডিট" : "Edit"}
          </Button>
        </div>
      )}

      {/* Tools grid */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {tiles.map((t, i) => {
          const inner = (
            <>
              <t.icon className={`mb-2 h-7 w-7 ${t.color}`} />
              <span className="text-center text-[13px] font-semibold">
                {lang === "bn" ? t.bn : t.en}
              </span>
            </>
          );
          if (t.to) {
            return (
              <Link
                key={i}
                to={t.to as never}
                className="flex flex-col items-center justify-center rounded-xl border bg-card p-4 shadow-sm transition-all hover:scale-[1.02] hover:shadow-md"
              >
                {inner}
              </Link>
            );
          }
          return (
            <button
              key={i}
              type="button"
              onClick={t.onClick}
              className="flex flex-col items-center justify-center rounded-xl border bg-card p-4 shadow-sm transition-all hover:scale-[1.02] hover:shadow-md"
            >
              {inner}
            </button>
          );
        })}
      </div>

      {shop && (
        <>
          <StoreSettingsDialog
            open={settingsOpen}
            onOpenChange={setSettingsOpen}
            shop={shop}
            onSaved={() => { void refetch(); }}
          />
          <ShopPolicyDialog
            open={policyOpen}
            onOpenChange={setPolicyOpen}
            shop={shop}
            onSaved={() => { void refetch(); }}
          />
          {publicUrl && (
            <QrCodeDialog open={qrOpen} onOpenChange={setQrOpen} url={publicUrl} shopName={shop.name} />
          )}
        </>
      )}
    </div>
  );
}

function bnNumIf(lang: string, n: number) {
  return lang === "bn" ? bnNum(n) : String(n);
}

function StatCard({ icon: Icon, label, value, accent }: { icon: typeof Settings; label: string; value: string; accent: string }) {
  const accentMap: Record<string, string> = {
    amber: "text-amber-500", emerald: "text-emerald-500", blue: "text-blue-500", violet: "text-violet-500",
  };
  return (
    <div className="rounded-xl border bg-card p-3 shadow-sm">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className={`h-4 w-4 ${accentMap[accent] ?? ""}`} />
        <span>{label}</span>
      </div>
      <div className="mt-1 text-xl font-extrabold">{value}</div>
    </div>
  );
}

function ActionCard({ icon: Icon, label, onClick }: { icon: typeof Globe; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-1.5 rounded-xl border bg-card p-4 shadow-sm transition-all hover:scale-[1.02] hover:shadow-md"
    >
      <Icon className="h-5 w-5 text-primary" />
      <span className="text-sm font-semibold">{label}</span>
    </button>
  );
}
