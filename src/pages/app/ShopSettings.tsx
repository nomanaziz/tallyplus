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

export default function ShopSettingsPage() {
  const { lang } = useI18n();
  const { current, refresh: refreshShops } = useShop();
  const { user } = useAuth();
  const nav = useNavigate();
  const isOwner = !!current && current.owner_id === user?.id;

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!current) return;
    setName(current.name || "");
    setAddress(current.address || "");
    setPhone(current.phone || "");
  }, [current?.id]);

  const schema = z.object({
    name: z.string().trim().min(2, lang === "bn" ? "দোকানের নাম দিন" : "Enter shop name").max(80),
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
      toast.success(lang === "bn" ? "দোকানের তথ্য আপডেট হয়েছে" : "Shop info updated");
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
      toast.success(lang === "bn" ? "ব্যাকআপ ডাউনলোড হলো" : "Backup downloaded");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setExporting(false);
    }
  };

  if (!current) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        {lang === "bn" ? "কোনো দোকান নির্বাচন করা নেই।" : "No shop selected."}
      </div>
    );
  }

  return (
    <div className="min-h-full bg-muted/30">
      <header className="flex items-center gap-2 border-b bg-background px-4 py-3">
        <Button variant="ghost" size="icon" onClick={() => nav(-1 as never)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold">{lang === "bn" ? "দোকানের সেটিংস" : "Shop Settings"}</h1>
      </header>

      <div className="mx-auto max-w-xl space-y-4 p-4">
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <h2 className="font-semibold">{lang === "bn" ? "দোকানের তথ্য" : "Shop info"}</h2>
          <div>
            <Label>{lang === "bn" ? "দোকানের নাম" : "Shop name"}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} disabled={!isOwner} className="mt-1" />
          </div>
          <div>
            <Label>{lang === "bn" ? "ঠিকানা" : "Address"}</Label>
            <Textarea value={address} onChange={(e) => setAddress(e.target.value)} maxLength={200} disabled={!isOwner} className="mt-1" rows={2} />
          </div>
          <div>
            <Label>{lang === "bn" ? "ফোন" : "Phone"}</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} disabled={!isOwner} className="mt-1" />
          </div>
          <Button onClick={save} disabled={busy || !isOwner} className="w-full">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {lang === "bn" ? "সংরক্ষণ করুন" : "Save"}
          </Button>
          {!isOwner && (
            <p className="text-xs text-muted-foreground">
              {lang === "bn" ? "শুধু মালিক এই তথ্য পরিবর্তন করতে পারবেন।" : "Only the owner can edit shop info."}
            </p>
          )}
        </div>

        <div className="rounded-xl border bg-card p-4 space-y-3">
          <h2 className="font-semibold">{lang === "bn" ? "ব্যাকআপ ও রিস্টোর" : "Backup & Restore"}</h2>
          <p className="text-xs text-muted-foreground">
            {lang === "bn"
              ? "প্রোডাক্ট, ক্যাটাগরি, গ্রাহক, সরবরাহকারী, সার্ভিস — এই master data ব্যাকআপ ও পরবর্তীতে restore করা যাবে।"
              : "Master data (products, categories, customers, suppliers, services) can be backed up and restored later."}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={exportBackup} disabled={exporting}>
              {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              {lang === "bn" ? "ব্যাকআপ নিন" : "Download"}
            </Button>
            <Button variant="outline" onClick={() => setRestoreOpen(true)} disabled={!isOwner}>
              <Upload className="mr-2 h-4 w-4" />
              {lang === "bn" ? "রিস্টোর করুন" : "Restore"}
            </Button>
          </div>
        </div>

        {isOwner && (
          <div className="rounded-xl border-2 border-rose-200 bg-rose-50 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-none text-rose-600" />
              <div>
                <h2 className="font-semibold text-rose-900">{lang === "bn" ? "বিপদসীমা" : "Danger Zone"}</h2>
                <p className="text-xs text-rose-700">
                  {lang === "bn"
                    ? "দোকান Reset করলে সমস্ত ডাটাবেস (প্রোডাক্ট, বিক্রয়, ক্রয়, লেনদেন ইত্যাদি) মুছে যাবে। দোকান নিজে থাকবে। চাইলে আগে ব্যাকআপ নিন।"
                    : "Reset will delete all shop data (products, sales, purchases, transactions, etc). The shop itself stays. Take a backup first if needed."}
                </p>
              </div>
            </div>
            <Button variant="destructive" className="w-full" onClick={() => setResetOpen(true)}>
              {lang === "bn" ? "দোকান Reset করুন" : "Reset Shop"}
            </Button>
          </div>
        )}
      </div>

      <ResetShopDialog open={resetOpen} onOpenChange={setResetOpen} shopId={current.id} shopName={current.name} />
      <RestoreBackupDialog open={restoreOpen} onOpenChange={setRestoreOpen} shopId={current.id} />
    </div>
  );
}