import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, fmtMoney } from "@/lib/i18n";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { createInstantReturn } from "@/lib/instant-return";

type Line = {
  product_id: string | null;
  name: string;
  qty: number;
  price: number;
  picked: boolean;
  returnQty: number;
};

export function PartialReturnDialog({
  open,
  onOpenChange,
  shopId,
  saleId,
  invoiceNo,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  shopId: string;
  saleId: string | null;
  invoiceNo?: string | null;
  onDone: () => void;
}) {
  const { lang, t } = useI18n();
  const [lines, setLines] = useState<Line[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refundMethod, setRefundMethod] = useState<"cash" | "due_adjust" | "none">("cash");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open || !saleId) return;
    setLoading(true);
    setNote("");
    setRefundMethod("cash");
    (async () => {
      const { data } = await supabase
        .from("sale_items")
        .select("product_id,name,qty,price")
        .eq("sale_id", saleId);
      setLines(
        ((data ?? []) as any[]).map((l) => ({
          product_id: l.product_id,
          name: l.name,
          qty: Number(l.qty),
          price: Number(l.price),
          picked: true,
          returnQty: Number(l.qty),
        }))
      );
      setLoading(false);
    })();
  }, [open, saleId]);

  const total = lines
    .filter((l) => l.picked)
    .reduce((a, l) => a + Number(l.returnQty || 0) * Number(l.price || 0), 0);

  async function onConfirm() {
    if (!saleId) return;
    const picked = lines.filter((l) => l.picked && Number(l.returnQty) > 0);
    if (picked.length === 0) {
      toast.error(lang === "bn" ? "অন্তত একটি পণ্য নির্বাচন করুন" : "Select at least one item");
      return;
    }
    setSaving(true);
    try {
      await createInstantReturn({
        shopId,
        saleId,
        items: picked.map((l) => ({
          product_id: l.product_id,
          name: l.name,
          qty: Number(l.returnQty),
          price: Number(l.price),
        })),
        refundMethod,
        note: note || undefined,
      });
      toast.success(lang === "bn" ? "ফেরত সম্পন্ন" : "Return completed");
      onOpenChange(false);
      onDone();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {lang === "bn" ? "আংশিক ফেরত" : "Partial return"}
            {invoiceNo ? ` · ${invoiceNo}` : ""}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            {lang === "bn" ? "লোড হচ্ছে…" : "Loading…"}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="max-h-64 space-y-2 overflow-y-auto rounded-md border p-2">
              {lines.map((l, i) => (
                <div key={i} className="flex items-center gap-2 rounded-md border bg-card px-2 py-1.5">
                  <Checkbox
                    checked={l.picked}
                    onCheckedChange={(v) =>
                      setLines((arr) => arr.map((x, j) => (j === i ? { ...x, picked: !!v } : x)))
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{l.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {fmtMoney(l.price, lang)} × {l.qty}
                    </div>
                  </div>
                  <Input
                    type="number"
                    min={0}
                    max={l.qty}
                    value={l.returnQty}
                    disabled={!l.picked}
                    onChange={(e) =>
                      setLines((arr) =>
                        arr.map((x, j) =>
                          j === i
                            ? { ...x, returnQty: Math.min(l.qty, Math.max(0, Number(e.target.value || 0))) }
                            : x
                        )
                      )
                    }
                    className="h-8 w-20"
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">{lang === "bn" ? "ফেরতের ধরন" : "Refund method"}</Label>
                <Select value={refundMethod} onValueChange={(v) => setRefundMethod(v as any)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">{lang === "bn" ? "ক্যাশ ফেরত" : "Cash refund"}</SelectItem>
                    <SelectItem value="due_adjust">{lang === "bn" ? "বাকি থেকে কাটুন" : "Adjust against due"}</SelectItem>
                    <SelectItem value="none">{lang === "bn" ? "ফেরত নয় (শুধু স্টক)" : "No refund (stock only)"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">{lang === "bn" ? "নোট" : "Note"}</Label>
                <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="—" className="h-9" />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm">
              <span className="text-muted-foreground">{lang === "bn" ? "ফেরতের মোট" : "Return total"}</span>
              <span className="font-bold">{fmtMoney(total, lang)}</span>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {lang === "bn" ? "বাতিল" : "Cancel"}
          </Button>
          <Button onClick={onConfirm} disabled={saving || loading}>
            {saving ? (lang === "bn" ? "চলছে…" : "Processing…") : (lang === "bn" ? "ফেরত করুন" : "Confirm return")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}