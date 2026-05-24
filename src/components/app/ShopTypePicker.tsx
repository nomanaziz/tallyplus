import { useEffect, useState } from "react";
import { useI18n, type Lang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Check, Store } from "lucide-react";
import * as Icons from "lucide-react";

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

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      {loading ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border bg-muted/40" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {types.map((tp) => {
            const selected = value === tp.code;
            const IconComp =
              (tp.icon && (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[tp.icon]) || Store;
            const includes = lang === "bn" ? tp.includes_bn : tp.includes_en;
            return (
              <button
                key={tp.code}
                type="button"
                onClick={() => onChange(tp.code, tp)}
                className={cn(
                  "group relative flex items-start gap-3 rounded-xl border p-3 text-left transition-all hover:border-primary hover:shadow-sm",
                  selected
                    ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                    : "border-border bg-card",
                )}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                    selected ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                  )}
                >
                  <IconComp className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold leading-tight">
                      {lang === "bn" ? tp.name_bn : tp.name_en}
                    </div>
                    {selected && <Check className="h-4 w-4 shrink-0 text-primary" />}
                  </div>
                  {includes && (
                    <p className="mt-1 line-clamp-3 text-xs leading-snug text-muted-foreground">
                      {includes}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}