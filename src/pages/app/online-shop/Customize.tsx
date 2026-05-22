import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useShop } from "@/lib/shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import { Link } from "@/lib/router";
import { ArrowLeft } from "lucide-react";



const FONTS = ["Inter", "Roboto", "Poppins", "Hind Siliguri", "Noto Sans Bengali", "Open Sans"];

type ThemeRow = {
  theme_primary_color: string | null;
  theme_secondary_color: string | null;
  theme_border_radius: number | null;
  theme_font_family: string | null;
  theme_card_variant: string | null;
  theme_card_shape: string | null;
};

function CustomizePage() {
  const { lang, t } = useI18n();
  const { current } = useShop();
  const shopId = current?.id ?? null;
  const [primary, setPrimary] = useState("#1ca301");
  const [secondary, setSecondary] = useState("#ff324d");
  const [radius, setRadius] = useState(0);
  const [font, setFont] = useState("Inter");
  const [variant, setVariant] = useState<"primary" | "secondary">("primary");
  const [shape, setShape] = useState<"round" | "square" | "pill">("square");
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["shop-theme", shopId],
    enabled: !!shopId,
    queryFn: async () => {
      const { data } = await supabase.from("shops")
        .select("theme_primary_color,theme_secondary_color,theme_border_radius,theme_font_family,theme_card_variant,theme_card_shape" as string)
        .eq("id", shopId!).maybeSingle();
      return data as ThemeRow | null;
    },
  });

  useEffect(() => {
    if (!data) return;
    setPrimary(data.theme_primary_color || "#1ca301");
    setSecondary(data.theme_secondary_color || "#ff324d");
    setRadius(data.theme_border_radius ?? 0);
    setFont(data.theme_font_family || "Inter");
    setVariant((data.theme_card_variant as "primary" | "secondary") || "primary");
    setShape((data.theme_card_shape as "round" | "square" | "pill") || "square");
  }, [data]);

  const save = async () => {
    if (!shopId) return;
    setSaving(true);
    const { error } = await supabase.from("shops").update({
      theme_primary_color: primary,
      theme_secondary_color: secondary,
      theme_border_radius: radius,
      theme_font_family: font,
      theme_card_variant: variant,
      theme_card_shape: shape,
    } as never).eq("id", shopId);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t("p6_Saved_2"));
  };

  const accent = variant === "primary" ? primary : secondary;
  const shapeRadius = shape === "round" ? Math.max(radius, 16) : shape === "pill" ? 9999 : 0;
  const effectiveRadius = shape === "square" ? 0 : shapeRadius;

  return (
    <div className="container mx-auto max-w-4xl px-4 pb-24">
      <div className="flex items-center gap-2 pt-3">
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <Link to="/app/online-shop">
            <ArrowLeft className="h-4 w-4" /> {t("p6_Back_to_Online_Shop")}
          </Link>
        </Button>
      </div>
      <div className="mt-3 space-y-4">
        <h1 className="text-xl font-bold">{t("p6_Customization")}</h1>

        {/* Colors */}
        <Section title={t("p6_Colors")}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ColorField label={t("p6_Primary_color")} value={primary} onChange={setPrimary} />
            <ColorField label={t("p6_Secondary_color")} value={secondary} onChange={setSecondary} />
          </div>
        </Section>

        {/* Border radius */}
        <Section title={t("p6_Border_radius")}>
          <Label className="text-xs text-muted-foreground">{t("p6_Value")}</Label>
          <div className="mt-2 flex items-center gap-3">
            <Slider value={[radius]} min={0} max={32} step={1} onValueChange={(v) => setRadius(v[0])} className="flex-1" />
            <div className="w-16 text-right text-sm font-semibold">{radius}px</div>
            <Button variant="default" size="sm">{t("p6_Preview")}</Button>
          </div>
        </Section>

        {/* Font */}
        <Section title={t("p6_Font")}>
          <Label className="text-xs text-muted-foreground">{t("p6_Font_family")}</Label>
          <Select value={font} onValueChange={setFont}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Select a font" /></SelectTrigger>
            <SelectContent>{FONTS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
          </Select>
        </Section>

        {/* Product card variants */}
        <Section title={t("p6_Product_Cards_Variants")} right={
          <div className="inline-flex rounded-md border p-0.5 text-xs">
            <button onClick={() => setVariant("primary")} className={`rounded px-3 py-1 ${variant === "primary" ? "bg-primary text-primary-foreground" : ""}`}>Primary</button>
            <button onClick={() => setVariant("secondary")} className={`rounded px-3 py-1 ${variant === "secondary" ? "bg-primary text-primary-foreground" : ""}`}>Secondary</button>
          </div>
        }>
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3" style={{ fontFamily: font }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="border bg-background p-3" style={{ borderRadius: effectiveRadius }}>
                <div className="aspect-square w-full bg-muted" style={{ borderRadius: effectiveRadius }} />
                <div className="mt-2 text-xs text-muted-foreground">CATEGORY</div>
                <div className="text-sm font-bold">Sample Product {i}</div>
                <div className="mt-1 text-base font-extrabold" style={{ color: accent }}>৳ {99 + i * 10}</div>
                <button className="mt-2 w-full py-1.5 text-xs font-bold text-white" style={{ background: accent, borderRadius: effectiveRadius }}>
                  {t("p6_Add_to_cart")}
                </button>
              </div>
            ))}
          </div>
        </Section>

        {/* Card shape */}
        <Section title={t("p6_Card_Shape")}>
          <div className="grid grid-cols-3 gap-3">
            {(["round", "square", "pill"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setShape(s)}
                className={`flex flex-col items-center gap-2 rounded-lg border p-3 text-xs font-semibold transition-colors ${shape === s ? "border-primary bg-primary/5 text-primary" : "text-muted-foreground hover:bg-muted/40"}`}
              >
                <div
                  className="h-10 w-16 bg-muted-foreground/20"
                  style={{ borderRadius: s === "round" ? 16 : s === "pill" ? 9999 : 0 }}
                />
                <span className="capitalize">{s}</span>
              </button>
            ))}
          </div>
        </Section>
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t bg-background p-3">
        <div className="mx-auto max-w-4xl">
          <Button className="w-full" onClick={save} disabled={saving}>{t("p6_Save_2")}</Button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
        {right}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="mt-1 flex items-center gap-2 rounded-md border px-2 py-1">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-7 w-9 cursor-pointer rounded border" />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="border-0 px-1 shadow-none focus-visible:ring-0" />
      </div>
    </div>
  );
}
export default CustomizePage;
