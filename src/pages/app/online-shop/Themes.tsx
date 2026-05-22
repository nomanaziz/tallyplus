import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useShop } from "@/lib/shop";
import { PageHeader } from "@/components/app/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { toast } from "sonner";



const WEB = [
  { key: "classic", name: "Classic", color: "from-emerald-200 to-emerald-50", accent: "#10b981" },
  { key: "modern", name: "Modern", color: "from-indigo-200 to-indigo-50", accent: "#4f46e5" },
  { key: "elegant", name: "Elegant", color: "from-amber-200 to-amber-50", accent: "#d97706" },
];
const APP = [
  { key: "default", name: "Default", color: "from-rose-200 to-rose-50", accent: "#e11d48" },
  { key: "blue", name: "Blue", color: "from-sky-200 to-sky-50", accent: "#0284c7" },
];

function ThemesPage() {
  const { lang, t } = useI18n();
  const { current } = useShop();
  const qc = useQueryClient();
  const shopId = current?.id ?? null;
  const [saving, setSaving] = useState(false);

  const { data: shop } = useQuery({
    queryKey: ["shop-themes", shopId],
    enabled: !!shopId,
    queryFn: async () => {
      const { data } = await supabase.from("shops").select("id,active_web_theme,active_app_theme").eq("id", shopId!).maybeSingle();
      return data as { active_web_theme: string; active_app_theme: string } | null;
    },
  });

  const setTheme = async (col: "active_web_theme" | "active_app_theme", val: string) => {
    if (!shopId) return;
    setSaving(true);
    const payload = col === "active_web_theme" ? { active_web_theme: val } : { active_app_theme: val };
    await supabase.from("shops").update(payload).eq("id", shopId);
    await qc.invalidateQueries({ queryKey: ["shop-themes", shopId] });
    setSaving(false);
    toast.success(t("p6_Theme_applied"));
  };

  return (
    <div className="container mx-auto max-w-5xl px-4 pb-10">
      <PageHeader breadcrumb={`Online-shop / ${t("p6_Themes")}`} title="" />
      <Tabs defaultValue="web" className="mt-3">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="web">{t("p6_Web_Themes")}</TabsTrigger>
          <TabsTrigger value="app">{t("p6_App_Themes")}</TabsTrigger>
        </TabsList>
        <TabsContent value="web" className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {WEB.map((t) => (
            <ThemeCard key={t.key} t={t} active={shop?.active_web_theme === t.key} disabled={saving}
              onApply={() => setTheme("active_web_theme", t.key)} aspect="aspect-[3/4]" kind="web" />
          ))}
        </TabsContent>
        <TabsContent value="app" className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {APP.map((t) => (
            <ThemeCard key={t.key} t={t} active={shop?.active_app_theme === t.key} disabled={saving}
              onApply={() => setTheme("active_app_theme", t.key)} aspect="aspect-[9/16]" kind="app" />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ThemeCard({ t, active, disabled, onApply, aspect, kind }: { t: { name: string; color: string; accent: string }; active: boolean; disabled: boolean; onApply: () => void; aspect: string; kind: "web" | "app" }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className={`relative ${aspect} w-full overflow-hidden rounded-lg bg-gradient-to-br ${t.color} p-3`}>
        {/* Mini storefront preview */}
        <div className="h-6 w-2/3 rounded bg-white/70" />
        <div className="mt-2 grid grid-cols-2 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-md bg-white/85 p-1.5 shadow-sm">
              <div className="aspect-square w-full rounded bg-muted" />
              <div className="mt-1 h-1.5 w-3/4 rounded bg-muted-foreground/40" />
              <div className="mt-1 h-2 w-1/2 rounded" style={{ background: t.accent }} />
            </div>
          ))}
        </div>
        {kind === "app" && <div className="absolute inset-x-3 bottom-3 h-7 rounded-full" style={{ background: t.accent }} />}
        {active && (
          <div className="absolute inset-0 grid place-items-center bg-black/10">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-emerald-500 text-white shadow-lg"><Check className="h-7 w-7" /></div>
          </div>
        )}
      </div>
      <div className="mt-2 text-center text-sm font-semibold">{t.name}</div>
      <Button onClick={onApply} disabled={disabled || active} className="mt-2 w-full" size="sm">
        {active ? "Active" : "Preview / Apply"}
      </Button>
    </div>
  );
}
export default ThemesPage;
