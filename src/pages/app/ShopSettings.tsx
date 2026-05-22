import { useEffect, useState } from "react";
import { useNavigate } from "@/lib/router";
import { ArrowLeft, Loader2, Download, Upload, AlertTriangle, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useShop } from "@/lib/shop";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { ResetShopDialog } from "@/components/app/ResetShopDialog";
import { RestoreBackupDialog } from "@/components/app/RestoreBackupDialog";
import { downloadJson, BACKUP_VERSION } from "@/lib/backup";
import { LocationPicker, type LocationValue } from "@/components/LocationPicker";
import { Switch } from "@/components/ui/switch";
import { MODULE_LABELS, loadShopModules, setShopModule } from "@/lib/modules";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ShopSettingsPage() {
  const { lang, t } = useI18n();
  const { current, refresh: refreshShops } = useShop();
  const { user } = useAuth();
  const nav = useNavigate();
  const isOwner = !!current && current.owner_id === user?.id;

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState<LocationValue>({ division: null, district: null, upazila: null, area: null });
  const [busy, setBusy] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [modules, setModules] = useState<Record<string, boolean>>({});
  const [moduleBusy, setModuleBusy] = useState<string | null>(null);
  const [lpgTier, setLpgTier] = useState<string>("");
  const [lpgListed, setLpgListed] = useState<boolean>(false);
  const [lpgBusy, setLpgBusy] = useState(false);

  useEffect(() => {
    if (!current) return;
    setName(current.name || "");
    setAddress(current.address || "");
    setPhone(current.phone || "");
    void (async () => {
      const { data } = await supabase
        .from("seller_locations")
        .select("division,district,upazila,area")
        .eq("shop_id", current.id)
        .maybeSingle();
      setLocation({
        division: data?.division ?? null,
        district: data?.district ?? null,
        upazila: data?.upazila ?? null,
        area: data?.area ?? null,
      });
    })();
    void (async () => {
      const m = await loadShopModules(current.id);
      setModules(m);
    })();
    void (async () => {
      const { data } = await supabase
        .from("shops")
        .select("lpg_tier,list_in_lpg_marketplace")
        .eq("id", current.id)
        .maybeSingle();
      setLpgTier((data?.lpg_tier as string | null) ?? "");
      setLpgListed(!!data?.list_in_lpg_marketplace);
    })();
  }, [current?.id]);

  const toggleModule = async (code: string, on: boolean) => {
    if (!current || !isOwner) return;
    setModuleBusy(code);
    const prev = modules[code] ?? false;
    setModules((s) => ({ ...s, [code]: on }));
    try {
      await setShopModule(current.id, code, on);
      toast.success(t("p7_Module_updated"));
    } catch (e) {
      setModules((s) => ({ ...s, [code]: prev }));
      toast.error((e as Error).message);
    } finally {
      setModuleBusy(null);
    }
  };

  const schema = z.object({
    name: z.string().trim().min(2, t("p7_Enter_shop_name")).max(80),
    address: z.string().trim().max(200).optional(),
    phone: z.string().trim().max(30).optional(),
  });

  const save = async () => {
    if (!current || !isOwner) return;
    const parsed = schema.safeParse({ name, address, phone });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase
        .from("shops")
        .update({ name: parsed.data.name, address: parsed.data.address || null, phone: parsed.data.phone || null })
        .eq("id", current.id);
      if (error) throw error;
      const { error: locErr } = await supabase
        .from("seller_locations")
        .upsert(
          {
            shop_id: current.id,
            division: location.division,
            district: location.district,
            upazila: location.upazila,
            area: location.area,
          },
          { onConflict: "shop_id" },
        );
      if (locErr) throw locErr;
      toast.success(t("p7_Shop_info_updated"));
      await refreshShops();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const exportBackup = async () => {
    if (!current) return;
    setExporting(true);
    try {
      const shopId = current.id;
      const [cats, prods, custs, sups, svcs] = await Promise.all([
        supabase.from("categories").select("name,parent_id,id").eq("shop_id", shopId),
        supabase.from("products").select("name,sku,barcode,unit,cost_price,sale_price,stock,low_stock_alert,description,image_url,category_id").eq("shop_id", shopId).is("deleted_at", null),
        supabase.from("customers").select("name,phone,address,email").eq("shop_id", shopId).is("deleted_at", null),
        supabase.from("suppliers").select("name,phone,address,email").eq("shop_id", shopId).is("deleted_at", null),
        supabase.from("services").select("name,price,description,duration_minutes").eq("shop_id", shopId).is("deleted_at", null),
      ]);

      const catById = new Map<string, { name: string; parent_id: string | null }>();
      for (const c of (cats.data ?? []) as Array<{ id: string; name: string; parent_id: string | null }>) {
        catById.set(c.id, { name: c.name, parent_id: c.parent_id });
      }
      const categories = Array.from(catById.values()).map((c) => ({
        name: c.name,
        parent_name: c.parent_id ? catById.get(c.parent_id)?.name ?? null : null,
      }));

      const products = ((prods.data ?? []) as Array<Record<string, unknown> & { category_id?: string | null }>).map((p) => ({
        ...p,
        category_name: p.category_id ? catById.get(p.category_id as string)?.name ?? null : null,
        category_id: undefined,
      }));

      const backup = {
        version: BACKUP_VERSION,
        exported_at: new Date().toISOString(),
        shop: { name: current.name, address: current.address, phone: current.phone, currency: current.currency },
        tables: {
          categories,
          products,
          customers: custs.data ?? [],
          suppliers: sups.data ?? [],
          services: svcs.data ?? [],
        },
      };
      const fname = `${(current.name || "shop").replace(/[^a-z0-9]+/gi, "-")}-backup-${new Date().toISOString().slice(0, 10)}.json`;
      downloadJson(fname, backup);
      toast.success(t("p7_Backup_downloaded"));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setExporting(false);
    }
  };

  if (!current) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        {t("p7_No_shop_selected")}
      </div>
    );
  }

  return (
    <div className="min-h-full bg-muted/30">
      <header className="flex items-center gap-2 border-b bg-background px-4 py-3">
        <Button variant="ghost" size="icon" onClick={() => nav(-1 as never)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold">{t("p7_Shop_Settings")}</h1>
      </header>

      <div className="mx-auto max-w-xl space-y-4 p-4">
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <h2 className="font-semibold">{t("p7_Shop_info")}</h2>
          <div>
            <Label>{t("p7_Shop_name")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} disabled={!isOwner} className="mt-1" />
          </div>
          <div>
            <Label>{t("p7_Address_2")}</Label>
            <Textarea value={address} onChange={(e) => setAddress(e.target.value)} maxLength={200} disabled={!isOwner} className="mt-1" rows={2} />
          </div>
          <div className="space-y-2">
            <Label>{t("p7_Location_optional")}</Label>
            <LocationPicker value={location} onChange={setLocation} disabled={!isOwner} />
          </div>
          <div>
            <Label>{t("p7_Phone")}</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} disabled={!isOwner} className="mt-1" />
          </div>
          <Button onClick={save} disabled={busy || !isOwner} className="w-full">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {t("p7_Save_5")}
          </Button>
          {!isOwner && (
            <p className="text-xs text-muted-foreground">
              {t("p7_Only_the_owner_can_edit_shop_i")}
            </p>
          )}
        </div>

        <div className="rounded-xl border bg-card p-4 space-y-3">
          <h2 className="font-semibold">{t("p7_Backup_Restore")}</h2>
          <p className="text-xs text-muted-foreground">
            {t("p7_Master_data_products_categorie")}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={exportBackup} disabled={exporting}>
              {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              {t("p7_Download")}
            </Button>
            <Button variant="outline" onClick={() => setRestoreOpen(true)} disabled={!isOwner}>
              <Upload className="mr-2 h-4 w-4" />
              {t("p7_Restore_2")}
            </Button>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 space-y-3">
          <div>
            <h2 className="font-semibold">{t("p7_Modules")}</h2>
            <p className="text-xs text-muted-foreground">
              {t("p7_Disabled_modules_are_hidden_fr")}
            </p>
          </div>
          <div className="divide-y">
            {Object.entries(MODULE_LABELS).map(([code, lbl]) => {
              const on = modules[code] ?? false;
              return (
                <div key={code} className="flex items-start justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{lang === "bn" ? lbl.bn : lbl.en}</div>
                    {lbl.hint && (
                      <div className="text-xs text-muted-foreground">{lang === "bn" ? lbl.hint.bn : lbl.hint.en}</div>
                    )}
                  </div>
                  <Switch
                    checked={on}
                    onCheckedChange={(v) => toggleModule(code, v)}
                    disabled={!isOwner || moduleBusy === code}
                  />
                </div>
              );
            })}
          </div>
          {!isOwner && (
            <p className="text-xs text-muted-foreground">
              {t("p7_Only_the_owner_can_change_modu")}
            </p>
          )}
        </div>

        {modules["lpg"] && (
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <div>
              <h2 className="font-semibold">{t("p7_LPG_Bottle_settings")}</h2>
              <p className="text-xs text-muted-foreground">
                {t("p7_Your_tier_and_whether_to_appea")}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>{t("p7_Business_tier")}</Label>
                <Select
                  value={lpgTier || "none"}
                  onValueChange={async (v) => {
                    if (!current || !isOwner) return;
                    const next = v === "none" ? "" : v;
                    setLpgBusy(true);
                    const { error } = await supabase.from("shops").update({ lpg_tier: next || null }).eq("id", current.id);
                    setLpgBusy(false);
                    if (error) return toast.error(error.message);
                    setLpgTier(next);
                    toast.success(t("p7_Updated_2"));
                  }}
                  disabled={!isOwner || lpgBusy}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={t("p7_Choose")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("p7_None")}</SelectItem>
                    <SelectItem value="dealer">{t("p7_Dealer")}</SelectItem>
                    <SelectItem value="wholesale">{t("p7_Wholesale")}</SelectItem>
                    <SelectItem value="retail">{t("p7_Retail")}</SelectItem>
                    <SelectItem value="producer">{t("p7_Producer_water_filter")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-start justify-between gap-3 rounded-md border bg-muted/30 p-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{t("p7_Show_in_public_LPG_marketplace")}</div>
                  <div className="text-xs text-muted-foreground">
                    {t("p7_Enable_to_appear_on_the_lpg_li")}
                  </div>
                </div>
                <Switch
                  checked={lpgListed}
                  disabled={!isOwner || lpgBusy}
                  onCheckedChange={async (v) => {
                    if (!current || !isOwner) return;
                    setLpgBusy(true);
                    const { error } = await supabase.from("shops").update({ list_in_lpg_marketplace: v }).eq("id", current.id);
                    setLpgBusy(false);
                    if (error) return toast.error(error.message);
                    setLpgListed(v);
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {isOwner && (
          <div className="rounded-xl border-2 border-rose-200 bg-rose-50 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-none text-rose-600" />
              <div>
                <h2 className="font-semibold text-rose-900">{t("p7_Danger_Zone")}</h2>
                <p className="text-xs text-rose-700">
                  {t("p7_Reset_will_delete_all_shop_dat")}
                </p>
              </div>
            </div>
            <Button variant="destructive" className="w-full" onClick={() => setResetOpen(true)}>
              {t("p7_Reset_Shop")}
            </Button>
            <a href="/app/restore-requests" className="block text-center text-xs font-semibold text-rose-700 underline">
              {t("p7_Reset_Delete_History_Restore_R")}
            </a>
          </div>
        )}
      </div>

      <ResetShopDialog open={resetOpen} onOpenChange={setResetOpen} shopId={current.id} shopName={current.name} />
      <RestoreBackupDialog open={restoreOpen} onOpenChange={setRestoreOpen} shopId={current.id} />
    </div>
  );
}