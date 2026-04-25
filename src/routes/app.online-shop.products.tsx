import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, bnNum } from "@/lib/i18n";
import { useShop } from "@/lib/shop";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Loader2, Package, ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/online-shop/products")({
  head: () => ({ meta: [{ title: "অনলাইন প্রোডাক্ট — Tally Plus" }] }),
  component: OnlineProductsPage,
});

type Product = {
  id: string;
  name: string;
  image_url: string | null;
  unit: string | null;
  sale_price: number;
  stock: number;
  warranty_value: number | null;
  warranty_enabled: boolean;
  is_marketplace_published: boolean;
};

type Listing = {
  id: string;
  product_id: string;
  price: number;
  stock: number;
  unit: string | null;
  warranty_months: number | null;
  is_published: boolean;
};

function OnlineProductsPage() {
  const { lang } = useI18n();
  const { current } = useShop();
  const qc = useQueryClient();
  const [savingId, setSavingId] = useState<string | null>(null);

  const shopId = current?.id ?? null;

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["products-for-online", shopId],
    enabled: !!shopId,
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id,name,image_url,unit,sale_price,stock,warranty_value,warranty_enabled,is_marketplace_published")
        .eq("shop_id", shopId!)
        .is("deleted_at", null)
        .order("name");
      return (data as Product[] | null) ?? [];
    },
  });

  const { data: listings } = useQuery<Record<string, Listing>>({
    queryKey: ["listings-by-product", shopId],
    enabled: !!shopId,
    queryFn: async () => {
      const { data } = await supabase
        .from("marketplace_listings")
        .select("id,product_id,price,stock,unit,warranty_months,is_published")
        .eq("shop_id", shopId!);
      const map: Record<string, Listing> = {};
      (data as Listing[] | null ?? []).forEach((l) => (map[l.product_id] = l));
      return map;
    },
  });

  const togglePublish = async (p: Product, publish: boolean) => {
    if (!shopId) return;
    setSavingId(p.id);
    const existing = listings?.[p.id];
    if (existing) {
      const { error } = await supabase
        .from("marketplace_listings")
        .update({ is_published: publish })
        .eq("id", existing.id);
      if (error) toast.error(error.message);
    } else if (publish) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setSavingId(null); return; }
      const { error } = await supabase.from("marketplace_listings").insert({
        shop_id: shopId,
        product_id: p.id,
        seller_id: user.id,
        price: p.sale_price,
        stock: p.stock,
        unit: p.unit,
        warranty_months: p.warranty_enabled ? p.warranty_value : null,
        is_published: true,
      });
      if (error) toast.error(error.message);
    }
    await supabase.from("products").update({ is_marketplace_published: publish }).eq("id", p.id);
    await qc.invalidateQueries({ queryKey: ["listings-by-product", shopId] });
    await qc.invalidateQueries({ queryKey: ["products-for-online", shopId] });
    setSavingId(null);
    toast.success(lang === "bn" ? (publish ? "অনলাইনে যুক্ত হয়েছে" : "অনলাইন থেকে সরানো হয়েছে") : (publish ? "Published online" : "Unpublished"));
  };

  const updateListing = async (productId: string, patch: Partial<Pick<Listing, "price" | "stock" | "warranty_months">>) => {
    const existing = listings?.[productId];
    if (!existing) return;
    setSavingId(productId);
    const { error } = await supabase
      .from("marketplace_listings")
      .update(patch)
      .eq("id", existing.id);
    setSavingId(null);
    if (error) { toast.error(error.message); return; }
    await qc.invalidateQueries({ queryKey: ["listings-by-product", shopId] });
    toast.success(lang === "bn" ? "আপডেট হয়েছে" : "Updated");
  };

  return (
    <div className="container px-4 py-4">
      <PageHeader
        breadcrumb="Online-shop / Products"
        title={lang === "bn" ? "অনলাইন প্রোডাক্ট" : "Online Products"}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/app/online-shop">
              <ArrowLeft className="mr-1 h-4 w-4" />
              {lang === "bn" ? "ফিরে যান" : "Back"}
            </Link>
          </Button>
        }
      />

      <p className="mt-2 text-sm text-muted-foreground">
        {lang === "bn"
          ? "যে পণ্যগুলো অনলাইনে বিক্রি করতে চান সেগুলো সক্রিয় করুন। দাম ও স্টক আলাদাভাবে সেট করতে পারেন।"
          : "Enable products you want to sell online. You can override price/stock per listing."}
      </p>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : !products || products.length === 0 ? (
        <div className="mt-10 flex flex-col items-center text-center">
          <Package className="h-10 w-10 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            {lang === "bn" ? "কোনো পণ্য নেই। প্রথমে প্রোডাক্ট লিস্টে পণ্য যোগ করুন।" : "No products. Add products first."}
          </p>
          <Button asChild className="mt-3" size="sm"><Link to="/app/products">{lang === "bn" ? "পণ্য যোগ করুন" : "Add Product"}</Link></Button>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {products.map((p) => {
            const l = listings?.[p.id];
            const isOnline = !!l && l.is_published;
            return (
              <div key={p.id} className="rounded-xl border bg-card p-3">
                <div className="flex items-start gap-3">
                  <div className="h-14 w-14 flex-none overflow-hidden rounded-lg bg-muted">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center"><Package className="h-6 w-6 text-muted-foreground" /></div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold">{p.name}</div>
                      <Switch
                        checked={isOnline}
                        disabled={savingId === p.id}
                        onCheckedChange={(v) => togglePublish(p, v)}
                      />
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {lang === "bn" ? "দোকানের দাম" : "Shop price"}: ৳ {p.sale_price} · {lang === "bn" ? "স্টক" : "Stock"}: {lang === "bn" ? bnNum(p.stock) : p.stock} {p.unit ?? ""}
                    </div>
                    {isOnline && l && (
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <ListingField
                          label={lang === "bn" ? "অনলাইন দাম" : "Online price"}
                          defaultValue={String(l.price)}
                          onSave={(v) => updateListing(p.id, { price: Number(v) || 0 })}
                          saving={savingId === p.id}
                        />
                        <ListingField
                          label={lang === "bn" ? "অনলাইন স্টক" : "Online stock"}
                          defaultValue={String(l.stock)}
                          onSave={(v) => updateListing(p.id, { stock: Number(v) || 0 })}
                          saving={savingId === p.id}
                        />
                        <ListingField
                          label={lang === "bn" ? "ওয়ারেন্টি (মাস)" : "Warranty (mo)"}
                          defaultValue={l.warranty_months != null ? String(l.warranty_months) : ""}
                          onSave={(v) => updateListing(p.id, { warranty_months: v.trim() === "" ? null : Number(v) || 0 })}
                          saving={savingId === p.id}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ListingField({ label, defaultValue, onSave, saving }: { label: string; defaultValue: string; onSave: (v: string) => void; saving: boolean }) {
  const [v, setV] = useState(defaultValue);
  const dirty = v !== defaultValue;
  return (
    <div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="flex items-center gap-1">
        <Input value={v} onChange={(e) => setV(e.target.value)} className="h-8 text-sm" />
        {dirty && (
          <Button size="icon" variant="ghost" className="h-8 w-8" disabled={saving} onClick={() => onSave(v)}>
            <Save className="h-4 w-4 text-primary" />
          </Button>
        )}
      </div>
    </div>
  );
}
