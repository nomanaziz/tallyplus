import { useEffect, useMemo, useState } from "react";
import { Link } from "@/lib/router";
import { supabase } from "@/integrations/supabase/client";
import { Flame, MapPin, Phone, Search, Store, Loader2, Droplet } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

type Shop = {
  id: string; name: string; username: string | null; slug: string | null;
  logo_url: string | null; address: string | null; phone: string | null;
  lpg_tier: string | null; shop_type_code: string | null;
};
type BType = { id: string; shop_id: string; name: string; size_label: string | null; retail_price: number; wholesale_price: number; dealer_price: number; sale_price: number };
type Loc = { shop_id: string; division: string | null; district: string | null; upazila: string | null; area: string | null };

export default function LpgMarketplacePage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [bottles, setBottles] = useState<BType[]>([]);
  const [locs, setLocs] = useState<Loc[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [district, setDistrict] = useState<string>("all");
  const [tier, setTier] = useState<string>("all");
  const [kind, setKind] = useState<string>("all");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [s, b, l] = await Promise.all([
        supabase
          .from("shops")
          .select("id,name,username,slug,logo_url,address,phone,lpg_tier,shop_type_code")
          .eq("list_in_lpg_marketplace", true)
          .order("name"),
        supabase
          .from("bottle_types")
          .select("id,shop_id,name,size_label,retail_price,wholesale_price,dealer_price,sale_price")
          .eq("is_active", true),
        supabase
          .from("seller_locations")
          .select("shop_id,division,district,upazila,area"),
      ]);
      if (cancelled) return;
      setShops((s.data ?? []) as Shop[]);
      setBottles((b.data ?? []) as BType[]);
      setLocs((l.data ?? []) as Loc[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const locByShop = useMemo(() => {
    const m = new Map<string, Loc>();
    for (const x of locs) m.set(x.shop_id, x);
    return m;
  }, [locs]);

  const bottlesByShop = useMemo(() => {
    const m = new Map<string, BType[]>();
    for (const x of bottles) {
      const arr = m.get(x.shop_id) ?? [];
      arr.push(x);
      m.set(x.shop_id, arr);
    }
    return m;
  }, [bottles]);

  const districts = useMemo(() => {
    const set = new Set<string>();
    for (const l of locs) if (l.district) set.add(l.district);
    return Array.from(set).sort();
  }, [locs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return shops.filter((s) => {
      if (q && !s.name.toLowerCase().includes(q)) return false;
      if (tier !== "all" && s.lpg_tier !== tier) return false;
      if (kind === "lpg" && s.shop_type_code !== "lpg_gas") return false;
      if (kind === "water" && s.shop_type_code !== "water_bottle") return false;
      if (district !== "all") {
        const l = locByShop.get(s.id);
        if (l?.district !== district) return false;
      }
      return true;
    });
  }, [shops, search, tier, kind, district, locByShop]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <section className="relative overflow-hidden bg-gradient-to-br from-orange-500 to-rose-600 py-10 text-white">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
              <Flame className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold sm:text-3xl">LPG ও পানির বোতল মার্কেটপ্লেস</h1>
              <p className="text-sm opacity-90">আপনার এলাকার ডিলার / পাইকারি / খুচরা বিক্রেতা খুঁজে নিন</p>
            </div>
          </div>
        </div>
      </section>

      <main className="container mx-auto flex-1 px-4 py-6">
        <div className="grid gap-2 sm:grid-cols-4">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="দোকানের নাম দিয়ে খুঁজুন"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={kind} onValueChange={setKind}>
            <SelectTrigger><SelectValue placeholder="ধরন" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সব ধরন</SelectItem>
              <SelectItem value="lpg">LPG গ্যাস</SelectItem>
              <SelectItem value="water">পানির বোতল</SelectItem>
            </SelectContent>
          </Select>
          <Select value={tier} onValueChange={setTier}>
            <SelectTrigger><SelectValue placeholder="টিয়ার" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সব টিয়ার</SelectItem>
              <SelectItem value="dealer">ডিলার</SelectItem>
              <SelectItem value="wholesale">পাইকারি</SelectItem>
              <SelectItem value="retail">খুচরা</SelectItem>
              <SelectItem value="producer">প্রস্তুতকারক</SelectItem>
            </SelectContent>
          </Select>
          {districts.length > 0 && (
            <Select value={district} onValueChange={setDistrict}>
              <SelectTrigger className="sm:col-span-4"><SelectValue placeholder="জেলা" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সব জেলা</SelectItem>
                {districts.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="mt-10 rounded-xl border border-dashed bg-card p-10 text-center">
            <Store className="mx-auto mb-2 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">এই ফিল্টারে কোনো দোকান পাওয়া যায়নি।</p>
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((s) => {
              const items = bottlesByShop.get(s.id) ?? [];
              const loc = locByShop.get(s.id);
              const isWater = s.shop_type_code === "water_bottle";
              const fordoHandle = (s.username && s.username.trim()) || (s.slug && s.slug.trim()) || null;
              return (
                <div key={s.id} className="flex flex-col rounded-xl border bg-card p-4 shadow-sm hover:shadow-md">
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 flex-none overflow-hidden rounded-lg bg-muted">
                      {s.logo_url ? (
                        <img src={s.logo_url} alt={s.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          {isWater ? <Droplet className="h-5 w-5 text-sky-500" /> : <Flame className="h-5 w-5 text-orange-500" />}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-bold">{s.name}</h3>
                      <div className="mt-0.5 flex flex-wrap gap-1 text-[11px]">
                        {s.lpg_tier && <Badge variant="secondary">{tierLabel(s.lpg_tier)}</Badge>}
                        <Badge variant="outline">{isWater ? "পানি" : "LPG"}</Badge>
                      </div>
                    </div>
                  </div>
                  {(loc?.area || loc?.upazila || loc?.district || s.address) && (
                    <div className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 flex-none" />
                      <span>{[loc?.area, loc?.upazila, loc?.district].filter(Boolean).join(", ") || s.address}</span>
                    </div>
                  )}
                  {items.length > 0 && (
                    <div className="mt-3 space-y-1 border-t pt-2 text-xs">
                      {items.slice(0, 4).map((b) => {
                        const price = priceForTier(b, s.lpg_tier);
                        return (
                          <div key={b.id} className="flex items-center justify-between">
                            <span className="truncate">{b.name}{b.size_label ? ` · ${b.size_label}` : ""}</span>
                            {price > 0 && <span className="font-semibold text-primary">৳{price}</span>}
                          </div>
                        );
                      })}
                      {items.length > 4 && <div className="text-muted-foreground">+ আরও {items.length - 4} ধরন</div>}
                    </div>
                  )}
                  <div className="mt-auto flex gap-2 pt-3">
                    {s.phone && (
                      <Button asChild size="sm" variant="outline" className="flex-1">
                        <a href={`tel:${s.phone}`}><Phone className="mr-1 h-3.5 w-3.5" />কল</a>
                      </Button>
                    )}
                    {fordoHandle && (
                      <Button asChild size="sm" className="flex-1">
                        <Link to="/$slug/fordo" params={{ slug: fordoHandle }}>অর্ডার দিন</Link>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function tierLabel(t: string) {
  return { dealer: "ডিলার", wholesale: "পাইকারি", retail: "খুচরা", producer: "প্রস্তুতকারক" }[t] ?? t;
}
function priceForTier(b: BType, tier: string | null) {
  if (tier === "dealer" && b.dealer_price) return b.dealer_price;
  if (tier === "wholesale" && b.wholesale_price) return b.wholesale_price;
  if (tier === "retail" && b.retail_price) return b.retail_price;
  return b.retail_price || b.sale_price || 0;
}
