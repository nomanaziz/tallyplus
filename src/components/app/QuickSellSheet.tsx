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
  const { lang } = useI18n();
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
    if (!current?.id) { toast.error(lang === "bn" ? "শপ নির্বাচন করুন" : "Select a shop"); return; }
    const amt = Number(amount);
    if (!amt || amt <= 0) { toast.error(lang === "bn" ? "টাকার পরিমাণ দিন" : "Enter amount"); return; }
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
      const noteText = [note.trim(), profit.trim() ? `${lang === "bn" ? "লাভ" : "Profit"}: ${profit}` : ""].filter(Boolean).join(" | ");
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
      toast.success(lang === "bn" ? "বিক্রয় সম্পন্ন" : "Sale recorded");
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
            <Label>{lang === "bn" ? "বিক্রির তারিখঃ" : "Sale date:"}</Label>
            <div className="relative">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="pr-10" />
              <Calendar className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{lang === "bn" ? "মূল্য পরিশোধ পদ্ধতি" : "Payment method"}</Label>
            <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2.5">
              <span className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-foreground">
                <span className="h-2 w-2 rounded-full bg-foreground" />
              </span>
              <span className="text-sm">{lang === "bn" ? "নগদ টাকা" : "Cash"}</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{lang === "bn" ? "টাকার পরিমান" : "Amount"} <span className="text-destructive">*</span></Label>
            <Input type="number" inputMode="decimal" placeholder={lang === "bn" ? "টাকার পরিমান" : "Amount"} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{lang === "bn" ? "লাভ" : "Profit"}</Label>
            <Input type="number" inputMode="decimal" placeholder={lang === "bn" ? "লাভ" : "Profit"} value={profit} onChange={(e) => setProfit(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{lang === "bn" ? "কাস্টমার নাম" : "Customer name"}</Label>
            <div className="relative">
              <Input placeholder={lang === "bn" ? "কাস্টমার নাম" : "Customer name"} value={custName} onChange={(e) => setCustName(e.target.value)} className="pr-10" />
              <UserRound className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{lang === "bn" ? "কাস্টমার মোবাইল নম্বর" : "Customer mobile"}</Label>
            <div className="flex gap-2">
              <div className="flex w-20 items-center justify-center rounded-md border bg-muted/30 text-sm">+88</div>
              <Input type="tel" placeholder="xxxxxxxxxx" value={custPhone} onChange={(e) => setCustPhone(e.target.value)} className="flex-1" />
            </div>
          </div>
          <div className="flex gap-2">
            <Textarea placeholder={lang === "bn" ? "মন্তব্য লিখুন" : "Write a note"} value={note} onChange={(e) => setNote(e.target.value)} className="flex-1" />
            <Button variant="outline" size="icon" className="h-10 w-10 flex-none" type="button"><Link2 className="h-4 w-4" /></Button>
          </div>
        </div>
        <div className="border-t bg-background p-4 space-y-3">
          <div className="flex items-center justify-center gap-3">
            <Switch checked={sms} onCheckedChange={setSms} />
            <span className="text-sm">{lang === "bn" ? "ম্যাসেজ পাঠান" : "Send SMS"}</span>
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
              {lang === "bn" ? "এসএমএস অবশিষ্ট: 30" : "SMS left: 30"}
            </Badge>
          </div>
          <Button onClick={save} disabled={saving} className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 text-base">
            {saving ? (lang === "bn" ? "সংরক্ষণ হচ্ছে..." : "Saving...") : (lang === "bn" ? "টাকার মূল্য পেয়েছেন" : "Payment received")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}