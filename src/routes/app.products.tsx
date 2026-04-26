import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Download, MoreVertical, Package, Pencil, Trash2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/lib/shop";
import { productsListQuery } from "@/lib/queries";
import { useI18n, fmtMoney, bnNum } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { CatalogProductPicker, type CatalogProduct } from "@/components/app/CatalogProductPicker";
import { SampleProductImportSheet } from "@/components/app/SampleProductImportSheet";

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
};

export const Route = createFileRoute("/app/products")({
  component: GuardedProductsPage,
});

import { RequirePerm } from "@/components/app/RequirePerm";
function GuardedProductsPage() {
  return <RequirePerm group="products"><ProductsPage /></RequirePerm>;
}

function ProductsPage() {
  const { lang } = useI18n();
  const { current } = useShop();
  const qc = useQueryClient();
  const { data: items = [], isLoading: loading, refetch } = useQuery(productsListQuery(current?.id ?? null));
  const [search, setSearch] = useState("");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [openImport, setOpenImport] = useState(false);
  const load = async () => {
    await qc.invalidateQueries({ queryKey: ["products"] });
    await refetch();
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((p) => p.name.toLowerCase().includes(q) || (p.sku ?? "").toLowerCase().includes(q));
  }, [items, search]);

  const onDelete = async (p: Product) => {
    if (!confirm(lang === "bn" ? "ডিলিট করবেন?" : "Delete this product?")) return;
    const { error } = await supabase.from("products").update({ deleted_at: new Date().toISOString() }).eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    toast.success(lang === "bn" ? "ডিলিট হয়েছে" : "Deleted");
    void load();
  };

  return (
    <div className="container px-4 py-4">
      <div className="mb-1 text-xs text-muted-foreground">Product List</div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-extrabold md:text-2xl">{lang === "bn" ? "প্রোডাক্ট লিস্ট" : "Product List"}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" className="h-10 gap-2">
            <Download className="h-4 w-4" />
            {lang === "bn" ? "ডাউনলোড/প্রিন্ট" : "Download/Print"}
          </Button>
          <Button variant="outline" className="h-10 gap-2" onClick={() => setOpenImport(true)}>
            <Sparkles className="h-4 w-4 text-primary" />
            {lang === "bn" ? "স্যাম্পল ইম্পোর্ট" : "Import Sample"}
          </Button>
          <Button className="h-10 gap-2" onClick={() => { setEditing(null); setOpenForm(true); }}>
            <Plus className="h-4 w-4" />
            {lang === "bn" ? "প্রোডাক্ট যুক্ত করুন" : "Add Product"}
          </Button>
        </div>
      </div>
      <SampleProductImportSheet open={openImport} onOpenChange={setOpenImport} onImported={() => void load()} />

      <div className="mt-4">
        <DataToolbar search={search} onSearch={setSearch} onRefresh={load} />
      </div>

      <div className="mt-4 rounded-xl border bg-card">
        <div className="border-b px-4 py-3 text-sm font-semibold">
          Total Products : {lang === "bn" ? bnNum(filtered.length) : filtered.length}
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
                  <TableHead>{lang === "bn" ? "পণ্যের নাম" : "Product"}</TableHead>
                  <TableHead className="text-right">{lang === "bn" ? "বর্তমান মজুদ" : "In stock"}</TableHead>
                  <TableHead className="text-right">{lang === "bn" ? "বিক্রয় মূল্য" : "Sale price"}</TableHead>
                  <TableHead className="hidden md:table-cell">{lang === "bn" ? "সাব ক্যাটাগরি" : "Category"}</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 flex-none items-center justify-center rounded-md bg-muted">
                          {p.image_url ? (
                            <img src={p.image_url} alt="" className="h-8 w-8 rounded-md object-cover" />
                          ) : (
                            <Package className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <span className="font-medium">{p.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {Number(p.stock) < 0
                        ? <span className="text-primary">{lang === "bn" ? "অসীম" : "Unlimited"}</span>
                        : (lang === "bn" ? bnNum(p.stock) : p.stock)}
                    </TableCell>
                    <TableCell className="text-right">{fmtMoney(Number(p.sale_price), lang)}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">—</TableCell>
                    <TableCell className="text-right">
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
                          <DropdownMenuItem className="text-destructive" onClick={() => onDelete(p)}>
                            <Trash2 className="mr-2 h-4 w-4" /> {lang === "bn" ? "ডিলিট" : "Delete"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="border-t px-4 py-3 text-center text-xs text-muted-foreground">
              Showing 1 to {filtered.length} of {filtered.length} Products
            </div>
          </>
        )}
      </div>

      <ProductFormDialog
        open={openForm}
        onOpenChange={setOpenForm}
        product={editing}
        shopId={current?.id ?? null}
        shopTypeCode={current?.shop_type_code ?? null}
        onSaved={load}
      />
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
  onSaved: () => void;
}) {
  const { lang } = useI18n();
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [unit, setUnit] = useState("pcs");
  const [cost, setCost] = useState("0");
  const [sale, setSale] = useState("0");
  const [stock, setStock] = useState("0");
  const [low, setLow] = useState("5");
  const [trackStock, setTrackStock] = useState(true);
  const [busy, setBusy] = useState(false);
  const [description, setDescription] = useState("");
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
  const [discountOn, setDiscountOn] = useState(false);
  const [discountValue, setDiscountValue] = useState("");
  const [discountType, setDiscountType] = useState<"percent"|"flat">("percent");
  const [barcodeOn, setBarcodeOn] = useState(false);

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
      setDiscountOn(Boolean(p?.discount_enabled));
      setDiscountValue(p?.discount_value != null ? String(p.discount_value) : "");
      setDiscountType(((p?.discount_type as "percent"|"flat") ?? "percent"));
      setBarcodeOn(Boolean(p?.barcode));
    }
  }, [open, product]);

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
      is_marketplace_published: onlineOn,
      bulk_enabled: bulkOn,
      bulk_price: bulkOn ? (Number(bulkPrice) || 0) : null,
      bulk_min_qty: bulkOn ? (Number(bulkMinQty) || 0) : null,
      vat_enabled: vatOn,
      vat_pct: vatOn ? (Number(vatPct) || 0) : null,
      warranty_enabled: warrantyOn,
      warranty_value: warrantyOn ? (Number(warrantyValue) || 0) : null,
      warranty_unit: warrantyOn ? warrantyUnit : null,
      discount_enabled: discountOn,
      discount_value: discountOn ? (Number(discountValue) || 0) : null,
      discount_type: discountOn ? discountType : null,
    };
    const { error } = product
      ? await supabase.from("products").update(payload).eq("id", product.id)
      : await supabase.from("products").insert(payload);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(lang === "bn" ? "সেভ হয়েছে" : "Saved");
    onOpenChange(false);
    onSaved();
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
              <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="pcs / kg / ltr" />
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

          <ToggleSection
            title={lang === "bn" ? "লো-স্টক অ্যালার্ট" : "Low stock alert"}
            checked={lowOn} onChange={setLowOn}
          >
            <div className="grid gap-1.5">
              <Label>{lang === "bn" ? "অ্যালার্ট স্টক পরিমাণ" : "Alert when stock reaches"}</Label>
              <Input type="number" value={low} onChange={(e) => setLow(e.target.value)} />
            </div>
          </ToggleSection>

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
            title={lang === "bn" ? "বারকোড" : "Barcode"}
            checked={barcodeOn} onChange={setBarcodeOn}
          >
            <div className="grid gap-1.5">
              <Label>{lang === "bn" ? "বারকোড" : "Barcode"}</Label>
              <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} />
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