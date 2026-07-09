import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { UserRound, Calendar, Wrench } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useShop } from "@/lib/shop";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function QuickServiceSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { lang, t } = useI18n();
  const { current } = useShop();
  const { user } = useAuth();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [serviceName, setServiceName] = useState("");
  const [amount, setAmount] = useState("");
  const [additionalCost, setAdditionalCost] = useState("");
  const [costNote, setCostNote] = useState("");
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [note, setNote] = useState("");
  const [walkIn, setWalkIn] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bkash" | "nagad" | "rocket" | "card" | "bank">("cash");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setDate(today); setServiceName(""); setAmount(""); setAdditionalCost(""); setCostNote("");
    setCustName(""); setCustPhone(""); setNote(""); setWalkIn(true); setPaymentMethod("cash");
  };

  const save = async () => {
    if (!current?.id) { toast.error(t("p2c_selectShop")); return; }
    if (!serviceName.trim()) { toast.error(lang === "bn" ? "সার্ভিসের নাম দিন" : "Enter service name"); return; }
    const amt = Number(amount);
    if (!amt || amt <= 0) { toast.error(t("p2c_enterAmount")); return; }
    if (!walkIn && !custName.trim()) { toast.error(t("p2c_custNameReq")); return; }
    setSaving(true);
    try {
      let customer_id: string | null = null;
      if (!walkIn && custName.trim()) {
        const { data: c, error: ce } = await supabase
          .from("customers")
          .insert({ shop_id: current.id, name: custName.trim(), phone: custPhone.trim() || null })
          .select("id").single();
        if (ce) throw ce;
        customer_id = c.id;
      }
      const { data: sale, error } = await supabase.from("sales").insert({
        shop_id: current.id,
        customer_id,
        subtotal: amt,
        total: amt,
        paid: amt,
        due: 0,
        payment_method: paymentMethod,
        status: "completed",
        note: [`Service: ${serviceName.trim()}`, note.trim()].filter(Boolean).join(" | "),
        created_by: user?.id ?? null,
        created_at: new Date(date).toISOString(),
      }).select("id").single();
      if (error) throw error;
      const saleId = (sale as { id: string }).id;

      await supabase.from("sale_items").insert({
        sale_id: saleId,
        product_id: null,
        service_id: null,
        item_type: "service",
        name: serviceName.trim(),
        qty: 1,
        price: amt,
        total: amt,
      });

      const addCost = Number(additionalCost) || 0;
      if (addCost > 0) {
        await supabase.from("expenses").insert({
          shop_id: current.id,
          category: lang === "bn" ? "সার্ভিস খরচ" : "Service cost",
          amount: addCost,
          note: `${serviceName.trim()}${costNote ? " — " + costNote : ""} (sale ${saleId.slice(0, 8)})`,
          paid_via: paymentMethod,
          created_by: user?.id ?? null,
        });
      }

      await supabase.from("cash_movements").insert({
        shop_id: current.id,
        direction: "in",
        amount: amt,
        note: `quick service ${saleId}`,
        ref_table: "sales",
        ref_id: saleId,
        created_by: user?.id ?? null,
      });

      toast.success(t("p2c_saleRecorded"));
      reset();
      onOpenChange(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally { setSaving(false); }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-md p-0 flex flex-col">
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle className="flex items-center justify-center gap-2 text-lg">
            <Wrench className="h-4 w-4" /> {lang === "bn" ? "কুইক সার্ভিস" : "Quick Service"}
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="space-y-1.5">
            <Label>{t("p2c_saleDateColon")}</Label>
            <div className="relative">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="pr-10" />
              <Calendar className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{lang === "bn" ? "সার্ভিসের নাম" : "Service name"} <span className="text-destructive">*</span></Label>
            <Input value={serviceName} onChange={(e) => setServiceName(e.target.value)} placeholder={lang === "bn" ? "উদাহরণ: এসি সার্ভিসিং" : "e.g. AC servicing"} />
          </div>
          <div className="space-y-1.5">
            <Label>{lang === "bn" ? "সার্ভিস চার্জ" : "Service charge"} <span className="text-destructive">*</span></Label>
            <Input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="rounded-md border bg-amber-50/40 dark:bg-amber-950/20 p-3 space-y-2">
            <Label className="text-xs font-semibold">
              {lang === "bn" ? "অতিরিক্ত খরচ (পার্টস/লেবার)" : "Additional cost (parts/labor)"}
            </Label>
            <div className="grid grid-cols-[1fr_2fr] gap-2">
              <Input type="number" inputMode="decimal" value={additionalCost} onChange={(e) => setAdditionalCost(e.target.value)} placeholder="0" />
              <Input value={costNote} onChange={(e) => setCostNote(e.target.value)} placeholder={lang === "bn" ? "নোট (ঐচ্ছিক)" : "Note (optional)"} />
            </div>
            <p className="text-[11px] text-muted-foreground">
              {lang === "bn" ? "এটি খরচ হিসেবে রেকর্ড হবে।" : "Recorded as an expense."}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>{t("p2c_paymentMethod")}</Label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="cash">{t("p2c_cash")}</option>
              <option value="bkash">bKash</option>
              <option value="nagad">Nagad</option>
              <option value="rocket">Rocket</option>
              <option value="card">Card</option>
              <option value="bank">Bank</option>
            </select>
          </div>
          <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
            <Label className="text-sm">{lang === "bn" ? "ওয়াকিং কাস্টমার" : "Walking customer"}</Label>
            <Switch checked={walkIn} onCheckedChange={setWalkIn} />
          </div>
          {!walkIn && (
            <>
              <div className="space-y-1.5">
                <Label>{t("p2c_customerName")}</Label>
                <div className="relative">
                  <Input value={custName} onChange={(e) => setCustName(e.target.value)} className="pr-10" />
                  <UserRound className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t("p2c_customerMobile")}</Label>
                <div className="flex gap-2">
                  <div className="flex w-20 items-center justify-center rounded-md border bg-muted/30 text-sm">+88</div>
                  <Input type="tel" value={custPhone} onChange={(e) => setCustPhone(e.target.value)} className="flex-1" />
                </div>
              </div>
            </>
          )}
          <Textarea placeholder={t("p2c_writeNote")} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="border-t bg-background p-4">
          <Button onClick={save} disabled={saving} className="w-full h-12 text-base">
            {saving ? t("p2c_saving") : t("p2c_paymentReceived")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}