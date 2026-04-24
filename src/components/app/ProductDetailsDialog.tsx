import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Package, Trash2, Plus } from "lucide-react";
import { useI18n, fmtMoney, bnNum } from "@/lib/i18n";

export type ProductFull = {
  id: string;
  name: string;
  stock: number;
  sale_price: number;
  cost_price: number;
  unit: string | null;
  category_id: string | null;
  low_stock_alert: number | null;
  image_url: string | null;
  expiry_date: string | null;
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}

export function ProductDetailsDialog({
  product,
  open,
  onOpenChange,
  onUpdateStock,
  onDelete,
}: {
  product: ProductFull | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onUpdateStock: () => void;
  onDelete: () => void;
}) {
  const { lang } = useI18n();
  if (!product) return null;
  const profit = Number(product.sale_price) - Number(product.cost_price);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{lang === "bn" ? "পণ্যের বিস্তারিত" : "Product details"}</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-3 border-b pb-3">
          <div className="flex h-12 w-12 flex-none items-center justify-center rounded-md bg-muted">
            {product.image_url ? (
              <img src={product.image_url} alt="" className="h-12 w-12 rounded-md object-cover" />
            ) : (
              <Package className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <div>
            <div className="font-bold">{product.name}</div>
            <div className="text-sm text-muted-foreground">{lang === "bn" ? bnNum(product.stock) : product.stock}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Field label={lang === "bn" ? "বর্তমান মজুদ" : "Current stock"} value={lang === "bn" ? bnNum(product.stock) : product.stock} />
          <Field
            label={lang === "bn" ? "বিক্রয় মূল্য (ডিসকাউন্ট ও ভ্যাট প্রযোজ্য)" : "Sale price"}
            value={fmtMoney(Number(product.sale_price), lang)}
          />
          <Field label={lang === "bn" ? "লাভ" : "Profit"} value={fmtMoney(profit, lang)} />
          <Field label={lang === "bn" ? "ক্রয় মূল্য" : "Cost price"} value={fmtMoney(Number(product.cost_price), lang)} />
          <Field label={lang === "bn" ? "ডিসকাউন্ট" : "Discount"} value="N/A" />
          <Field label={lang === "bn" ? "সাব ক্যাটাগরি" : "Sub category"} value={product.category_id ? "—" : "N/A"} />
        </div>

        <div className="mt-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {lang === "bn" ? "MORE DETAILS OF PRODUCT" : "More details of product"}
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Field label={lang === "bn" ? "ভ্যাট শতাংশ (%)" : "VAT %"} value="N/A" />
          <Field label={lang === "bn" ? "ওয়ারেন্টি" : "Warranty"} value="N/A Day" />
          <Field
            label={lang === "bn" ? "স্টক কমের অ্যালার্ট" : "Low stock alert"}
            value={product.low_stock_alert ? (lang === "bn" ? bnNum(Number(product.low_stock_alert)) : product.low_stock_alert) : "N/A"}
          />
        </div>

        <div className="mt-2">
          <div className="text-sm font-semibold">{lang === "bn" ? "পণ্যের বিস্তারিত" : "Description"}</div>
          <div className="text-sm text-muted-foreground">N/A</div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 border-t pt-3">
          <Button variant="outline" onClick={onDelete} className="border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100">
            <Trash2 className="mr-2 h-4 w-4" />
            {lang === "bn" ? "মুছে ফেলুন" : "Delete"}
          </Button>
          <Button onClick={onUpdateStock} className="bg-foreground text-background hover:opacity-90">
            <Plus className="mr-2 h-4 w-4" />
            {lang === "bn" ? "পণ্য সংখ্যা আপডেট করুন" : "Update stock count"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}