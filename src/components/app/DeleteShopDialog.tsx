import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Link } from "@/lib/router";

type ShopLite = { id: string; name: string };

export function DeleteShopDialog({
  open,
  onOpenChange,
  shop,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  shop: ShopLite | null;
  onDeleted: () => void | Promise<void>;
}) {
  const { lang, t } = useI18n();
  const [confirmName, setConfirmName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setConfirmName("");
  }, [open]);

  if (!shop) return null;

  const matches = confirmName.trim().toLowerCase() === shop.name.trim().toLowerCase();

  const onDelete = async () => {
    if (!matches || !shop) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("request_shop_delete", {
        _shop_id: shop.id,
        _confirm_text: confirmName.trim(),
      });
      if (error) throw error;
      const res = data as { ok?: boolean; error?: string };
      if (!res?.ok) { toast.error(res?.error || "delete_failed"); return; }
      toast.success(t("p7_Shop_deleted_Snapshot_kept_by_"));
      onOpenChange(false);
      await onDeleted();
    } catch (e: any) {
      toast.error(e?.message ?? (t("p7_Delete_failed")));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!busy) onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-rose-600">
            <AlertTriangle className="h-5 w-5" />
            {t("p7_Permanently_delete_shop")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
            {lang === "bn" ? (
              <>
                <p className="font-semibold">এই কাজটি ফেরানো যাবে না।</p>
                <p className="mt-1">
                  <span className="font-bold">{shop.name}</span> দোকানের সকল ডেটা — বিক্রি, ক্রয়, পণ্য, কাস্টমার, সাপ্লায়ার, খরচ, আয়, পেমেন্ট, ক্যাশ, সম্পদ, মালিকের লেনদেন — সব স্থায়ীভাবে মুছে যাবে।
                </p>
                <p className="mt-2">
                  ৩০ দিনের জন্য Admin-এর কাছে snapshot সংরক্ষিত থাকবে। ভুলে delete হলে <Link to="/app/restore-requests" className="underline font-semibold">Restore Request</Link> পাঠাতে পারবেন (charge ৳১০০০)।
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold">This action cannot be undone.</p>
                <p className="mt-1">
                  All data of <span className="font-bold">{shop.name}</span> — sales, purchases, products, customers, suppliers, expenses, income, payments, cash, assets, owner transactions — will be permanently deleted.
                </p>
                <p className="mt-2">
                  A snapshot will be kept by Admin for 30 days. You can submit a <Link to="/app/restore-requests" className="underline font-semibold">Restore Request</Link> (৳1000 charge).
                </p>
              </>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label className="text-sm">
              {lang === "bn"
                ? <>নিশ্চিত করতে দোকানের নাম লিখুন: <span className="font-bold text-foreground">{shop.name}</span></>
                : <>Type the shop name to confirm: <span className="font-bold text-foreground">{shop.name}</span></>}
            </Label>
            <Input
              autoFocus
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value.slice(0, 200))}
              placeholder={shop.name}
              disabled={busy}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            {t("p7_Cancel")}
          </Button>
          <Button
            onClick={onDelete}
            disabled={!matches || busy}
            className="bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
          >
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {t("p7_Permanently_delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
