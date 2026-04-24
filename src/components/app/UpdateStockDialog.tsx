import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Minus, Plus, Package, Save } from "lucide-react";
import { useI18n, bnNum } from "@/lib/i18n";

export function UpdateStockDialog({
  open,
  onOpenChange,
  productName,
  currentStock,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  productName: string;
  currentStock: number;
  onSave: (newStock: number) => Promise<void> | void;
}) {
  const { lang } = useI18n();
  const [val, setVal] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setVal(0);
  }, [open]);

  const handleSave = async () => {
    setBusy(true);
    await onSave(currentStock + val);
    setBusy(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{lang === "bn" ? "স্টক আপডেট" : "Update Stock"}</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-3 border-b pb-3">
          <div className="flex h-10 w-10 flex-none items-center justify-center rounded-md bg-muted">
            <Package className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <div className="font-bold">{productName}</div>
            <div className="text-sm text-muted-foreground">{lang === "bn" ? bnNum(currentStock) : currentStock}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="h-12 w-14 bg-rose-100 text-rose-600 hover:bg-rose-200"
            onClick={() => setVal(val - 1)}
          >
            <Minus className="h-5 w-5" />
          </Button>
          <Input
            type="number"
            value={val}
            onChange={(e) => setVal(Number(e.target.value) || 0)}
            className="h-12 text-center text-xl font-bold"
          />
          <Button
            variant="outline"
            className="h-12 w-14 bg-emerald-500 text-white hover:bg-emerald-600 border-emerald-500"
            onClick={() => setVal(val + 1)}
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
        <Button onClick={handleSave} disabled={busy} className="h-11 bg-foreground text-background hover:opacity-90">
          <Save className="mr-2 h-4 w-4" />
          {busy ? "..." : lang === "bn" ? "পণ্য সংখ্যা আপডেট করুন" : "Update stock count"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}