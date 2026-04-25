import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, bnNum } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/PageHeader";
import { Loader2, Search, ShoppingBag, Store, ShieldCheck, Package } from "lucide-react";

type Listing = {
  id: string;
  shop_id: string;
  product_id: string;
  price: number;
  stock: number;
  unit: string | null;
  min_order: number | null;
  warranty_months: number | null;
};
type Shop = { id: string; name: string; slug: string | null; logo_url: string | null; tagline: string | null };
type Product = { id: string; name: string; image_url: string | null; unit: string | null };

export const Route = createFileRoute("/app/online-shop")({
  head: () => ({ meta: [{ title: "অনলাইন মার্কেটপ্লেস — Hishabee" }] }),
  component: OnlineMarketplacePage,
});

function OnlineMarketplacePage() {
  const { lang } = useI18n();
  const [q, setQ] = useState("");
  const [submittedQ, setSubmittedQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 24;
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<Listing[]>([]);
  const [shops, setShops] = useState<Record<string, Shop>>({});
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void supabase.functions
      .invoke("marketplace-public", {
        body: { action: "list", q: submittedQ, page, pageSize },
      })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setListings([]);
          setTotal(0);
        } else {
          const d = data as {
            listings: Listing[];
            shops: Record<string, Shop>;
            products: Record<string, Product>;
            total: number;
          };
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
  }, [submittedQ, page]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSubmittedQ(q.trim());
  };

  return (
    <div className="container px-4 py-4">
      <PageHeader
        title={lang === "bn" ? "অনলাইন মার্কেটপ্লেস" : "Online Marketplace"}
        subtitle={lang === "bn" ? "সকল দোকানের প্রকাশিত পণ্য এক জায়গায়" : "Published products from all shops"}
      />

      <form onSubmit={submit} className="mt-4 flex max-w-xl items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={lang === "bn" ? "পণ্য বা দোকান খুঁজুন…" : "Search product or shop…"}
            className="pl-9 h-10"
          />
        </div>
        <Button type="submit" className="h-10">{lang === "bn" ? "খুঁজুন" : "Search"}</Button>
      </form>

      <div className="mt-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : listings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <ShoppingBag className="mb-3 h-12 w-12 text-muted-foreground" />
            <p className="text-base font-medium">
              {lang === "bn" ? "কোনো পণ্য পাওয়া যায়নি" : "No products found"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {submittedQ
                ? (lang === "bn" ? "অন্য নাম দিয়ে খুঁজে দেখুন।" : "Try a different search.")
                : (lang === "bn"
                    ? "এখনো কোনো দোকান পণ্য প্রকাশ করেনি।"
                    : "No shops have published products yet.")}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5">
              {listings.map((l) => {
                const p = products[l.product_id];
                const s = shops[l.shop_id];
                if (!p || !s) return null;
                const inStock = Number(l.stock) > 0;
                return (
                  <a
                    key={l.id}
                    href={`/shop/p/${l.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex flex-col rounded-xl border bg-card p-3 transition-shadow hover:shadow-md"
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
                          <Package className="h-10 w-10" />
                        </div>
                      )}
                    </div>
                    <div className="mt-2 line-clamp-2 text-sm font-medium">{p.name}</div>
                    <div className="mt-1 text-base font-bold text-primary">৳ {l.price}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      {inStock ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                          {lang === "bn"
                            ? `স্টক ${bnNum(Number(l.stock))} ${l.unit ?? p.unit ?? ""}`
                            : `Stock ${l.stock} ${l.unit ?? p.unit ?? ""}`}
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          {lang === "bn" ? "স্টক আউট" : "Out of stock"}
                        </span>
                      )}
                      {l.warranty_months ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                          <ShieldCheck className="h-3 w-3" />
                          {lang === "bn"
                            ? `${bnNum(l.warranty_months)} মাস ওয়ারেন্টি`
                            : `${l.warranty_months}mo warranty`}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                      {s.logo_url ? (
                        <img src={s.logo_url} alt="" className="h-4 w-4 rounded-full" />
                      ) : (
                        <Store className="h-3 w-3" />
                      )}
                      <span className="truncate">{s.name}</span>
                    </div>
                  </a>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  {lang === "bn" ? "পূর্ববর্তী" : "Previous"}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {lang === "bn" ? `পৃষ্ঠা ${bnNum(page)} / ${bnNum(totalPages)}` : `Page ${page} / ${totalPages}`}
                </span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  {lang === "bn" ? "পরবর্তী" : "Next"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}