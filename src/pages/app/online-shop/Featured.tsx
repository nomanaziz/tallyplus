import { Link } from "@/lib/router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, bnNum } from "@/lib/i18n";
import { useShop } from "@/lib/shop";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Star, Package } from "lucide-react";
import { toast } from "sonner";

({
  head: () => ({ meta: [{ title: "Featured Products — Tally Plus" }] }),
  component: FeaturedPage,
});

type Product = {
  id: string; name: string; image_url: string | null;
  sale_price: number; stock: number; unit: string | null;
  is_featured: boolean; is_marketplace_published: boolean;
};

function FeaturedPage() {
  const { lang } = useI18n();
  const { current } = useShop();
  const qc = useQueryClient();
  const shopId = current?.id ?? null;

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["featured-products", shopId],
    enabled: !!shopId,
    queryFn: async () => {
      const { data } = await supabase.from("products")
        .select("id,name,image_url,sale_price,stock,unit,is_featured,is_marketplace_published")
        .eq("shop_id", shopId!)
        .eq("is_featured", true)
        .is("deleted_at", null)
        .order("name");
      return (data ?? []) as Product[];
    },
  });

  const toggleFeatured = async (p: Product, v: boolean) => {
    await supabase.from("products").update({ is_featured: v }).eq("id", p.id);
    toast.success(v
      ? (lang === "bn" ? "ফিচার্ড করা হয়েছে" : "Marked featured")
      : (lang === "bn" ? "ফিচার্ড থেকে সরানো হয়েছে" : "Removed from featured"));
    qc.invalidateQueries({ queryKey: ["featured-products", shopId] });
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 pb-10">
      <PageHeader breadcrumb={`Online-shop / ${lang === "bn" ? "ফিচার্ড পণ্য" : "Featured Products"}`} title="" />
      <div className="mt-3 rounded-xl border bg-muted/40 p-3 text-xs text-muted-foreground">
        {lang === "bn"
          ? "ফিচার্ড পণ্যগুলো আপনার অনলাইন শপের হোমপেজে আগে দেখানো হবে। অনলাইন প্রোডাক্ট পেজে যেকোনো পণ্যের ⭐ চিহ্ন চাপ দিয়ে ফিচার্ড করুন।"
          : "Featured products show first on your online shop homepage. Tap the ⭐ on any product in Online Products to feature it."}
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">{lang === "bn" ? "লোড হচ্ছে..." : "Loading..."}</div>
      ) : products.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-xl border bg-card p-10 text-center shadow-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Star className="h-7 w-7 text-primary" />
          </div>
          <h2 className="mt-4 text-lg font-bold">{lang === "bn" ? "এখনও কোনো ফিচার্ড পণ্য নেই" : "No featured products yet"}</h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            {lang === "bn" ? "অনলাইন প্রোডাক্ট পেজে গিয়ে পণ্যে ⭐ চাপ দিন।" : "Go to Online Products and tap the ⭐ icon."}
          </p>
          <Button asChild className="mt-5"><Link to="/app/online-shop/products">{lang === "bn" ? "অনলাইন প্রোডাক্ট" : "Online Products"}</Link></Button>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {products.map((p) => (
            <div key={p.id} className="flex gap-3 rounded-xl border bg-card p-3 shadow-sm">
              <div className="h-20 w-20 flex-none overflow-hidden rounded-lg bg-muted">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full place-items-center"><Package className="h-7 w-7 text-muted-foreground" /></div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{p.name}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {lang === "bn" ? "স্টক:" : "Stock:"} {lang === "bn" ? bnNum(p.stock) : p.stock} {p.unit ?? ""}
                    </div>
                    <div className="mt-1 text-sm font-bold text-primary">৳ {p.sale_price}</div>
                  </div>
                  <Switch checked={p.is_featured} onCheckedChange={(v) => toggleFeatured(p, v)} />
                </div>
                {!p.is_marketplace_published && (
                  <div className="mt-1 text-[11px] text-amber-600">
                    {lang === "bn" ? "⚠ এখনো অনলাইনে প্রকাশিত নয়" : "⚠ Not published online yet"}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
export default FeaturedPage;
