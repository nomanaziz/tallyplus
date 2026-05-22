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
      toast.error(t("p4_EnterServiceName"));
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
      if (li) toast.error(t("p4_LimitUpgrade"));
      else toast.error(error.message);
      return;
    }
    toast.success(t("p4_ServiceAdded"));
    void qc.invalidateQueries({ queryKey: ["services"] });
    if (data) onAdded?.(data as QuickService);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("p4_QuickAddService")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>{t("p4_ServiceName")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>{t("p4_Price")}</Label>
              <Input type="number" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>{t("p4_DurationMin")}</Label>
              <Input type="number" inputMode="numeric" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder={t("p4_Optional")} />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <div className="text-sm">{t("p4_HomeService")}</div>
            <Switch checked={homeService} onCheckedChange={setHomeService} />
          </div>
          <p className="text-xs text-muted-foreground">
            {t("p4_EditLaterHint")}
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{t("p4_Cancel")}</Button>
          <Button onClick={save} disabled={saving}>{saving ? (t("p4_Saving")) : (t("p4_SaveShort"))}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}