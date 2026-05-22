import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/lib/shop";
import { useI18n, bnNum } from "@/lib/i18n";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Package, Search, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { ensureDefaultCategories } from "@/lib/default-categories";

type CatalogProduct = {
  id: string;
  name_bn: string;
  name_en: string;
  brand: string | null;
  pack_size: string | null;
  category: string | null;
  base_unit: string | null;
  default_price: number | null;
  default_cost: number | null;
  image_url: string | null;
  barcode: string | null;
};

export function SampleProductImportSheet({
  open,
  onOpenChange,
  onImported,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onImported: () => void;
}) {
  const { lang, t } = useI18n();
  const { current } = useShop();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<CatalogProduct[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const shopType = current?.shop_type_code;
    let q = supabase
      .from("marketplace_products")
      .select("id,name_bn,name_en,brand,pack_size,category,base_unit,default_price,default_cost,image_url,barcode,shop_types")
      .eq("is_active", true)
      .order("category", { ascending: true })
      .limit(2000);
    // Default: filter by current shop's type. If none/empty, show all.
    if (shopType) {
      q = q.or(`shop_types.cs.{${shopType}},shop_types.eq.{}`);
    }
    void q.then(({ data, error }) => {
      if (error) toast.error(error.message);
      const rows = (data as CatalogProduct[] | null) ?? [];
      setItems(rows);
      setLoading(false);
    });
  }, [open, current?.shop_type_code]);

  // Filtered by search across all categories
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (p) =>
        p.name_bn?.toLowerCase().includes(q) ||
        p.name_en?.toLowerCase().includes(q) ||
        (p.brand ?? "").toLowerCase().includes(q) ||
        (p.category ?? "").toLowerCase().includes(q),
    );
  }, [items, search]);

  // Group by category for left list
  const categories = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((p) => {
      const c = p.category ?? (t("p7_Other"));
      map.set(c, (map.get(c) ?? 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [filtered, lang]);

  // Auto-pick first category once data loads / search changes
  useEffect(() => {
    if (categories.length === 0) {
      setActiveCategory(null);
      return;
    }
    if (!activeCategory || !categories.find(([c]) => c === activeCategory)) {
      setActiveCategory(categories[0][0]);
    }
  }, [categories, activeCategory]);

  const visible = useMemo(() => {
    if (!activeCategory) return [];
    return filtered.filter(
      (p) => (p.category ?? (t("p7_Other"))) === activeCategory,
    );
  }, [filtered, activeCategory, lang]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectWholeCategory = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      visible.forEach((p) => next.add(p.id));
      return next;
    });
  };

  const clearAll = () => setSelected(new Set());

  const doImport = async () => {
    if (!current?.id) {
      toast.error(t("p7_Select_a_shop_first"));
      return;
    }
    if (selected.size === 0) return;
    setImporting(true);
    try {
      const picked = items.filter((p) => selected.has(p.id));

      // Ensure all default categories exist before linking products to them.
      await ensureDefaultCategories(current.id);

      // 1) Ensure categories
      const catNames = Array.from(
        new Set(picked.map((p) => p.category).filter((c): c is string => !!c && c.trim().length > 0)),
      );
      const { data: existingCats } = await supabase
        .from("categories")
        .select("id, name")
        .eq("shop_id", current.id)
        .in("name", catNames.length ? catNames : ["__none__"]);
      const catIdByName = new Map<string, string>();
      (existingCats ?? []).forEach((c) => catIdByName.set(c.name, c.id));
      const missing = catNames.filter((n) => !catIdByName.has(n));
      if (missing.length > 0) {
        const { data: created, error: catErr } = await supabase
          .from("categories")
          .insert(missing.map((name) => ({ shop_id: current.id, name })))
          .select("id, name");
        if (catErr) throw catErr;
        (created ?? []).forEach((c) => catIdByName.set(c.name, c.id));
      }

      // 2) Skip products with duplicate barcodes
      const barcodes = picked.map((p) => p.barcode).filter((b): b is string => !!b && b.trim().length > 0);
      let existingBarcodes = new Set<string>();
      if (barcodes.length > 0) {
        const { data: existProds } = await supabase
          .from("products")
          .select("barcode")
          .eq("shop_id", current.id)
          .is("deleted_at", null)
          .in("barcode", barcodes);
        existingBarcodes = new Set((existProds ?? []).map((p) => p.barcode as string));
      }

      const toInsert = picked
        .filter((p) => !(p.barcode && existingBarcodes.has(p.barcode)))
        .map((p) => ({
          shop_id: current.id,
          name: lang === "bn" ? p.name_bn || p.name_en : p.name_en || p.name_bn,
          unit: p.base_unit ?? "pcs",
          cost_price: p.default_cost ?? 0,
          sale_price: p.default_price ?? 0,
          stock: 0,
          barcode: p.barcode ?? null,
          image_url: p.image_url ?? null,
          category_id: p.category ? catIdByName.get(p.category) ?? null : null,
        }));

      const skipped = picked.length - toInsert.length;

      if (toInsert.length > 0) {
        const { error: insErr } = await supabase.from("products").insert(toInsert);
        if (insErr) throw insErr;
      }

      toast.success(
        lang === "bn"
          ? `${bnNum(toInsert.length)} টি পণ্য ইম্পোর্ট হয়েছে${skipped > 0 ? ` (${bnNum(skipped)} টি আগে থেকেই ছিল)` : ""}`
          : `Imported ${toInsert.length} products${skipped > 0 ? ` (${skipped} already existed)` : ""}`,
      );
      setSelected(new Set());
      onOpenChange(false);
      onImported();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-4xl sm:max-w-4xl p-0 flex flex-col">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t("p7_Import_Sample_Products")}
          </SheetTitle>
          <p className="text-xs text-muted-foreground">
            {t("p7_Pick_categories_or_individual_")}
          </p>
        </SheetHeader>

        <div className="border-b px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("p7_Search_name_brand_or_category")}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-[220px_1fr] overflow-hidden">
          {/* Categories */}
          <ScrollArea className="border-b md:border-b-0 md:border-r max-h-48 md:max-h-none">
            {loading ? (
              <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> ...
              </div>
            ) : categories.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">{t("p7_Nothing_found")}</div>
            ) : (
              <ul className="py-1">
                {categories.map(([c, n]) => (
                  <li key={c}>
                    <button
                      type="button"
                      onClick={() => setActiveCategory(c)}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-accent",
                        activeCategory === c && "bg-accent font-semibold",
                      )}
                    >
                      <span className="truncate">{c}</span>
                      <span className="text-xs text-muted-foreground">{lang === "bn" ? bnNum(n) : n}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>

          {/* Products */}
          <div className="flex flex-col overflow-hidden">
            <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
              <div className="text-sm font-medium truncate">
                {activeCategory ?? (t("p7_Category"))}
              </div>
              <Button size="sm" variant="outline" disabled={visible.length === 0} onClick={selectWholeCategory}>
                {t("p7_Add_whole_category")}
              </Button>
            </div>
            <ScrollArea className="flex-1">
              {loading ? (
                <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> ...
                </div>
              ) : visible.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  {t("p7_No_products_in_this_category")}
                </div>
              ) : (
                <ul className="divide-y">
                  {visible.map((p) => {
                    const checked = selected.has(p.id);
                    return (
                      <li
                        key={p.id}
                        className={cn("flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-accent/50", checked && "bg-primary/5")}
                        onClick={() => toggle(p.id)}
                      >
                        <Checkbox checked={checked} onCheckedChange={() => toggle(p.id)} />
                        {p.image_url ? (
                          <img src={p.image_url} alt="" className="h-10 w-10 flex-none rounded object-cover" />
                        ) : (
                          <div className="flex h-10 w-10 flex-none items-center justify-center rounded bg-muted">
                            <Package className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">
                            {lang === "bn" ? p.name_bn : p.name_en}
                            {p.pack_size && <span className="ml-1 text-xs text-muted-foreground">({p.pack_size})</span>}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {p.brand && <span>{p.brand}</span>}
                            {p.brand && p.category && <span> • </span>}
                            {p.category && <span>{p.category}</span>}
                          </div>
                        </div>
                        {p.default_price ? (
                          <div className="flex-none text-sm font-semibold">৳ {p.default_price}</div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </ScrollArea>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t bg-card px-4 py-3">
          <div className="text-sm">
            {t("p7_Selected")}
            <span className="font-semibold">{lang === "bn" ? bnNum(selected.size) : selected.size}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" disabled={selected.size === 0 || importing} onClick={clearAll}>
              {t("p7_Clear_3")}
            </Button>
            <Button onClick={doImport} disabled={selected.size === 0 || importing} className="gap-2">
              {importing && <Loader2 className="h-4 w-4 animate-spin" />}
              {lang === "bn" ? `ইম্পোর্ট (${bnNum(selected.size)})` : `Import (${selected.size})`}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}