import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { QRCodeCanvas } from "qrcode.react";
import { toast } from "sonner";
import { useRef } from "react";
import { Download } from "lucide-react";

export function QrCodeDialog({
  open, onOpenChange, url, shopName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  url: string;
  shopName: string;
}) {
  const { lang } = useI18n();
  const ref = useRef<HTMLDivElement>(null);

  const download = () => {
    const canvas = ref.current?.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `${shopName}-qr.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success(lang === "bn" ? "ডাউনলোড হয়েছে" : "Downloaded");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{lang === "bn" ? "QR কোড" : "QR Code"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-3">
          <div ref={ref} className="rounded-lg bg-white p-4">
            <QRCodeCanvas value={url} size={224} />
          </div>
          <p className="break-all text-center text-xs text-muted-foreground">{url}</p>
          <Button onClick={download} className="w-full">
            <Download className="mr-2 h-4 w-4" />
            {lang === "bn" ? "ডাউনলোড" : "Download"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
