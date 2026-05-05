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
  const { lang } = useI18n();
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
    if (!confirm(lang === "bn" ? "ডিলিট করবেন?" : "Delete this product?")) return;
    const { error } = await supabase.from("products").update({ deleted_at: new Date().toISOString() }).eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    toast.success(lang === "bn" ? "ডিলিট হয়েছে" : "Deleted");
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
      lang === "bn"
        ? `${ids.length}টি প্রোডাক্ট ডিলিট হয়েছে`
        : `${ids.length} products deleted`,
    );
    setConfirmOpen(false);
    setConfirmText("");
    cancelSelect();
    void load();
  };

  const handlePrintProducts = () => {
    printTableReport({
      shopName: current?.name ?? "",
      shopAddress: (current as { address?: string | null } | null)?.address ?? null,
      shopPhone: (current as { phone?: string | null } | null)?.phone ?? null,
      title: lang === "bn" ? "প্রোডাক্ট তালিকা" : "Products List",
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date().toISOString().slice(0, 10),
      lang,
      columns: [
        { key: "idx", label: "#" },
        { key: "name", label: lang === "bn" ? "পণ্যের নাম" : "Name" },
        { key: "sku", label: "SKU" },
        { key: "stock", label: lang === "bn" ? "স্টক" : "Stock", align: "right" },
        { key: "cost", label: lang === "bn" ? "দর" : "Cost", align: "right" },
        { key: "sale", label: lang === "bn" ? "বিক্রয় মূল্য" : "Sale Price", align: "right" },
        { key: "value", label: lang === "bn" ? "মজুদ মূল্য" : "Stock Value", align: "right" },
      ],
      rows: filtered.map((p, i) => {
        const s = Number(p.stock);
        const isUnlimited = s < 0;
        const value = isUnlimited ? "—" : fmtMoney(Number(p.cost_price) * s, lang);
        return {
          idx: String(i + 1),
          name: p.name,
          sku: p.sku ?? "—",
          stock: isUnlimited ? (lang === "bn" ? "অসীম" : "Unlimited") : (lang === "bn" ? bnNum(s) : s),
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
    toast.success(lang === "bn" ? "আপডেট হয়েছে" : "Updated");
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
      toast.info(lang === "bn" ? "কোনো পরিবর্তন নেই" : "No changes");
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
    toast.success(lang === "bn" ? "সংরক্ষণ হয়েছে" : "Saved");
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
        {lang === "bn" ? "প্রোডাক্ট ও স্টক ব্যবস্থাপনা" : "Products & Stock Management"}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-sm font-bold sm:text-lg md:text-2xl">
          {lang === "bn" ? "প্রোডাক্ট ও স্টক" : "Products & Stock"}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          {editStockMode ? (
            <>
              <Button variant="outline" className="h-10 gap-2" onClick={cancelBulk}>
                <X className="h-4 w-4" />
                {lang === "bn" ? "ক্যানসেল" : "Cancel"}
              </Button>
              <Button
                className="h-10 gap-2"
                onClick={saveBulk}
                disabled={savingStock || Object.keys(updates).length === 0}
              >
                <Save className="h-4 w-4" />
                {savingStock ? "..." : lang === "bn" ? "সংরক্ষণ করুন" : "Save"}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                className="h-9 gap-1.5 px-2 sm:h-10 sm:gap-2 sm:px-3"
                onClick={load}
                aria-label={lang === "bn" ? "রিফ্রেশ" : "Refresh"}
              >
                <RefreshCw className="h-4 w-4" />
                <span className="hidden sm:inline">{lang === "bn" ? "রিফ্রেশ" : "Refresh"}</span>
              </Button>
              <Button variant="outline" className="hidden sm:inline-flex h-10 gap-2 border-primary text-primary hover:bg-primary/10" onClick={openHistory}>
                <History className="h-4 w-4" />
                {lang === "bn" ? "স্টকের ইতিহাস" : "Stock history"}
              </Button>
              <Button variant="outline" className="hidden sm:inline-flex h-10 gap-2" onClick={() => setEditStockMode(true)}>
                <ListOrdered className="h-4 w-4" />
                {lang === "bn" ? "স্টক এডিট" : "Stock edit"}
              </Button>
              <Button
                variant={selectMode ? "default" : "outline"}
                className="hidden sm:inline-flex h-10 gap-2"
                onClick={() => (selectMode ? cancelSelect() : setSelectMode(true))}
              >
                <CheckSquare className="h-4 w-4" />
                {selectMode
                  ? lang === "bn" ? "ক্যানসেল" : "Cancel"
                  : lang === "bn" ? "নির্বাচন" : "Select"}
              </Button>
              {selectMode && selected.size > 0 && (
                <Button
                  variant="destructive"
                  className="h-10 gap-2"
                  onClick={() => { setConfirmText(""); setConfirmOpen(true); }}
                >
                  <Trash2 className="h-4 w-4" />
                  {lang === "bn"
                    ? `${selected.size}টি ডিলিট`
                    : `Delete (${selected.size})`}
                </Button>
              )}
              <Button variant="outline" className="hidden sm:inline-flex h-10 gap-2" onClick={handlePrintProducts}>
                <Download className="h-4 w-4" />
                {lang === "bn" ? "ডাউনলোড/প্রিন্ট" : "Download/Print"}
              </Button>
              <Button variant="outline" className="hidden sm:inline-flex h-10 gap-2" onClick={() => setOpenImport(true)}>
                <Sparkles className="h-4 w-4 text-primary" />
                {lang === "bn" ? "স্যাম্পল ইম্পোর্ট" : "Import Sample"}
              </Button>
              <Button variant="outline" className="hidden sm:inline-flex h-10 gap-2" onClick={() => setOpenBulkImport(true)}>
                <Upload className="h-4 w-4 text-primary" />
                {lang === "bn" ? "Excel Import" : "Excel Import"}
              </Button>
              <Button variant="outline" className="hidden sm:inline-flex h-10 gap-2" onClick={() => exportProductsToXlsx(filtered, `products-${new Date().toISOString().slice(0,10)}.xlsx`)}>
                <Download className="h-4 w-4" />
                {lang === "bn" ? "Excel Export" : "Excel Export"}
              </Button>
              <Button className="h-9 gap-1.5 px-3 sm:h-10 sm:gap-2 sm:px-4" disabled={limitReached} onClick={() => {
                if (!current?.id) {
                  toast.error(lang === "bn" ? "আগে দোকান নির্বাচন করুন" : "Select a shop first");
                  return;
                }
                if (limitReached) {
                  toast.error(lang === "bn" ? "ফ্রি প্ল্যানের সীমা শেষ — আপগ্রেড করুন" : "Free plan limit reached — upgrade");
                  return;
                }
                setEditing(null);
                setOpenForm(true);
              }}>
                <Plus className="h-4 w-4" />
                <span className="sm:hidden">{lang === "bn" ? "যোগ" : "Add"}</span>
                <span className="hidden sm:inline">{lang === "bn" ? "প্রোডাক্ট যুক্ত করুন" : "Add Product"}</span>
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
                    {selectMode ? (lang === "bn" ? "ক্যানসেল" : "Cancel select") : (lang === "bn" ? "নির্বাচন" : "Select")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handlePrintProducts}>
                    <Download className="mr-2 h-4 w-4" />
                    {lang === "bn" ? "ডাউনলোড/প্রিন্ট" : "Download/Print"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setOpenImport(true)}>
                    <Sparkles className="mr-2 h-4 w-4 text-primary" />
                    {lang === "bn" ? "স্যাম্পল ইম্পোর্ট" : "Import Sample"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setOpenBulkImport(true)}>
                    <Upload className="mr-2 h-4 w-4 text-primary" />
                    {lang === "bn" ? "Excel Import" : "Excel Import"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportProductsToXlsx(filtered, `products-${new Date().toISOString().slice(0,10)}.xlsx`)}>
                    <Download className="mr-2 h-4 w-4" />
                    {lang === "bn" ? "Excel Export" : "Excel Export"}
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
              {lang === "bn" ? "মোট স্টক" : "Total Stock"}
            </div>
          </div>
          <div className="rounded-lg bg-primary-foreground/15 px-2 py-1 text-center sm:px-3 sm:py-2">
            <div className="text-sm font-extrabold tabular-nums sm:text-xl">
              {fmtMoney(totalStockValue, lang)}
            </div>
            <div className="mt-0 text-[10px] font-semibold sm:text-xs">
              {lang === "bn" ? "মজুদ মূল্য" : "Stock Value"}
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
            {lang === "bn" ? "স্টকের ইতিহাস" : "Stock History"}
          </Button>
          <Button
            variant="outline"
            className="h-9 flex-1 gap-1.5 text-xs"
            onClick={() => setEditStockMode(true)}
          >
            <ListOrdered className="h-3.5 w-3.5" />
            {lang === "bn" ? "স্টক এডিট" : "Stock Edit"}
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
                  <Button variant="outline" size="icon" className="h-9 w-9 flex-none sm:hidden" aria-label={lang === "bn" ? "সাজান ও ফিল্টার" : "Sort & filter"}>
                    <SlidersHorizontal className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-64 space-y-3 p-3">
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-muted-foreground">{lang === "bn" ? "সাজান" : "Sort"}</div>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="h-9 w-full text-xs">
                        <SelectValue placeholder={lang === "bn" ? "সাজান" : "Sort"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="name_asc">{lang === "bn" ? "নাম (ক → হ)" : "Name (A → Z)"}</SelectItem>
                        <SelectItem value="name_desc">{lang === "bn" ? "নাম (হ → ক)" : "Name (Z → A)"}</SelectItem>
                        <SelectItem value="stock_asc">{lang === "bn" ? "স্টক কম → বেশি" : "Stock low → high"}</SelectItem>
                        <SelectItem value="stock_desc">{lang === "bn" ? "স্টক বেশি → কম" : "Stock high → low"}</SelectItem>
                        <SelectItem value="price_asc">{lang === "bn" ? "দাম কম → বেশি" : "Price low → high"}</SelectItem>
                        <SelectItem value="price_desc">{lang === "bn" ? "দাম বেশি → কম" : "Price high → low"}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-muted-foreground">{lang === "bn" ? "ফিল্টার" : "Filter"}</div>
                    <Select value={filterBy} onValueChange={setFilterBy}>
                      <SelectTrigger className="h-9 w-full text-xs">
                        <SelectValue placeholder={lang === "bn" ? "ফিল্টার" : "Filter"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{lang === "bn" ? "সব প্রোডাক্ট" : "All products"}</SelectItem>
                        <SelectItem value="in_stock">{lang === "bn" ? "স্টক আছে" : "In stock"}</SelectItem>
                        <SelectItem value="out_of_stock">{lang === "bn" ? "স্টক শেষ" : "Out of stock"}</SelectItem>
                        <SelectItem value="low_stock">{lang === "bn" ? "কম স্টক" : "Low stock"}</SelectItem>
                        <SelectItem value="unlimited">{lang === "bn" ? "অসীম স্টক" : "Unlimited"}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Desktop: inline selects */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="hidden sm:flex h-10 w-[170px] text-sm">
                  <SelectValue placeholder={lang === "bn" ? "সাজান" : "Sort"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name_asc">{lang === "bn" ? "নাম (ক → হ)" : "Name (A → Z)"}</SelectItem>
                  <SelectItem value="name_desc">{lang === "bn" ? "নাম (হ → ক)" : "Name (Z → A)"}</SelectItem>
                  <SelectItem value="stock_asc">{lang === "bn" ? "স্টক কম → বেশি" : "Stock low → high"}</SelectItem>
                  <SelectItem value="stock_desc">{lang === "bn" ? "স্টক বেশি → কম" : "Stock high → low"}</SelectItem>
                  <SelectItem value="price_asc">{lang === "bn" ? "দাম কম → বেশি" : "Price low → high"}</SelectItem>
                  <SelectItem value="price_desc">{lang === "bn" ? "দাম বেশি → কম" : "Price high → low"}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterBy} onValueChange={setFilterBy}>
                <SelectTrigger className="hidden sm:flex h-10 w-[160px] text-sm">
                  <SelectValue placeholder={lang === "bn" ? "ফিল্টার" : "Filter"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{lang === "bn" ? "সব প্রোডাক্ট" : "All products"}</SelectItem>
                  <SelectItem value="in_stock">{lang === "bn" ? "স্টক আছে" : "In stock"}</SelectItem>
                  <SelectItem value="out_of_stock">{lang === "bn" ? "স্টক শেষ" : "Out of stock"}</SelectItem>
                  <SelectItem value="low_stock">{lang === "bn" ? "কম স্টক" : "Low stock"}</SelectItem>
                  <SelectItem value="unlimited">{lang === "bn" ? "অসীম স্টক" : "Unlimited"}</SelectItem>
                </SelectContent>
              </Select>
            </>
          }
        />
      </div>

      {editStockMode && (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {lang === "bn"
            ? "স্টক এডিট মোড — পরিমাণ পরিবর্তন করে উপরে \"সংরক্ষণ করুন\" চাপুন।"
            : "Stock edit mode — change quantities then press \"Save\" above."}
        </div>
      )}

      <div className="mt-2 rounded-xl border bg-card sm:mt-4">
        <div className="border-b px-3 py-2 text-xs font-semibold sm:px-4 sm:py-3 sm:text-sm">
          {lang === "bn" ? "মোট প্রোডাক্ট:" : "Total Products:"} {lang === "bn" ? bnNum(filtered.length) : filtered.length}
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">...</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Package className="h-6 w-6" />}
            title={lang === "bn" ? "কোনো প্রোডাক্ট নেই" : "No products yet"}
            action={
              <Button size="sm" onClick={() => { setEditing(null); setOpenForm(true); }} className="gap-2">
                <Plus className="h-4 w-4" /> {lang === "bn" ? "প্রোডাক্ট যোগ করুন" : "Add product"}
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
                  <TableHead>{lang === "bn" ? "পণ্যের নাম" : "Product"}</TableHead>
                  <TableHead className="text-right whitespace-nowrap w-px">{lang === "bn" ? "বর্তমান মজুদ" : "In stock"}</TableHead>
                  <TableHead className="text-right hidden sm:table-cell whitespace-nowrap w-px">{lang === "bn" ? "দর" : "Cost"}</TableHead>
                  <TableHead className={"text-right whitespace-nowrap w-px " + (editStockMode ? "hidden sm:table-cell" : "")}>{lang === "bn" ? "বিক্রয় মূল্য" : "Sale price"}</TableHead>
                  <TableHead className="text-right hidden md:table-cell whitespace-nowrap w-px">{lang === "bn" ? "মোট মজুদ মূল্য" : "Stock value"}</TableHead>
                  {editStockMode ? (
                    <TableHead className="text-center w-auto sm:w-[260px]">{lang === "bn" ? "আপডেটেড স্টক" : "Updated stock"}</TableHead>
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
                              aria-label={lang === "bn" ? "অনলাইনে বিক্রয়যোগ্য" : "Available online"}
                            />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {isUnlimited
                          ? <span className="text-primary">{lang === "bn" ? "অসীম" : "Unlimited"}</span>
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
                              {lang === "bn" ? "অসীম" : "Unlimited"}
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
                              title={lang === "bn" ? "বিস্তারিত" : "View"}
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
                                  <Pencil className="mr-2 h-4 w-4" /> {lang === "bn" ? "এডিট" : "Edit"}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setDetails(p); setUpdateOpen(true); }}>
                                  <Plus className="mr-2 h-4 w-4" /> {lang === "bn" ? "স্টক আপডেট" : "Update stock"}
                                </DropdownMenuItem>
                                {p.is_serialized && (
                                  <DropdownMenuItem onClick={() => setSerialsTarget(p)}>
                                    <Hash className="mr-2 h-4 w-4" /> {lang === "bn" ? "সিরিয়াল ম্যানেজ" : "Manage Serials"}
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem className="text-destructive" onClick={() => onDelete(p)}>
                                  <Trash2 className="mr-2 h-4 w-4" /> {lang === "bn" ? "ডিলিট" : "Delete"}
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
                ? (lang === "bn" ? "প্রোডাক্ট নির্বাচন করুন" : "Select products")
                : (lang === "bn" ? "স্টকের ইতিহাস" : "Stock history")}
            </DialogTitle>
          </DialogHeader>
          {historyStep === "pick" ? (
            <div className="space-y-3">
              <Input
                value={historyPickerSearch}
                onChange={(e) => setHistoryPickerSearch(e.target.value)}
                placeholder={lang === "bn" ? "প্রোডাক্ট খুঁজুন" : "Search products"}
                className="h-10"
              />
              <label className="flex items-center gap-2 border-b pb-2 text-sm font-semibold">
                <Checkbox checked={allPickerSelected} onCheckedChange={togglePickAll} />
                {lang === "bn" ? "সব নির্বাচন করুন" : "Select all"}
                <span className="ml-auto text-xs font-normal text-muted-foreground">
                  {lang === "bn"
                    ? `${bnNum(historyPicked.size)} নির্বাচিত`
                    : `${historyPicked.size} selected`}
                </span>
              </label>
              <div className="max-h-[50vh] space-y-1 overflow-auto">
                {pickerProducts.length === 0 ? (
                  <EmptyState title={lang === "bn" ? "কোনো প্রোডাক্ট নেই" : "No products"} />
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
                          ? (lang === "bn" ? "অসীম" : "Unlimited")
                          : (lang === "bn" ? bnNum(Number(p.stock)) : Number(p.stock))}
                      </span>
                    </label>
                  ))
                )}
              </div>
              <div className="flex justify-end gap-2 border-t pt-3">
                <Button variant="outline" onClick={() => setHistoryOpen(false)}>
                  {lang === "bn" ? "ক্যানসেল" : "Cancel"}
                </Button>
                <Button
                  disabled={historyPicked.size === 0}
                  onClick={() => setHistoryStep("view")}
                >
                  {lang === "bn"
                    ? `ইতিহাস দেখুন (${bnNum(historyPicked.size)})`
                    : `Show history (${historyPicked.size})`}
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
                  {lang === "bn" ? "পরিবর্তন" : "Change"}
                </button>
              </div>
              {filteredHistory.length === 0 ? (
                <EmptyState title={lang === "bn" ? "কোনো রেকর্ড নেই" : "No records"} />
              ) : (
                <div className="max-h-[55vh] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{lang === "bn" ? "তারিখ" : "Date"}</TableHead>
                        <TableHead>{lang === "bn" ? "পণ্য" : "Product"}</TableHead>
                        <TableHead>{lang === "bn" ? "ধরন" : "Type"}</TableHead>
                        <TableHead className="text-right">{lang === "bn" ? "পরিমাণ" : "Qty"}</TableHead>
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
                  {lang === "bn" ? "পিছনে" : "Back"}
                </Button>
                <Button onClick={() => setHistoryOpen(false)}>
                  {lang === "bn" ? "বন্ধ করুন" : "Close"}
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
              {lang === "bn" ? "প্রোডাক্ট ডিলিট নিশ্চিত করুন" : "Confirm bulk delete"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>
              {lang === "bn"
                ? `আপনি ${selected.size}টি প্রোডাক্ট ডিলিট করতে যাচ্ছেন। এই কাজটি করতে নিচের ঘরে`
                : `You are about to delete ${selected.size} products. To confirm, type`}{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">delete</code>{" "}
              {lang === "bn" ? "লিখুন।" : "below."}
            </p>
            <Input
              autoFocus
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="delete"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                {lang === "bn" ? "ক্যানসেল" : "Cancel"}
              </Button>
              <Button
                variant="destructive"
                disabled={confirmText.trim().toLowerCase() !== "delete" || bulkDeleting}
                onClick={confirmBulkDelete}
              >
                {bulkDeleting
                  ? "..."
                  : lang === "bn" ? "ডিলিট করুন" : "Delete"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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
  const { lang } = useI18n();
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
  // Marketplace category state (separate from per-shop category tree)
  const [mpCategoryId, setMpCategoryId] = useState<string | null>(null);
  const [mpSubcategoryId, setMpSubcategoryId] = useState<string | null>(null);
  type MpCat = { id: string; parent_id: string | null; name_bn: string; name_en: string };
  const [mpCats, setMpCats] = useState<MpCat[]>([]);
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
    if (!open) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("marketplace_categories")
        .select("id,parent_id,name_bn,name_en")
        .eq("is_active", true)
        .order("sort_order")
        .order("name_en");
      if (!cancelled) setMpCats((data as MpCat[] | null) ?? []);
    })();
    return () => { cancelled = true; };
  }, [open]);

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
      setMpCategoryId(((p as Record<string, unknown> | null)?.marketplace_category_id as string | null) ?? null);
      setMpSubcategoryId(((p as Record<string, unknown> | null)?.marketplace_subcategory_id as string | null) ?? null);
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
        toast.error(lang === "bn"
          ? "এই দোকানে ক্যাটাগরি যোগ করার অনুমতি নেই"
          : "You don't have permission to add categories in this shop");
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
    if (!name.trim()) { toast.error(lang === "bn" ? "নাম দিন" : "Name required"); return; }
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
      marketplace_category_id: mpCategoryId,
      marketplace_subcategory_id: mpSubcategoryId,
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
        toast.error(lang === "bn" ? "ফ্রি প্ল্যানের সীমা শেষ — আপগ্রেড করুন" : "Free plan limit reached — upgrade");
      } else if (code === "42501") {
        toast.error(lang === "bn"
          ? "এই দোকানে প্রোডাক্ট যোগ করার অনুমতি নেই"
          : "You don't have permission to add products in this shop");
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
    toast.success(lang === "bn" ? "সেভ হয়েছে" : "Saved");
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
            {product ? (lang === "bn" ? "প্রোডাক্ট এডিট" : "Edit Product") : (lang === "bn" ? "প্রোডাক্ট যোগ করুন" : "Add Product")}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 grid gap-4 pb-24">
          {/* Always-visible required fields */}
          <div className="grid gap-1.5">
            <Label>{lang === "bn" ? "পণ্যের নাম" : "Product Name"} *</Label>
            <CatalogProductPicker
              value={name}
              onChange={setName}
              onSelect={(p: CatalogProduct) => {
                const fullName = p.name_bn + (p.pack_size ? ` (${p.pack_size})` : "");
                setName(fullName);
                if (p.barcode) { setBarcode(p.barcode); setBarcodeOn(true); }
                if (p.base_unit) setUnit(p.base_unit);
                if (p.default_price) setSale(String(p.default_price));
                if (p.default_cost) setCost(String(p.default_cost));
              }}
              shopTypeCode={shopTypeCode}
              placeholder={lang === "bn" ? "২ অক্ষর লিখলে suggestion পাবেন" : "Type 2+ chars for suggestions"}
            />
          </div>

          {/* Stock tracking toggle */}
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium">
                  {lang === "bn" ? "স্টক হিসাব রাখতে চান?" : "Track stock for this product?"}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {trackStock
                    ? (lang === "bn" ? "মজুদ ও লো-স্টক অ্যালার্ট সক্রিয় থাকবে।" : "Stock & low-stock alert will be active.")
                    : (lang === "bn" ? "স্টক unlimited হিসেবে গণ্য হবে। অর্ডারে স্টক কমবে না, কোনো অ্যালার্ট আসবে না।" : "Stock will be treated as unlimited. Orders won't reduce stock; no alerts.")}
                </div>
              </div>
              <Switch checked={trackStock} onCheckedChange={setTrackStock} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {trackStock && (
              <div className="grid gap-1.5">
                <Label>{lang === "bn" ? "বর্তমান মজুদ" : "Current Stock"}</Label>
                <Input type="number" value={stock} onChange={(e) => setStock(e.target.value)} />
              </div>
            )}
            <div className="grid gap-1.5">
              <Label>{lang === "bn" ? "ইউনিট" : "Unit"}</Label>
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
              <Label>{lang === "bn" ? "ক্রয় মূল্য" : "Purchase Price"}</Label>
              <Input type="number" value={cost} onChange={(e) => setCost(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>{lang === "bn" ? "বিক্রয় মূল্য" : "Sell Price"}</Label>
              <Input type="number" value={sale} onChange={(e) => setSale(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>SKU</Label>
            <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Optional" />
          </div>

          <div className="grid gap-1.5">
            <Label>{lang === "bn" ? "ব্র্যান্ড / কোম্পানি" : "Brand / Company"}</Label>
            <BrandCombobox
              value={brand}
              shopId={shopId}
              onChange={setBrand}
              placeholder={lang === "bn" ? "ব্র্যান্ড / কোম্পানি (optional)" : "Brand / Company (optional)"}
            />
          </div>

          {/* Marketplace Category (platform-wide, used for online filter) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>{lang === "bn" ? "মার্কেটপ্লেস ক্যাটাগরি" : "Marketplace Category"}</Label>
              <Select
                value={mpCategoryId ?? "__none"}
                onValueChange={(v) => {
                  setMpCategoryId(v === "__none" ? null : v);
                  setMpSubcategoryId(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={lang === "bn" ? "বাছাই করুন" : "Select"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">— None —</SelectItem>
                  {mpCats.filter((c) => !c.parent_id).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name_bn} / {c.name_en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>{lang === "bn" ? "সাবক্যাটাগরি" : "Subcategory"}</Label>
              <Select
                value={mpSubcategoryId ?? "__none"}
                onValueChange={(v) => setMpSubcategoryId(v === "__none" ? null : v)}
                disabled={!mpCategoryId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={mpCategoryId ? (lang === "bn" ? "বাছাই" : "Select") : (lang === "bn" ? "আগে ক্যাটাগরি" : "Pick category first")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">— None —</SelectItem>
                  {mpCats.filter((c) => c.parent_id === mpCategoryId).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name_bn} / {c.name_en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Category & Sub-Category */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>{lang === "bn" ? "ক্যাটাগরি" : "Category Name"}</Label>
              <Select
                value={categoryId ?? ""}
                onValueChange={(v) => {
                  if (v === "__add__") { setNewCatName(""); setAddCatOpen(true); return; }
                  setCategoryId(v || null);
                  setSubCategoryId(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={lang === "bn" ? "ক্যাটাগরি বাছাই" : "Select category"} />
                </SelectTrigger>
                <SelectContent>
                  {topCats.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                  <SelectItem value="__add__" className="font-semibold text-primary">
                    + {lang === "bn" ? "নতুন ক্যাটাগরি" : "Add New Category"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>{lang === "bn" ? "সাব-ক্যাটাগরি" : "Sub-Category Name"}</Label>
              <Select
                value={subCategoryId ?? ""}
                onValueChange={(v) => {
                  if (v === "__add__") { setNewCatName(""); setAddSubOpen(true); return; }
                  setSubCategoryId(v || null);
                }}
                disabled={!categoryId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={lang === "bn" ? "সাব-ক্যাটাগরি" : "Select sub-category"} />
                </SelectTrigger>
                <SelectContent>
                  {subCats.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                  <SelectItem value="__add__" className="font-semibold text-primary">
                    + {lang === "bn" ? "নতুন সাব-ক্যাটাগরি" : "Add New Sub-Category"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>{lang === "bn" ? "প্রোডাক্ট বিবরণ" : "Product Details"}</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          {/* Toggle sections */}
          <ToggleSection
            title={lang === "bn" ? "অনলাইনে বিক্রি করতে চান?" : "Want to sell this product online?"}
            checked={onlineOn} onChange={setOnlineOn}
          />

          <ToggleSection
            title={lang === "bn" ? "বাল্ক/পাইকারি বিক্রি?" : "Want to sell this in bulk?"}
            checked={bulkOn} onChange={setBulkOn}
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>{lang === "bn" ? "বাল্ক দাম" : "Bulk Price"}</Label>
                <Input type="number" value={bulkPrice} onChange={(e) => setBulkPrice(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>{lang === "bn" ? "মিনিমাম পরিমাণ" : "Minimum Order Qty"}</Label>
                <Input type="number" value={bulkMinQty} onChange={(e) => setBulkMinQty(e.target.value)} />
              </div>
            </div>
          </ToggleSection>

          {trackStock && (
            <ToggleSection
              title={lang === "bn" ? "লো-স্টক অ্যালার্ট" : "Low stock alert"}
              checked={lowOn} onChange={setLowOn}
            >
              <div className="grid gap-1.5">
                <Label>{lang === "bn" ? "অ্যালার্ট স্টক পরিমাণ" : "Alert when stock reaches"}</Label>
                <Input type="number" value={low} onChange={(e) => setLow(e.target.value)} />
              </div>
            </ToggleSection>
          )}

          <ToggleSection
            title={lang === "bn" ? "VAT applicable?" : "VAT applicable?"}
            checked={vatOn} onChange={setVatOn}
          >
            <div className="grid gap-1.5">
              <Label>{lang === "bn" ? "VAT (%)" : "VAT percentage (%)"}</Label>
              <Input type="number" value={vatPct} onChange={(e) => setVatPct(e.target.value)} />
            </div>
          </ToggleSection>

          <ToggleSection
            title={lang === "bn" ? "ওয়ারেন্টি" : "Warranty"}
            checked={warrantyOn} onChange={setWarrantyOn}
          >
            <div className="grid grid-cols-[1fr_140px] gap-3">
              <div className="grid gap-1.5">
                <Label>{lang === "bn" ? "বিক্রির পর সময়" : "Days after sale date"}</Label>
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
              {lang === "bn" ? "উৎপাদন ও মেয়াদ" : "Manufacturing & Expiry"}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>{lang === "bn" ? "উৎপাদনের তারিখ" : "Manufacturing date"}</Label>
                <Input
                  type="date"
                  value={mfgDate}
                  onChange={(e) => setMfgDate(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>{lang === "bn" ? "মেয়াদ শেষের তারিখ" : "Expiry date"}</Label>
                <Input
                  type="date"
                  value={expDate}
                  onChange={(e) => setExpDate(e.target.value)}
                  min={mfgDate || undefined}
                />
                <p className="text-[11px] text-muted-foreground">
                  {lang === "bn"
                    ? "মেয়াদ এক মাসের কম থাকলে পণ্যটি \"শীঘ্রই মেয়াদোত্তীর্ণ\" পেজে দেখাবে।"
                    : "If expiry is within one month, the product will appear on the \"Expire Soon\" page."}
                </p>
              </div>
            </div>
          </div>

          <ToggleSection
            title={lang === "bn" ? "ডিসকাউন্ট" : "Discount"}
            checked={discountOn} onChange={setDiscountOn}
          >
            <div className="grid grid-cols-[1fr_120px] gap-3">

              <div className="grid gap-1.5">
                <Label>{lang === "bn" ? "ডিসকাউন্ট" : "Discount"}</Label>
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
            title={lang === "bn" ? "IMEI / সিরিয়াল ট্র্যাকিং" : "IMEI / Serial tracking"}
            checked={serializedOn}
            onChange={setSerializedOn}
          >
            <p className="text-xs text-muted-foreground">
              {lang === "bn"
                ? "প্রতিটি ইউনিটের আলাদা IMEI বা সিরিয়াল নম্বর সেভ করুন। সেভ করার সাথে সাথে সিরিয়াল যোগ করার window আসবে — ক্রমিক (sequential) অথবা র‍্যান্ডম যেভাবে চান দিতে পারবেন।"
                : "Track each unit by a unique IMEI or Serial. After saving, you'll be prompted to enter serials — sequential range or random one-by-one."}
            </p>
          </ToggleSection>

          <ToggleSection
            title={lang === "bn" ? "বারকোড" : "Barcode"}
            checked={barcodeOn} onChange={setBarcodeOn}
          >
            <div className="grid gap-1.5">
              <Label>{lang === "bn" ? "বারকোড" : "Barcode"}</Label>
              <div className="flex gap-2">
                <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} />
                <BarcodeScannerButton onDetected={(code: string) => setBarcode(code)} />
              </div>
            </div>
          </ToggleSection>
        </div>

        <SheetFooter className="sticky bottom-0 -mx-6 border-t bg-background px-6 py-3 sm:flex-row sm:justify-between sm:gap-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            {lang === "bn" ? "বাতিল" : "Cancel"}
          </Button>
          <Button className="flex-1" onClick={save} disabled={busy}>
            {busy ? "..." : product ? (lang === "bn" ? "আপডেট" : "Update Product") : (lang === "bn" ? "যোগ করুন" : "Add New Product")}
          </Button>
        </SheetFooter>

        <Dialog open={addCatOpen || addSubOpen} onOpenChange={(o) => { if (!o) { setAddCatOpen(false); setAddSubOpen(false); } }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>
                {addSubOpen
                  ? (lang === "bn" ? "নতুন সাব-ক্যাটাগরি" : "New Sub-Category")
                  : (lang === "bn" ? "নতুন ক্যাটাগরি" : "New Category")}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-2">
              <Label>{lang === "bn" ? "নাম" : "Name"}</Label>
              <Input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") addCategory(addSubOpen ? categoryId : null); }}
              />
              <div className="mt-2 flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setAddCatOpen(false); setAddSubOpen(false); }}>
                  {lang === "bn" ? "বাতিল" : "Cancel"}
                </Button>
                <Button onClick={() => addCategory(addSubOpen ? categoryId : null)} disabled={!newCatName.trim()}>
                  {lang === "bn" ? "সংরক্ষণ" : "Save"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </SheetContent>
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
