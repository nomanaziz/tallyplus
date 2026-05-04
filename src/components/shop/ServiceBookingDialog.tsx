import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BdLocationPicker, type BdLocation } from "@/components/shared/BdLocationPicker";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CalendarClock, BadgeDollarSign } from "lucide-react";

export type BookingService = {
  id: string;
  name: string;
  price: number;
  advance_amount?: number | null;
  advance_required?: boolean | null;
  booking_enabled?: boolean | null;
};

export type BookingShop = {
  id: string;
  name: string;
  phone?: string | null;
};

export function ServiceBookingDialog({
  open,
  onOpenChange,
  service,
  shop,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  service: BookingService;
  shop: BookingShop;
  onSuccess?: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [loc, setLoc] = useState<BdLocation>({ division: null, district: null, upazila: null, area: null });
  const [scheduledAt, setScheduledAt] = useState("");
  const [note, setNote] = useState("");
  const [advMethod, setAdvMethod] = useState<string>("bkash");
  const [advTxn, setAdvTxn] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Pre-fill from logged-in consumer
  useEffect(() => {
    if (!open) return;
    let alive = true;
    void (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!alive || !u?.user) return;
      const { data: prof } = await supabase
        .from("consumer_profiles")
        .select("name, phone, address, division, district, upazila, area")
        .eq("id", u.user.id)
        .maybeSingle();
      if (!alive || !prof) return;
      const p = prof as { name?: string; phone?: string; address?: string; division?: string; district?: string; upazila?: string; area?: string };
      if (p.name) setName(p.name);
      if (p.phone) setPhone(p.phone);
      if (p.address) setAddress(p.address);
      setLoc({ division: p.division ?? null, district: p.district ?? null, upazila: p.upazila ?? null, area: p.area ?? null });
    })();
    return () => { alive = false; };
  }, [open]);

  const advanceRequired = !!service.advance_required && Number(service.advance_amount ?? 0) > 0;
  const advanceAmount = Number(service.advance_amount ?? 0);

  const submit = async () => {
    if (!name.trim() || !phone.trim()) {
      toast.error("নাম ও ফোন আবশ্যক");
      return;
    }
    if (advanceRequired && !advTxn.trim()) {
      toast.error("অগ্রিম পেমেন্টের TxnID দিন");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("marketplace-public", {
        body: {
          action: "create-service-booking",
          service_id: service.id,
          customer_name: name.trim(),
          customer_phone: phone.trim(),
          customer_address: address.trim() || null,
          division: loc.division,
          district: loc.district,
          upazila: loc.upazila,
          area: loc.area,
          scheduled_at: scheduledAt || null,
          note: note.trim() || null,
          advance_payment_method: advanceRequired ? advMethod : (advTxn ? advMethod : null),
          advance_txn_id: advTxn.trim() || null,
        },
      });
      const errMsg = (data as { error?: string } | null)?.error ?? error?.message;
      if (errMsg) {
        toast.error(errMsg);
      } else {
        toast.success("বুকিং নেওয়া হয়েছে — দোকান শীঘ্রই কল করবে");
        onOpenChange(false);
        onSuccess?.();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{service.name} — বুকিং</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-md border bg-muted/30 p-2 text-sm">
            <div>সার্ভিস ফি: <strong>৳{service.price.toLocaleString("bn-BD")}</strong></div>
            {advanceAmount > 0 && (
              <div className="text-amber-700 dark:text-amber-400">
                <BadgeDollarSign className="inline h-3.5 w-3.5" /> অগ্রিম / যাতায়াত: <strong>৳{advanceAmount.toLocaleString("bn-BD")}</strong>
                {advanceRequired ? " (বাধ্যতামূলক)" : " (ঐচ্ছিক)"}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>আপনার নাম *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>ফোন *</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" />
            </div>
          </div>
          <div>
            <Label>ঠিকানা</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="বাসা / রাস্তা / এলাকা" />
          </div>
          <BdLocationPicker value={loc} onChange={setLoc} showArea={false} />
          <div>
            <Label className="flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" /> পছন্দের সময়</Label>
            <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
          </div>
          <div>
            <Label>নোট</Label>
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="বিশেষ কোনো নির্দেশনা" />
          </div>
          {advanceAmount > 0 && (
            <div className="rounded-md border p-3 space-y-2">
              <div className="text-sm font-semibold">অগ্রিম পেমেন্ট</div>
              <div className="text-xs text-muted-foreground">
                দোকানের নাম্বারে ৳{advanceAmount.toLocaleString("bn-BD")} পাঠিয়ে TxnID দিন।
                {shop.phone && (<> দোকান নাম্বার: <strong>{shop.phone}</strong></>)}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Select value={advMethod} onValueChange={setAdvMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bkash">bKash</SelectItem>
                    <SelectItem value="nagad">Nagad</SelectItem>
                    <SelectItem value="rocket">Rocket</SelectItem>
                    <SelectItem value="cash">ক্যাশ</SelectItem>
                  </SelectContent>
                </Select>
                <Input value={advTxn} onChange={(e) => setAdvTxn(e.target.value)} placeholder="TxnID" />
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>বাতিল</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} বুকিং নিশ্চিত করুন
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}