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
  const { lang } = useI18n();
  const [parsed, setParsed] = useState<Backup | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);

  const onFile = async (f: File | null) => {
    if (!f) return;
    setErrors([]); setParsed(null); setCounts({});
    if (f.size > 20 * 1024 * 1024) {
      setErrors([lang === "bn" ? "ফাইল 20MB এর কম হতে হবে" : "File must be under 20MB"]);
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
        const rows = t.customers.map((c) => ({ shop_id: shopId, name: c.name, phone: c.phone || null, address: c.address || null, email: c.email || null }));
        const { error } = await supabase.from("customers").insert(rows);
        if (error) throw error;
      }
      if (t.suppliers.length > 0) {
        const rows = t.suppliers.map((c) => ({ shop_id: shopId, name: c.name, phone: c.phone || null, address: c.address || null, email: c.email || null }));
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

      toast.success(lang === "bn" ? "রিস্টোর সম্পন্ন" : "Restore complete");
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
          <DialogTitle>{lang === "bn" ? "ব্যাকআপ থেকে রিস্টোর" : "Restore from Backup"}</DialogTitle>
          <DialogDescription>
            {lang === "bn"
              ? "JSON ব্যাকআপ ফাইল আপলোড করুন। ভুল ডাটা থাকলে আপলোডের আগেই ধরা পড়বে।"
              : "Upload a JSON backup file. Invalid data is caught before upload."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>{lang === "bn" ? "ব্যাকআপ ফাইল" : "Backup file"}</Label>
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
                <AlertTriangle className="h-4 w-4" /> {lang === "bn" ? "ভুল ডাটা পাওয়া গেছে" : "Validation failed"}
              </div>
              <ul className="mt-1 list-disc pl-5 text-xs">
                {errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
              <p className="mt-2 text-xs">{lang === "bn" ? "ফাইল ঠিক করে আবার আপলোড করুন।" : "Fix the file and try again."}</p>
            </div>
          )}

          {parsed && (
            <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">
              <div className="flex items-center gap-1 font-semibold">
                <CheckCircle2 className="h-4 w-4" /> {lang === "bn" ? "ফাইল ঠিক আছে" : "File is valid"}
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
            {lang === "bn" ? "বাতিল" : "Cancel"}
          </Button>
          <Button onClick={onRestore} disabled={!parsed || busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            {lang === "bn" ? "রিস্টোর করুন" : "Restore"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}