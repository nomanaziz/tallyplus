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
  const { lang } = useI18n();
  const { current } = useShop();
  const { user } = useAuth();
  const [dir, setDir] = useState<PaymentDir>(defaultDirection);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<string>("cash");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) { setDir(defaultDirection); setAmount(""); setNote(""); setMethod("cash"); } }, [open, defaultDirection]);

  const titleBn = dir === "in" ? "টাকা পেলাম" : "টাকা দিলাম";
  const titleEn = dir === "in" ? "Money Received" : "Money Given";

  const save = async () => {
    if (!current?.id) { toast.error(lang === "bn" ? "শপ নির্বাচন করুন" : "Select a shop"); return; }
    const amt = Number(amount);
    if (!amt || amt <= 0) { toast.error(lang === "bn" ? "পরিমাণ দিন" : "Enter amount"); return; }
    setSaving(true);
    try {
      const { error: payErr } = await supabase.from("payments").insert({
        shop_id: current.id,
        customer_id: party === "customer" ? contactId : null,
        supplier_id: party === "supplier" ? contactId : null,
        direction: dir,
        amount: amt,
        method: method as "cash" | "bkash" | "nagad" | "rocket" | "bank" | "card" | "other",
        note: note.trim() || null,
        created_by: user?.id ?? null,
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
      });

      toast.success(lang === "bn" ? "সংরক্ষিত হয়েছে" : "Saved");
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
            {lang === "bn" ? "লেনদেনের তথ্য দিন" : "Enter payment details"}
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
              {lang === "bn" ? "পেলাম" : "Received"}
            </Button>
            <Button
              type="button"
              variant={dir === "out" ? "default" : "outline"}
              className={dir === "out" ? "bg-rose-600 hover:bg-rose-700 text-white" : ""}
              onClick={() => setDir("out")}
            >
              {lang === "bn" ? "দিলাম" : "Given"}
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label>{lang === "bn" ? "টাকার পরিমাণ" : "Amount"} <span className="text-destructive">*</span></Label>
            <Input type="number" inputMode="decimal" autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>{lang === "bn" ? "মাধ্যম" : "Method"}</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">{lang === "bn" ? "নগদ" : "Cash"}</SelectItem>
                <SelectItem value="bkash">bKash</SelectItem>
                <SelectItem value="nagad">Nagad</SelectItem>
                <SelectItem value="rocket">Rocket</SelectItem>
                <SelectItem value="bank">{lang === "bn" ? "ব্যাংক" : "Bank"}</SelectItem>
                <SelectItem value="card">{lang === "bn" ? "কার্ড" : "Card"}</SelectItem>
                <SelectItem value="other">{lang === "bn" ? "অন্যান্য" : "Other"}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>{lang === "bn" ? "মন্তব্য" : "Note"}</Label>
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={lang === "bn" ? "যেমন: bkash 01711…" : "e.g. bkash 01711…"} />
          </div>

          <Button onClick={save} disabled={saving} className="w-full h-11">
            {saving ? (lang === "bn" ? "সংরক্ষণ হচ্ছে..." : "Saving...") : (lang === "bn" ? "সেভ করুন" : "Save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
