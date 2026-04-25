import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Download, MoreVertical, Package, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/lib/shop";
import { productsListQuery } from "@/lib/queries";
import { useI18n, fmtMoney, bnNum } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataToolbar } from "@/components/app/DataToolbar";
import { EmptyState } from "@/components/app/EmptyState";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { CatalogProductPicker, type CatalogProduct } from "@/components/app/CatalogProductPicker";

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
  component: ProductsPage,
});

function ProductsPage() {
  const { lang } = useI18n();
  const { current } = useShop();
  const qc = useQueryClient();
  const { data: items = [], isLoading: loading, refetch } = useQuery(productsListQuery(current?.id ?? null));
  const [search, setSearch] = useState("");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
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
          <Button className="h-10 gap-2" onClick={() => { setEditing(null); setOpenForm(true); }}>
            <Plus className="h-4 w-4" />
            {lang === "bn" ? "প্রোডাক্ট যুক্ত করুন" : "Add Product"}
          </Button>
        </div>
      </div>

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
                    <TableCell className="text-right">{lang === "bn" ? bnNum(p.stock) : p.stock}</TableCell>
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
        shopTypeCode={(current as any)?.shop_type_code ?? null}
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
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setName(product?.name ?? "");
      setSku(product?.sku ?? "");
      setBarcode(product?.barcode ?? "");
      setUnit(product?.unit ?? "pcs");
      setCost(String(product?.cost_price ?? 0));
      setSale(String(product?.sale_price ?? 0));
      setStock(String(product?.stock ?? 0));
      setLow(String(product?.low_stock_alert ?? 5));
    }
  }, [open, product]);

  const save = async () => {
    if (!shopId) return;
    if (!name.trim()) { toast.error(lang === "bn" ? "নাম দিন" : "Name required"); return; }
    setBusy(true);
    const payload = {
      name: name.trim(),
      sku: sku.trim() || null,
      barcode: barcode.trim() || null,
      unit: unit.trim() || "pcs",
      cost_price: Number(cost) || 0,
      sale_price: Number(sale) || 0,
      stock: Number(stock) || 0,
      low_stock_alert: Number(low) || 0,
      shop_id: shopId,
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {product ? (lang === "bn" ? "প্রোডাক্ট এডিট" : "Edit product") : (lang === "bn" ? "নতুন প্রোডাক্ট" : "New product")}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>{lang === "bn" ? "পণ্যের নাম" : "Name"}</Label>
            <CatalogProductPicker
              value={name}
              onChange={setName}
              onSelect={(p: CatalogProduct) => {
                const fullName = p.name_bn + (p.pack_size ? ` (${p.pack_size})` : "");
                setName(fullName);
                if (p.barcode) setBarcode(p.barcode);
                if (p.base_unit) setUnit(p.base_unit);
                if (p.default_price) setSale(String(p.default_price));
                if (p.default_cost) setCost(String(p.default_cost));
              }}
              shopTypeCode={shopTypeCode}
              placeholder={lang === "bn" ? "২ অক্ষর লিখলে suggestion পাবেন" : "Type 2+ chars for suggestions"}
            />
            <p className="text-xs text-muted-foreground">
              {lang === "bn"
                ? "Tip: Catalog থেকে suggest হলে দাম, ইউনিট auto-fill হবে।"
                : "Tip: Selecting a catalog suggestion auto-fills price & unit."}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>SKU</Label>
              <Input value={sku} onChange={(e) => setSku(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Barcode</Label>
              <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>{lang === "bn" ? "ক্রয় মূল্য" : "Cost price"}</Label>
              <Input type="number" value={cost} onChange={(e) => setCost(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>{lang === "bn" ? "বিক্রয় মূল্য" : "Sale price"}</Label>
              <Input type="number" value={sale} onChange={(e) => setSale(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>{lang === "bn" ? "মজুদ" : "Stock"}</Label>
              <Input type="number" value={stock} onChange={(e) => setStock(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>{lang === "bn" ? "লো-স্টক অ্যালার্ট" : "Low stock alert"}</Label>
              <Input type="number" value={low} onChange={(e) => setLow(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>{lang === "bn" ? "ইউনিট" : "Unit"}</Label>
              <Input value={unit} onChange={(e) => setUnit(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{lang === "bn" ? "বাতিল" : "Cancel"}</Button>
          <Button onClick={save} disabled={busy}>{busy ? "..." : (lang === "bn" ? "সেভ" : "Save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}