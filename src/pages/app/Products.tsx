import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Download, MoreVertical, Package, Pencil, Trash2, Sparkles, Hash,
  Eye, History, Save, X, Minus, ListOrdered, RefreshCw, SlidersHorizontal, Globe, Upload,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/lib/shop";
import { useAuth } from "@/lib/auth";
import { productsListQuery, stockHistoryQuery } from "@/lib/queries";
import { useI18n, fmtMoney, bnNum } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DataToolbar } from "@/components/app/DataToolbar";
import { EmptyState } from "@/components/app/EmptyState";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { publishProductToMarketplace } from "@/lib/marketplace-publish";
import { CatalogProductPicker, type CatalogProduct } from "@/components/app/CatalogProductPicker";
import { VariantPickerSheet } from "@/components/app/VariantPickerSheet";
import { ensureDefaultCategories } from "@/lib/default-categories";
import { SampleProductImportSheet } from "@/components/app/SampleProductImportSheet";
import { ProductBulkImportDialog } from "@/components/app/ProductBulkImportDialog";
import { exportProductsToXlsx } from "@/lib/product-export";
import { ProductSerialsDialog } from "@/components/app/ProductSerialsDialog";
import { BarcodeScannerButton } from "@/components/app/BarcodeScannerButton";
import { SerialCaptureDialog } from "@/components/app/SerialCaptureDialog";
import { ProductDetailsDialog, type ProductFull } from "@/components/app/ProductDetailsDialog";
import { UpdateStockDialog } from "@/components/app/UpdateStockDialog";
import { BrandCombobox } from "@/components/app/BrandCombobox";
import { DataPagination } from "@/components/app/DataPagination";
import { usePagination } from "@/hooks/use-pagination";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckSquare } from "lucide-react";
import { printTableReport } from "@/lib/print-report";
import { useUsageLimit, parseLimitError } from "@/lib/usage-limits";
import { UsageLimitBanner } from "@/components/app/UsageLimitBanner";

type Product = {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  unit: string | null;
  cost_price: number;
  sale_price: number;
  stock: number;
  low_stock_alert: number | null;
  category_id: string | null;
  image_url: string | null;
  is_serialized?: boolean;
  is_marketplace_published?: boolean | null;
};

const PREDEFINED_UNITS = [
  "pcs", "piece", "ft", "sq.ft", "sq.m", "kg", "gm", "km", "meter", "litre", "ml", "dozen", "pack", "box", "bottle", "bag",
] as const;




import { RequirePerm } from "@/components/app/RequirePerm";
function GuardedProductsPage() {
  return <RequirePerm group="products"><ProductsPage /></RequirePerm>;
}

function ProductsPage() {
  const { lang, t } = useI18n();
  const { current } = useShop();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: items = [], isLoading: loading, refetch } = useQuery(productsListQuery(current?.id ?? null));
  const { data: usage, refresh: refreshUsage } = useUsageLimit(current?.id ?? null, "products");
  const limitReached = !!usage && usage.limit !== -1 && usage.used >= usage.limit;
  // Re-check usage whenever the products list size changes (after add/delete).
  useEffect(() => { void refreshUsage(); }, [items.length, refreshUsage]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<string>("name_asc");
  const [filterBy, setFilterBy] = useState<string>("all");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [openImport, setOpenImport] = useState(false);
  const [openBulkImport, setOpenBulkImport] = useState(false);
  const [serialsTarget, setSerialsTarget] = useState<Product | null>(null);
  // Serial capture (after add stock / new product) — { id, name, qty, cost }
  const [serialCapture, setSerialCapture] = useState<{ productId: string; name: string; qty: number; cost: number } | null>(null);

  // View / Update stock dialogs
  const [details, setDetails] = useState<Product | null>(null);
  const [updateOpen, setUpdateOpen] = useState(false);

  // Stock history dialog
  const [historyOpen, setHistoryOpen] = useState(false);
  const { data: history } = useQuery({
    ...stockHistoryQuery(current?.id ?? null),
    enabled: !!current?.id && historyOpen,
  });

  // Bulk Stock Edit mode (inline)
  const [editStockMode, setEditStockMode] = useState(false);
  const [updates, setUpdates] = useState<Record<string, number>>({});
  const [savingStock, setSavingStock] = useState(false);

  // Bulk select / delete mode
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Reference-block dialog (shown when product(s) cannot be deleted)
  type RefCounts = {
    sales: number;
    purchases: number;
    quotations: number;
    returns: number;
    onlineOrders: number;
    listings: number;
  };
  const [refBlock, setRefBlock] = useState<{
    mode: "single" | "bulk";
    productName?: string;
    counts: RefCounts;
    cleanIds?: string[];
    blockedCount?: number;
  } | null>(null);

  const REF_TABLES: Array<{ key: keyof RefCounts; table: string }> = [
    { key: "sales", table: "sale_items" },
    { key: "purchases", table: "purchase_items" },
    { key: "quotations", table: "quotation_items" },
    { key: "returns", table: "sale_return_items" },
    { key: "onlineOrders", table: "marketplace_order_items" },
    { key: "listings", table: "marketplace_listings" },
  ];

  // Returns counts (total) and blocked product ids across all reference tables.
  const checkProductReferences = async (productIds: string[]) => {
    const counts: RefCounts = { sales: 0, purchases: 0, quotations: 0, returns: 0, onlineOrders: 0, listings: 0 };
    const blocked = new Set<string>();
    await Promise.all(
      REF_TABLES.map(async ({ key, table }) => {
        const { data, error } = await supabase
          .from(table as never)
          .select("product_id")
          .in("product_id", productIds)
          .limit(10000);
        if (error || !data) return;
        counts[key] = data.length;
        for (const row of data as Array<{ product_id: string }>) {
          if (row.product_id) blocked.add(row.product_id);
        }
      }),
    );
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return { counts, blocked, total };
  };

  const load = async () => {
    await qc.invalidateQueries({ queryKey: ["products"] });
    await refetch();
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = items;
    if (q) {
      list = list.filter((p) => p.name.toLowerCase().includes(q) || (p.sku ?? "").toLowerCase().includes(q));
    }
    // Filter
    if (filterBy === "in_stock") list = list.filter((p) => Number(p.stock) > 0);
    else if (filterBy === "out_of_stock") list = list.filter((p) => Number(p.stock) === 0);
    else if (filterBy === "low_stock")
      list = list.filter((p) => {
        const s = Number(p.stock);
        const a = p.low_stock_alert == null ? 0 : Number(p.low_stock_alert);
        return s >= 0 && a > 0 && s <= a;
      });
    else if (filterBy === "unlimited") list = list.filter((p) => Number(p.stock) < 0);
    // Sort
    const cmp = (a: Product, b: Product) => {
      switch (sortBy) {
        case "name_desc": return b.name.localeCompare(a.name, lang === "bn" ? "bn" : undefined);
        case "stock_desc": return Number(b.stock) - Number(a.stock);
        case "stock_asc": return Number(a.stock) - Number(b.stock);
        case "price_desc": return Number(b.sale_price) - Number(a.sale_price);
        case "price_asc": return Number(a.sale_price) - Number(b.sale_price);
        case "name_asc":
        default: return a.name.localeCompare(b.name, lang === "bn" ? "bn" : undefined);
      }
    };
    return [...list].sort(cmp);
  }, [items, search, filterBy, sortBy, lang]);

  const { paged, page, setPage, pageSize, setPageSize, pageCount, total, from, to } = usePagination(filtered, 25);

  const totalStockValue = useMemo(
    () => filtered.reduce((sum, p) => {
      const s = Number(p.stock);
      if (s < 0) return sum; // unlimited skipped
      return sum + Number(p.cost_price) * s;
    }, 0),
    [filtered],
  );

  const totalStockCount = useMemo(
    () => filtered.reduce((sum, p) => {
      const s = Number(p.stock);
      if (s < 0) return sum; // unlimited skipped
      return sum + s;
    }, 0),
    [filtered],
  );

  const productMap = useMemo(
    () => Object.fromEntries(items.map((p) => [p.id, p.name])),
    [items],
  );

  // Stock-history product picker
  const [historyStep, setHistoryStep] = useState<"pick" | "view">("pick");
  const [historyPicked, setHistoryPicked] = useState<Set<string>>(new Set());
  const [historyPickerSearch, setHistoryPickerSearch] = useState("");

  const openHistory = () => {
    setHistoryStep("pick");
    setHistoryPicked(new Set());
    setHistoryPickerSearch("");
    setHistoryOpen(true);
  };
  const togglePick = (id: string) => {
    setHistoryPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const pickerProducts = useMemo(() => {
    const q = historyPickerSearch.trim().toLowerCase();
    if (!q) return items;
    return items.filter((p) => p.name.toLowerCase().includes(q) || (p.sku ?? "").toLowerCase().includes(q));
  }, [items, historyPickerSearch]);
  const allPickerSelected = pickerProducts.length > 0 && pickerProducts.every((p) => historyPicked.has(p.id));
  const togglePickAll = () => {
    setHistoryPicked((prev) => {
      const next = new Set(prev);
      if (allPickerSelected) pickerProducts.forEach((p) => next.delete(p.id));
      else pickerProducts.forEach((p) => next.add(p.id));
      return next;
    });
  };
  const filteredHistory = useMemo(() => {
    if (!history) return [];
    if (historyPicked.size === 0) return history;
    return history.filter((m) => historyPicked.has(m.product_id));
  }, [history, historyPicked]);

  const onDelete = async (p: Product) => {
    const { counts, total } = await checkProductReferences([p.id]);
    if (total > 0) {
      setRefBlock({ mode: "single", productName: p.name, counts });
      return;
    }
    if (!confirm(t("p3_DeleteConfirm"))) return;
    const { writeWithOffline } = await import("@/lib/useOfflineWrite");
    const res = await writeWithOffline({
      table: "products", op: "update",
      payload: { set: { deleted_at: new Date().toISOString() }, match: { id: p.id } },
    });
    if (res.error) { toast.error(res.error); return; }
    toast.success(t("p3_Deleted"));
    setDetails(null);
    void load();
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleSelectAllPage = () => {
    const ids = paged.map((p) => p.id);
    const allSelected = ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  };
  const cancelSelect = () => {
    setSelectMode(false);
    setSelected(new Set());
  };
  const confirmBulkDelete = async () => {
    if (confirmText.trim().toLowerCase() !== "delete") return;
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setBulkDeleting(true);
    const { counts, blocked } = await checkProductReferences(ids);
    const cleanIds = ids.filter((id) => !blocked.has(id));
    if (blocked.size > 0) {
      setBulkDeleting(false);
      setConfirmOpen(false);
      setConfirmText("");
      setRefBlock({ mode: "bulk", counts, cleanIds, blockedCount: blocked.size });
      return;
    }
    const { error } = await supabase
      .from("products")
      .update({ deleted_at: new Date().toISOString() })
      .in("id", ids);
    setBulkDeleting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(
      t("p3_NDeleted", { n: lang === "bn" ? bnNum(ids.length) : ids.length }),
    );
    setConfirmOpen(false);
    setConfirmText("");
    cancelSelect();
    void load();
  };

  // Soft-delete only the clean ids from the bulk-block dialog.
  const proceedDeleteCleanOnly = async () => {
    if (!refBlock || refBlock.mode !== "bulk" || !refBlock.cleanIds) return;
    const cleanIds = refBlock.cleanIds;
    const blockedCount = refBlock.blockedCount ?? 0;
    setRefBlock(null);
    if (cleanIds.length === 0) {
      toast.error(
        t("p3_NoneDeleted"),
      );
      return;
    }
    const { error } = await supabase
      .from("products")
      .update({ deleted_at: new Date().toISOString() })
      .in("id", cleanIds);
    if (error) { toast.error(error.message); return; }
    toast.success(
      t("p3_PartialDeleted", { c: lang === "bn" ? bnNum(cleanIds.length) : cleanIds.length, b: lang === "bn" ? bnNum(blockedCount) : blockedCount }),
    );
    cancelSelect();
    void load();
  };

  const handlePrintProducts = () => {
    printTableReport({
      shopName: current?.name ?? "",
      shopAddress: (current as { address?: string | null } | null)?.address ?? null,
      shopPhone: (current as { phone?: string | null } | null)?.phone ?? null,
      title: t("p3_ProductsList"),
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date().toISOString().slice(0, 10),
      lang,
      columns: [
        { key: "idx", label: "#" },
        { key: "name", label: t("p3_ProductNameLabel") },
        { key: "sku", label: "SKU" },
        { key: "stock", label: t("p3_StockShort"), align: "right" },
        { key: "cost", label: t("p3_Cost"), align: "right" },
        { key: "sale", label: t("p3_SalePrice"), align: "right" },
        { key: "value", label: t("p3_StockValue"), align: "right" },
      ],
      rows: filtered.map((p, i) => {
        const s = Number(p.stock);
        const isUnlimited = s < 0;
        const value = isUnlimited ? "—" : fmtMoney(Number(p.cost_price) * s, lang);
        return {
          idx: String(i + 1),
          name: p.name,
          sku: p.sku ?? "—",
          stock: isUnlimited ? (t("p3_Unlimited")) : (lang === "bn" ? bnNum(s) : s),
          cost: fmtMoney(Number(p.cost_price), lang),
          sale: fmtMoney(Number(p.sale_price), lang),
          value,
        };
      }),
    });
  };

  // Adjust stock from "Update Stock" dialog (single product)
  const adjust = async (p: Product, newStock: number) => {
    if (!current || !user) return;
    const diff = newStock - Number(p.stock);
    if (diff === 0) return;
    const { error: e1 } = await supabase.from("products").update({ stock: newStock }).eq("id", p.id);
    if (e1) { toast.error(e1.message); return; }
    await supabase.from("stock_movements").insert({
      shop_id: current.id,
      product_id: p.id,
      qty: Math.abs(diff),
      type: diff > 0 ? "in" : "out",
      note: "manual adjust",
      created_by: user.id,
    });
    toast.success(t("p3_Updated"));
    void load();
    void qc.invalidateQueries({ queryKey: ["stock", "history"] });
    // Trigger serial capture when new units are added to a serialized product
    if (p.is_serialized && diff > 0) {
      setSerialCapture({ productId: p.id, name: p.name, qty: diff, cost: Number(p.cost_price) || 0 });
    }
  };

  // Bulk save (inline edit mode)
  const setQty = (id: string, v: number) => setUpdates((u) => ({ ...u, [id]: v }));
  const saveBulk = async () => {
    if (!current || !user) return;
    const changes = items.filter((p) => updates[p.id] != null && updates[p.id] !== Number(p.stock));
    if (changes.length === 0) {
      toast.info(t("p3_NoChanges"));
      return;
    }
    setSavingStock(true);
    for (const p of changes) {
      const newStock = updates[p.id];
      const diff = newStock - Number(p.stock);
      const { error } = await supabase.from("products").update({ stock: newStock }).eq("id", p.id);
      if (error) { toast.error(error.message); setSavingStock(false); return; }
      await supabase.from("stock_movements").insert({
        shop_id: current.id,
        product_id: p.id,
        qty: Math.abs(diff),
        type: diff > 0 ? "in" : "out",
        note: "bulk edit",
        created_by: user.id,
      });
    }
    setSavingStock(false);
    toast.success(t("p3_Saved"));
    setUpdates({});
    setEditStockMode(false);
    await qc.invalidateQueries({ queryKey: ["products"] });
    void qc.invalidateQueries({ queryKey: ["stock", "history"] });
    await refetch();
  };

  const cancelBulk = () => {
    setUpdates({});
    setEditStockMode(false);
  };

  return (
    <div className="container px-3 py-2 sm:px-4 sm:py-4">
      <div className="mb-1 hidden text-xs text-muted-foreground sm:block">
        {t("p3_ProductsStockMgmt")}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-sm font-bold sm:text-lg md:text-2xl">
          {t("p3_ProductsStock")}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          {editStockMode ? (
            <>
              <Button variant="outline" className="h-10 gap-2" onClick={cancelBulk}>
                <X className="h-4 w-4" />
                {t("p3_Cancel")}
              </Button>
              <Button
                className="h-10 gap-2"
                onClick={saveBulk}
                disabled={savingStock || Object.keys(updates).length === 0}
              >
                <Save className="h-4 w-4" />
                {savingStock ? "..." : t("p3_Save")}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                className="h-9 gap-1.5 px-2 sm:h-10 sm:gap-2 sm:px-3"
                onClick={load}
                aria-label={t("p3_Refresh")}
              >
                <RefreshCw className="h-4 w-4" />
                <span className="hidden sm:inline">{t("p3_Refresh")}</span>
              </Button>
              <Button variant="outline" className="hidden sm:inline-flex h-10 gap-2 border-primary text-primary hover:bg-primary/10" onClick={openHistory}>
                <History className="h-4 w-4" />
                {t("p3_StockHistory")}
              </Button>
              <Button variant="outline" className="hidden sm:inline-flex h-10 gap-2" onClick={() => setEditStockMode(true)}>
                <ListOrdered className="h-4 w-4" />
                {t("p3_StockEdit")}
              </Button>
              <Button
                variant={selectMode ? "default" : "outline"}
                className="hidden sm:inline-flex h-10 gap-2"
                onClick={() => (selectMode ? cancelSelect() : setSelectMode(true))}
              >
                <CheckSquare className="h-4 w-4" />
                {selectMode
                  ? t("p3_Cancel")
                  : t("p3_Select")}
              </Button>
              {selectMode && selected.size > 0 && (
                <Button
                  variant="destructive"
                  className="h-10 gap-2"
                  onClick={() => { setConfirmText(""); setConfirmOpen(true); }}
                >
                  <Trash2 className="h-4 w-4" />
                  {t("p3_DeleteN", { n: lang === "bn" ? bnNum(selected.size) : selected.size })}
                </Button>
              )}
              <Button variant="outline" className="hidden sm:inline-flex h-10 gap-2" onClick={handlePrintProducts}>
                <Download className="h-4 w-4" />
                {t("p3_DownloadPrint")}
              </Button>
              <Button variant="outline" className="hidden sm:inline-flex h-10 gap-2" onClick={() => setOpenImport(true)}>
                <Sparkles className="h-4 w-4 text-primary" />
                {t("p3_ImportSample")}
              </Button>
              <Button variant="outline" className="hidden sm:inline-flex h-10 gap-2" onClick={() => setOpenBulkImport(true)}>
                <Upload className="h-4 w-4 text-primary" />
                {t("p3_ExcelImport")}
              </Button>
              <Button variant="outline" className="hidden sm:inline-flex h-10 gap-2" onClick={() => exportProductsToXlsx(filtered, `products-${new Date().toISOString().slice(0,10)}.xlsx`)}>
                <Download className="h-4 w-4" />
                {t("p3_ExcelExport")}
              </Button>
              <Button className="h-9 gap-1.5 px-3 sm:h-10 sm:gap-2 sm:px-4" disabled={limitReached} onClick={() => {
                if (!current?.id) {
                  toast.error(t("p3_SelectShopFirst"));
                  return;
                }
                if (limitReached) {
                  toast.error(t("p3_FreeLimit"));
                  return;
                }
                setEditing(null);
                setOpenForm(true);
              }}>
                <Plus className="h-4 w-4" />
                <span className="sm:hidden">{t("p3_Add")}</span>
                <span className="hidden sm:inline">{t("p3_AddProduct")}</span>
              </Button>
              {/* Mobile-only More menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-9 w-9 sm:hidden" aria-label="More">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => (selectMode ? cancelSelect() : setSelectMode(true))}>
                    <CheckSquare className="mr-2 h-4 w-4" />
                    {selectMode ? (t("p3_CancelSelect")) : (t("p3_Select"))}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handlePrintProducts}>
                    <Download className="mr-2 h-4 w-4" />
                    {t("p3_DownloadPrint")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setOpenImport(true)}>
                    <Sparkles className="mr-2 h-4 w-4 text-primary" />
                    {t("p3_ImportSample")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setOpenBulkImport(true)}>
                    <Upload className="mr-2 h-4 w-4 text-primary" />
                    {t("p3_ExcelImport")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportProductsToXlsx(filtered, `products-${new Date().toISOString().slice(0,10)}.xlsx`)}>
                    <Download className="mr-2 h-4 w-4" />
                    {t("p3_ExcelExport")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>
      <SampleProductImportSheet open={openImport} onOpenChange={setOpenImport} onImported={() => void load()} />
      <ProductBulkImportDialog open={openBulkImport} onOpenChange={setOpenBulkImport} onImported={() => void load()} />

      {/* Summary card — Total Stock & Stock Value */}
      <div className="mt-2 rounded-xl bg-primary p-1.5 text-primary-foreground shadow-sm sm:mt-3 sm:p-3">
        <div className="grid grid-cols-2 gap-1.5 sm:gap-3">
          <div className="rounded-lg bg-primary-foreground/15 px-2 py-1 text-center sm:px-3 sm:py-2">
            <div className="text-sm font-extrabold tabular-nums sm:text-xl">
              {lang === "bn" ? bnNum(totalStockCount) : totalStockCount.toLocaleString()}
            </div>
            <div className="mt-0 text-[10px] font-semibold sm:text-xs">
              {t("p3_TotalStock")}
            </div>
          </div>
          <div className="rounded-lg bg-primary-foreground/15 px-2 py-1 text-center sm:px-3 sm:py-2">
            <div className="text-sm font-extrabold tabular-nums sm:text-xl">
              {fmtMoney(totalStockValue, lang)}
            </div>
            <div className="mt-0 text-[10px] font-semibold sm:text-xs">
              {t("p3_StockValue")}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile-only quick actions (Stock History + Stock Edit) */}
      {!editStockMode && (
        <div className="mt-2 flex gap-1.5 sm:hidden">
          <Button
            variant="outline"
            className="h-9 flex-1 gap-1.5 text-xs border-primary text-primary hover:bg-primary/10"
            onClick={openHistory}
          >
            <History className="h-3.5 w-3.5" />
            {t("p3_StockHistoryCap")}
          </Button>
          <Button
            variant="outline"
            className="h-9 flex-1 gap-1.5 text-xs"
            onClick={() => setEditStockMode(true)}
          >
            <ListOrdered className="h-3.5 w-3.5" />
            {t("p3_StockEditCap")}
          </Button>
        </div>
      )}

      <div className="mt-2 sm:mt-4 [&_input]:h-9 sm:[&_input]:h-10 [&_button]:h-9 sm:[&_button]:h-10">
        <UsageLimitBanner data={usage} label_bn="পণ্য" label_en="products" />
        <DataToolbar
          search={search}
          onSearch={setSearch}
          middleExtra={
            <>
              {/* Mobile: collapse Sort + Filter into a single popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon" className="h-9 w-9 flex-none sm:hidden" aria-label={t("p3_SortFilter")}>
                    <SlidersHorizontal className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-64 space-y-3 p-3">
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-muted-foreground">{t("p3_Sort")}</div>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="h-9 w-full text-xs">
                        <SelectValue placeholder={t("p3_Sort")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="name_asc">{t("p3_NameAZ")}</SelectItem>
                        <SelectItem value="name_desc">{t("p3_NameZA")}</SelectItem>
                        <SelectItem value="stock_asc">{t("p3_StockLowHigh")}</SelectItem>
                        <SelectItem value="stock_desc">{t("p3_StockHighLow")}</SelectItem>
                        <SelectItem value="price_asc">{t("p3_PriceLowHigh")}</SelectItem>
                        <SelectItem value="price_desc">{t("p3_PriceHighLow")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-muted-foreground">{t("p3_Filter")}</div>
                    <Select value={filterBy} onValueChange={setFilterBy}>
                      <SelectTrigger className="h-9 w-full text-xs">
                        <SelectValue placeholder={t("p3_Filter")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("p3_AllProducts")}</SelectItem>
                        <SelectItem value="in_stock">{t("p3_InStock")}</SelectItem>
                        <SelectItem value="out_of_stock">{t("p3_OutOfStock")}</SelectItem>
                        <SelectItem value="low_stock">{t("p3_LowStock")}</SelectItem>
                        <SelectItem value="unlimited">{t("p3_UnlimitedStock")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Desktop: inline selects */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="hidden sm:flex h-10 w-[170px] text-sm">
                  <SelectValue placeholder={t("p3_Sort")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name_asc">{t("p3_NameAZ")}</SelectItem>
                  <SelectItem value="name_desc">{t("p3_NameZA")}</SelectItem>
                  <SelectItem value="stock_asc">{t("p3_StockLowHigh")}</SelectItem>
                  <SelectItem value="stock_desc">{t("p3_StockHighLow")}</SelectItem>
                  <SelectItem value="price_asc">{t("p3_PriceLowHigh")}</SelectItem>
                  <SelectItem value="price_desc">{t("p3_PriceHighLow")}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterBy} onValueChange={setFilterBy}>
                <SelectTrigger className="hidden sm:flex h-10 w-[160px] text-sm">
                  <SelectValue placeholder={t("p3_Filter")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("p3_AllProducts")}</SelectItem>
                  <SelectItem value="in_stock">{t("p3_InStock")}</SelectItem>
                  <SelectItem value="out_of_stock">{t("p3_OutOfStock")}</SelectItem>
                  <SelectItem value="low_stock">{t("p3_LowStock")}</SelectItem>
                  <SelectItem value="unlimited">{t("p3_UnlimitedStock")}</SelectItem>
                </SelectContent>
              </Select>
            </>
          }
        />
      </div>

      {editStockMode && (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {t("p3_StockEditMode")}
        </div>
      )}

      <div className="mt-2 rounded-xl border bg-card sm:mt-4">
        <div className="border-b px-3 py-2 text-xs font-semibold sm:px-4 sm:py-3 sm:text-sm">
          {t("p3_TotalProducts")} {lang === "bn" ? bnNum(filtered.length) : filtered.length}
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">...</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Package className="h-6 w-6" />}
            title={t("p3_NoProductsYet")}
            action={
              <Button size="sm" onClick={() => { setEditing(null); setOpenForm(true); }} className="gap-2">
                <Plus className="h-4 w-4" /> {t("p3_AddProductLower")}
              </Button>
            }
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  {selectMode && (
                    <TableHead className="w-10">
                      <Checkbox
                        checked={paged.length > 0 && paged.every((p) => selected.has(p.id))}
                        onCheckedChange={() => toggleSelectAllPage()}
                        aria-label="select all"
                      />
                    </TableHead>
                  )}
                  <TableHead>{t("p3_ProductHeader")}</TableHead>
                  <TableHead className="text-right whitespace-nowrap w-px">{t("p3_CurrentStock")}</TableHead>
                  <TableHead className="text-right hidden sm:table-cell whitespace-nowrap w-px">{t("p3_Cost")}</TableHead>
                  <TableHead className={"text-right whitespace-nowrap w-px " + (editStockMode ? "hidden sm:table-cell" : "")}>{t("p3_SalePriceLower")}</TableHead>
                  <TableHead className="text-right hidden md:table-cell whitespace-nowrap w-px">{t("p3_StockValueLower")}</TableHead>
                  {editStockMode ? (
                    <TableHead className="text-center w-auto sm:w-[260px]">{t("p3_UpdatedStock")}</TableHead>
                  ) : (
                    <TableHead className="text-right w-px whitespace-nowrap">Action</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((p) => {
                  const stockNum = Number(p.stock);
                  const isUnlimited = stockNum < 0;
                  const stockValue = isUnlimited ? 0 : Number(p.cost_price) * stockNum;
                  const cur = updates[p.id] ?? stockNum;
                  const changed = updates[p.id] != null && updates[p.id] !== stockNum;
                  return (
                    <TableRow
                      key={p.id}
                      className={(editStockMode && changed ? "bg-amber-50/60 hover:bg-amber-50 " : "") + (!editStockMode && !selectMode ? "cursor-pointer sm:cursor-default" : "")}
                      onClick={(e) => {
                        if (editStockMode || selectMode) return;
                        const target = e.target as HTMLElement;
                        if (target.closest('button,a,input,[role="menuitem"],[role="menu"],[role="checkbox"]')) return;
                        setDetails(p);
                      }}
                    >
                      {selectMode && (
                        <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selected.has(p.id)}
                            onCheckedChange={() => toggleSelect(p.id)}
                            aria-label={`select ${p.name}`}
                          />
                        </TableCell>
                      )}
                      <TableCell className="min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="flex h-8 w-8 flex-none items-center justify-center rounded-md bg-muted">
                            {p.image_url ? (
                              <img src={p.image_url} alt="" className="h-8 w-8 rounded-md object-cover" />
                            ) : (
                              <Package className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <span className="font-medium text-sm sm:text-base whitespace-normal break-words leading-tight min-w-0">{p.name}</span>
                          {p.is_marketplace_published && (
                            <Globe
                              className="h-3.5 w-3.5 flex-none text-emerald-600"
                              aria-label={t("p3_AvailOnline")}
                            />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {isUnlimited
                          ? <span className="text-primary">{t("p3_Unlimited")}</span>
                          : (() => {
                              const alert = p.low_stock_alert == null ? 0 : Number(p.low_stock_alert);
                              const tone =
                                stockNum === 0
                                  ? "bg-rose-100 text-rose-700"
                                  : alert > 0 && stockNum <= alert
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-emerald-100 text-emerald-700";
                              return (
                                <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums ${tone}`}>
                                  {lang === "bn" ? bnNum(stockNum) : stockNum}
                                </span>
                              );
                            })()}
                      </TableCell>
                      <TableCell className="text-right hidden sm:table-cell tabular-nums">
                        {fmtMoney(Number(p.cost_price), lang)}
                      </TableCell>
                      <TableCell className={"text-right tabular-nums " + (editStockMode ? "hidden sm:table-cell" : "")}>{fmtMoney(Number(p.sale_price), lang)}</TableCell>
                      <TableCell className="text-right hidden md:table-cell font-semibold tabular-nums">
                        {isUnlimited ? "—" : fmtMoney(stockValue, lang)}
                      </TableCell>
                      {editStockMode ? (
                        <TableCell className="px-1 sm:px-2" onClick={(e) => e.stopPropagation()}>
                          {isUnlimited ? (
                            <div className="text-center text-xs text-muted-foreground">
                              {t("p3_Unlimited")}
                            </div>
                          ) : (
                            <div className="mx-auto flex w-full max-w-[240px] items-center gap-1 sm:gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 sm:w-10 flex-none rounded-md bg-rose-100 text-rose-600 hover:bg-rose-200 border-rose-200"
                                onClick={() => setQty(p.id, Math.max(0, cur - 1))}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <Input
                                type="number"
                                value={cur}
                                onChange={(e) => setQty(p.id, Math.max(0, Number(e.target.value) || 0))}
                                className={"h-9 min-w-0 flex-1 text-center text-sm font-semibold tabular-nums " + (changed ? "border-b-2 border-b-blue-500 focus-visible:ring-blue-500" : "")}
                              />
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 sm:w-10 flex-none rounded-md bg-emerald-500 text-white hover:bg-emerald-600 border-emerald-500"
                                onClick={() => setQty(p.id, cur + 1)}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      ) : (
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="hidden sm:inline-flex h-8 w-8 p-0"
                              onClick={() => setDetails(p)}
                              title={t("p3_View")}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => { setEditing(p); setOpenForm(true); }}>
                                  <Pencil className="mr-2 h-4 w-4" /> {t("p3_Edit")}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setDetails(p); setUpdateOpen(true); }}>
                                  <Plus className="mr-2 h-4 w-4" /> {t("p3_UpdateStock")}
                                </DropdownMenuItem>
                                {p.is_serialized && (
                                  <DropdownMenuItem onClick={() => setSerialsTarget(p)}>
                                    <Hash className="mr-2 h-4 w-4" /> {t("p3_ManageSerials")}
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem className="text-destructive" onClick={() => onDelete(p)}>
                                  <Trash2 className="mr-2 h-4 w-4" /> {t("p3_Delete")}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <DataPagination
              page={page}
              pageCount={pageCount}
              pageSize={pageSize}
              total={total}
              from={from}
              to={to}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </>
        )}
      </div>

      <ProductFormDialog
        open={openForm}
        onOpenChange={setOpenForm}
        product={editing}
        shopId={current?.id ?? null}
        shopTypeCode={current?.shop_type_code ?? null}
        onSaved={(saved) => {
          void load();
          if (saved && saved.is_serialized && saved.stock > 0 && saved.id) {
            setSerialCapture({ productId: saved.id, name: saved.name, qty: saved.stock, cost: saved.cost_price });
          }
        }}
      />

      <ProductSerialsDialog
        open={serialsTarget !== null}
        onOpenChange={(v) => { if (!v) setSerialsTarget(null); }}
        productId={serialsTarget?.id ?? null}
        productName={serialsTarget?.name ?? ""}
      />

      <SerialCaptureDialog
        open={serialCapture !== null}
        onOpenChange={(v) => { if (!v) setSerialCapture(null); }}
        productId={serialCapture?.productId ?? null}
        productName={serialCapture?.name ?? ""}
        qty={serialCapture?.qty ?? 0}
        costPrice={serialCapture?.cost ?? 0}
        onSaved={() => { setSerialCapture(null); }}
      />

      <ProductDetailsDialog
        product={details ? ({
          id: details.id,
          name: details.name,
          stock: Number(details.stock),
          sale_price: Number(details.sale_price),
          cost_price: Number(details.cost_price),
          unit: details.unit,
          category_id: details.category_id,
          low_stock_alert: details.low_stock_alert,
          image_url: details.image_url,
          expiry_date: null,
        } as ProductFull) : null}
        open={!!details && !updateOpen}
        onOpenChange={(v) => !v && setDetails(null)}
        onUpdateStock={() => setUpdateOpen(true)}
        onDelete={() => details && onDelete(details)}
      />

      <UpdateStockDialog
        open={updateOpen}
        onOpenChange={(v) => { setUpdateOpen(v); if (!v) setDetails(null); }}
        productName={details?.name ?? ""}
        currentStock={Number(details?.stock ?? 0)}
        onSave={async (newStock) => {
          if (details) await adjust(details, newStock);
        }}
      />

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {historyStep === "pick"
                ? (t("p3_SelectProducts"))
                : (t("p3_StockHistory"))}
            </DialogTitle>
          </DialogHeader>
          {historyStep === "pick" ? (
            <div className="space-y-3">
              <Input
                value={historyPickerSearch}
                onChange={(e) => setHistoryPickerSearch(e.target.value)}
                placeholder={t("p3_SearchProducts")}
                className="h-10"
              />
              <label className="flex items-center gap-2 border-b pb-2 text-sm font-semibold">
                <Checkbox checked={allPickerSelected} onCheckedChange={togglePickAll} />
                {t("p3_SelectAll")}
                <span className="ml-auto text-xs font-normal text-muted-foreground">
                  {t("p3_NSelected", { n: lang === "bn" ? bnNum(historyPicked.size) : historyPicked.size })}
                </span>
              </label>
              <div className="max-h-[50vh] space-y-1 overflow-auto">
                {pickerProducts.length === 0 ? (
                  <EmptyState title={t("p3_NoProducts")} />
                ) : (
                  pickerProducts.map((p) => (
                    <label
                      key={p.id}
                      className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-accent"
                    >
                      <Checkbox
                        checked={historyPicked.has(p.id)}
                        onCheckedChange={() => togglePick(p.id)}
                      />
                      <span className="flex-1 truncate text-sm font-medium">{p.name}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {Number(p.stock) < 0
                          ? (t("p3_Unlimited"))
                          : (lang === "bn" ? bnNum(Number(p.stock)) : Number(p.stock))}
                      </span>
                    </label>
                  ))
                )}
              </div>
              <div className="flex justify-end gap-2 border-t pt-3">
                <Button variant="outline" onClick={() => setHistoryOpen(false)}>
                  {t("p3_Cancel")}
                </Button>
                <Button
                  disabled={historyPicked.size === 0}
                  onClick={() => setHistoryStep("view")}
                >
                  {t("p3_ShowHistoryN", { n: lang === "bn" ? bnNum(historyPicked.size) : historyPicked.size })}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-1 rounded-md bg-muted/40 p-2 text-xs">
                {Array.from(historyPicked).slice(0, 6).map((id) => (
                  <span key={id} className="rounded bg-background px-2 py-0.5 font-medium">
                    {productMap[id] ?? "—"}
                  </span>
                ))}
                {historyPicked.size > 6 && (
                  <span className="text-muted-foreground">+{historyPicked.size - 6}</span>
                )}
                <button
                  type="button"
                  className="ml-auto text-xs font-semibold text-primary underline-offset-2 hover:underline"
                  onClick={() => setHistoryStep("pick")}
                >
                  {t("p3_Change")}
                </button>
              </div>
              {filteredHistory.length === 0 ? (
                <EmptyState title={t("p3_NoRecords")} />
              ) : (
                <div className="max-h-[55vh] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("p3_Date")}</TableHead>
                        <TableHead>{t("p3_ProductWord")}</TableHead>
                        <TableHead>{t("p3_Type")}</TableHead>
                        <TableHead className="text-right">{t("p3_Qty")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredHistory.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="text-xs">{new Date(m.created_at).toLocaleString()}</TableCell>
                          <TableCell>{productMap[m.product_id] ?? "—"}</TableCell>
                          <TableCell><span className={m.type === "in" ? "text-emerald-600" : "text-destructive"}>{m.type}</span></TableCell>
                          <TableCell className="text-right tabular-nums">{lang === "bn" ? bnNum(m.qty) : m.qty}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              <div className="flex justify-end gap-2 border-t pt-3">
                <Button variant="outline" onClick={() => setHistoryStep("pick")}>
                  {t("p3_Back")}
                </Button>
                <Button onClick={() => setHistoryOpen(false)}>
                  {t("p3_Close")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={confirmOpen} onOpenChange={(o) => { setConfirmOpen(o); if (!o) setConfirmText(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">
              {t("p3_ConfirmBulkDelete")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>
              {t("p3_BulkDeleteWarn", { n: lang === "bn" ? bnNum(selected.size) : selected.size })}{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">delete</code>{" "}
              {t("p3_TypeBelow")}
            </p>
            <Input
              autoFocus
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="delete"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                {t("p3_Cancel")}
              </Button>
              <Button
                variant="destructive"
                disabled={confirmText.trim().toLowerCase() !== "delete" || bulkDeleting}
                onClick={confirmBulkDelete}
              >
                {bulkDeleting
                  ? "..."
                  : t("p3_DeleteAction")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!refBlock} onOpenChange={(o) => { if (!o) setRefBlock(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("p3_CannotDelete")}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <div>
                  {refBlock?.mode === "single"
                    ? (lang === "bn"
                        ? <>প্রোডাক্ট <b>{refBlock?.productName}</b>-এর সাথে নিচের data যুক্ত আছে। আগে ওগুলো ডিলিট করুন, তারপর প্রোডাক্ট ডিলিট করতে পারবেন।</>
                        : <>Product <b>{refBlock?.productName}</b> has the related data below. Delete those first, then you can delete the product.</>)
                    : (lang === "bn"
                        ? <>{bnNum(refBlock?.blockedCount ?? 0)}টি প্রোডাক্ট-এর সাথে reference যুক্ত আছে। ওগুলোর related data আগে ডিলিট করতে হবে।</>
                        : <>{refBlock?.blockedCount ?? 0} product(s) have references. Delete the related data first.</>)}
                </div>
                <ul className="space-y-1 text-sm">
                  {refBlock && refBlock.counts.sales > 0 && (
                    <li>• <a className="underline text-primary" href="/app/sales-ledger">{t("p3_Sales")}: {lang === "bn" ? bnNum(refBlock.counts.sales) : refBlock.counts.sales}</a></li>
                  )}
                  {refBlock && refBlock.counts.purchases > 0 && (
                    <li>• <a className="underline text-primary" href="/app/purchase-ledger">{t("p3_Purchases")}: {lang === "bn" ? bnNum(refBlock.counts.purchases) : refBlock.counts.purchases}</a></li>
                  )}
                  {refBlock && refBlock.counts.quotations > 0 && (
                    <li>• <a className="underline text-primary" href="/app/sell">{t("p3_Quotations")}: {lang === "bn" ? bnNum(refBlock.counts.quotations) : refBlock.counts.quotations}</a></li>
                  )}
                  {refBlock && refBlock.counts.returns > 0 && (
                    <li>• <a className="underline text-primary" href="/app/returns">{t("p3_SalesReturns")}: {lang === "bn" ? bnNum(refBlock.counts.returns) : refBlock.counts.returns}</a></li>
                  )}
                  {refBlock && refBlock.counts.onlineOrders > 0 && (
                    <li>• <a className="underline text-primary" href="/app/online-shop">{t("p3_OnlineOrders")}: {lang === "bn" ? bnNum(refBlock.counts.onlineOrders) : refBlock.counts.onlineOrders}</a></li>
                  )}
                  {refBlock && refBlock.counts.listings > 0 && (
                    <li>• <a className="underline text-primary" href="/app/online-shop">{t("p3_OnlineListing")}: {lang === "bn" ? bnNum(refBlock.counts.listings) : refBlock.counts.listings}</a></li>
                  )}
                </ul>
                {refBlock?.mode === "bulk" && (refBlock.cleanIds?.length ?? 0) > 0 && (
                  <div className="rounded-md border bg-muted/40 p-2 text-sm">
                    {lang === "bn"
                      ? <>{bnNum(refBlock.cleanIds!.length)}টি প্রোডাক্ট-এ কোনো reference নেই — শুধু ওগুলো এখনই ডিলিট করতে পারেন।</>
                      : <>{refBlock.cleanIds!.length} product(s) have no references — you can delete only those now.</>}
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("p3_CancelBatil")}</AlertDialogCancel>
            {refBlock?.mode === "bulk" && (refBlock.cleanIds?.length ?? 0) > 0 && (
              <AlertDialogAction onClick={proceedDeleteCleanOnly}>
                {t("p3_DeleteCleanOnly")}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ProductFormDialog({
  open,
  onOpenChange,
  product,
  shopId,
  shopTypeCode,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  product: Product | null;
  shopId: string | null;
  shopTypeCode?: string | null;
  onSaved: (saved?: { id: string; name: string; stock: number; cost_price: number; is_serialized: boolean } | null) => void;
}) {
  const { lang, t } = useI18n();
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [variantPickerOpen, setVariantPickerOpen] = useState(false);
  const [variantCatalogProduct, setVariantCatalogProduct] = useState<CatalogProduct | null>(null);
  const [unit, setUnit] = useState("pcs");
  const [cost, setCost] = useState("0");
  const [sale, setSale] = useState("0");
  const [stock, setStock] = useState("0");
  const [low, setLow] = useState("5");
  const [trackStock, setTrackStock] = useState(true);
  const [busy, setBusy] = useState(false);
  const [description, setDescription] = useState("");
  const [brand, setBrand] = useState("");
  // Category state
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [subCategoryId, setSubCategoryId] = useState<string | null>(null);
  type Cat = { id: string; name: string; parent_id: string | null };
  const [allCats, setAllCats] = useState<Cat[]>([]);
  const [addCatOpen, setAddCatOpen] = useState(false);
  const [addSubOpen, setAddSubOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  // toggles
  const [onlineOn, setOnlineOn] = useState(false);
  const [bulkOn, setBulkOn] = useState(false);
  const [bulkPrice, setBulkPrice] = useState("");
  const [bulkMinQty, setBulkMinQty] = useState("");
  const [lowOn, setLowOn] = useState(false);
  const [vatOn, setVatOn] = useState(false);
  const [vatPct, setVatPct] = useState("");
  const [warrantyOn, setWarrantyOn] = useState(false);
  const [warrantyValue, setWarrantyValue] = useState("");
  const [warrantyUnit, setWarrantyUnit] = useState<"day"|"week"|"month"|"year">("month");
  const [mfgDate, setMfgDate] = useState("");
  const [expDate, setExpDate] = useState("");
  const [discountOn, setDiscountOn] = useState(false);
  const [discountValue, setDiscountValue] = useState("");
  const [discountType, setDiscountType] = useState<"percent"|"flat">("percent");
  const [barcodeOn, setBarcodeOn] = useState(false);
  const [serializedOn, setSerializedOn] = useState(false);

  // IMEI/Serial tracking is available for all shop types — any product
  // (jewelry, hardware, furniture, etc.) can opt in to per-unit serial tracking.
  void shopTypeCode;

  const reloadCats = async (sid: string) => {
    const { data } = await supabase
      .from("categories")
      .select("id,name,parent_id")
      .eq("shop_id", sid)
      .order("name");
    setAllCats((data as Cat[] | null) ?? []);
  };

  // Ensure all default sample-import categories exist on every dialog open.
  // The helper is idempotent and per-session cached, so this is essentially
  // free after the first call per shop.
  useEffect(() => {
    if (!open || !shopId) return;
    let cancelled = false;
    (async () => {
      await ensureDefaultCategories(shopId);
      if (!cancelled) await reloadCats(shopId);
    })();
    return () => { cancelled = true; };
  }, [open, shopId]);

  useEffect(() => {
    if (open) {
      const p = product as (Product & Record<string, unknown>) | null;
      setName(p?.name ?? "");
      setSku(p?.sku ?? "");
      setBarcode(p?.barcode ?? "");
      setUnit(p?.unit ?? "pcs");
      setCost(String(p?.cost_price ?? 0));
      setSale(String(p?.sale_price ?? 0));
      const initStock = Number(p?.stock ?? 0);
      const isUnlimited = initStock < 0;
      setTrackStock(!isUnlimited);
      setStock(isUnlimited ? "0" : String(initStock));
      setLow(String(p?.low_stock_alert ?? 5));
      setDescription(String((p?.description as string) ?? ""));
      setCategoryId((p?.category_id as string | null) ?? null);
      setSubCategoryId((p?.sub_category_id as string | null) ?? null);
      setBrand(((p as Record<string, unknown> | null)?.brand as string | null) ?? "");
      setOnlineOn(Boolean(p?.is_marketplace_published));
      setBulkOn(Boolean(p?.bulk_enabled));
      setBulkPrice(p?.bulk_price != null ? String(p.bulk_price) : "");
      setBulkMinQty(p?.bulk_min_qty != null ? String(p.bulk_min_qty) : "");
      setLowOn(p?.low_stock_alert != null && Number(p.low_stock_alert) > 0);
      setVatOn(Boolean(p?.vat_enabled));
      setVatPct(p?.vat_pct != null ? String(p.vat_pct) : "");
      setWarrantyOn(Boolean(p?.warranty_enabled));
      setWarrantyValue(p?.warranty_value != null ? String(p.warranty_value) : "");
      setWarrantyUnit(((p?.warranty_unit as "day"|"week"|"month"|"year") ?? "month"));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setMfgDate(((p as any)?.manufacturing_date as string | null) ?? "");
      setExpDate(((p as any)?.expiry_date as string | null) ?? "");
      setDiscountOn(Boolean(p?.discount_enabled));
      setDiscountValue(p?.discount_value != null ? String(p.discount_value) : "");
      setDiscountType(((p?.discount_type as "percent"|"flat") ?? "percent"));
      setBarcodeOn(Boolean(p?.barcode));
      // For new products in mobile shops, default IMEI/Serial tracking ON
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const existingSerialized = (p as any)?.is_serialized;
      if (p) {
        setSerializedOn(Boolean(existingSerialized));
      } else {
        setSerializedOn(shopTypeCode === "mobile");
      }
    }
  }, [open, product, shopTypeCode]);

  const topCats = allCats.filter((c) => !c.parent_id);
  const subCats = categoryId ? allCats.filter((c) => c.parent_id === categoryId) : [];

  const addCategory = async (parent: string | null) => {
    if (!shopId || !newCatName.trim()) return;
    const { data, error } = await supabase
      .from("categories")
      .insert({ shop_id: shopId, name: newCatName.trim(), parent_id: parent })
      .select("id,name,parent_id")
      .single();
    if (error) {
      const code = (error as { code?: string }).code;
      if (code === "42501") {
        toast.error(t("p3_NoCatPerm"));
      } else {
        toast.error(error.message);
      }
      return;
    }
    if (data) {
      setAllCats((prev) => [...prev, data as Cat]);
      if (parent) setSubCategoryId((data as Cat).id);
      else setCategoryId((data as Cat).id);
    }
    setNewCatName("");
    setAddCatOpen(false);
    setAddSubOpen(false);
  };

  const save = async () => {
    if (!shopId) return;
    if (!name.trim()) { toast.error(t("p3_NameRequired")); return; }
    setBusy(true);
    const payload = {
      name: name.trim(),
      sku: sku.trim() || null,
      barcode: barcodeOn ? (barcode.trim() || null) : null,
      unit: unit.trim() || "pcs",
      cost_price: Number(cost) || 0,
      sale_price: Number(sale) || 0,
      stock: trackStock ? (Number(stock) || 0) : -1,
      low_stock_alert: trackStock && lowOn ? (Number(low) || 0) : 0,
      shop_id: shopId,
      description: description.trim() || null,
      category_id: categoryId,
      sub_category_id: subCategoryId,
      brand: brand.trim() || null,
      is_marketplace_published: onlineOn,
      bulk_enabled: bulkOn,
      bulk_price: bulkOn ? (Number(bulkPrice) || 0) : null,
      bulk_min_qty: bulkOn ? (Number(bulkMinQty) || 0) : null,
      vat_enabled: vatOn,
      vat_pct: vatOn ? (Number(vatPct) || 0) : null,
      warranty_enabled: warrantyOn,
      warranty_value: warrantyOn ? (Number(warrantyValue) || 0) : null,
      warranty_unit: warrantyOn ? warrantyUnit : null,
      manufacturing_date: mfgDate || null,
      expiry_date: expDate || null,
      discount_enabled: discountOn,
      discount_value: discountOn ? (Number(discountValue) || 0) : null,
      discount_type: discountOn ? discountType : null,
      is_serialized: serializedOn,
    };
    const { data: savedRow, error } = product
      ? await supabase.from("products").update(payload).eq("id", product.id).select("id").maybeSingle()
      : await supabase.from("products").insert(payload).select("id").maybeSingle();
    setBusy(false);
    if (error) {
      const code = (error as { code?: string }).code;
      const li = parseLimitError(error.message);
      if (li) {
        toast.error(t("p3_FreeLimit"));
      } else if (code === "42501") {
        toast.error(t("p3_NoProductPerm"));
      } else {
        toast.error(error.message);
      }
      return;
    }
    // If user toggled "online sell" on this product, publish/unpublish
    // the matching marketplace listing. This ensures the product shows
    // in the public marketplace (and that the parent shop is enabled).
    const savedProductId = (savedRow as { id?: string } | null)?.id ?? product?.id ?? null;
    if (savedProductId) {
      try {
        await publishProductToMarketplace(
          {
            id: savedProductId,
            shop_id: shopId,
            sale_price: payload.sale_price,
            stock: payload.stock,
            unit: payload.unit,
            warranty_enabled: payload.warranty_enabled,
            warranty_value: payload.warranty_value,
          },
          onlineOn,
        );
      } catch {
        /* non-blocking */
      }
    }
    toast.success(t("p3_SavedShort"));
    onOpenChange(false);
    const savedId = (savedRow as { id?: string } | null)?.id ?? product?.id ?? null;
    if (!product && savedId && serializedOn && payload.stock > 0) {
      onSaved({
        id: savedId,
        name: payload.name,
        stock: payload.stock,
        cost_price: payload.cost_price,
        is_serialized: true,
      });
    } else {
      onSaved(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-center">
            {product ? (t("p3_EditProduct")) : (t("p3_AddProductCap"))}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 grid gap-4 pb-24">
          {/* Always-visible required fields */}
          <div className="grid gap-1.5">
            <Label>{t("p3_ProductNameCap")} *</Label>
            <CatalogProductPicker
              value={name}
              onChange={setName}
              onSelect={async (p: CatalogProduct) => {
                // Check if catalog product has variants
                const { data: vs } = await supabase
                  .from("marketplace_product_variants")
                  .select("id")
                  .eq("marketplace_product_id", p.id)
                  .eq("is_active", true)
                  .limit(1);
                if ((vs?.length ?? 0) > 0 && !product) {
                  setVariantCatalogProduct(p);
                  setVariantPickerOpen(true);
                  return;
                }
                const fullName = p.name_bn + (p.pack_size ? ` (${p.pack_size})` : "");
                setName(fullName);
                if (p.barcode) { setBarcode(p.barcode); setBarcodeOn(true); }
                if (p.base_unit) setUnit(p.base_unit);
                if (p.default_price) setSale(String(p.default_price));
                if (p.default_cost) setCost(String(p.default_cost));
              }}
              shopTypeCode={shopTypeCode}
              placeholder={t("p3_TwoCharsHint")}
            />
          </div>

          {/* Stock tracking toggle */}
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium">
                  {t("p3_TrackStockQ")}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {trackStock
                    ? (t("p3_StockAlertActive"))
                    : (t("p3_UnlimitedStockInfo"))}
                </div>
              </div>
              <Switch checked={trackStock} onCheckedChange={setTrackStock} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {trackStock && (
              <div className="grid gap-1.5">
                <Label>{t("p3_CurrentStockCap")}</Label>
                <Input type="number" value={stock} onChange={(e) => setStock(e.target.value)} />
              </div>
            )}
            <div className="grid gap-1.5">
              <Label>{t("p3_Unit")}</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger><SelectValue placeholder="Units" /></SelectTrigger>
                <SelectContent>
                  {Array.from(new Set([...PREDEFINED_UNITS, unit].filter(Boolean))).map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>{t("p3_PurchasePrice")}</Label>
              <Input type="number" value={cost} onChange={(e) => setCost(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>{t("p3_SellPrice")}</Label>
              <Input type="number" value={sale} onChange={(e) => setSale(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>SKU</Label>
            <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Optional" />
          </div>

          <div className="grid gap-1.5">
            <Label>{t("p3_Brand")}</Label>
            <BrandCombobox
              value={brand}
              shopId={shopId}
              onChange={setBrand}
              placeholder={t("p3_BrandOpt")}
            />
          </div>

          {/* Category & Sub-Category */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>{t("p3_CategoryName")}</Label>
              <Select
                value={categoryId ?? ""}
                onValueChange={(v) => {
                  if (v === "__add__") { setNewCatName(""); setAddCatOpen(true); return; }
                  setCategoryId(v || null);
                  setSubCategoryId(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("p3_SelectCategory")} />
                </SelectTrigger>
                <SelectContent>
                  {topCats.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                  <SelectItem value="__add__" className="font-semibold text-primary">
                    + {t("p3_AddNewCategory")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>{t("p3_SubCatName")}</Label>
              <Select
                value={subCategoryId ?? ""}
                onValueChange={(v) => {
                  if (v === "__add__") { setNewCatName(""); setAddSubOpen(true); return; }
                  setSubCategoryId(v || null);
                }}
                disabled={!categoryId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("p3_SelectSubCat")} />
                </SelectTrigger>
                <SelectContent>
                  {subCats.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                  <SelectItem value="__add__" className="font-semibold text-primary">
                    + {t("p3_AddNewSubCat")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>{t("p3_ProductDetails")}</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          {/* Toggle sections */}
          <ToggleSection
            title={t("p3_SellOnlineQ")}
            checked={onlineOn} onChange={setOnlineOn}
          />

          <ToggleSection
            title={t("p3_BulkSellQ")}
            checked={bulkOn} onChange={setBulkOn}
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>{t("p3_BulkPrice")}</Label>
                <Input type="number" value={bulkPrice} onChange={(e) => setBulkPrice(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>{t("p3_MinOrderQty")}</Label>
                <Input type="number" value={bulkMinQty} onChange={(e) => setBulkMinQty(e.target.value)} />
              </div>
            </div>
          </ToggleSection>

          {trackStock && (
            <ToggleSection
              title={t("p3_LowStockAlert")}
              checked={lowOn} onChange={setLowOn}
            >
              <div className="grid gap-1.5">
                <Label>{t("p3_AlertStockQty")}</Label>
                <Input type="number" value={low} onChange={(e) => setLow(e.target.value)} />
              </div>
            </ToggleSection>
          )}

          <ToggleSection
            title={t("p3_VatApp")}
            checked={vatOn} onChange={setVatOn}
          >
            <div className="grid gap-1.5">
              <Label>{t("p3_VatPct")}</Label>
              <Input type="number" value={vatPct} onChange={(e) => setVatPct(e.target.value)} />
            </div>
          </ToggleSection>

          <ToggleSection
            title={t("p3_Warranty")}
            checked={warrantyOn} onChange={setWarrantyOn}
          >
            <div className="grid grid-cols-[1fr_140px] gap-3">
              <div className="grid gap-1.5">
                <Label>{t("p3_DaysAfterSale")}</Label>
                <Input type="number" value={warrantyValue} onChange={(e) => setWarrantyValue(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>&nbsp;</Label>
                <Select value={warrantyUnit} onValueChange={(v) => setWarrantyUnit(v as "day"|"week"|"month"|"year")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Day</SelectItem>
                    <SelectItem value="week">Week</SelectItem>
                    <SelectItem value="month">Month</SelectItem>
                    <SelectItem value="year">Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </ToggleSection>

          <div className="rounded-lg border bg-background p-3">
            <div className="mb-2 text-sm font-semibold">
              {t("p3_MfgExpiry")}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>{t("p3_MfgDate")}</Label>
                <Input
                  type="date"
                  value={mfgDate}
                  onChange={(e) => setMfgDate(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>{t("p3_ExpiryDate")}</Label>
                <Input
                  type="date"
                  value={expDate}
                  onChange={(e) => setExpDate(e.target.value)}
                  min={mfgDate || undefined}
                />
                <p className="text-[11px] text-muted-foreground">
                  {t("p3_ExpiryHint")}
                </p>
              </div>
            </div>
          </div>

          <ToggleSection
            title={t("p3_Discount")}
            checked={discountOn} onChange={setDiscountOn}
          >
            <div className="grid grid-cols-[1fr_120px] gap-3">

              <div className="grid gap-1.5">
                <Label>{t("p3_Discount")}</Label>
                <Input type="number" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>&nbsp;</Label>
                <Select value={discountType} onValueChange={(v) => setDiscountType(v as "percent"|"flat")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">%</SelectItem>
                    <SelectItem value="flat">৳</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </ToggleSection>

          <ToggleSection
            title={t("p3_IMEISerial")}
            checked={serializedOn}
            onChange={setSerializedOn}
          >
            <p className="text-xs text-muted-foreground">
              {t("p3_IMEIHint")}
            </p>
          </ToggleSection>

          <ToggleSection
            title={t("p3_Barcode")}
            checked={barcodeOn} onChange={setBarcodeOn}
          >
            <div className="grid gap-1.5">
              <Label>{t("p3_Barcode")}</Label>
              <div className="flex gap-2">
                <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} />
                <BarcodeScannerButton onDetected={(code: string) => setBarcode(code)} />
              </div>
            </div>
          </ToggleSection>
        </div>

        <SheetFooter className="sticky bottom-0 -mx-6 border-t bg-background px-6 py-3 sm:flex-row sm:justify-between sm:gap-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            {t("p3_CancelBatil")}
          </Button>
          <Button className="flex-1" onClick={save} disabled={busy}>
            {busy ? "..." : product ? (t("p3_UpdateProduct")) : (t("p3_AddNewProduct"))}
          </Button>
        </SheetFooter>

        <Dialog open={addCatOpen || addSubOpen} onOpenChange={(o) => { if (!o) { setAddCatOpen(false); setAddSubOpen(false); } }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>
                {addSubOpen
                  ? (t("p3_NewSubCategory"))
                  : (t("p3_NewCategory"))}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-2">
              <Label>{t("p3_Name")}</Label>
              <Input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") addCategory(addSubOpen ? categoryId : null); }}
              />
              <div className="mt-2 flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setAddCatOpen(false); setAddSubOpen(false); }}>
                  {t("p3_CancelBatil")}
                </Button>
                <Button onClick={() => addCategory(addSubOpen ? categoryId : null)} disabled={!newCatName.trim()}>
                  {t("p3_SaveSimple")}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </SheetContent>
      <VariantPickerSheet
        open={variantPickerOpen}
        onOpenChange={setVariantPickerOpen}
        catalogProduct={variantCatalogProduct}
        shopId={shopId ?? ""}
        trackStock={trackStock}
        onDone={() => {
          onOpenChange(false);
          onSaved(null);
        }}
      />
    </Sheet>
  );
}

function ToggleSection({
  title, checked, onChange, children,
}: { title: string; checked: boolean; onChange: (v: boolean) => void; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="text-sm font-medium">{title}</div>
        <Switch checked={checked} onCheckedChange={onChange} />
      </div>
      {checked && children ? <div className="border-t px-4 py-3">{children}</div> : null}
    </div>
  );
}
export default GuardedProductsPage;
