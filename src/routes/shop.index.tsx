import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, Store, ShoppingBag } from "lucide-react";

type Listing = {
  id: string;
  shop_id: string;
  product_id: string;
  price: number;
  stock: number;
  unit: string | null;
  min_order: number | null;
};
type Shop = { id: string; name: string; slug: string | null; logo_url: string | null; tagline: string | null };
type Product = { id: string; name: string; image_url: string | null; unit: string | null };

type SearchParams = { q?: string; page?: number };

export const Route = createFileRoute("/shop/")({
  head: () => ({
    meta: [
      { title: "মার্কেটপ্লেস — Tally Plus" },
      { name: "description", content: "স্থানীয় দোকান থেকে অনলাইনে কেনাকাটা করুন।" },
      { property: "og:title", content: "Tally Plus মার্কেটপ্লেস" },
      { property: "og:description", content: "প্রিয় দোকান থেকে ফর্দ পাঠান।" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    q: typeof s.q === "string" ? s.q : undefined,
    page: typeof s.page === "number" ? s.page : typeof s.page === "string" ? Number(s.page) || 1 : 1,
  }),
  component: MarketplacePage,
});

function MarketplacePage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [q, setQ] = useState(search.q ?? "");
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<Listing[]>([]);
  const [shops, setShops] = useState<Record<string, Shop>>({});
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [total, setTotal] = useState(0);
  const page = search.page ?? 1;
  const pageSize = 24;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void supabase.functions
      .invoke("marketplace-public", {
        body: { action: "list", q: search.q ?? "", page, pageSize },
      })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data || (data as { error?: string }).error) {
          setListings([]);
          setTotal(0);
        } else {
          const d = data as { listings: Listing[]; shops: Record<string, Shop>; products: Record<string, Product>; total: number };
          setListings(d.listings ?? []);
          setShops(d.shops ?? {});
          setProducts(d.products ?? {});
          setTotal(d.total ?? 0);
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [search.q, page]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void navigate({ to: "/shop", search: { q: q.trim() || undefined, page: 1 } });
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-card/85 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
          <Link to="/shop" className="flex items-center gap-2 font-bold">
            <ShoppingBag className="h-5 w-5 text-primary" />
            মার্কেটপ্লেস
          </Link>
          <form onSubmit={submitSearch} className="flex flex-1 max-w-md items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="পণ্য বা দোকান খুঁজুন…"
                className="pl-9"
              />
            </div>
            <Button type="submit" size="sm">খুঁজুন</Button>
          </form>
          <Link to="/auth" className="text-sm font-medium text-primary hover:underline whitespace-nowrap">
            লগইন
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : listings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Store className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">কোনো পণ্য পাওয়া যায়নি</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {search.q ? "অন্য নাম দিয়ে খুঁজে দেখুন।" : "এখনো কোনো দোকান অনলাইনে যুক্ত হয়নি।"}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {listings.map((l) => {
                const p = products[l.product_id];
                const s = shops[l.shop_id];
                if (!p || !s) return null;
                return (
                  <Link
                    key={l.id}
                    to="/shop/p/$id"
                    params={{ id: l.id }}
                    className="group rounded-xl border bg-card p-3 transition-shadow hover:shadow-md"
                  >
                    <div className="aspect-square overflow-hidden rounded-lg bg-muted">
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt={p.name}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground">
                          <ShoppingBag className="h-10 w-10" />
                        </div>
                      )}
                    </div>
                    <div className="mt-2 line-clamp-2 text-sm font-medium">{p.name}</div>
                    <div className="mt-1 text-base font-bold text-primary">৳ {l.price}</div>
                    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      {s.logo_url ? (
                        <img src={s.logo_url} alt="" className="h-4 w-4 rounded-full" />
                      ) : (
                        <Store className="h-3 w-3" />
                      )}
                      <span className="truncate">{s.name}</span>
                    </div>
                  </Link>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => navigate({ to: "/shop", search: { q: search.q, page: page - 1 } })}
                >
                  পূর্ববর্তী
                </Button>
                <span className="text-sm text-muted-foreground">
                  পৃষ্ঠা {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => navigate({ to: "/shop", search: { q: search.q, page: page + 1 } })}
                >
                  পরবর্তী
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
