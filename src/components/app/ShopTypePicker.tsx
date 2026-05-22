import { useEffect, useState } from "react";
import { useI18n, type Lang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export type ShopType = {
  code: string;
  name_bn: string;
  name_en: string;
  icon: string | null;
  default_categories: string[];
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
  const { t } = useI18n();
  const [types, setTypes] = useState<ShopType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("shop_types")
        .select("code,name_bn,name_en,icon,default_categories")
        .eq("is_active", true)
        .order("sort_order");
      if (cancelled) return;
      setTypes((data as ShopType[]) ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <Select
        value={value ?? ""}
        onValueChange={(code) => {
          const t = types.find((x) => x.code === code);
          if (t) onChange(code, t);
        }}
      >
        <SelectTrigger className="h-12">
          <SelectValue
            placeholder={
              loading
                ? t("p7_Loading_2")
                : t("p7_Choose_shop_type")
            }
          />
        </SelectTrigger>
        <SelectContent>
          {types.map((t) => (
            <SelectItem key={t.code} value={t.code}>
              {lang === "bn" ? t.name_bn : t.name_en}
              <span className="ml-2 text-xs text-muted-foreground">
                ({lang === "bn" ? t.name_en : t.name_bn})
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}