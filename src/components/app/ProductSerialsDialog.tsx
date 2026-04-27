import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useShop } from "@/lib/shop";
import { Trash2, Plus, X } from "lucide-react";
import { toast } from "sonner";

export type SerialRow = {
  id: string;
  serial_no: string;
  imei2: string | null;
  status: "in_stock" | "sold" | "returned" | "damaged";
  cost_price: number;
  warranty_until: string | null;
  note: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  productId: string | null;
  productName: string;
};

export function ProductSerialsDialog({ open, onOpenChange, productId, productName }: Props) {
  const { lang } = useI18n();
  const { current } = useShop();
  const [rows, setRows] = useState<SerialRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkCost, setBulkCost] = useState("");
  const [bulkWarranty, setBulkWarranty] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    if (!productId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("product_serials")
      .select("id, serial_no, imei2, status, cost_price, warranty_until, note")
      .eq("product_id", productId)
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setRows((data ?? []) as SerialRow[]);
  }

  useEffect(() => {
    if (open && productId) {
      void refresh();
      setBulkText(""); setBulkCost(""); setBulkWarranty("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, productId]);

  async function bulkAdd() {
    if (!current || !productId) return;
    const lines = bulkText.split(/\r?\n|,/).map((s) => s.trim()).filter(Boolean);
    if (lines.length === 0) {
      toast.error(lang === "bn" ? "অন্তত একটি সিরিয়াল দিন" : "Enter at least one serial");
      return;
    }
    setBusy(true);
    const payload = lines.map((s) => ({
      shop_id: current.id,
      product_id: productId,
      serial_no: s,
      cost_price: Number(bulkCost) || 0,
      warranty_until: bulkWarranty || null,
      status: "in_stock" as const,
    }));
    const { error } = await supabase.from("product_serials").insert(payload);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(lang === "bn" ? `${lines.length}টি সিরিয়াল যোগ হয়েছে` : `${lines.length} serial(s) added`);
    setBulkText(""); setBulkCost(""); setBulkWarranty("");
    void refresh();
  }

  async function removeRow(id: string) {
    if (!confirm(lang === "bn" ? "ডিলিট করবেন?" : "Delete?")) return;
    const { error } = await supabase.from("product_serials").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    void refresh();
  }

  const statusBadge = (s: SerialRow["status"]) => {
    const map: Record<string, { cls: string; bn: string; en: string }> = {
      in_stock: { cls: "bg-emerald-100 text-emerald-800", bn: "স্টকে", en: "In stock" },
      sold: { cls: "bg-slate-200 text-slate-700", bn: "বিক্রিত", en: "Sold" },
      returned: { cls: "bg-amber-100 text-amber-800", bn: "ফেরত", en: "Returned" },
      damaged: { cls: "bg-rose-100 text-rose-800", bn: "ক্ষতিগ্রস্ত", en: "Damaged" },
    };
    const m = map[s];
    return <span className={`rounded px-2 py-0.5 text-xs font-semibold ${m.cls}`}>{lang === "bn" ? m.bn : m.en}</span>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lang === "bn" ? "সিরিয়াল / IMEI ম্যানেজ" : "Manage Serials / IMEI"}</DialogTitle>
          <DialogDescription>{productName}</DialogDescription>
        </DialogHeader>

        {/* Bulk add */}
        <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
          <div className="text-sm font-semibold">
            {lang === "bn" ? "নতুন সিরিয়াল যোগ করুন" : "Add new serials"}
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">
              {lang === "bn" ? "IMEI/সিরিয়াল (প্রতি লাইনে একটি, অথবা কমা দিয়ে আলাদা)" : "IMEI/Serial (one per line or comma-separated)"}
            </Label>
            <Textarea rows={3} value={bulkText} onChange={(e) => setBulkText(e.target.value)} placeholder="354897109876543" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label className="text-xs">{lang === "bn" ? "প্রতিটির ক্রয়মূল্য" : "Cost price each"}</Label>
              <Input type="number" value={bulkCost} onChange={(e) => setBulkCost(e.target.value)} placeholder="0" />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">{lang === "bn" ? "ওয়ারেন্টি শেষ তারিখ" : "Warranty end date"}</Label>
              <Input type="date" value={bulkWarranty} onChange={(e) => setBulkWarranty(e.target.value)} />
            </div>
          </div>
          <Button onClick={bulkAdd} disabled={busy} className="w-full gap-2">
            <Plus className="h-4 w-4" />
            {lang === "bn" ? "যোগ করুন" : "Add"}
          </Button>
        </div>

        {/* List */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">
              {lang === "bn" ? `সিরিয়াল তালিকা (${rows.length})` : `Serial list (${rows.length})`}
            </div>
          </div>
          {loading ? (
            <div className="py-6 text-center text-sm text-muted-foreground">...</div>
          ) : rows.length === 0 ? (
            <div className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
              {lang === "bn" ? "কোন সিরিয়াল যোগ করা হয়নি" : "No serials added"}
            </div>
          ) : (
            <ul className="divide-y rounded-lg border">
              {rows.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-mono text-sm">{r.serial_no}</span>
                      {statusBadge(r.status)}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {r.warranty_until ? (lang === "bn" ? `ওয়ারেন্টি: ${r.warranty_until}` : `Warranty: ${r.warranty_until}`) : "—"}
                      {r.cost_price ? ` • ৳${r.cost_price}` : ""}
                    </div>
                  </div>
                  {r.status === "in_stock" && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeRow(r.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="gap-1.5">
            <X className="h-4 w-4" />
            {lang === "bn" ? "বন্ধ করুন" : "Close"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}