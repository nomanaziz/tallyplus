import { Link } from "@/lib/router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, bnNum } from "@/lib/i18n";
import { useShop } from "@/lib/shop";
import { PageHeader } from "@/components/app/PageHeader";
import { DashboardBannerCarousel } from "@/components/app/DashboardBannerCarousel";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Globe, Copy, QrCode, Settings, ClipboardList,
  Palette, AlertTriangle,
  Tag, Eye, ExternalLink,
} from "lucide-react";
import { QrCodeDialog } from "@/components/app/online-shop/QrCodeDialog";
import { icons } from "@/lib/icons";
const productListIcon = icons.productList;
const salesListIcon = icons.salesList;
const accessIcon = icons.access;
const marketingIcon = icons.marketing;
const quickSellIcon = icons.quickSell;
const warrantyIcon = icons.warranty;
const purchaseIcon = icons.purchase;
const contactIcon = icons.contact;
const onlineShopIcon = icons.onlineShop;
const businessReportIcon = icons.businessReport;



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
  const { lang, t } = useI18n();
  const { current } = useShop();
  const [qrOpen, setQrOpen] = useState(false);

  const shopId = current?.id ?? null;

  const { data: shop } = useQuery<ShopRow | null>({
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
      const [{ count: products }, { count: visits }, { count: activeOrders }] = await Promise.all([
        supabase.from("marketplace_listings").select("id", { count: "exact", head: true }).eq("shop_id", shopId!).eq("is_published", true),
        supabase.from("shop_visits").select("id", { count: "exact", head: true }).eq("shop_id", shopId!),
        supabase.from("marketplace_orders").select("id", { count: "exact", head: true }).eq("shop_id", shopId!).in("status", ["pending", "processing", "shipped"]),
      ]);
      return { activeOrders: activeOrders ?? 0, products: products ?? 0, earning: 0, visits: visits ?? 0 };
    },
  });

  const username = shop?.username ?? null;
  const publicUrl = useMemo(() => {
    if (!username || typeof window === "undefined") return "";
    return `${window.location.origin}/vendor/${username}`;
  }, [username]);

  const copyLink = async () => {
    if (!publicUrl) {
      toast.error(t("p6_Set_a_username_first"));
      return;
    }
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success(t("p6_Link_copied"));
    } catch {
      toast.error(t("p6_Failed_to_copy"));
    }
  };

  const openWebsite = () => {
    if (!publicUrl) {
      toast.error(t("p6_Set_a_username_first"));
      return;
    }
    window.open(publicUrl, "_blank", "noopener");
  };

  const openQr = () => {
    if (!publicUrl) {
      toast.error(t("p6_Set_a_username_first"));
      return;
    }
    setQrOpen(true);
  };

  const comingSoon = () =>
    toast.info(t("p6_Coming_soon"));

  const tiles: Array<{
    icon?: typeof Settings;
    img?: React.ComponentType<{ className?: string }>;
    bn: string;
    en: string;
    onClick: () => void;
    color: string;
    to?: string;
  }> = [
    { img: contactIcon, bn: "মেসেজ", en: "Message", color: "text-pink-500", onClick: () => undefined, to: "/app/online-shop/messages" },
    { img: accessIcon, bn: "স্টোর সেটিংস", en: "Store Settings", color: "text-blue-500", onClick: () => undefined, to: "/app/online-shop/settings" },
    { img: productListIcon, bn: "অনলাইন প্রোডাক্ট", en: "Online Product", color: "text-emerald-500", onClick: () => undefined, to: "/app/online-shop/products" },
    { img: salesListIcon, bn: "অর্ডার লিস্ট", en: "Order List", color: "text-amber-500", onClick: () => undefined, to: "/app/online-shop/orders" },
    { icon: Palette, bn: "থিম", en: "Themes", color: "text-purple-500", onClick: () => undefined, to: "/app/online-shop/themes" },
    { icon: Palette, bn: "কাস্টমাইজেশন", en: "Customization", color: "text-violet-500", onClick: () => undefined, to: "/app/online-shop/customize" },
    { img: purchaseIcon, bn: "ডেলিভারি", en: "Delivery", color: "text-orange-500", onClick: () => undefined, to: "/app/online-shop/delivery" },
    { img: quickSellIcon, bn: "ফিচার্ড পণ্য", en: "Featured Products", color: "text-yellow-500", onClick: () => undefined, to: "/app/online-shop/featured" },
    { img: marketingIcon, bn: "মার্কেটিং ও SEO", en: "Marketing & SEO", color: "text-fuchsia-500", onClick: () => undefined, to: "/app/online-shop/marketing" },
    { img: warrantyIcon, bn: "শপ পলিসি", en: "Shop Policy", color: "text-teal-500", onClick: () => undefined, to: "/app/online-shop/policy" },
    { icon: AlertTriangle, bn: "ফ্রড চেক", en: "Fraud Check", color: "text-red-500", onClick: () => undefined, to: "/app/online-shop/fraud-check" },
    { icon: Tag, bn: "প্রোমো কোড", en: "Promo Code", color: "text-rose-500", onClick: () => undefined, to: "/app/online-shop/promo-codes" },
  ];

  // No auto-open dialog — Settings is now its own page

  return (
    <div className="container px-4 py-4">
      <PageHeader
        breadcrumb="Online-shop"
        title={t("p6_Online_Shop")}
      />

      <div className="mt-4 overflow-hidden rounded-xl">
        <DashboardBannerCarousel />
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard to="/app/online-shop/orders" icon={ClipboardList} label={t("p6_Active_Order")} value={bnNumIf(lang, stats?.activeOrders ?? 0)} accent="amber" />
        <StatCard to="/app/online-shop/products" img={productListIcon} label={t("p6_Online_Product")} value={bnNumIf(lang, stats?.products ?? 0)} accent="emerald" />
        <StatCard img={businessReportIcon} label={t("p6_Total_Earning")} value={`৳ ${bnNumIf(lang, stats?.earning ?? 0)}`} accent="blue" />
        <StatCard icon={Eye} label={t("p6_Website_Visit")} value={bnNumIf(lang, stats?.visits ?? 0)} accent="violet" />
      </div>

      {/* Quick actions */}
      <div className="mt-3 grid grid-cols-3 gap-3">
        <ActionCard img={onlineShopIcon} label={t("p6_Website")} onClick={openWebsite} />
        <ActionCard icon={Copy} label={t("p6_Copy_Link")} onClick={copyLink} />
        <ActionCard icon={QrCode} label={t("p6_QR_Code")} onClick={openQr} />
      </div>

      {/* Username banner */}
      {shop && (
        <div className="mt-3 flex flex-col items-start justify-between gap-2 rounded-xl border bg-muted/40 px-4 py-3 sm:flex-row sm:items-center">
          <div className="min-w-0 text-sm">
            <span className="text-muted-foreground">{t("p6_Your_store_URL")}</span>{" "}
            {username ? (
              <a href={publicUrl} target="_blank" rel="noopener" className="break-all font-semibold text-primary hover:underline">
                {publicUrl} <ExternalLink className="inline h-3 w-3" />
              </a>
            ) : (
              <span className="font-semibold text-destructive">{t("p6_Not_set_yet")}</span>
            )}
          </div>
          <Button asChild size="sm" variant="outline">
            <Link to="/app/online-shop/settings">{t("p6_Edit")}</Link>
          </Button>
        </div>
      )}

      {/* Tools grid */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {tiles.map((t, i) => {
          const inner = (
            <>
              {t.img ? (
                <t.img className={`mb-2 h-7 w-7 ${t.color}`} />
              ) : t.icon ? (
                <t.icon className={`mb-2 h-7 w-7 ${t.color}`} />
              ) : null}
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

function StatCard({ icon: Icon, img: Img, label, value, accent, to }: { icon?: typeof Settings; img?: React.ComponentType<{ className?: string }>; label: string; value: string; accent: string; to?: string }) {
  const accentMap: Record<string, string> = {
    amber: "text-amber-500", emerald: "text-emerald-500", blue: "text-blue-500", violet: "text-violet-500",
  };
  const inner = (
    <>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {Img ? (
          <Img className={`h-4 w-4 ${accentMap[accent] ?? ""}`} />
        ) : Icon ? (
          <Icon className={`h-4 w-4 ${accentMap[accent] ?? ""}`} />
        ) : null}
        <span>{label}</span>
      </div>
      <div className="mt-1 text-xl font-extrabold">{value}</div>
    </>
  );
  if (to) {
    return (
      <Link to={to as never} className="rounded-xl border bg-card p-3 shadow-sm transition hover:border-primary/40 hover:shadow-md">
        {inner}
      </Link>
    );
  }
  return (
    <div className="rounded-xl border bg-card p-3 shadow-sm">
      {inner}
    </div>
  );
}

function ActionCard({ icon: Icon, img: Img, label, onClick }: { icon?: typeof Globe; img?: React.ComponentType<{ className?: string }>; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-1.5 rounded-xl border bg-card p-4 shadow-sm transition-all hover:scale-[1.02] hover:shadow-md"
    >
      {Img ? (
        <Img className="h-6 w-6 text-primary" />
      ) : Icon ? (
        <Icon className="h-5 w-5 text-primary" />
      ) : null}
      <span className="text-sm font-semibold">{label}</span>
    </button>
  );
}

export default OnlineShopDashboard;
