import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Share2, MessageCircle, Send, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  downloadBlob,
  shareViaWhatsApp,
  shareViaTelegram,
} from "@/lib/share-document";

type Props = {
  /** Build the PDF blob lazily (only when user picks a destination). */
  buildPdf: () => Promise<Blob>;
  /** WhatsApp/share text body. */
  text: string;
  /** Default phone for WhatsApp. */
  phone?: string | null;
  /** Filename for the PDF. */
  filename?: string;
  label?: string;
  size?: "sm" | "default" | "lg" | "icon";
  variant?: "default" | "outline" | "ghost" | "secondary";
  className?: string;
};

export function ShareMenu({
  buildPdf,
  text,
  phone,
  filename = "document.pdf",
  label = "Share",
  size = "sm",
  variant = "outline",
  className,
}: Props) {
  const [loading, setLoading] = useState<string | null>(null);

  const run = async (action: "wa" | "tg" | "dl") => {
    setLoading(action);
    try {
      const blob = await buildPdf();
      if (action === "wa") {
        await shareViaWhatsApp({ phone, text, blob, filename });
        toast.success("WhatsApp খোলা হয়েছে — PDF সংযুক্ত করুন (যদি প্রয়োজন হয়)");
      } else if (action === "tg") {
        await shareViaTelegram({ text, blob, filename });
        toast.success("Telegram খোলা হয়েছে");
      } else {
        downloadBlob(blob, filename);
        toast.success("PDF download শুরু হয়েছে");
      }
    } catch (e: any) {
      toast.error("Share করতে সমস্যা: " + (e?.message ?? String(e)));
    } finally {
      setLoading(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size={size} variant={variant} className={className} disabled={!!loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
          <span className="ml-1.5">{label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => run("wa")} disabled={!!loading}>
          <MessageCircle className="mr-2 h-4 w-4 text-emerald-600" />
          WhatsApp এ পাঠাও
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => run("tg")} disabled={!!loading}>
          <Send className="mr-2 h-4 w-4 text-sky-600" />
          Telegram এ পাঠাও
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => run("dl")} disabled={!!loading}>
          <Download className="mr-2 h-4 w-4" />
          PDF Download
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}