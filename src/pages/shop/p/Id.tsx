import { Link, useParams } from "@/lib/router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Loader2, ShoppingBag, Store, ArrowLeft, MessageCircle, Phone } from "lucide-react";
import { addToCart as addToConsumerCart } from "@/lib/consumer-cart";
import { toast } from "sonner";

type Listing = { id: string; shop_id: string; product_id: string; price: number; stock: number; unit: string | null; min_order: number | null };
type Shop = {
  id: string; name: string; slug: string | null; logo_url: string | null;
  cover_url: string | null; tagline: string | null; address: string | null; phone: string | null;
};
type Product = { id: string; name: string; image_url: string | null; unit: string | null };



function ProductDetailPage() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [product, setProduct] = useState<Product | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void supabase.functions
      .invoke("marketplace-public", { body: { action: "listing", id } })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data || (data as { error?: string }).error) {
          setError((data as { error?: string })?.error ?? error?.message ?? "ত্রুটি");
        } else {
          const d = data as { listing: Listing; shop: Shop; product: Product };
          setListing(d.listing);
          setShop(d.shop);
          setProduct(d.product);
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const addToCart = () => {
    if (!listing || !product || !shop) return;
    const minOrder = Number(listing.min_order ?? 1);
    addToConsumerCart(
      {
        listing_id: listing.id,
        shop_id: shop.id,
        shop_name: shop.name,
        name: product.name,
        price: listing.price,
        unit: listing.unit ?? product.unit,
        image_url: product.image_url,
        qty: minOrder,
      },
      minOrder,
    );
    toast.success("List-এ যোগ করা হয়েছে");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !listing || !shop || !product) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <ShoppingBag className="h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-semibold">{error ?? "পণ্য পাওয়া যায়নি"}</p>
        <Link to="/shop" className="text-primary hover:underline">মার্কেটপ্লেসে ফিরুন</Link>
      </div>
    );
  }

  const waMsg = encodeURIComponent(`আসসালামু আলাইকুম। আমি "${product.name}" সম্পর্কে জানতে চাই (Tally Plus মার্কেটপ্লেস থেকে)।`);
  const waPhone = (shop.phone ?? "").replace(/\D/g, "");

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

      <main className="container mx-auto grid gap-8 px-4 py-8 md:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border bg-muted aspect-square">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <ShoppingBag className="h-20 w-20" />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-bold sm:text-3xl">{product.name}</h1>

          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-extrabold text-primary">৳ {listing.price}</span>
            {listing.unit || product.unit ? (
              <span className="text-sm text-muted-foreground">/ {listing.unit ?? product.unit}</span>
            ) : null}
          </div>

          {listing.stock < 0 ? (
            <div className="text-sm text-primary">সবসময় অর্ডারযোগ্য</div>
          ) : listing.stock > 0 ? (
            <div className="text-sm text-muted-foreground">স্টক আছে: {listing.stock} {listing.unit ?? product.unit ?? ""}</div>
          ) : (
            <div className="text-sm font-medium text-destructive">এখন স্টক নেই</div>
          )}

          {listing.min_order && Number(listing.min_order) > 1 && (
            <div className="text-sm text-muted-foreground">সর্বনিম্ন অর্ডার: {listing.min_order}</div>
          )}

          <div className="mt-2 flex flex-wrap gap-2">
            <Button onClick={addToCart} disabled={listing.stock === 0} className="gap-2">
              <ShoppingBag className="h-4 w-4" /> List-এ যোগ করুন
            </Button>
            {waPhone && (
              <Button asChild variant="outline" className="gap-2">
                <a href={`https://wa.me/${waPhone}?text=${waMsg}`} target="_blank" rel="noreferrer">
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
              </Button>
            )}
          </div>

          {/* Shop info */}
          <Link
            to="/shop/s/$slug"
            params={{ slug: shop.slug ?? "" }}
            className="mt-6 flex items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-accent"
          >
            {shop.logo_url ? (
              <img src={shop.logo_url} alt={shop.name} className="h-12 w-12 rounded-lg object-cover" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                <Store className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{shop.name}</div>
              {shop.tagline && <div className="text-xs text-muted-foreground truncate">{shop.tagline}</div>}
              {shop.address && <div className="mt-0.5 text-xs text-muted-foreground truncate">{shop.address}</div>}
            </div>
            {shop.phone && (
              <a href={`tel:${shop.phone}`} onClick={(e) => e.stopPropagation()} className="rounded-md p-2 text-muted-foreground hover:bg-background hover:text-primary">
                <Phone className="h-4 w-4" />
              </a>
            )}
          </Link>
        </div>
      </main>
      </div>
      <SiteFooter />
    </div>
  );
}

export default ProductDetailPage;
