import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

type Props = {
  open: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  onOpenChange: (v: boolean) => void;
  onConfirmed: () => void | Promise<void>;
};

export function PinConfirmDialog({ open, title = "নিশ্চিত করুন", message, confirmLabel = "মুছে ফেলুন", onOpenChange, onConfirmed }: Props) {
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) { setPin(""); setBusy(false); }
  }, [open]);

  const submit = async () => {
    if (!/^\d{4}$/.test(pin)) return toast.error("৪-সংখ্যার PIN দিন");
    setBusy(true);
    const { data, error } = await supabase.rpc("verify_current_user_pin", { _pin: pin });
    if (error) { setBusy(false); return toast.error(error.message); }
    if (!data) { setBusy(false); return toast.error("ভুল PIN"); }
    try {
      await onConfirmed();
      onOpenChange(false);
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" />{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {message && <div className="text-sm text-muted-foreground">{message}</div>}
          <div>
            <Label>আপনার login PIN দিন</Label>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={4}
              autoFocus
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
              onKeyDown={(e) => { if (e.key === "Enter") void submit(); }}
              placeholder="••••"
              className="tracking-[0.6em] text-center text-lg"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>বাতিল</Button>
          <Button variant="destructive" onClick={submit} disabled={busy || pin.length !== 4}>
            {busy ? "চেক হচ্ছে..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}