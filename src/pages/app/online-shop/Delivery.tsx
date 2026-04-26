import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useShop } from "@/lib/shop";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Truck } from "lucide-react";

({
  head: () => ({ meta: [{ title: "Delivery — Tally Plus" }] }),
  component: DeliveryPage,
});

type Zone = {
  id: string; shop_id: string; name: string; charge: number;
  free_shipping_min: number | null; sort_order: number; is_active: boolean;
};

function DeliveryPage() {
  const { lang } = useI18n();
  const { current } = useShop();
  const qc = useQueryClient();
  const shopId = current?.id ?? null;
  const [editing, setEditing] = useState<Zone | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: zones = [], isLoading } = useQuery<Zone[]>({
    queryKey: ["delivery-zones", shopId],
    enabled: !!shopId,
    queryFn: async () => {
      const { data } = await supabase.from("shop_delivery_zones")
        .select("id,shop_id,name,charge,free_shipping_min,sort_order,is_active")
        .eq("shop_id", shopId!).order("sort_order").order("created_at");
      return (data ?? []) as Zone[];
    },
  });

  // Auto-seed defaults on first visit
  useEffect(() => {
    if (!shopId || isLoading) return;
    if (zones.length > 0) return;
    (async () => {
      const { error } = await supabase.from("shop_delivery_zones").insert([
        { shop_id: shopId, name: lang === "bn" ? "ঢাকার ভিতরে" : "Inside Dhaka", charge: 60, sort_order: 0 },
        { shop_id: shopId, name: lang === "bn" ? "ঢাকার বাইরে" : "Outside Dhaka", charge: 120, sort_order: 1 },
      ]);
      if (!error) qc.invalidateQueries({ queryKey: ["delivery-zones", shopId] });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId, isLoading, zones.length]);

  const toggle = async (z: Zone, v: boolean) => {
    await supabase.from("shop_delivery_zones").update({ is_active: v }).eq("id", z.id);
    qc.invalidateQueries({ queryKey: ["delivery-zones", shopId] });
  };

  const remove = async (id: string) => {
    if (!confirm(lang === "bn" ? "মুছে ফেলবেন?" : "Delete this zone?")) return;
    await supabase.from("shop_delivery_zones").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["delivery-zones", shopId] });
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 pb-24">
      <PageHeader breadcrumb={`Online-shop / ${lang === "bn" ? "ডেলিভারি" : "Delivery"}`} title="" />
      <div className="mt-3 rounded-xl border bg-muted/40 p-3">
        <div className="text-sm font-semibold">
          {lang === "bn" ? "ডেলিভারি এরিয়া ও চার্জ" : "Delivery Zones & Charges"}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {lang === "bn"
            ? "নতুন এরিয়া যোগ করুন বা চার্জ পরিবর্তন করুন। যেকোনো এরিয়াতে নির্দিষ্ট পরিমাণের বেশি অর্ডারে ফ্রি শিপিং দিতে পারেন।"
            : "Add zones or change charges. Optionally offer free shipping above a minimum order amount."}
        </p>
        <div className="mt-3 space-y-2">
          {zones.length === 0 && !isLoading && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {lang === "bn" ? "ডিফল্ট এরিয়া তৈরি করা হচ্ছে…" : "Setting up defaults…"}
            </div>
          )}
          {zones.map((z) => (
            <div key={z.id} className="rounded-lg border bg-card p-3 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-primary" />
                    <span className="font-bold">{z.name}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    <span><span className="text-muted-foreground">{lang === "bn" ? "চার্জ:" : "Charge:"}</span> <b className="text-primary">৳ {z.charge}</b></span>
                    {z.free_shipping_min ? (
                      <span><span className="text-muted-foreground">{lang === "bn" ? "ফ্রি শিপিং:" : "Free above:"}</span> <b>৳ {z.free_shipping_min}+</b></span>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Switch checked={z.is_active} onCheckedChange={(v) => toggle(z, v)} />
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(z)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => remove(z.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t bg-background p-3">
        <div className="mx-auto max-w-2xl">
          <Button className="w-full" onClick={() => setCreating(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            {lang === "bn" ? "নতুন এরিয়া যোগ" : "Add New Zone"}
          </Button>
        </div>
      </div>

      {shopId && (creating || editing) && (
        <ZoneDialog
          open
          onOpenChange={(o) => { if (!o) { setCreating(false); setEditing(null); } }}
          shopId={shopId}
          lang={lang}
          zone={editing}
          onSaved={() => qc.invalidateQueries({ queryKey: ["delivery-zones", shopId] })}
        />
      )}
    </div>
  );
}

function ZoneDialog({ open, onOpenChange, shopId, lang, zone, onSaved }: {
  open: boolean; onOpenChange: (v: boolean) => void; shopId: string; lang: string;
  zone: Zone | null; onSaved: () => void;
}) {
  const [name, setName] = useState(zone?.name ?? "");
  const [charge, setCharge] = useState(String(zone?.charge ?? ""));
  const [freeMin, setFreeMin] = useState(zone?.free_shipping_min ? String(zone.free_shipping_min) : "");
  const [active, setActive] = useState(zone?.is_active ?? true);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim()) { toast.error(lang === "bn" ? "নাম দিন" : "Enter name"); return; }
    const c = Number(charge);
    if (isNaN(c) || c < 0) { toast.error(lang === "bn" ? "সঠিক চার্জ দিন" : "Enter valid charge"); return; }
    setSaving(true);
    const payload = {
      name: name.trim(), charge: c,
      free_shipping_min: freeMin ? Number(freeMin) : null,
      is_active: active,
    };
    const { error } = zone
      ? await supabase.from("shop_delivery_zones").update(payload).eq("id", zone.id)
      : await supabase.from("shop_delivery_zones").insert({ ...payload, shop_id: shopId });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(lang === "bn" ? "সংরক্ষিত" : "Saved");
    onSaved(); onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{zone ? (lang === "bn" ? "এরিয়া এডিট" : "Edit Zone") : (lang === "bn" ? "নতুন এরিয়া" : "New Zone")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>{lang === "bn" ? "এরিয়ার নাম" : "Zone Name"}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={lang === "bn" ? "যেমন: ঢাকার ভিতরে" : "e.g. Inside Dhaka"} />
          </div>
          <div>
            <Label>{lang === "bn" ? "ডেলিভারি চার্জ (৳)" : "Delivery Charge (৳)"}</Label>
            <Input type="number" value={charge} onChange={(e) => setCharge(e.target.value)} placeholder="60" />
          </div>
          <div>
            <Label>{lang === "bn" ? "ফ্রি শিপিং (এই অঙ্কের বেশি অর্ডারে)" : "Free shipping above (৳)"}</Label>
            <Input type="number" value={freeMin} onChange={(e) => setFreeMin(e.target.value)} placeholder={lang === "bn" ? "ঐচ্ছিক" : "Optional"} />
            <p className="mt-1 text-xs text-muted-foreground">
              {lang === "bn" ? "খালি রাখলে ফ্রি শিপিং বন্ধ থাকবে।" : "Leave blank to disable free shipping."}
            </p>
          </div>
          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <span className="text-sm">{lang === "bn" ? "সক্রিয়" : "Active"}</span>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{lang === "bn" ? "বাতিল" : "Cancel"}</Button>
          <Button onClick={submit} disabled={saving}>{lang === "bn" ? "সংরক্ষণ" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
export default DeliveryPage;
