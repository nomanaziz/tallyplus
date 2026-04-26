import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Package, Banknote } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { useNavigate } from "@/lib/router";

export type DueDirection = "giving" | "taking";
export type DueKind = "goods" | "money";

export function DueTypePickerDialog({
  open,
  onOpenChange,
  onPickMoney,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPickMoney: (dir: DueDirection) => void;
}) {
  const { lang } = useI18n();
  const nav = useNavigate();
  const [kind, setKind] = useState<DueKind>("money");
  const [dir, setDir] = useState<DueDirection>("giving");

  const onContinue = () => {
    if (kind === "goods") {
      onOpenChange(false);
      // giving = customer owes us → sell page; taking = we owe supplier → purchase page
      if (dir === "giving") nav({ to: "/app/sell", search: { payment: "due" } as never });
      else nav({ to: "/app/purchase", search: { payment: "due" } as never });
    } else {
      onOpenChange(false);
      onPickMoney(dir);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{lang === "bn" ? "বাকির ধরন নির্বাচন করুন" : "Select the due type"}</DialogTitle>
          <DialogDescription className="sr-only">Choose due type</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setKind("goods")}
            className={cn("flex flex-col items-center gap-2 rounded-lg border-2 p-6 transition", kind === "goods" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40")}
          >
            <Package className="h-10 w-10 text-amber-500" />
            <span className="font-semibold">{lang === "bn" ? "পণ্য বাকি" : "Goods due"}</span>
          </button>
          <button
            type="button"
            onClick={() => setKind("money")}
            className={cn("flex flex-col items-center gap-2 rounded-lg border-2 p-6 transition", kind === "money" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40")}
          >
            <Banknote className="h-10 w-10 text-emerald-600" />
            <span className="font-semibold">{lang === "bn" ? "টাকা বাকি" : "Money due"}</span>
          </button>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">{lang === "bn" ? "বাকির ধরণ" : "Direction"}</p>
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
                  <span className="block font-medium">{d === "giving" ? (lang === "bn" ? "দিচ্ছি" : "Giving") : (lang === "bn" ? "নিচ্ছি" : "Taking")}</span>
                  <span className="block text-xs text-muted-foreground">
                    {d === "giving" ? (lang === "bn" ? "আপনি বাকি দিচ্ছেন" : "You are giving on credit") : (lang === "bn" ? "আপনি বাকি নিচ্ছেন" : "You are taking on credit")}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
        <Button onClick={onContinue} className="w-full h-11 bg-foreground text-background hover:bg-foreground/90">
          Continue
        </Button>
      </DialogContent>
    </Dialog>
  );
}