import { Link } from "@/lib/router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, bnNum } from "@/lib/i18n";
import { useShop } from "@/lib/shop";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package, Plus, Search, Pencil } from "lucide-react";
import { toast } from "sonner";
import { publishProductToMarketplace } from "@/lib/marketplace-publish";



type Product = {
  id: string;
  name: string;
  image_url: string | null;
  description: string | null;
  unit: string | null;
  sale_price: number;
  stock: number;
  warranty_value: number | null;
  warranty_enabled: boolean;
  is_marketplace_published: boolean;
  is_featured: boolean;
};

type Listing = {
  id: string;
  product_id: string;
  price: number;
  stock: number;
  unit: string | null;
  warranty_months: number | null;
  is_published: boolean;
  is_featured: boolean;
};

function OnlineProductsPage() {
  const { lang } = useI18n();
  const { current } = useShop();
  const qc = useQueryClient();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editingDesc, setEditingDesc] = useState<Product | null>(null);
  const [descText, setDescText] = useState("");

  const shopId = current?.id ?? null;

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["products-for-online", shopId],
    enabled: !!shopId,
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id,name,image_url,description,unit,sale_price,stock,warranty_value,warranty_enabled,is_marketplace_published,is_featured")
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
        .select("id,product_id,price,stock,unit,warranty_months,is_published,is_featured")
        .eq("shop_id", shopId!);
      const map: Record<string, Listing> = {};
      (data as Listing[] | null ?? []).forEach((l) => (map[l.product_id] = l));
      return map;
    },
  });

  const togglePublish = async (p: Product, publish: boolean) => {
    if (!shopId) return;
    setSavingId(p.id);
    const result = await publishProductToMarketplace(
      {
        id: p.id,
        shop_id: shopId,
        sale_price: p.sale_price,
        stock: p.stock,
        unit: p.unit,
        warranty_enabled: p.warranty_enabled,
        warranty_value: p.warranty_value,
      },
      publish,
    );
    if (!result.ok && result.error) toast.error(result.error);
    await qc.invalidateQueries({ queryKey: ["listings-by-product", shopId] });
    await qc.invalidateQueries({ queryKey: ["products-for-online", shopId] });
    setSavingId(null);
    toast.success(lang === "bn" ? (publish ? "অনলাইনে যুক্ত হয়েছে" : "অনলাইন থেকে সরানো হয়েছে") : (publish ? "Published online" : "Unpublished"));
  };

  const toggleFeature = async (p: Product, feature: boolean) => {
    if (!shopId) return;
    setSavingId(p.id);
    await supabase.from("products").update({ is_featured: feature }).eq("id", p.id);
    const existing = listings?.[p.id];
    if (existing) {
      await supabase.from("marketplace_listings").update({ is_featured: feature }).eq("id", existing.id);
    }
    await qc.invalidateQueries({ queryKey: ["products-for-online", shopId] });
    await qc.invalidateQueries({ queryKey: ["listings-by-product", shopId] });
    setSavingId(null);
    toast.success(feature
      ? (lang === "bn" ? "ফিচার্ড করা হয়েছে" : "Marked featured")
      : (lang === "bn" ? "ফিচার্ড সরানো হয়েছে" : "Unfeatured"));
  };

  const saveDescription = async () => {
    if (!editingDesc) return;
    setSavingId(editingDesc.id);
    const { error } = await supabase.from("products").update({ description: descText }).eq("id", editingDesc.id);
    setSavingId(null);
    if (error) { toast.error(error.message); return; }
    await qc.invalidateQueries({ queryKey: ["products-for-online", shopId] });
    toast.success(lang === "bn" ? "বিবরণ সংরক্ষণ" : "Description saved");
    setEditingDesc(null);
  };

  const filtered = useMemo(() => {
    const list = products ?? [];
    const q = search.trim().toLowerCase();
    return q ? list.filter((p) => p.name.toLowerCase().includes(q)) : list;
  }, [products, search]);

  const published = filtered.filter((p) => listings?.[p.id]?.is_published);
  const unpublished = filtered.filter((p) => !listings?.[p.id]?.is_published);

  return (
    <div className="container mx-auto max-w-3xl px-4 py-4">
      <PageHeader
        breadcrumb={`Online-shop / ${lang === "bn" ? "অনলাইন প্রোডাক্ট" : "Online Products"}`}
        title=""
      />

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <Tabs defaultValue="published" className="mt-3">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="published">{lang === "bn" ? "প্রকাশিত" : "PUBLISHED"} ({published.length})</TabsTrigger>
            <TabsTrigger value="unpublished">{lang === "bn" ? "অপ্রকাশিত" : "UNPUBLISHED"} ({unpublished.length})</TabsTrigger>
          </TabsList>

          <div className="mt-3 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={lang === "bn" ? "প্রোডাক্ট খুঁজুন" : "Search Product"} className="pl-9" />
            </div>
            <Button asChild size="icon"><Link to="/app/products"><Plus className="h-4 w-4" /></Link></Button>
          </div>

          <TabsContent value="published" className="mt-3 space-y-2">
            {published.length === 0 ? <EmptyState lang={lang} /> : published.map((p) => (
              <ProductCard key={p.id} p={p} listing={listings?.[p.id]} saving={savingId === p.id} lang={lang}
                onTogglePublish={(v) => togglePublish(p, v)}
                onToggleFeature={(v) => toggleFeature(p, v)}
                onEditDesc={() => { setEditingDesc(p); setDescText(p.description ?? ""); }}
              />
            ))}
          </TabsContent>
          <TabsContent value="unpublished" className="mt-3 space-y-2">
            {unpublished.length === 0 ? <EmptyState lang={lang} /> : unpublished.map((p) => (
              <ProductCard key={p.id} p={p} listing={listings?.[p.id]} saving={savingId === p.id} lang={lang}
                onTogglePublish={(v) => togglePublish(p, v)}
                onToggleFeature={(v) => toggleFeature(p, v)}
                onEditDesc={() => { setEditingDesc(p); setDescText(p.description ?? ""); }}
              />
            ))}
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={!!editingDesc} onOpenChange={(o) => { if (!o) setEditingDesc(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{lang === "bn" ? "বিবরণ সম্পাদনা" : "Edit Description"}</DialogTitle>
          </DialogHeader>
          <div className="text-sm font-medium">{editingDesc?.name}</div>
          <Textarea value={descText} onChange={(e) => setDescText(e.target.value)} rows={6} placeholder={lang === "bn" ? "পণ্যের বিবরণ" : "Product description"} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingDesc(null)}>{lang === "bn" ? "বাতিল" : "Cancel"}</Button>
            <Button onClick={saveDescription} disabled={!!savingId}>{savingId && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{lang === "bn" ? "সংরক্ষণ" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmptyState({ lang }: { lang: string }) {
  return (
    <div className="flex flex-col items-center py-10 text-center">
      <Package className="h-10 w-10 text-muted-foreground" />
      <p className="mt-2 text-sm text-muted-foreground">
        {lang === "bn" ? "কোনো পণ্য নেই" : "No products"}
      </p>
    </div>
  );
}

function ProductCard({ p, listing, saving, lang, onTogglePublish, onToggleFeature, onEditDesc }: {
  p: Product; listing: Listing | undefined; saving: boolean; lang: string;
  onTogglePublish: (v: boolean) => void; onToggleFeature: (v: boolean) => void; onEditDesc: () => void;
}) {
  const isPub = !!listing?.is_published;
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="flex items-start gap-3">
        <div className="h-14 w-14 flex-none overflow-hidden rounded-lg bg-muted">
          {p.image_url ? <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" /> :
            <div className="grid h-full place-items-center"><Package className="h-6 w-6 text-muted-foreground" /></div>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold">{p.name}</div>
          <Badge variant={isPub ? "default" : "secondary"} className="mt-1 h-5 text-[10px]">
            {isPub ? (lang === "bn" ? "প্রকাশিত" : "Published") : (lang === "bn" ? "অপ্রকাশিত" : "Unpublished")}
          </Badge>
        </div>
        <div className="flex flex-col items-end gap-1.5 text-xs">
          <div className="flex items-center gap-2"><span>{lang === "bn" ? "প্রকাশ" : "Publish"}</span>
            <Switch checked={isPub} disabled={saving} onCheckedChange={onTogglePublish} />
          </div>
          <div className="flex items-center gap-2"><span>{lang === "bn" ? "ফিচার" : "Feature"}</span>
            <Switch checked={!!p.is_featured} disabled={saving || !isPub} onCheckedChange={onToggleFeature} />
          </div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 divide-x rounded-md border bg-muted/40 px-2 py-2 text-center text-xs">
        <div>
          <div className="text-muted-foreground">{lang === "bn" ? "বিক্রয় মূল্য" : "Sell Price"}</div>
          <div className="mt-0.5 font-semibold">৳ {lang === "bn" ? bnNum(p.sale_price) : p.sale_price}</div>
        </div>
        <div>
          <div className="text-muted-foreground">{lang === "bn" ? "স্টক" : "Stock"}</div>
          <div className={`mt-0.5 font-semibold ${p.stock < 0 ? "text-primary" : p.stock > 0 ? "" : "text-destructive"}`}>
            {p.stock < 0 ? (lang === "bn" ? "অসীম" : "Unlimited") : (lang === "bn" ? bnNum(p.stock) : p.stock)}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">{lang === "bn" ? "বিবরণ" : "Description"}</div>
          <button type="button" onClick={onEditDesc} className="mt-0.5 inline-flex items-center gap-1 text-primary">
            <Pencil className="h-3 w-3" /> {lang === "bn" ? "এডিট" : "Edit Description"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default OnlineProductsPage;
