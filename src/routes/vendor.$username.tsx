import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MapPin, Phone, ShoppingBag, Store, MessageCircle, Facebook, Info, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketplaceProductCard } from "@/components/marketplace/MarketplaceProductCard";

const RESERVED = new Set([
  "app","admin","auth","shop","shops","api","pricing","affiliate","f","_",
  "login","signup","register","logout","dashboard","contact","about","help",
  "support","terms","privacy","blog","docs","pages","static","public","assets",
  "marketplace","store","stores","favicon.ico","robots.txt","sitemap.xml","manifest.webmanifest",
]);

type Shop = {
  id: string; name: string; username: string | null; slug: string | null; logo_url: string | null;
  wishlist_slug?: string | null;
  cover_url: string | null; tagline: string | null; address: string | null; phone: string | null;
  about: string | null; terms_and_conditions: string | null; return_policy: string | null;
  shipping_policy: string | null; facebook_url: string | null; whatsapp_number: string | null;
  meta_description: string | null;
};
type Listing = { id: string; product_id: string; price: number; stock: number; unit: string | null; min_order: number | null; warranty_months: number | null };
type Product = { id: string; name: string; image_url: string | null; unit: string | null };

type LoaderData = { shop: Shop; listings: Listing[]; products: Record<string, Product> };

export const Route = createFileRoute("/vendor/$username")({
  loader: async ({ params }): Promise<LoaderData> => {
    const u = params.username.toLowerCase();
    if (RESERVED.has(u) || !/^[a-z0-9][a-z0-9_-]{2,31}$/.test(u)) throw notFound();
    const { data, error } = await supabase.functions.invoke("marketplace-public", {
      body: { action: "shop-by-username", username: u },
    });
    if (error || !data || (data as { error?: string }).error) throw notFound();
    const d = data as LoaderData;
    if (!d.shop) throw notFound();
    return d;
  },
  head: ({ loaderData }) => {
    const s = loaderData?.shop;
    if (!s) return { meta: [{ title: "Tally Plus" }] };
    const desc = s.meta_description || s.tagline || s.about || `${s.name} — অনলাইন দোকান`;
    return {
      meta: [
        { title: `${s.name} — Tally Plus` },
        { name: "description", content: desc },
        { property: "og:title", content: s.name },
        { property: "og:description", content: desc },
        ...(s.logo_url ? [{ property: "og:image", content: s.logo_url }] : []),
      ],
    };
  },
  notFoundComponent: () => (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
      <Store className="h-12 w-12 text-muted-foreground" />
      <p className="text-lg font-semibold">দোকান পাওয়া যায়নি</p>
      <Link to="/" className="text-primary hover:underline">হোম পেজে ফিরুন</Link>
    </div>
  ),
  errorComponent: () => (
    <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
  ),
  component: PublicShopPage,
});

function PublicShopPage() {
  const { shop, listings, products } = Route.useLoaderData();
  const rawWishlistSlug = shop.wishlist_slug;
  const wishlistSlug =
    typeof rawWishlistSlug === "string" && rawWishlistSlug.trim().length > 0
      ? rawWishlistSlug.trim()
      : null;

  // Log a visit (fire & forget)
  useEffect(() => {
    void supabase.functions.invoke("marketplace-public", {
      body: { action: "log-visit", shop_id: shop.id },
    });
  }, [shop.id]);

  return (
    <div className="min-h-screen bg-background">
      {/* Cover */}
      <section className="relative">
        <div className="h-40 w-full bg-gradient-to-br from-primary/20 to-primary/5 sm:h-56">
          {shop.cover_url && <img src={shop.cover_url} alt="" className="h-full w-full object-cover" />}
        </div>
        <div className="container mx-auto px-4">
          <div className="-mt-12 flex flex-col items-start gap-4 sm:-mt-16 sm:flex-row sm:items-end">
            <div className="h-24 w-24 overflow-hidden rounded-2xl border-4 border-background bg-card shadow-md sm:h-32 sm:w-32">
              {shop.logo_url ? (
                <img src={shop.logo_url} alt={shop.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground"><Store className="h-10 w-10" /></div>
              )}
            </div>
            <div className="min-w-0 flex-1 pb-2">
              <h1 className="text-2xl font-bold sm:text-3xl">{shop.name}</h1>
              {shop.tagline && <p className="mt-1 text-sm text-muted-foreground">{shop.tagline}</p>}
            </div>
            <div className="flex gap-2 pb-2">
              {shop.whatsapp_number && (
                <Button asChild size="sm" variant="outline">
                  <a href={`https://wa.me/${shop.whatsapp_number.replace(/\D/g, "")}`} target="_blank" rel="noopener">
                    <MessageCircle className="mr-1 h-4 w-4" /> WhatsApp
                  </a>
                </Button>
              )}
              {shop.facebook_url && (
                <Button asChild size="sm" variant="outline">
                  <a href={shop.facebook_url} target="_blank" rel="noopener">
                    <Facebook className="mr-1 h-4 w-4" /> Facebook
                  </a>
                </Button>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
            {shop.address && <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" />{shop.address}</span>}
            {shop.phone && (
              <a href={`tel:${shop.phone}`} className="inline-flex items-center gap-1.5 hover:text-primary">
                <Phone className="h-4 w-4" />{shop.phone}
              </a>
            )}
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-8">
        {/* Primary CTA: Send a ফর্দ */}
        <section className="mb-6 overflow-hidden rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-background p-5 shadow-sm">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                <FileText className="h-4 w-4" /> ফর্দ পাঠান
              </div>
              <h2 className="mt-1 text-lg font-extrabold leading-tight sm:text-xl">
                বাজারের তালিকা পাঠান, দোকানদার দাম জানিয়ে দিবেন
              </h2>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                সরাসরি লিখুন বা মাইক চেপে কথা বলে ফর্দ বানান। ১ মিনিটেই পাঠানো শেষ।
              </p>
            </div>
            {wishlistSlug ? (
              <Link
                to="/f/$slug"
                params={{ slug: wishlistSlug }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-md hover:bg-primary/90 sm:text-base"
              >
                <FileText className="h-4 w-4" />
                ফর্দ তৈরি করুন
              </Link>
            ) : (
              <span
                title="এই দোকানের ফর্দ লিঙ্ক এখনো সক্রিয় নয়"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-muted px-5 py-3 text-sm font-bold text-muted-foreground sm:text-base"
              >
                <FileText className="h-4 w-4" />
                ফর্দ লিঙ্ক এখনো নেই
              </span>
            )}
          </div>
        </section>

        {shop.about && (
          <section className="mb-6 rounded-xl border bg-card p-4">
            <h2 className="mb-2 flex items-center gap-2 text-base font-semibold"><Info className="h-4 w-4" /> দোকান সম্পর্কে</h2>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{shop.about}</p>
          </section>
        )}

        <h2 className="mb-4 text-lg font-semibold">পণ্যসমূহ ({listings.length})</h2>
        {listings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ShoppingBag className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">এই দোকানে এখনো অনলাইন পণ্য নেই।</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {listings.map((l: Listing) => {
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

        {(shop.terms_and_conditions || shop.return_policy || shop.shipping_policy) && (
          <section className="mt-10 grid gap-4 md:grid-cols-3">
            {shop.terms_and_conditions && (
              <PolicyCard title="শর্ত ও নিয়মাবলী" body={shop.terms_and_conditions} />
            )}
            {shop.return_policy && (
              <PolicyCard title="রিটার্ন/রিফান্ড পলিসি" body={shop.return_policy} />
            )}
            {shop.shipping_policy && (
              <PolicyCard title="ডেলিভারি পলিসি" body={shop.shipping_policy} />
            )}
          </section>
        )}
      </main>

      <footer className="mt-10 border-t bg-muted/40 py-6 text-center text-xs text-muted-foreground">
        Powered by <Link to="/" className="font-semibold text-primary hover:underline">Tally Plus</Link>
      </footer>
    </div>
  );
}

function PolicyCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><FileText className="h-4 w-4" /> {title}</h3>
      <p className="whitespace-pre-wrap text-xs text-muted-foreground">{body}</p>
    </div>
  );
}
