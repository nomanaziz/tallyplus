import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useShop } from "@/lib/shop";
import { Plus, Check } from "lucide-react";
import { toast } from "sonner";

type Available = { id: string; serial_no: string };

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  productId: string | null;
  productName: string;
  excludeSerialIds?: string[];
  onPicked: (serial: { id: string; serial_no: string }) => void;
};

export function SerialPickDialog({ open, onOpenChange, productId, productName, excludeSerialIds = [], onPicked }: Props) {
  const { lang, t } = useI18n();
  const { current } = useShop();
  const [list, setList] = useState<Available[]>([]);
  const [loading, setLoading] = useState(false);
  const [newSerial, setNewSerial] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    if (!productId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("product_serials")
      .select("id, serial_no")
      .eq("product_id", productId)
      .eq("status", "in_stock")
      .order("created_at", { ascending: true });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setList((data ?? []).filter((r) => !excludeSerialIds.includes(r.id)) as Available[]);
  }

  useEffect(() => {
    if (open && productId) {
      void refresh();
      setNewSerial("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, productId]);

  async function addAndPick() {
    if (!current || !productId) return;
    const sn = newSerial.trim();
    if (!sn) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("product_serials")
      .insert({ shop_id: current.id, product_id: productId, serial_no: sn, status: "in_stock" })
      .select("id, serial_no")
      .single();
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    onPicked({ id: (data as Available).id, serial_no: (data as Available).serial_no });
    onOpenChange(false);
  }

  function pick(s: Available) {
    onPicked(s);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("p7_Pick_a_serial")}</DialogTitle>
          <DialogDescription>{productName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label className="text-xs">{t("p7_In_stock_serials")}</Label>
          {loading ? (
            <div className="py-3 text-center text-sm text-muted-foreground">...</div>
          ) : list.length === 0 ? (
            <div className="rounded border border-dashed py-4 text-center text-xs text-muted-foreground">
              {t("p7_No_serials_in_stock_add_one_be")}
            </div>
          ) : (
            <ul className="max-h-48 divide-y overflow-y-auto rounded border">
              {list.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => pick(s)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                  >
                    <span className="font-mono">{s.serial_no}</span>
                    <Check className="h-4 w-4 text-emerald-600" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
          <Label className="text-xs">{t("p7_Add_new_serial_sell")}</Label>
          <div className="flex gap-2">
            <Input
              value={newSerial}
              onChange={(e) => setNewSerial(e.target.value)}
              placeholder={t("p7_IMEI_Serial")}
              className="font-mono"
            />
            <Button onClick={addAndPick} disabled={busy || !newSerial.trim()} className="gap-1">
              <Plus className="h-4 w-4" />
              {t("p7_Add")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}