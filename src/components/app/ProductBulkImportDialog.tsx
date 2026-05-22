import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Download, Upload, AlertCircle, CheckCircle2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useShop } from "@/lib/shop";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { downloadProductImportTemplate, parseImportFile, type ParsedRow } from "@/lib/product-export";
import { ScrollArea } from "@/components/ui/scroll-area";

export function ProductBulkImportDialog({
  open, onOpenChange, onImported,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onImported: () => void;
}) {
  const { lang, t } = useI18n();
  const { current } = useShop();
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);

  const reset = () => { setRows(null); };

  const onFile = async (file: File) => {
    setParsing(true);
    try {
      const parsed = await parseImportFile(file);
      if (parsed.length === 0) {
        toast.error(t("p7_No_data_in_file"));
        setRows(null);
        return;
      }
      setRows(parsed);
    } catch (e) {
      toast.error((e as Error).message || (t("p7_Failed_to_read_file")));
    } finally {
      setParsing(false);
    }
  };

  const valid = (rows ?? []).filter((r) => r.errors.length === 0);
  const invalid = (rows ?? []).filter((r) => r.errors.length > 0);

  const doImport = async () => {
    if (!current?.id || valid.length === 0) return;
    setImporting(true);
    try {
      const payload = valid.map((r) => ({
        shop_id: current.id,
        name: r.name,
        stock: r.qty,
        cost_price: r.cost,
        sale_price: r.price,
        unit: r.unit || "pcs",
        barcode: r.barcode || null,
      }));
      const { error } = await supabase.from("products").insert(payload);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success(lang === "bn" ? `${valid.length} টি পণ্য যুক্ত হয়েছে` : `${valid.length} products added`);
        onImported();
        onOpenChange(false);
        reset();
      }
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t("p7_Bulk_Import_Products_Excel_CSV")}</DialogTitle>
        </DialogHeader>

        {!rows ? (
          <div className="space-y-4 py-4">
            <div className="rounded-lg border bg-muted/40 p-4">
              <div className="text-sm font-semibold">
                {t("p7_Instructions")}
              </div>
              <ul className="mt-2 list-inside list-disc text-xs text-muted-foreground space-y-1">
                <li>{t("p7_Upload_Excel_xlsx_or_CSV_file")}</li>
                <li>{t("p7_Columns_Name_Quantity_Cost_Pri")}</li>
                <li>{t("p7_Download_the_template_to_get_s")}</li>
              </ul>
              <Button variant="outline" size="sm" className="mt-3 gap-2" onClick={downloadProductImportTemplate}>
                <Download className="h-4 w-4" />
                {t("p7_Download_Template")}
              </Button>
            </div>

            <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-8 cursor-pointer hover:border-primary hover:bg-primary/5">
              {parsing ? <Loader2 className="h-8 w-8 animate-spin text-primary" /> : <Upload className="h-8 w-8 text-muted-foreground" />}
              <span className="text-sm font-semibold">
                {parsing
                  ? (t("p7_Parsing"))
                  : (t("p7_Choose_file"))}
              </span>
              <span className="text-xs text-muted-foreground">.xlsx, .xls, .csv</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); e.target.value = ""; }}
              />
            </label>
          </div>
        ) : (
          <div className="space-y-3 py-3">
            <div className="flex items-center gap-3 text-sm">
              <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                <CheckCircle2 className="h-4 w-4" /> {valid.length} {t("p7_valid")}
              </span>
              {invalid.length > 0 && (
                <span className="flex items-center gap-1 text-rose-600 font-semibold">
                  <AlertCircle className="h-4 w-4" /> {invalid.length} {t("p7_invalid")}
                </span>
              )}
            </div>
            <ScrollArea className="h-[320px] rounded border">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    <th className="p-2 text-left">#</th>
                    <th className="p-2 text-left">{t("p7_Name")}</th>
                    <th className="p-2 text-right">{t("p7_Qty")}</th>
                    <th className="p-2 text-right">{t("p7_Cost")}</th>
                    <th className="p-2 text-right">{t("p7_Sale")}</th>
                    <th className="p-2 text-left">Unit</th>
                    <th className="p-2 text-left">{t("p7_Status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className={r.errors.length ? "bg-rose-50" : ""}>
                      <td className="p-2">{i + 1}</td>
                      <td className="p-2">{r.name || <span className="text-rose-500">—</span>}</td>
                      <td className="p-2 text-right tabular-nums">{r.qty}</td>
                      <td className="p-2 text-right tabular-nums">{r.cost}</td>
                      <td className="p-2 text-right tabular-nums">{r.price}</td>
                      <td className="p-2">{r.unit}</td>
                      <td className="p-2">{r.errors.length ? <span className="text-rose-600">{r.errors.join(", ")}</span> : <span className="text-emerald-600">OK</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          </div>
        )}

        <DialogFooter>
          {rows && (
            <Button variant="outline" onClick={reset}>
              {t("p7_Choose_another")}
            </Button>
          )}
          <Button onClick={doImport} disabled={!rows || valid.length === 0 || importing}>
            {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {lang === "bn" ? `${valid.length} টি পণ্য যুক্ত করুন` : `Import ${valid.length} products`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}