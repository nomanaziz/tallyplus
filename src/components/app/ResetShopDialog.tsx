import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";
import { useShop } from "@/lib/shop";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, AlertTriangle } from "lucide-react";
import { Link } from "@/lib/router";

export function ResetShopDialog({
  open,
  onOpenChange,
  shopId,
  shopName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  shopId: string;
  shopName: string;
}) {
  const { lang, t } = useI18n();
  const { refresh } = useShop();
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const canReset = confirm.trim() === shopName.trim();

  const onReset = async () => {
    if (!canReset) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("request_shop_reset", {
        _shop_id: shopId,
        _confirm_text: confirm.trim(),
      });
      if (error) throw error;
      const res = data as { ok?: boolean; error?: string; summary?: Record<string, number> };
      if (!res?.ok) {
        toast.error(res?.error || "reset_failed");
        return;
      }
      const total = Object.values(res.summary || {}).reduce((a, b) => a + (b || 0), 0);
      toast.success(
        lang === "bn"
          ? `দোকান Reset সম্পন্ন। মোট ${total} টি রেকর্ড মুছে গেছে।`
          : `Shop reset complete. Deleted ${total} records.`
      );
      await refresh();
      onOpenChange(false);
      setConfirm("");
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
          <DialogTitle className="flex items-center gap-2 text-rose-600">
            <AlertTriangle className="h-5 w-5" />
            {t("p7_Reset_Shop")}
          </DialogTitle>
          <DialogDescription>
            {t("p7_This_action_cannot_be_undone_A")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-900">
            {t("p7_Type_the_shop_name_exactly_to_")}
            <div className="mt-1 font-mono font-semibold">{shopName}</div>
          </div>
          <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
            {lang === "bn"
              ? <>এই reset-এর data ৩০ দিনের জন্য Admin-এর কাছে সংরক্ষিত থাকবে। প্রয়োজনে <Link to="/app/restore-requests" className="underline font-semibold">Restore Request</Link> পাঠাতে পারবেন (charge ৳৫০০)।</>
              : <>This reset's data is kept by Admin for 30 days. You may send a <Link to="/app/restore-requests" className="underline font-semibold">Restore Request</Link> later (৳500 charge).</>}
          </div>
          <div>
            <Label>{t("p7_Shop_name")}</Label>
            <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={shopName} className="mt-1" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            {t("p7_Cancel")}
          </Button>
          <Button variant="destructive" onClick={onReset} disabled={!canReset || busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("p7_Reset")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}