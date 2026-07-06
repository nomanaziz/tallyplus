import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useI18n, fmtMoney } from "@/lib/i18n";
import { useShop } from "@/lib/shop";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, Phone, History, Server, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  customer: { id: string; name: string; phone: string | null; due_balance: number } | null;
};

function normalizePhone(raw: string): string {
  // strip non-digits, prepend Bangladesh country code if 11-digit local
  const d = (raw || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("880")) return d;
  if (d.startsWith("0") && d.length === 11) return "880" + d.slice(1);
  if (d.length === 10) return "880" + d;
  return d;
}

export function DueReminderDialog({ open, onOpenChange, customer }: Props) {
  const { lang, t } = useI18n();
  const { current } = useShop();
  const [message, setMessage] = useState("");
  const [lastSent, setLastSent] = useState<{ channel: string; at: string } | null>(null);
  const [sendingServer, setSendingServer] = useState(false);

  useEffect(() => {
    if (!open || !customer || !current) return;
    const shopName = current.name || (t("p7_Our_Shop"));
    const amount = fmtMoney(Number(customer.due_balance || 0), lang);
    const body = lang === "bn"
      ? `আসসালামু আলাইকুম ${customer.name},\n\nআপনার কাছে ${shopName}-এ ${amount} বাকি রয়েছে। দয়া করে সুবিধামতো পরিশোধ করুন।\n\nধন্যবাদ।`
      : `Hello ${customer.name},\n\nYou have an outstanding balance of ${amount} at ${shopName}. Kindly settle at your convenience.\n\nThank you.`;
    setMessage(body);

    // fetch last reminder
    supabase
      .from("customer_reminder_log")
      .select("channel, created_at")
      .eq("shop_id", current.id)
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data[0]) setLastSent({ channel: data[0].channel, at: data[0].created_at });
        else setLastSent(null);
      });
  }, [open, customer, current, lang]);

  if (!customer) return null;
  const phone = normalizePhone(customer.phone || "");
  const hasPhone = phone.length >= 10;

  async function logReminder(channel: "whatsapp" | "sms" | "server_sms") {
    if (!current || !customer) return;
    const { data: u } = await supabase.auth.getUser();
    await supabase.from("customer_reminder_log").insert({
      shop_id: current.id,
      customer_id: customer.id,
      channel,
      amount: Number(customer.due_balance || 0),
      message,
      created_by: u.user?.id ?? null,
    });
  }

  function sendWhatsapp() {
    if (!hasPhone) {
      toast.error(t("p7_Customer_has_no_phone_number"));
      return;
    }
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    void logReminder("whatsapp");
    toast.success(t("p7_WhatsApp_opened"));
    onOpenChange(false);
  }

  function sendSms() {
    if (!hasPhone) {
      toast.error(t("p7_Customer_has_no_phone_number"));
      return;
    }
    const url = `sms:+${phone}?body=${encodeURIComponent(message)}`;
    window.location.href = url;
    void logReminder("sms");
  }

  async function sendServerSms() {
    if (!hasPhone || !current || !customer) {
      toast.error(t("p7_Customer_has_no_phone_number"));
      return;
    }
    setSendingServer(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-sms", {
        body: {
          shop_id: current.id,
          message,
          recipients: [{ phone, name: customer.name }],
        },
      });
      if (error) throw error;
      const r = (data?.results ?? [])[0];
      if (r?.status === "sent") {
        toast.success(lang === "bn" ? "SMS পাঠানো হয়েছে" : "SMS sent");
        void logReminder("server_sms");
        onOpenChange(false);
      } else {
        toast.error(r?.error ?? (lang === "bn" ? "পাঠানো ব্যর্থ" : "Send failed"));
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setSendingServer(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t("p7_Send_due_reminder")}
          </DialogTitle>
          <DialogDescription>
            {customer.name} • {customer.phone ?? (t("p7_no_phone"))} •{" "}
            <span className="font-semibold text-emerald-700">
              {fmtMoney(Number(customer.due_balance || 0), lang)}
            </span>
          </DialogDescription>
        </DialogHeader>

        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={6}
          className="resize-none text-sm"
        />

        {lastSent && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <History className="h-3.5 w-3.5" />
            {t("p7_Last_sent")} {lastSent.channel} •{" "}
            {new Date(lastSent.at).toLocaleString(t("p7_en_GB"))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 pt-1">
          <Button onClick={sendWhatsapp} disabled={!hasPhone} className="bg-[#25D366] text-white hover:bg-[#1fb558] gap-2">
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </Button>
          <Button onClick={sendSms} disabled={!hasPhone} variant="outline" className="gap-2">
            <Phone className="h-4 w-4" />
            {lang === "bn" ? "ফোন SMS" : "Phone SMS"}
          </Button>
        </div>
        <Button
          onClick={sendServerSms}
          disabled={!hasPhone || sendingServer}
          className="mt-2 w-full gap-2"
        >
          {sendingServer ? <Loader2 className="h-4 w-4 animate-spin" /> : <Server className="h-4 w-4" />}
          {lang === "bn" ? "সার্ভার SMS পাঠান" : "Send via Server SMS"}
        </Button>
        {!hasPhone && (
          <p className="text-xs text-destructive">
            {t("p7_Add_a_phone_number_for_this_cu")}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}