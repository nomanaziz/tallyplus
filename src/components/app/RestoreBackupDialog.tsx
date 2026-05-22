import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Upload, CheckCircle2, AlertTriangle } from "lucide-react";
import { validateBackup, type Backup } from "@/lib/backup";

export function RestoreBackupDialog({
  open,
  onOpenChange,
  shopId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  shopId: string;
}) {
  const { lang, t } = useI18n();
  const [parsed, setParsed] = useState<Backup | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);

  const onFile = async (f: File | null) => {
    if (!f) return;
    setErrors([]); setParsed(null); setCounts({});
    if (f.size > 20 * 1024 * 1024) {
      setErrors([t("p7_File_must_be_under_20MB")]);
      return;
    }
    try {
      const text = await f.text();
      const json = JSON.parse(text);
      const report = validateBackup(json);
      if (!report.ok) {
        setErrors(report.errors.slice(0, 10));
        return;
      }
      setParsed(report.parsed!);
      setCounts(report.counts);
    } catch (e) {
      setErrors([(e as Error).message]);
    }
  };

  const onRestore = async () => {
    if (!parsed) return;
    setBusy(true);
    try {
      const t = parsed.tables;

      // Categories — first parents, then children
      const parents = t.categories.filter((c) => !c.parent_name);
      const children = t.categories.filter((c) => !!c.parent_name);
      const nameToId = new Map<string, string>();

      if (parents.length > 0) {
        const rows = parents.map((c) => ({ shop_id: shopId, name: c.name }));
        const { data, error } = await supabase.from("categories").insert(rows).select("id,name");
        if (error) throw error;
        for (const r of (data ?? []) as Array<{ id: string; name: string }>) nameToId.set(r.name, r.id);
      }
      if (children.length > 0) {
        const rows = children
          .map((c) => ({ shop_id: shopId, name: c.name, parent_id: c.parent_name ? nameToId.get(c.parent_name) ?? null : null }));
        const { data, error } = await supabase.from("categories").insert(rows).select("id,name");
        if (error) throw error;
        for (const r of (data ?? []) as Array<{ id: string; name: string }>) nameToId.set(r.name, r.id);
      }

      // Customers, Suppliers, Services
      if (t.customers.length > 0) {
        const rows = t.customers.map((c) => ({ shop_id: shopId, name: c.name, phone: c.phone || null, address: c.address || null }));
        const { error } = await supabase.from("customers").insert(rows);
        if (error) throw error;
      }
      if (t.suppliers.length > 0) {
        const rows = t.suppliers.map((c) => ({ shop_id: shopId, name: c.name, phone: c.phone || null, address: c.address || null }));
        const { error } = await supabase.from("suppliers").insert(rows);
        if (error) throw error;
      }
      if (t.services.length > 0) {
        const rows = t.services.map((s) => ({ shop_id: shopId, name: s.name, price: Number(s.price) || 0, description: (s as { description?: string }).description || null, duration_minutes: (s as { duration_minutes?: number | null }).duration_minutes ?? null }));
        const { error } = await supabase.from("services").insert(rows);
        if (error) throw error;
      }

      // Products
      if (t.products.length > 0) {
        const rows = t.products.map((p) => {
          const catName = (p as { category_name?: string | null }).category_name;
          return {
            shop_id: shopId,
            name: p.name,
            sku: p.sku || null,
            barcode: p.barcode || null,
            unit: p.unit || null,
            cost_price: Number(p.cost_price) || 0,
            sale_price: Number(p.sale_price) || 0,
            stock: Number(p.stock) || 0,
            low_stock_alert: p.low_stock_alert != null ? Number(p.low_stock_alert) : null,
            description: p.description || null,
            image_url: p.image_url || null,
            category_id: catName ? nameToId.get(catName) ?? null : null,
          };
        });
        // Insert in chunks of 200
        for (let i = 0; i < rows.length; i += 200) {
          const slice = rows.slice(i, i + 200);
          const { error } = await supabase.from("products").insert(slice);
          if (error) throw error;
        }
      }

      toast.success(t("p7_Restore_complete"));
      onOpenChange(false);
      setParsed(null); setCounts({}); setErrors([]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!busy) onOpenChange(v); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("p7_Restore_from_Backup")}</DialogTitle>
          <DialogDescription>
            {t("p7_Upload_a_JSON_backup_file_Inva")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>{t("p7_Backup_file")}</Label>
            <input
              type="file"
              accept="application/json,.json"
              onChange={(e) => onFile(e.target.files?.[0] ?? null)}
              className="mt-1 block w-full text-sm"
            />
          </div>

          {errors.length > 0 && (
            <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-900">
              <div className="flex items-center gap-1 font-semibold">
                <AlertTriangle className="h-4 w-4" /> {t("p7_Validation_failed")}
              </div>
              <ul className="mt-1 list-disc pl-5 text-xs">
                {errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
              <p className="mt-2 text-xs">{t("p7_Fix_the_file_and_try_again")}</p>
            </div>
          )}

          {parsed && (
            <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">
              <div className="flex items-center gap-1 font-semibold">
                <CheckCircle2 className="h-4 w-4" /> {t("p7_File_is_valid")}
              </div>
              <ul className="mt-1 list-disc pl-5 text-xs">
                {Object.entries(counts).map(([k, v]) => (
                  <li key={k}>{k}: {v}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            {t("p7_Cancel")}
          </Button>
          <Button onClick={onRestore} disabled={!parsed || busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            {t("p7_Restore_2")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}