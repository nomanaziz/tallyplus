import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";

type Brand = { id: string; name: string; name_bn: string | null; shop_id: string | null; is_global: boolean };

export function BrandCombobox({
  value,
  shopId,
  onChange,
  placeholder,
}: {
  value: string;
  shopId: string | null;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const q = supabase
        .from("product_brands")
        .select("id,name,name_bn,shop_id,is_global")
        .order("name");
      const { data } = await q;
      if (!cancelled) setBrands((data as Brand[] | null) ?? []);
    })();
    return () => { cancelled = true; };
  }, [shopId]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const v = (value ?? "").trim();
  const filtered = useMemo(() => {
    if (!v) return brands.slice(0, 30);
    const lo = v.toLowerCase();
    return brands
      .filter((b) => b.name.toLowerCase().includes(lo) || (b.name_bn ?? "").toLowerCase().includes(lo))
      .slice(0, 30);
  }, [brands, v]);

  const exact = brands.some((b) => b.name.toLowerCase() === v.toLowerCase());

  const createNew = async () => {
    if (!shopId || !v || creating) return;
    setCreating(true);
    const { data, error } = await supabase
      .from("product_brands")
      .insert({ name: v, shop_id: shopId, is_global: false })
      .select("id,name,name_bn,shop_id,is_global")
      .maybeSingle();
    setCreating(false);
    if (!error && data) {
      setBrands((p) => [...p, data as Brand]);
      onChange((data as Brand).name);
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <Input
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder ?? "ব্র্যান্ড / কোম্পানি (optional)"}
      />
      {open && (filtered.length > 0 || (v && !exact && shopId)) && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md">
          {filtered.map((b) => (
            <button
              key={b.id}
              type="button"
              className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
              onClick={() => { onChange(b.name); setOpen(false); }}
            >
              <span className="truncate">{b.name}{b.name_bn ? ` / ${b.name_bn}` : ""}</span>
              {b.is_global && <span className="ml-2 text-[10px] text-muted-foreground">global</span>}
            </button>
          ))}
          {v && !exact && shopId && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              disabled={creating}
              onClick={createNew}
            >
              {creating ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-1 h-3.5 w-3.5" />}
              "{v}" নতুন ব্র্যান্ড হিসেবে যোগ করুন
            </Button>
          )}
        </div>
      )}
    </div>
  );
}