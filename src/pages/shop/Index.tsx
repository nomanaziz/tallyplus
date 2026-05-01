import { Link, useSearch, useNavigate } from "@/lib/router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Search, Store, SlidersHorizontal, RotateCcw, ShoppingBag, MapPin, FileText } from "lucide-react";
import { MarketplaceProductCard } from "@/components/marketplace/MarketplaceProductCard";
import { VendorGridSkeleton, ProductGridSkeleton } from "@/components/marketplace/MarketplaceSkeleton";

type Listing = {
  id: string;
  shop_id: string;
  product_id: string;
  price: number;
  stock: number;
  unit: string | null;
  min_order: number | null;
  warranty_months?: number | null;
};
type Shop = { id: string; name: string; slug: string | null; username: string | null; wishlist_slug?: string | null; logo_url: string | null; tagline: string | null; address?: string | null; is_wholesale?: boolean };
type Product = { id: string; name: string; image_url: string | null; unit: string | null };
type ShopType = { code: string; name_bn: string; name_en: string };

type Sort = "newest" | "price_asc" | "price_desc";
type View = "products" | "vendors";
type WholesaleFilter = "all" | "wholesale" | "retail";

type SearchParams = {
  q?: string;
  page?: number;
  min?: number;
  max?: number;
  type?: string[];
  inStock?: boolean;
  sort?: Sort;
  view?: View;
  wholesale?: WholesaleFilter;
};



function MarketplacePage() {
  const rawSearch = useSearch();
  const search = {
    ...rawSearch,
    page: rawSearch.page ? Number(rawSearch.page) : undefined,
    min: rawSearch.min ? Number(rawSearch.min) : undefined,
    max: rawSearch.max ? Number(rawSearch.max) : undefined,
    type: rawSearch.type ? String(rawSearch.type).split(",").filter(Boolean) : undefined,
    inStock: rawSearch.inStock === "true" ? true : rawSearch.inStock === "false" ? false : undefined,
  } as SearchParams;
  const navigate = useNavigate();
  const [q, setQ] = useState(search.q ?? "");
  const [minP, setMinP] = useState(search.min !== undefined ? String(search.min) : "");
  const [maxP, setMaxP] = useState(search.max !== undefined ? String(search.max) : "");
  const [shopTypes, setShopTypes] = useState<ShopType[]>([]);
  const page = search.page ?? 1;
  const pageSize = 24;
  const view: View = (search.view as View) ?? "vendors";

  useEffect(() => {
    void supabase
      .from("shop_types")
      .select("code, name_bn, name_en")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .then(({ data }) => setShopTypes((data as ShopType[] | null) ?? []));
  }, []);

  const typeKey = (search.type ?? []).join(",");

  // Products query — only runs when products view is active
  const productsQ = useQuery({
    queryKey: [
      "marketplace",
      "products",
      search.q ?? "",
      search.min ?? null,
      search.max ?? null,
      search.inStock ?? false,
      search.sort ?? "newest",
      page,
      typeKey,
    ],
    enabled: view === "products",
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("marketplace-public", {
        body: {
          action: "list",
          q: search.q ?? "",
          page,
          pageSize,
          min_price: search.min,
          max_price: search.max,
          shop_type: search.type,
          in_stock: search.inStock ? true : undefined,
          sort: search.sort ?? "newest",
        },
      });
      if (error || !data || (data as { error?: string }).error) {
        return { listings: [] as Listing[], shops: {} as Record<string, Shop>, products: {} as Record<string, Product>, total: 0 };
      }
      return data as { listings: Listing[]; shops: Record<string, Shop>; products: Record<string, Product>; total: number };
    },
  });

  // Vendors query — only runs when vendors view is active
  const vendorsQ = useQuery({
    queryKey: ["marketplace", "vendors", search.q ?? "", page, typeKey, search.wholesale ?? "all"],
    enabled: view === "vendors",
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("marketplace-public", {
        body: {
          action: "list-shops",
          q: search.q ?? "",
          page,
          pageSize,
          shop_type: search.type,
          wholesale:
            search.wholesale === "wholesale" ? "true" :
            search.wholesale === "retail" ? "false" : undefined,
        },
      });
      if (error || !data || (data as { error?: string }).error) {
        return { shops: [] as Shop[], counts: {} as Record<string, number>, total: 0 };
      }
      return data as { shops: Shop[]; counts: Record<string, number>; total: number };
    },
  });

  const listings = productsQ.data?.listings ?? [];
  const shops = productsQ.data?.shops ?? {};
  const products = productsQ.data?.products ?? {};
  const total = productsQ.data?.total ?? 0;
  const loading = productsQ.isLoading;

  const vendors = vendorsQ.data?.shops ?? [];
  const vendorCounts = vendorsQ.data?.counts ?? {};
  const vendorTotal = vendorsQ.data?.total ?? 0;
  const vendorLoading = vendorsQ.isLoading;

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void navigate({ search: (prev) => ({ ...prev, q: q.trim() || undefined, page: 1 }) });
  };

  const applyPrice = () => {
    const min = minP === "" ? undefined : Number(minP);
    const max = maxP === "" ? undefined : Number(maxP);
    void navigate({
      search: (prev) => ({
        ...prev,
        min: Number.isFinite(min as number) ? (min as number) : undefined,
        max: Number.isFinite(max as number) ? (max as number) : undefined,
        page: 1,
      }),
    });
  };

  const toggleType = (code: string, checked: boolean) => {
    void navigate({
      search: (prev) => {
        const cur = new Set(prev.type ?? []);
        if (checked) cur.add(code);
        else cur.delete(code);
        const next = Array.from(cur);
        return { ...prev, type: next.length > 0 ? next : undefined, page: 1 };
      },
    });
  };

  const setInStock = (v: boolean) => {
    void navigate({ search: (prev) => ({ ...prev, inStock: v ? true : undefined, page: 1 }) });
  };

  const setSort = (v: Sort) => {
    void navigate({ search: (prev) => ({ ...prev, sort: v === "newest" ? undefined : v, page: 1 }) });
  };

  const reset = () => {
    setQ("");
    setMinP("");
    setMaxP("");
    void navigate({ search: () => ({ page: 1 }) });
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const vendorTotalPages = Math.max(1, Math.ceil(vendorTotal / pageSize));
  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (search.min !== undefined) n++;
    if (search.max !== undefined) n++;
    if (search.type && search.type.length > 0) n += search.type.length;
    if (search.inStock) n++;
    if (search.sort && search.sort !== "newest") n++;
    return n;
  }, [search]);

  const filterPanel = (
    <div className="space-y-6">
      <div>
        <Label className="mb-2 block text-sm font-semibold">মূল্যসীমা (৳)</Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            inputMode="numeric"
            placeholder="সর্বনিম্ন"
            value={minP}
            onChange={(e) => setMinP(e.target.value)}
            className="h-9"
          />
          <span className="text-muted-foreground">–</span>
          <Input
            type="number"
            inputMode="numeric"
            placeholder="সর্বোচ্চ"
            value={maxP}
            onChange={(e) => setMaxP(e.target.value)}
            className="h-9"
          />
        </div>
        <Button size="sm" variant="outline" className="mt-2 w-full" onClick={applyPrice}>
          মূল্য প্রয়োগ করুন
        </Button>
      </div>

      <div className="flex items-center justify-between rounded-lg border bg-card p-3">
        <Label htmlFor="instock" className="text-sm font-medium">শুধু স্টকে আছে</Label>
        <Switch id="instock" checked={!!search.inStock} onCheckedChange={setInStock} />
      </div>

      <div>
        <Label className="mb-2 block text-sm font-semibold">সাজান</Label>
        <Select value={search.sort ?? "newest"} onValueChange={(v) => setSort(v as Sort)}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">নতুন আগে</SelectItem>
            <SelectItem value="price_asc">দাম: কম থেকে বেশি</SelectItem>
            <SelectItem value="price_desc">দাম: বেশি থেকে কম</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {shopTypes.length > 0 && (
        <div>
          <Label className="mb-2 block text-sm font-semibold">দোকানের ধরন</Label>
          <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {shopTypes.map((t) => {
              const checked = (search.type ?? []).includes(t.code);
              return (
                <label key={t.code} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-accent">
                  <Checkbox checked={checked} onCheckedChange={(v) => toggleType(t.code, !!v)} />
                  <span className="truncate">{t.name_bn}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      <Button variant="ghost" size="sm" className="w-full gap-2" onClick={reset}>
        <RotateCcw className="h-4 w-4" /> সব ফিল্টার রিসেট
      </Button>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <div className="flex-1">

      <div className="border-b bg-card/40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold">মার্কেটপ্লেস</h1>
          </div>
          <form onSubmit={submitSearch} className="mt-3 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="পণ্য বা দোকান খুঁজুন…"
                className="h-10 pl-9"
              />
            </div>
            <Button type="submit" className="h-10">খুঁজুন</Button>
            <Sheet>
              <SheetTrigger asChild>
                <Button type="button" variant="outline" className="h-10 gap-2 lg:hidden">
                  <SlidersHorizontal className="h-4 w-4" />
                  ফিল্টার{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>ফিল্টার</SheetTitle>
                </SheetHeader>
                <div className="mt-4">{filterPanel}</div>
              </SheetContent>
            </Sheet>
          </form>

          {/* View tabs */}
          <div className="mt-3">
            <Tabs
              value={view}
              onValueChange={(v) =>
                navigate({ search: (prev) => ({ ...prev, view: v === "products" ? "products" : undefined, page: 1 }) })
              }
            >
              <TabsList className="h-9">
                <TabsTrigger value="vendors" className="gap-1.5">
                  <Store className="h-3.5 w-3.5" /> দোকান
                </TabsTrigger>
                <TabsTrigger value="products" className="gap-1.5">
                  <ShoppingBag className="h-3.5 w-3.5" /> পণ্য
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Wholesale / Retail quick filter (only on vendor view) */}
          {view === "vendors" && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
              {([
                { v: undefined, label: "সব দোকান" },
                { v: "retail" as const, label: "খুচরা" },
                { v: "wholesale" as const, label: "পাইকারি" },
              ]).map((opt) => {
                const active = (search.wholesale ?? undefined) === opt.v;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() =>
                      navigate({ search: (prev) => ({ ...prev, wholesale: opt.v, page: 1 }) })
                    }
                    className={
                      "rounded-full border px-3 py-1 font-medium transition-colors " +
                      (active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background hover:bg-accent")
                    }
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <main className="container mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Desktop sidebar */}
          <aside className="hidden w-64 flex-none lg:block">
            <div className="sticky top-20 rounded-xl border bg-card p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-bold">
                  <SlidersHorizontal className="h-4 w-4" /> ফিল্টার
                </h2>
                {activeFilterCount > 0 && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    {activeFilterCount}
                  </span>
                )}
              </div>
              {filterPanel}
            </div>
          </aside>

          {/* Results */}
          <section className="min-w-0 flex-1">
            {view === "vendors" ? (
              vendorLoading ? (
                <VendorGridSkeleton count={8} />
              ) : vendors.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Store className="mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="text-lg font-medium">কোনো দোকান পাওয়া যায়নি</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {search.q ? "নাম বদলে চেষ্টা করুন।" : "এখনো কোনো দোকান অনলাইনে যুক্ত হয়নি।"}
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-3 text-sm text-muted-foreground">{vendorTotal} টি দোকান</div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {vendors.map((s) => {
                      // Prefer the clean handle (username → slug → wishlist_slug fallback)
                      const rawSlug = s.wishlist_slug;
                      const wishlistFallback =
                        typeof rawSlug === "string" && rawSlug.trim().length > 0
                          ? rawSlug.trim()
                          : null;
                      const fordoHandle =
                        (s.username && s.username.trim()) ||
                        (s.slug && s.slug.trim()) ||
                        wishlistFallback;
                      const fordoIsLegacy = fordoHandle === wishlistFallback && fordoHandle !== null;
                      return (
                        <div
                          key={s.id}
                          className="flex flex-col rounded-2xl border bg-card p-3 transition-shadow hover:shadow-md"
                        >
                          <Link
                            to={s.username ? "/vendor/$username" : "/shop/s/$slug"}
                            params={s.username ? ({ username: s.username } as never) : ({ slug: s.slug ?? "" } as never)}
                            className="flex items-center gap-3"
                          >
                            <div className="h-14 w-14 flex-none overflow-hidden rounded-full border bg-muted">
                              {s.logo_url ? (
                                <img src={s.logo_url} alt={s.name} className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full items-center justify-center text-muted-foreground">
                                  <Store className="h-7 w-7" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1 text-left">
                              <div className="flex items-center gap-1.5">
                                <div className="line-clamp-1 text-sm font-bold leading-tight">{s.name}</div>
                                {s.is_wholesale && (
                                  <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                    পাইকারি
                                  </span>
                                )}
                              </div>
                              {s.address && (
                                <div className="mt-0.5 line-clamp-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                  <MapPin className="h-3 w-3" />
                                  {s.address}
                                </div>
                              )}
                              <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                <ShoppingBag className="h-3 w-3" />
                                {vendorCounts[s.id] ?? 0} টি পণ্য
                              </div>
                            </div>
                          </Link>
                          <div className="mt-3 flex gap-2">
                            {fordoHandle ? (
                              <Link
                                to={fordoIsLegacy ? "/f/$slug" : "/$slug/forward"}
                                params={{ slug: fordoHandle }}
                                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90"
                              >
                                <FileText className="h-3.5 w-3.5" />
                                ফর্দ পাঠান
                              </Link>
                            ) : (
                              <span
                                title="এই দোকানের ফর্দ লিঙ্ক এখনো সক্রিয় নয়"
                                className="flex flex-1 items-center justify-center rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground"
                              >
                                ফর্দ লিঙ্ক এখনো নেই
                              </span>
                            )}
                            <Link
                              to={s.username ? "/vendor/$username" : "/shop/s/$slug"}
                              params={s.username ? ({ username: s.username } as never) : ({ slug: s.slug ?? "" } as never)}
                              className="flex items-center justify-center rounded-lg border bg-background px-3 py-2 text-xs font-semibold hover:bg-accent"
                            >
                              দোকান
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {vendorTotalPages > 1 && (
                    <div className="mt-8 flex items-center justify-center gap-2">
                      <Button variant="outline" size="sm" disabled={page <= 1}
                        onClick={() => navigate({ search: (prev) => ({ ...prev, page: page - 1 }) })}>
                        পূর্ববর্তী
                      </Button>
                      <span className="text-sm text-muted-foreground">পৃষ্ঠা {page} / {vendorTotalPages}</span>
                      <Button variant="outline" size="sm" disabled={page >= vendorTotalPages}
                        onClick={() => navigate({ search: (prev) => ({ ...prev, page: page + 1 }) })}>
                        পরবর্তী
                      </Button>
                    </div>
                  )}
                </>
              )
            ) : loading ? (
              <ProductGridSkeleton count={10} />
            ) : listings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Store className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-lg font-medium">কোনো পণ্য পাওয়া যায়নি</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {activeFilterCount > 0 || search.q ? "ফিল্টার বদলে আবার চেষ্টা করুন।" : "এখনো কোনো দোকান অনলাইনে যুক্ত হয়নি।"}
                </p>
                {activeFilterCount > 0 && (
                  <Button variant="outline" size="sm" className="mt-4" onClick={reset}>
                    সব ফিল্টার রিসেট
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="mb-3 text-sm text-muted-foreground">
                  {total} টি পণ্য
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                  {listings.map((l) => {
                    const p = products[l.product_id];
                    const s = shops[l.shop_id];
                    if (!p || !s) return null;
                    return (
                      <MarketplaceProductCard
                        key={l.id}
                        listing={l}
                        product={p}
                        shop={s}
                      />
                    );
                  })}
                </div>

                {totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => navigate({ search: (prev) => ({ ...prev, page: page - 1 }) })}
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
                      onClick={() => navigate({ search: (prev) => ({ ...prev, page: page + 1 }) })}
                    >
                      পরবর্তী
                    </Button>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </main>
      </div>
      <SiteFooter />
    </div>
  );
}

export default MarketplacePage;
