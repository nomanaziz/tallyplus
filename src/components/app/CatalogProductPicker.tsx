import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Loader2, Package, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export type CatalogProduct = {
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
  shop_types: string[];
};

export function CatalogProductPicker({
  value,
  onChange,
  onSelect,
  shopTypeCode,
  placeholder,
  className,
  inputClassName,
  autoFocus,
}: {
  value: string;
  onChange: (text: string) => void;
  onSelect: (product: CatalogProduct) => void;
  shopTypeCode?: string | null;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  autoFocus?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search
  useEffect(() => {
    const q = value.trim().toLowerCase();
    if (q.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    const handle = setTimeout(async () => {
      let query = supabase
        .from("marketplace_products")
        .select("id,name_bn,name_en,brand,pack_size,category,base_unit,default_price,default_cost,image_url,barcode,shop_types")
        .eq("is_active", true)
        .or(`search_text.ilike.%${q}%,barcode.eq.${q}`)
        .limit(8);
      if (shopTypeCode) {
        // include products tagged with this shop type OR with no shop type tag (universal)
        query = query.or(`shop_types.cs.{${shopTypeCode}},shop_types.eq.{}`);
      }
      const { data } = await query;
      setResults((data as CatalogProduct[]) ?? []);
      setLoading(false);
      setOpen(true);
    }, 250);
    return () => clearTimeout(handle);
  }, [value, shopTypeCode]);

  // Close on outside click
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pick = (p: CatalogProduct) => {
    onSelect(p);
    setOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => value.trim().length >= 2 && setOpen(true)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={inputClassName}
      />
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-auto rounded-md border bg-popover shadow-lg">
          {loading && results.length === 0 ? (
            <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> খুঁজছি...
            </div>
          ) : results.length === 0 ? (
            <div className="px-3 py-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                <span>"{value}" — নতুন পণ্য হিসেবে ব্যবহার করুন</span>
              </div>
            </div>
          ) : (
            <ul className="py-1">
              {results.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => pick(p)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-accent"
                  >
                    {p.image_url ? (
                      <img src={p.image_url} alt="" className="h-10 w-10 flex-none rounded object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 flex-none items-center justify-center rounded bg-muted">
                        <Package className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {p.name_bn}
                        {p.pack_size && <span className="ml-1 text-xs text-muted-foreground">({p.pack_size})</span>}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {p.name_en}
                        {p.brand && <span> • {p.brand}</span>}
                        {p.category && <span> • {p.category}</span>}
                      </div>
                    </div>
                    {p.default_price ? (
                      <div className="flex-none text-sm font-semibold">৳ {p.default_price}</div>
                    ) : null}
                  </button>
                </li>
              ))}
              <li className="border-t">
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  <Plus className="mr-1 inline h-3 w-3" />
                  "{value}" — নতুন পণ্য হিসেবে রাখুন
                </div>
              </li>
            </ul>
          )}
        </div>
      )}
    </div>
  );
}