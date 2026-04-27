import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, BadgePercent } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n, fmtMoney } from "@/lib/i18n";

export type DueDiscountSale = {
  id: string;
  shop_id: string;
  customer_id: string | null;
  total: number;
  discount: number;
  due: number;
};

export function DueDiscountDialog({
  open,
  onOpenChange,
  sale,
  onApplied,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sale: DueDiscountSale | null;
  onApplied?: () => void;
}) {
  const { lang } = useI18n();
  const { user } = useAuth();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setAmount("");
      setNote("");
    }
  }, [open, sale?.id]);

  const due = Number(sale?.due ?? 0);
  const amt = Number(amount) || 0;
  const remaining = useMemo(() => Math.max(0, due - amt), [due, amt]);
  const valid = sale && amt > 0 && amt <= due;

  const apply = async () => {
    if (!sale || !valid) {
      toast.error(lang === "bn" ? "সঠিক পরিমান দিন" : "Enter a valid amount");
      return;
    }
    setSaving(true);
    try {
      // 1. record adjustment history
      const { error: aErr } = await supabase.from("sale_adjustments").insert({
        shop_id: sale.shop_id,
        sale_id: sale.id,
        customer_id: sale.customer_id,
        type: "discount",
        amount: amt,
        note: note.trim() || null,
        created_by: user?.id ?? null,
      });
      if (aErr) throw aErr;

      // 2. update the sale: discount up, total down, due down
      const newDiscount = Number(sale.discount ?? 0) + amt;
      const newTotal = Math.max(0, Number(sale.total ?? 0) - amt);
      const newDue = Math.max(0, due - amt);
      const { error: sErr } = await supabase
        .from("sales")
        .update({ discount: newDiscount, total: newTotal, due: newDue })
        .eq("id", sale.id);
      if (sErr) throw sErr;

      // 3. reduce customer's outstanding balance
      if (sale.customer_id) {
        const { data: c } = await supabase
          .from("customers")
          .select("due_balance")
          .eq("id", sale.customer_id)
          .maybeSingle();
        const cur = Number((c as { due_balance: number } | null)?.due_balance ?? 0);
        await supabase
          .from("customers")
          .update({ due_balance: Math.max(0, cur - amt) })
          .eq("id", sale.customer_id);
      }

      toast.success(lang === "bn" ? "ডিসকাউন্ট দেওয়া হয়েছে" : "Discount applied");
      onApplied?.();
      onOpenChange(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BadgePercent className="h-5 w-5 text-primary" />
            {lang === "bn" ? "বাকিতে ডিসকাউন্ট" : "Discount on due"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-lg border bg-muted/40 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{lang === "bn" ? "বর্তমান বাকি" : "Current due"}</span>
              <span className="font-bold">{fmtMoney(due, lang)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-muted-foreground">{lang === "bn" ? "ডিসকাউন্টের পর বাকি" : "Due after discount"}</span>
              <span className="font-bold text-primary">{fmtMoney(remaining, lang)}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{lang === "bn" ? "ডিসকাউন্টের পরিমান" : "Discount amount"}</Label>
            <Input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder={lang === "bn" ? "যেমন: ৭০" : "e.g. 70"}
            />
            {amt > due && (
              <div className="text-xs text-destructive">
                {lang === "bn" ? "বাকির চেয়ে বেশি দেওয়া যাবে না" : "Cannot exceed current due"}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>{lang === "bn" ? "মন্তব্য (ঐচ্ছিক)" : "Note (optional)"}</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={lang === "bn" ? "কেন ডিসকাউন্ট দিচ্ছেন" : "Reason for discount"}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {lang === "bn" ? "বাতিল" : "Cancel"}
          </Button>
          <Button onClick={apply} disabled={!valid || saving}>
            {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            {lang === "bn" ? "ডিসকাউন্ট দিন" : "Apply discount"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
