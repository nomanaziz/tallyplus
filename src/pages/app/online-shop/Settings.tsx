import { Link, useNavigate } from "@/lib/router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useShop } from "@/lib/shop";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, ImagePlus, Pencil, Facebook, Instagram, Youtube, Music2, Copy } from "lucide-react";



const RESERVED = new Set([
  "app","admin","auth","shop","shops","api","pricing","affiliate","f","_",
  "login","signup","register","logout","dashboard","contact","about","help",
  "support","terms","privacy","blog","docs","pages","static","public","assets",
  "marketplace","store","stores",
]);

type ShopRow = {
  id: string; name: string; username: string | null; tagline: string | null;
  address: string | null; phone: string | null; logo_url: string | null;
  banner_url: string | null;
  marketplace_enabled: boolean;
  is_wholesale: boolean;
  social_links: Record<string, string> | null;
};

function StoreSettingsPage() {
  const { lang, t } = useI18n();
  const { current } = useShop();
  const nav = useNavigate();
  const shopId = current?.id ?? null;

  const { data: shop, refetch, isLoading } = useQuery<ShopRow | null>({
    queryKey: ["shop-settings", shopId],
    enabled: !!shopId,
    queryFn: async () => {
      const { data } = await supabase
        .from("shops")
        .select("id,name,username,tagline,address,phone,logo_url,banner_url,marketplace_enabled,is_wholesale,social_links")
        .eq("id", shopId!)
        .maybeSingle();
      return (data as ShopRow | null) ?? null;
    },
  });

  const [enabled, setEnabled] = useState(true);
  const [isWholesale, setIsWholesale] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [editingUsername, setEditingUsername] = useState(false);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [social, setSocial] = useState({ facebook: "", instagram: "", tiktok: "", youtube: "" });
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const logoInput = useRef<HTMLInputElement>(null);
  const bannerInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!shop) return;
    setEnabled(shop.marketplace_enabled);
    setIsWholesale(!!shop.is_wholesale);
    setName(shop.name ?? "");
    setUsername(shop.username ?? defaultUsername(shop.name ?? ""));
    setPhone(shop.phone ?? "");
    setAddress(shop.address ?? "");
    setLogoUrl(shop.logo_url);
    setBannerUrl(shop.banner_url);
    const s = (shop.social_links ?? {}) as Record<string, string>;
    setSocial({ facebook: s.facebook ?? "", instagram: s.instagram ?? "", tiktok: s.tiktok ?? "", youtube: s.youtube ?? "" });
  }, [shop?.id]);

  const upload = async (file: File, kind: "logo" | "banner") => {
    if (!shopId) return null;
    const setLoading = kind === "logo" ? setUploadingLogo : setUploadingBanner;
    setLoading(true);
    const { data: ud } = await supabase.auth.getUser();
    const uid = ud?.user?.id;
    if (!uid) {
      setLoading(false);
      toast.error(t("p6_Login_required"));
      return null;
    }
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${uid}/${shopId}/${kind}-${Date.now()}-${safeName}`;
    const { error } = await supabase.storage.from("shop-logos").upload(path, file, { upsert: true, contentType: file.type });
    if (error) {
      setLoading(false);
      toast.error(error.message);
      return null;
    }
    const { data } = supabase.storage.from("shop-logos").getPublicUrl(path);
    setLoading(false);
    return data.publicUrl;
  };

  const onLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = await upload(f, "logo");
    if (url) setLogoUrl(url);
  };
  const onBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = await upload(f, "banner");
    if (url) setBannerUrl(url);
  };

  const togglePublished = async (v: boolean) => {
    if (!shopId) return;
    setEnabled(v);
    await supabase.from("shops").update({ marketplace_enabled: v }).eq("id", shopId);
    toast.success(v
      ? (t("p6_Store_published"))
      : (t("p6_Store_unpublished")));
    void refetch();
  };

  const save = async () => {
    if (!shopId) return;
    if (!name.trim()) { toast.error(t("p6_Shop_name_required")); return; }
    const u = username.trim().toLowerCase();
    if (!u || !/^[a-z0-9][a-z0-9_-]{2,31}$/.test(u) || RESERVED.has(u)) {
      toast.error(t("p6_Invalid_username"));
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("shops").update({
      name: name.trim(),
      username: u,
      phone: phone.trim() || null,
      address: address.trim() || null,
      logo_url: logoUrl,
      banner_url: bannerUrl,
      is_wholesale: isWholesale,
      social_links: social,
    }).eq("id", shopId);
    setSaving(false);
    if (error) {
      if (error.code === "23505") toast.error(t("p6_Username_taken"));
      else toast.error(error.message);
      return;
    }
    toast.success(t("p6_Saved"));
    setEditingUsername(false);
    void refetch();
  };

  const publicUrl = username && typeof window !== "undefined" ? `${window.location.origin}/vendor/${username}` : "";

  const copyLink = async () => {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    toast.success(t("p6_Copied"));
  };

  if (isLoading || !shop) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="pb-24">
      <PageHeader
        breadcrumb={`Online-shop / ${t("p6_Store_Settings")}`}
        title=""
        actions={<Button variant="ghost" size="sm" onClick={() => nav({ to: "/app/online-shop" })}>← {t("p6_Back")}</Button>}
      />

      <div className="container mx-auto max-w-3xl space-y-5 px-4 py-5">
        {/* Publish toggle */}
        <div className="flex items-center justify-between rounded-xl border bg-card p-4">
          <div>
            <div className="text-sm font-bold">{t("p6_Online_Shop_Publish")}</div>
            <Badge variant={enabled ? "default" : "secondary"} className="mt-1">
              {enabled ? (t("p6_PUBLISHED")) : (t("p6_UNPUBLISHED"))}
            </Badge>
          </div>
          <Switch checked={enabled} onCheckedChange={togglePublished} />
        </div>

        {/* Wholesale (B2B) toggle */}
        <div className="flex items-start justify-between gap-3 rounded-xl border bg-card p-4">
          <div className="min-w-0">
            <div className="text-sm font-bold">
              {t("p6_Are_you_a_wholesale_seller")}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("p6_When_enabled_your_shop_will_be")}
            </p>
            {isWholesale && (
              <Badge className="mt-2" variant="default">
                {t("p6_Wholesale_Seller")}
              </Badge>
            )}
          </div>
          <Switch checked={isWholesale} onCheckedChange={setIsWholesale} />
        </div>

        {/* Logo + Name + Type */}
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={() => logoInput.current?.click()}
              className="group relative flex h-20 w-20 flex-none flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed bg-muted/40 hover:border-primary"
            >
              {logoUrl ? (
                <img src={logoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <ImagePlus className="h-7 w-7 text-muted-foreground" />
              )}
              {uploadingLogo && <div className="absolute inset-0 grid place-items-center bg-background/70"><Loader2 className="h-5 w-5 animate-spin" /></div>}
            </button>
            <input ref={logoInput} type="file" accept="image/*" className="hidden" onChange={onLogoChange} />
            <div className="min-w-0 flex-1 space-y-2">
              <button type="button" onClick={() => logoInput.current?.click()} className="text-sm font-semibold text-primary hover:underline">
                {t("p6_Logo_Update")}
              </button>
              <div>
                <Label className="text-xs">{t("p6_Shop_Name")}</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-muted/40" />
              </div>
            </div>
          </div>
        </div>

        {/* Banner */}
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-bold">{t("p6_Shop_Banner")}</div>
              <div className="text-xs text-muted-foreground">Size (1920 × 560)</div>
            </div>
            <Button size="sm" onClick={() => bannerInput.current?.click()} disabled={uploadingBanner}>
              {uploadingBanner ? <Loader2 className="h-4 w-4 animate-spin" /> : (t("p6_Banner_Update"))}
            </Button>
            <input ref={bannerInput} type="file" accept="image/*" className="hidden" onChange={onBannerChange} />
          </div>
          <div className="mt-3 aspect-[16/5] w-full overflow-hidden rounded-lg bg-muted/40">
            {bannerUrl ? (
              <img src={bannerUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full place-items-center text-sm text-muted-foreground">
                {t("p6_No_banner_uploaded")}
              </div>
            )}
          </div>
        </div>

        {/* Shop Link */}
        <div className="rounded-xl border bg-card p-4">
          <div className="text-sm font-bold">{t("p6_Your_Shop_Link")}</div>
          {editingUsername ? (
            <div className="mt-2 flex items-center gap-1">
              <span className="rounded-l-md border border-r-0 bg-muted px-2 py-2 text-xs text-muted-foreground">
                {typeof window !== "undefined" ? window.location.origin : ""}/vendor/
              </span>
              <Input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} className="rounded-l-none" placeholder="my-shop" />
              <Button size="sm" onClick={() => setEditingUsername(false)}>OK</Button>
            </div>
          ) : (
            <div className="mt-2 flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-sm">{publicUrl || (t("p6_Set_username"))}</span>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={copyLink}><Copy className="h-3.5 w-3.5" /></Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingUsername(true)}><Pencil className="h-3.5 w-3.5 text-primary" /></Button>
            </div>
          )}
        </div>

        {/* Social Media */}
        <div className="rounded-xl border bg-card p-4">
          <div className="text-sm font-bold">{t("p6_Social_Media_Link")}</div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SocialField icon={<Facebook className="h-4 w-4 text-blue-600" />} value={social.facebook} onChange={(v) => setSocial({ ...social, facebook: v })} placeholder="Add Facebook Link" />
            <SocialField icon={<Music2 className="h-4 w-4" />} value={social.tiktok} onChange={(v) => setSocial({ ...social, tiktok: v })} placeholder="Add TikTok Link" />
            <SocialField icon={<Instagram className="h-4 w-4 text-pink-500" />} value={social.instagram} onChange={(v) => setSocial({ ...social, instagram: v })} placeholder="Add Instagram Link" />
            <SocialField icon={<Youtube className="h-4 w-4 text-red-600" />} value={social.youtube} onChange={(v) => setSocial({ ...social, youtube: v })} placeholder="Add YouTube Link" />
          </div>
        </div>

        {/* Other Info */}
        <div className="rounded-xl border bg-card p-4">
          <div className="text-sm font-bold">{t("p6_Shop_Other_Info")}</div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">{t("p6_Shop_Name_2")}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-muted/40" />
            </div>
            <div>
              <Label className="text-xs">{t("p6_Shop_Mobile")}</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-muted/40" placeholder="+88 01..." />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">{t("p6_Shop_Address")}</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} className="bg-muted/40" />
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Save */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t bg-background/95 px-4 py-3 backdrop-blur sm:left-[var(--sidebar-w,0)]">
        <div className="container mx-auto max-w-3xl">
          <Button onClick={save} disabled={saving} className="w-full" size="lg">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("p6_Shop_Information_Update")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SocialField({ icon, value, onChange, placeholder }: { icon: React.ReactNode; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-2">
      <div className="grid h-7 w-7 flex-none place-items-center rounded bg-muted">{icon}</div>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="border-0 px-0 shadow-none focus-visible:ring-0" />
    </div>
  );
}

function defaultUsername(name: string): string {
  return name.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}
export default StoreSettingsPage;
