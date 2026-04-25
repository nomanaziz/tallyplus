import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useShop } from "@/lib/shop";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/online-shop/marketing")({
  head: () => ({ meta: [{ title: "Marketing & SEO — Tally Plus" }] }),
  component: MarketingPage,
});

type Row = {
  id: string; tagline: string | null; meta_title: string | null;
  meta_description: string | null; meta_keywords: string | null;
  og_image_url: string | null; google_analytics_id: string | null;
  facebook_pixel_id: string | null;
};

function MarketingPage() {
  const { lang } = useI18n();
  const { current } = useShop();
  const shopId = current?.id ?? null;

  const { data: shop, refetch } = useQuery<Row | null>({
    queryKey: ["shop-marketing", shopId],
    enabled: !!shopId,
    queryFn: async () => {
      const { data } = await supabase.from("shops")
        .select("id,tagline,meta_title,meta_description,meta_keywords,og_image_url,google_analytics_id,facebook_pixel_id")
        .eq("id", shopId!).maybeSingle();
      return (data as Row | null) ?? null;
    },
  });

  const [form, setForm] = useState({
    tagline: "", meta_title: "", meta_description: "", meta_keywords: "",
    og_image_url: "", google_analytics_id: "", facebook_pixel_id: "",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!shop) return;
    setForm({
      tagline: shop.tagline ?? "",
      meta_title: shop.meta_title ?? "",
      meta_description: shop.meta_description ?? "",
      meta_keywords: shop.meta_keywords ?? "",
      og_image_url: shop.og_image_url ?? "",
      google_analytics_id: shop.google_analytics_id ?? "",
      facebook_pixel_id: shop.facebook_pixel_id ?? "",
    });
  }, [shop?.id]);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !shopId) return;
    setUploading(true);
    const path = `${shopId}/og-${Date.now()}-${f.name}`;
    const { error } = await supabase.storage.from("shop-logos").upload(path, f, { upsert: true });
    if (error) { toast.error(error.message); setUploading(false); return; }
    const { data } = supabase.storage.from("shop-logos").getPublicUrl(path);
    setForm((s) => ({ ...s, og_image_url: data.publicUrl }));
    setUploading(false);
  };

  const save = async () => {
    if (!shopId) return;
    setSaving(true);
    const { error } = await supabase.from("shops").update({
      tagline: form.tagline.trim() || null,
      meta_title: form.meta_title.trim() || null,
      meta_description: form.meta_description.trim() || null,
      meta_keywords: form.meta_keywords.trim() || null,
      og_image_url: form.og_image_url || null,
      google_analytics_id: form.google_analytics_id.trim() || null,
      facebook_pixel_id: form.facebook_pixel_id.trim() || null,
    }).eq("id", shopId);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(lang === "bn" ? "সংরক্ষিত হয়েছে" : "Saved");
    void refetch();
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 pb-24">
      <PageHeader breadcrumb={`Online-shop / ${lang === "bn" ? "মার্কেটিং ও SEO" : "Marketing & SEO"}`} title="" />

      <div className="mt-3 space-y-4">
        <Section title={lang === "bn" ? "SEO তথ্য" : "SEO Information"}>
          <div>
            <Label>{lang === "bn" ? "ট্যাগলাইন" : "Tagline"}</Label>
            <Input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })}
              placeholder={lang === "bn" ? "যেমন: সেরা দামে আসল পণ্য" : "e.g. Best prices, original products"} />
          </div>
          <div>
            <Label>{lang === "bn" ? "মেটা টাইটেল" : "Meta Title"} <span className="text-xs text-muted-foreground">({form.meta_title.length}/60)</span></Label>
            <Input value={form.meta_title} maxLength={70} onChange={(e) => setForm({ ...form, meta_title: e.target.value })}
              placeholder={lang === "bn" ? "Google-এ দেখানো শিরোনাম" : "Title shown in Google"} />
          </div>
          <div>
            <Label>{lang === "bn" ? "মেটা ডেসক্রিপশন" : "Meta Description"} <span className="text-xs text-muted-foreground">({form.meta_description.length}/160)</span></Label>
            <Textarea value={form.meta_description} maxLength={200} rows={3}
              onChange={(e) => setForm({ ...form, meta_description: e.target.value })}
              placeholder={lang === "bn" ? "সংক্ষিপ্ত বিবরণ" : "Short description"} />
          </div>
          <div>
            <Label>{lang === "bn" ? "কীওয়ার্ড (কমা দিয়ে)" : "Keywords (comma separated)"}</Label>
            <Input value={form.meta_keywords} onChange={(e) => setForm({ ...form, meta_keywords: e.target.value })}
              placeholder="electronics, mobile, accessories" />
          </div>
          <div>
            <Label>{lang === "bn" ? "OG / সোশ্যাল শেয়ার ইমেজ" : "OG / Social Share Image"}</Label>
            <div className="mt-1 flex items-center gap-3">
              {form.og_image_url ? (
                <img src={form.og_image_url} alt="" className="h-16 w-28 rounded border object-cover" />
              ) : (
                <div className="grid h-16 w-28 place-items-center rounded border bg-muted text-xs text-muted-foreground">No image</div>
              )}
              <label className="cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
                <Button asChild size="sm" variant="outline" disabled={uploading}>
                  <span>{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : (lang === "bn" ? "ইমেজ আপলোড" : "Upload image")}</span>
                </Button>
              </label>
            </div>
          </div>
        </Section>

        <Section title={lang === "bn" ? "অ্যানালিটিক্স" : "Analytics"}>
          <div>
            <Label>Google Analytics ID</Label>
            <Input value={form.google_analytics_id} onChange={(e) => setForm({ ...form, google_analytics_id: e.target.value })} placeholder="G-XXXXXXX" />
          </div>
          <div>
            <Label>Facebook Pixel ID</Label>
            <Input value={form.facebook_pixel_id} onChange={(e) => setForm({ ...form, facebook_pixel_id: e.target.value })} placeholder="123456789012345" />
          </div>
        </Section>
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t bg-background p-3">
        <div className="mx-auto max-w-3xl">
          <Button onClick={save} disabled={saving} className="w-full" size="lg">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {lang === "bn" ? "সংরক্ষণ" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="text-sm font-bold">{title}</div>
      <div className="mt-3 space-y-3">{children}</div>
    </div>
  );
}