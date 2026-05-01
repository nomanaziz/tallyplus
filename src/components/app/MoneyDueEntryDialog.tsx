import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { useShop } from "@/lib/shop";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserRound, Calendar, Link2 } from "lucide-react";
import type { DueDirection } from "./DueTypePickerDialog";

type PartyType = "customer" | "supplier" | "employee";

export function MoneyDueEntryDialog({
  open,
  onOpenChange,
  defaultDirection,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultDirection: DueDirection;
  onSaved?: () => void;
}) {
  const { lang } = useI18n();
  const { current } = useShop();
  const { user } = useAuth();
  const today = new Date().toISOString().slice(0, 10);
  const [party, setParty] = useState<PartyType>("customer");
  const [date, setDate] = useState(today);
  const [dir, setDir] = useState<DueDirection>(defaultDirection);
  const [amount, setAmount] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [sms, setSms] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) setDir(defaultDirection); }, [open, defaultDirection]);

  const reset = () => {
    setParty("customer"); setDate(today); setAmount(""); setName("");
    setPhone(""); setAddress(""); setNote(""); setSms(false);
  };

  const partyLabel = () => {
    if (party === "customer") return lang === "bn" ? "কাস্টমারের নাম" : "Customer name";
    if (party === "supplier") return lang === "bn" ? "সাপ্লায়ারের নাম" : "Supplier name";
    return lang === "bn" ? "কর্মচারীর নাম" : "Employee name";
  };

  const save = async () => {
    if (!current?.id) { toast.error(lang === "bn" ? "শপ নির্বাচন করুন" : "Select a shop"); return; }
    const amt = Number(amount);
    if (!amt || amt <= 0) { toast.error(lang === "bn" ? "টাকার পরিমাণ দিন" : "Enter amount"); return; }
    if (!name.trim()) { toast.error(lang === "bn" ? "নাম দিন" : "Enter name"); return; }
    if (!phone.trim()) { toast.error(lang === "bn" ? "ফোন নাম্বার দিন" : "Enter phone"); return; }
    setSaving(true);
    try {
      // Insert into the right party table (employee → also customers row marked via note)
      let contactId: string | null = null;
      if (party === "supplier") {
        const { data, error } = await supabase
          .from("suppliers")
          .insert({ shop_id: current.id, name: name.trim(), phone: phone.trim(), address: address.trim() || null, due_balance: dir === "taking" ? amt : 0 })
          .select("id").single();
        if (error) throw error;
        contactId = data.id;
      } else {
        const { data, error } = await supabase
          .from("customers")
          .insert({ shop_id: current.id, name: name.trim(), phone: phone.trim(), address: address.trim() || null, due_balance: dir === "giving" ? amt : 0 })
          .select("id").single();
        if (error) throw error;
        contactId = data.id;
      }

      // Cash movement: giving = cash out (we lent), taking = cash in (we borrowed)
      const { error: cmErr } = await supabase.from("cash_movements").insert({
        shop_id: current.id,
        direction: dir === "giving" ? "out" : "in",
        amount: amt,
        note: [party === "employee" ? "Employee due" : `${party} due`, name.trim(), note.trim()].filter(Boolean).join(" | "),
        created_by: user?.id ?? null,
        ref_table: party === "supplier" ? "suppliers" : "customers",
        ref_id: contactId,
      });
      if (cmErr) throw cmErr;

      toast.success(lang === "bn" ? "সংরক্ষিত হয়েছে" : "Saved");
      reset();
      onOpenChange(false);
      onSaved?.();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg);
    } finally { setSaving(false); }
  };

  const titleEn = dir === "giving" ? "Add Money Given Entry" : "Add Money Taken Entry";
  const titleBn = dir === "giving" ? "টাকা দেওয়ার এন্ট্রি" : "টাকা নেওয়ার এন্ট্রি";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 max-h-[90vh] flex flex-col">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle className="text-center">{lang === "bn" ? titleBn : titleEn}</DialogTitle>
          <DialogDescription className="sr-only">Money due entry form</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <Tabs value={party} onValueChange={(v) => setParty(v as PartyType)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="customer">{lang === "bn" ? "কাস্টমার" : "Customer"}</TabsTrigger>
              <TabsTrigger value="supplier">{lang === "bn" ? "সাপ্লায়ার" : "Supplier"}</TabsTrigger>
              <TabsTrigger value="employee">{lang === "bn" ? "কর্মচারী" : "Employee"}</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-1.5">
            <Label>{lang === "bn" ? "তারিখ" : "Date"}</Label>
            <div className="relative">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="pr-10" />
              <Calendar className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{lang === "bn" ? "নগদ টাকা" : "Cash"}</Label>
            <div className="grid grid-cols-2 gap-3">
              {(["giving", "taking"] as DueDirection[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDir(d)}
                  className={cn("flex items-start gap-2 rounded-lg border-2 p-3 text-left transition", dir === d ? "border-destructive bg-destructive/5" : "border-border hover:border-muted-foreground/40")}
                >
                  <span className={cn("mt-0.5 flex h-4 w-4 flex-none items-center justify-center rounded-full border-2", dir === d ? "border-foreground" : "border-muted-foreground")}>
                    {dir === d && <span className="h-2 w-2 rounded-full bg-foreground" />}
                  </span>
                  <span>
                    <span className="block text-sm font-medium">{d === "giving" ? (lang === "bn" ? "দিচ্ছি" : "Giving") : (lang === "bn" ? "নিচ্ছি" : "Taking")}</span>
                    <span className="block text-xs text-muted-foreground">
                      {d === "giving" ? (lang === "bn" ? "আপনি বাকি দিচ্ছেন" : "You are giving") : (lang === "bn" ? "আপনি টাকা নিচ্ছেন" : "You are taking")}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{lang === "bn" ? "টাকার পরিমান" : "Amount"} <span className="text-destructive">*</span></Label>
            <Input type="number" inputMode="decimal" placeholder={lang === "bn" ? "টাকার পরিমান" : "Amount"} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>{partyLabel()} <span className="text-destructive">*</span></Label>
            <div className="relative">
              <Input placeholder={partyLabel()} value={name} onChange={(e) => setName(e.target.value)} className="pr-10" />
              <UserRound className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{lang === "bn" ? "ফোন নাম্বার" : "Phone"} <span className="text-destructive">*</span></Label>
            <div className="flex gap-2">
              <div className="flex w-20 items-center justify-center rounded-md border bg-muted/30 text-sm">+88</div>
              <Input type="tel" placeholder="xxxxxxxxxx" value={phone} onChange={(e) => setPhone(e.target.value)} className="flex-1" />
            </div>
          </div>

          <Input placeholder={lang === "bn" ? "ঠিকানা" : "Address"} value={address} onChange={(e) => setAddress(e.target.value)} />

          <div className="flex gap-2">
            <Textarea placeholder={lang === "bn" ? "মন্তব্য লিখুন" : "Note"} value={note} onChange={(e) => setNote(e.target.value)} className="flex-1" />
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
          <Button onClick={save} disabled={saving} className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90">
            {saving ? (lang === "bn" ? "সংরক্ষণ হচ্ছে..." : "Saving...") : (lang === "bn" ? "সেভ করুন" : "Save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}