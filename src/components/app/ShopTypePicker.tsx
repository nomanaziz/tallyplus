import { useEffect, useState } from "react";
import { type Lang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Store } from "lucide-react";
import * as Icons from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type ShopType = {
  code: string;
  name_bn: string;
  name_en: string;
  icon: string | null;
  default_categories: string[];
  includes_bn?: string | null;
  includes_en?: string | null;
  category_group?: string | null;
};

export function ShopTypePicker({
  value,
  onChange,
  lang = "bn",
  label,
}: {
  value: string | null | undefined;
  onChange: (code: string, type: ShopType) => void;
  lang?: Lang;
  label?: string;
}) {
  const [types, setTypes] = useState<ShopType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("shop_types")
        .select("code,name_bn,name_en,icon,default_categories,includes_bn,includes_en,category_group")
        .eq("is_active", true)
        .eq("is_group_head", true)
        .order("sort_order");
      if (cancelled) return;
      setTypes((data as ShopType[]) ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-select default "General Retail" if nothing chosen yet
  useEffect(() => {
    if (!value && types.length > 0) {
      const def = types.find((x) => x.code === "group_retail") ?? types[0];
      if (def) onChange(def.code, def);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [types]);

  const selected = types.find((t) => t.code === value) ?? null;
  const includes = selected ? (lang === "bn" ? selected.includes_bn : selected.includes_en) : null;

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      {loading ? (
        <div className="h-10 animate-pulse rounded-md border bg-muted/40" />
      ) : (
        <>
          <Select
            value={value ?? undefined}
            onValueChange={(code) => {
              const tp = types.find((t) => t.code === code);
              if (tp) onChange(tp.code, tp);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={lang === "bn" ? "দোকানের ধরন বাছাই করুন" : "Select shop type"} />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {types.map((tp) => {
                const IconComp =
                  (tp.icon && (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[tp.icon]) || Store;
                return (
                  <SelectItem key={tp.code} value={tp.code}>
                    <span className="inline-flex items-center gap-2">
                      <IconComp className="h-4 w-4" />
                      {lang === "bn" ? tp.name_bn : tp.name_en}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {includes && (
            <p className="text-xs leading-snug text-muted-foreground">{includes}</p>
          )}
        </>
      )}
    </div>
  );
}