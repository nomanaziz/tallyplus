import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle, Loader2 } from "lucide-react";

type ShopLite = { id: string; name: string };

async function cascadeDeleteShop(shopId: string): Promise<void> {
  const sales = await supabase.from("sales").select("id").eq("shop_id", shopId);
  const saleIds = (sales.data ?? []).map((r: any) => r.id);
  if (saleIds.length) {
    const { error } = await supabase.from("sale_items").delete().in("sale_id", saleIds);
    if (error) throw error;
  }

  const purchases = await supabase.from("purchases").select("id").eq("shop_id", shopId);
  const purIds = (purchases.data ?? []).map((r: any) => r.id);
  if (purIds.length) {
    const { error } = await supabase.from("purchase_items").delete().in("purchase_id", purIds);
    if (error) throw error;
  }

  const wishlists = await supabase.from("customer_wishlists").select("id").eq("shop_id", shopId);
  const wIds = (wishlists.data ?? []).map((r: any) => r.id);
  if (wIds.length) {
    const { error } = await supabase.from("customer_wishlist_items").delete().in("wishlist_id", wIds);
    if (error) throw error;
  }

  const tables = [
    "sales",
    "purchases",
    "payments",
    "expenses",
    "other_income",
    "cash_movements",
    "products",
    "categories",
    "customers",
    "suppliers",
    "customer_wishlists",
    "promo_codes",
    "marketplace_listings",
    "fraud_check_logs",
    "assets",
    "owner_transactions",
    "shop_members",
  ];
  for (const t of tables) {
    const { error } = await supabase.from(t as any).delete().eq("shop_id", shopId);
    if (error && !/does not exist/i.test(error.message)) {
      throw new Error(`${t}: ${error.message}`);
    }
  }

  const { error } = await supabase.from("shops").delete().eq("id", shopId);
  if (error) throw error;
}

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
  const { lang } = useI18n();
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
      await cascadeDeleteShop(shop.id);
      toast.success(lang === "bn" ? "দোকান মুছে ফেলা হয়েছে" : "Shop deleted");
      onOpenChange(false);
      await onDeleted();
    } catch (e: any) {
      toast.error(e?.message ?? (lang === "bn" ? "মুছতে ব্যর্থ" : "Delete failed"));
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
            {lang === "bn" ? "দোকান স্থায়ীভাবে মুছুন" : "Permanently delete shop"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
            {lang === "bn" ? (
              <>
                <p className="font-semibold">এই কাজটি ফেরানো যাবে না।</p>
                <p className="mt-1">
                  <span className="font-bold">{shop.name}</span> দোকানের সকল ডেটা — বিক্রি, কেনা, পণ্য, কাস্টমার, সাপ্লায়ার, খরচ, আয়, পেমেন্ট, ক্যাশ, সম্পদ, মালিকের লেনদেন — সব স্থায়ীভাবে মুছে যাবে।
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold">This action cannot be undone.</p>
                <p className="mt-1">
                  All data of <span className="font-bold">{shop.name}</span> — sales, purchases, products, customers, suppliers, expenses, income, payments, cash, assets, owner transactions — will be permanently deleted.
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
            {lang === "bn" ? "বাতিল" : "Cancel"}
          </Button>
          <Button
            onClick={onDelete}
            disabled={!matches || busy}
            className="bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
          >
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {lang === "bn" ? "স্থায়ীভাবে মুছুন" : "Permanently delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
