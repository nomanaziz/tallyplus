import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/lib/shop";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { parseLimitError } from "@/lib/usage-limits";

type QuickService = {
  id: string;
  name: string;
  price: number;
  unit: string;
  duration_minutes: number | null;
  home_service: boolean;
  warranty_enabled: boolean;
  warranty_value: number | null;
  warranty_unit: string | null;
  image_url: string | null;
  duration_label: string | null;
};

export function QuickAddServiceDialog({
  open,
  onClose,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  onAdded?: (s: QuickService) => void;
}) {
  const { lang } = useI18n();
  const { current } = useShop();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("0");
  const [duration, setDuration] = useState("");
  const [homeService, setHomeService] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setName("");
      setPrice("0");
      setDuration("");
      setHomeService(false);
    }
  }, [open]);

  const save = async () => {
    if (!current) return;
    if (!name.trim()) {
      toast.error(lang === "bn" ? "সার্ভিসের নাম দিন" : "Enter service name");
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from("services")
      .insert({
        shop_id: current.id,
        name: name.trim(),
        price: Number(price) || 0,
        unit: "service",
        duration_minutes: duration ? Number(duration) : null,
        home_service: homeService,
        is_marketplace_published: false,
        booking_enabled: true,
        service_areas: [],
      } as never)
      .select("id,name,price,unit,duration_minutes,home_service,warranty_enabled,warranty_value,warranty_unit,image_url,duration_label")
      .single();
    setSaving(false);
    if (error) {
      const li = parseLimitError(error.message);
      if (li) toast.error(lang === "bn" ? "সীমা শেষ — আপগ্রেড করুন" : "Limit reached — upgrade");
      else toast.error(error.message);
      return;
    }
    toast.success(lang === "bn" ? "সার্ভিস যোগ হয়েছে" : "Service added");
    void qc.invalidateQueries({ queryKey: ["services"] });
    if (data) onAdded?.(data as QuickService);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{lang === "bn" ? "দ্রুত সার্ভিস যোগ" : "Quick add service"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>{lang === "bn" ? "সার্ভিসের নাম" : "Service name"}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>{lang === "bn" ? "মূল্য" : "Price"}</Label>
              <Input type="number" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>{lang === "bn" ? "সময় (মিনিট)" : "Duration (min)"}</Label>
              <Input type="number" inputMode="numeric" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder={lang === "bn" ? "ঐচ্ছিক" : "optional"} />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <div className="text-sm">{lang === "bn" ? "হোম সার্ভিস" : "Home service"}</div>
            <Switch checked={homeService} onCheckedChange={setHomeService} />
          </div>
          <p className="text-xs text-muted-foreground">
            {lang === "bn"
              ? "পরবর্তীতে বিস্তারিত (বিবরণ, ওয়ারেন্টি, ছবি, এলাকা) এডিট করতে পারবেন।"
              : "You can edit full details (description, warranty, image, areas) later."}
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{lang === "bn" ? "বাতিল" : "Cancel"}</Button>
          <Button onClick={save} disabled={saving}>{saving ? (lang === "bn" ? "সেভ হচ্ছে…" : "Saving…") : (lang === "bn" ? "সেভ" : "Save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}