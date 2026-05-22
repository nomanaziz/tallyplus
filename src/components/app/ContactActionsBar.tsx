import { Phone, MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { normalizeBdPhone } from "@/lib/permissions";
import { useI18n, fmtMoney } from "@/lib/i18n";
import { toast } from "sonner";

type Props = {
  name: string;
  phone: string | null | undefined;
  due?: number;
};

export function ContactActionsBar({ name, phone, due = 0 }: Props) {
  const { lang, t } = useI18n();
  const normalized = normalizeBdPhone(phone);

  const guard = () => {
    if (!normalized) {
      toast.error(t("p2b_noPhone"));
      return false;
    }
    return true;
  };

  const reminderText = () => {
    const greet = t("p2b_remGreet", { name });
    return due > 0
      ? greet + t("p2b_remDue", { amt: fmtMoney(due, lang) })
      : greet + t("p2b_remThanks");
  };

  const onCall = () => {
    if (!guard()) return;
    window.location.href = `tel:+${normalized}`;
  };

  const onWhatsApp = () => {
    if (!guard()) return;
    const url = `https://wa.me/${normalized}?text=${encodeURIComponent(reminderText())}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const onTelegram = () => {
    if (!guard()) return;
    // Telegram does not support pre-filled DM by phone reliably; open share URL
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(`tel:+${normalized}`)}&text=${encodeURIComponent(reminderText())}`;
    window.open(shareUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" className="gap-1.5" onClick={onCall}>
        <Phone className="h-4 w-4 text-emerald-600" />
        {t("p2b_call")}
      </Button>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={onWhatsApp}>
        <MessageCircle className="h-4 w-4 text-green-600" />
        WhatsApp
      </Button>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={onTelegram}>
        <Send className="h-4 w-4 text-sky-500" />
        Telegram
      </Button>
    </div>
  );
}