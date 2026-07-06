import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";
import { useShop } from "@/lib/shop";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type PaymentDir = "in" | "out"; // in = received, out = given

export function PaymentEntryDialog({
  open,
  onOpenChange,
  party,
  contactId,
  contactName,
  defaultDirection,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  party: "customer" | "supplier";
  contactId: string;
  contactName: string;
  defaultDirection: PaymentDir;
  onSaved?: () => void;
}) {
  const { lang, t } = useI18n();
  const { current } = useShop();
  const { user } = useAuth();
  const [dir, setDir] = useState<PaymentDir>(defaultDirection);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<string>("cash");
  const [note, setNote] = useState("");
  const [txDate, setTxDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDir(defaultDirection);
      setAmount("");
      setNote("");
      setMethod("cash");
      setTxDate(new Date().toISOString().slice(0, 10));
    }
  }, [open, defaultDirection]);

  const titleBn = dir === "in" ? "টাকা পেলাম" : "টাকা দিলাম";
  const titleEn = dir === "in" ? "Money Received" : "Money Given";

  const save = async () => {
    if (!current?.id) { toast.error(t("p7_Select_a_shop")); return; }
    const amt = Number(amount);
    if (!amt || amt <= 0) { toast.error(t("p7_Enter_amount")); return; }
    setSaving(true);
    try {
      const createdAt = new Date(txDate + "T00:00:00").toISOString();
      const { error: payErr } = await supabase.from("payments").insert({
        shop_id: current.id,
        customer_id: party === "customer" ? contactId : null,
        supplier_id: party === "supplier" ? contactId : null,
        direction: dir,
        amount: amt,
        method: method as "cash" | "bkash" | "nagad" | "rocket" | "bank" | "card" | "other",
        note: note.trim() || null,
        created_by: user?.id ?? null,
        created_at: createdAt,
      });
      if (payErr) throw payErr;

      // Mirror to cash_movements
      await supabase.from("cash_movements").insert({
        shop_id: current.id,
        direction: dir,
        amount: amt,
        note: [(dir === "in" ? "Received from " : "Paid to ") + contactName, note.trim()].filter(Boolean).join(" | "),
        created_by: user?.id ?? null,
        ref_table: "payments",
        ref_id: null,
        created_at: createdAt,
      });

      toast.success(t("p7_Saved_2"));
      onOpenChange(false);
      onSaved?.();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg);
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{lang === "bn" ? titleBn : titleEn} — {contactName}</DialogTitle>
          <DialogDescription>
            {t("p7_Enter_payment_details")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={dir === "in" ? "default" : "outline"}
              className={dir === "in" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
              onClick={() => setDir("in")}
            >
              {t("p7_Received")}
            </Button>
            <Button
              type="button"
              variant={dir === "out" ? "default" : "outline"}
              className={dir === "out" ? "bg-rose-600 hover:bg-rose-700 text-white" : ""}
              onClick={() => setDir("out")}
            >
              {t("p7_Given")}
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label>{t("p7_Amount_2")} <span className="text-destructive">*</span></Label>
            <Input type="number" inputMode="decimal" autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>{lang === "bn" ? "তারিখ" : "Date"}</Label>
            <Input type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>{t("p7_Method")}</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">{t("p7_Cash")}</SelectItem>
                <SelectItem value="bkash">bKash</SelectItem>
                <SelectItem value="nagad">Nagad</SelectItem>
                <SelectItem value="rocket">Rocket</SelectItem>
                <SelectItem value="bank">{t("p7_Bank")}</SelectItem>
                <SelectItem value="card">{t("p7_Card")}</SelectItem>
                <SelectItem value="other">{t("p7_Other")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>{t("p7_Note_2")}</Label>
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("p7_e_g_bkash_01711")} />
          </div>

          <Button onClick={save} disabled={saving} className="w-full h-11">
            {saving ? (t("p7_Saving")) : (t("p7_Save_4"))}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
