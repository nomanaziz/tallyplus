import { Dialog, DialogPortal, DialogOverlay, DialogTitle } from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Package, Trash2, Plus, X } from "lucide-react";
import { useI18n, fmtMoney, bnNum } from "@/lib/i18n";
import { cn } from "@/lib/utils";

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
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          className={cn(
            "fixed z-50 bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            // Mobile: bottom sheet
            "inset-x-0 bottom-0 top-auto max-h-[90vh] rounded-t-2xl border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
            // Desktop: centered modal
            "sm:inset-auto sm:left-[50%] sm:top-[50%] sm:bottom-auto sm:max-h-[85vh] sm:w-full sm:max-w-2xl sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-lg sm:border sm:data-[state=closed]:slide-out-to-left-1/2 sm:data-[state=closed]:slide-out-to-top-[48%] sm:data-[state=open]:slide-in-from-left-1/2 sm:data-[state=open]:slide-in-from-top-[48%] sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95",
            "flex flex-col",
          )}
        >
          {/* Sticky header */}
          <div className="flex items-center justify-between border-b px-4 py-3 sm:px-6">
            <DialogTitle className="text-base font-bold sm:text-lg">
              {lang === "bn" ? "পণ্যের বিস্তারিত" : "Product Details"}
            </DialogTitle>
            <DialogPrimitive.Close className="rounded-sm p-1 opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring">
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
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

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
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

        <div className="mt-4 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {lang === "bn" ? "MORE DETAILS OF PRODUCT" : "More details of product"}
        </div>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Field label={lang === "bn" ? "ভ্যাট শতাংশ (%)" : "VAT %"} value="N/A" />
          <Field label={lang === "bn" ? "ওয়ারেন্টি" : "Warranty"} value="N/A Day" />
          <Field
            label={lang === "bn" ? "স্টক কমের অ্যালার্ট" : "Low stock alert"}
            value={product.low_stock_alert ? (lang === "bn" ? bnNum(Number(product.low_stock_alert)) : product.low_stock_alert) : "N/A"}
          />
        </div>

        <div className="mt-4">
          <div className="text-sm font-semibold">{lang === "bn" ? "পণ্যের বিস্তারিত" : "Description"}</div>
          <div className="text-sm text-muted-foreground">N/A</div>
        </div>
          </div>

          {/* Sticky footer */}
          <div className="grid flex-none grid-cols-2 gap-2 border-t bg-background px-4 py-3 sm:px-6 [padding-bottom:max(0.75rem,env(safe-area-inset-bottom))]">
            <Button variant="outline" onClick={onDelete} className="border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100">
              <Trash2 className="mr-2 h-4 w-4" />
              {lang === "bn" ? "মুছে ফেলুন" : "Delete"}
            </Button>
            <Button onClick={onUpdateStock} className="bg-foreground text-background hover:opacity-90">
              <Plus className="mr-2 h-4 w-4" />
              {lang === "bn" ? "স্টক আপডেট" : "Update Stock"}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}