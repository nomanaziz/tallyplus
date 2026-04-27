import { Link, useParams } from "@/lib/router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Loader2, MapPin, Phone, ShoppingBag, Store, ArrowLeft } from "lucide-react";
import { MarketplaceProductCard } from "@/components/marketplace/MarketplaceProductCard";

type Listing = { id: string; product_id: string; price: number; stock: number; unit: string | null; min_order: number | null; warranty_months?: number | null };
type Shop = {
  id: string; name: string; slug: string | null; username: string | null; logo_url: string | null;
  cover_url: string | null; tagline: string | null; address: string | null; phone: string | null;
};
type Product = { id: string; name: string; image_url: string | null; unit: string | null };



function ShopPage() {
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState<Shop | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void supabase.functions
      .invoke("marketplace-public", { body: { action: "shop", slug } })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data || (data as { error?: string }).error) {
          setError((data as { error?: string })?.error ?? error?.message ?? "ত্রুটি");
        } else {
          const d = data as { shop: Shop; listings: Listing[]; products: Record<string, Product> };
          setShop(d.shop);
          setListings(d.listings ?? []);
          setProducts(d.products ?? {});
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !shop) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <Store className="h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-semibold">{error ?? "দোকান পাওয়া যায়নি"}</p>
        <Link to="/shop" className="text-primary hover:underline">মার্কেটপ্লেসে ফিরুন</Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <div className="flex-1">
      <div className="border-b bg-card/40">
        <div className="container mx-auto px-4 py-2">
          <Link to="/shop" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> মার্কেটপ্লেসে ফিরুন
          </Link>
        </div>
      </div>

      {/* Cover + identity */}
      <section className="relative">
        <div className="h-40 w-full bg-gradient-to-br from-primary/20 to-primary/5 sm:h-56">
          {shop.cover_url && (
            <img src={shop.cover_url} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="container mx-auto px-4">
          <div className="-mt-12 flex items-end gap-4 sm:-mt-16">
            <div className="h-24 w-24 overflow-hidden rounded-2xl border-4 border-background bg-card shadow-md sm:h-32 sm:w-32">
              {shop.logo_url ? (
                <img src={shop.logo_url} alt={shop.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <Store className="h-10 w-10" />
                </div>
              )}
            </div>
            <div className="pb-2">
              <h1 className="text-2xl font-bold sm:text-3xl">{shop.name}</h1>
              {shop.tagline && <p className="mt-1 text-sm text-muted-foreground">{shop.tagline}</p>}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
            {shop.address && (
              <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" />{shop.address}</span>
            )}
            {shop.phone && (
              <a href={`tel:${shop.phone}`} className="inline-flex items-center gap-1.5 hover:text-primary">
                <Phone className="h-4 w-4" />{shop.phone}
              </a>
            )}
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-8">
        <h2 className="mb-4 text-lg font-semibold">পণ্যসমূহ ({listings.length})</h2>

        {listings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ShoppingBag className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">এই দোকানে এখনো কোনো অনলাইন পণ্য যোগ হয়নি।</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {listings.map((l) => {
              const p = products[l.product_id];
              if (!p) return null;
              return (
                <MarketplaceProductCard
                  key={l.id}
                  listing={{ ...l, shop_id: shop.id }}
                  product={p}
                  shop={shop}
                  showShopChip={false}
                />
              );
            })}
          </div>
        )}
      </main>
      </div>
      <SiteFooter />
    </div>
  );
}

export default ShopPage;
