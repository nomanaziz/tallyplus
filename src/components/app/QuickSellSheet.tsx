import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { UserRound, Link2, Calendar } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useShop } from "@/lib/shop";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function QuickSellSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { lang, t } = useI18n();
  const { current } = useShop();
  const { user } = useAuth();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [amount, setAmount] = useState("");
  const [profit, setProfit] = useState("");
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [note, setNote] = useState("");
  const [sms, setSms] = useState(false);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setDate(today); setAmount(""); setProfit(""); setCustName("");
    setCustPhone(""); setNote(""); setSms(false);
  };

  const save = async () => {
    if (!current?.id) { toast.error(t("p2c_selectShop")); return; }
    const amt = Number(amount);
    if (!amt || amt <= 0) { toast.error(t("p2c_enterAmount")); return; }
    if (!custName.trim()) { toast.error(t("p2c_custNameReq")); return; }
    if (!custPhone.trim()) { toast.error(t("p2c_mobileRequired")); return; }
    setSaving(true);
    try {
      let customer_id: string | null = null;
      if (custName.trim()) {
        const { data: c, error: ce } = await supabase
          .from("customers")
          .insert({ shop_id: current.id, name: custName.trim(), phone: custPhone.trim() || null })
          .select("id").single();
        if (ce) throw ce;
        customer_id = c.id;
      }
      const noteText = [note.trim(), profit.trim() ? `${t("p2c_profit")}: ${profit}` : ""].filter(Boolean).join(" | ");
      const { error } = await supabase.from("sales").insert({
        shop_id: current.id,
        customer_id,
        subtotal: amt,
        total: amt,
        paid: amt,
        due: 0,
        payment_method: "cash",
        status: "completed",
        note: noteText || null,
        created_by: user?.id ?? null,
        created_at: new Date(date).toISOString(),
      });
      if (error) throw error;
      toast.success(t("p2c_saleRecorded"));
      reset();
      onOpenChange(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg);
    } finally { setSaving(false); }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-md p-0 flex flex-col">
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle className="text-center text-lg">Quick Sell</SheetTitle>
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
            <Label>{t("p2c_paymentMethod")}</Label>
            <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2.5">
              <span className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-foreground">
                <span className="h-2 w-2 rounded-full bg-foreground" />
              </span>
              <span className="text-sm">{t("p2c_cash")}</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{t("p2c_amount2")} <span className="text-destructive">*</span></Label>
            <Input type="number" inputMode="decimal" placeholder={t("p2c_amount2")} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("p2c_profit")}</Label>
            <Input type="number" inputMode="decimal" placeholder={t("p2c_profit")} value={profit} onChange={(e) => setProfit(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("p2c_customerName")}</Label>
            <div className="relative">
              <Input placeholder={t("p2c_customerName")} value={custName} onChange={(e) => setCustName(e.target.value)} className="pr-10" />
              <UserRound className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{t("p2c_customerMobile")}</Label>
            <div className="flex gap-2">
              <div className="flex w-20 items-center justify-center rounded-md border bg-muted/30 text-sm">+88</div>
              <Input type="tel" placeholder="xxxxxxxxxx" value={custPhone} onChange={(e) => setCustPhone(e.target.value)} className="flex-1" />
            </div>
          </div>
          <div className="flex gap-2">
            <Textarea placeholder={t("p2c_writeNote")} value={note} onChange={(e) => setNote(e.target.value)} className="flex-1" />
            <Button variant="outline" size="icon" className="h-10 w-10 flex-none" type="button"><Link2 className="h-4 w-4" /></Button>
          </div>
        </div>
        <div className="border-t bg-background p-4 space-y-3">
          <div className="flex items-center justify-center gap-3">
            <Switch checked={sms} onCheckedChange={setSms} />
            <span className="text-sm">{t("p2c_sendSms")}</span>
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
              {t("p2c_smsLeft30b")}
            </Badge>
          </div>
          <Button onClick={save} disabled={saving} className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 text-base">
            {saving ? (t("p2c_saving")) : (t("p2c_paymentReceived"))}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}