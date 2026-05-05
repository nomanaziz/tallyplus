import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Minus, X, Package, ShoppingCart, ChevronDown, MessageSquare, RefreshCw, Search, UserRound, LayoutGrid, List as ListIcon } from "lucide-react";
import { useNavigate } from "@/lib/router";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/lib/shop";
import { useAuth } from "@/lib/auth";
import { useI18n, fmtMoney, bnNum } from "@/lib/i18n";
import { productsLiteQuery } from "@/lib/queries";
import { servicesLiteQuery, durationToText, type Service } from "@/lib/services-queries";
import { SerialPickDialog } from "@/components/app/SerialPickDialog";
import { BarcodeScannerButton } from "@/components/app/BarcodeScannerButton";
import { useHardwareScanner } from "@/hooks/useHardwareScanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wrench, Clock, Shield } from "lucide-react";
import { EmptyState } from "@/components/app/EmptyState";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { toast } from "sonner";
import { InvoiceDialog, type InvoiceData } from "@/components/app/InvoiceDialog";

type Mode = "sell" | "purchase";

type Product = {
  id: string;
  name: string;
  unit: string | null;
  cost_price: number;
  sale_price: number;
  stock: number;
  image_url: string | null;
  bulk_enabled?: boolean | null;
  bulk_price?: number | null;
  bulk_min_qty?: number | null;
  is_serialized?: boolean | null;
  barcode?: string | null;
  sku?: string | null;
};

type CartItem = {
  product_id: string | null;
  service_id?: string | null;
  item_type?: "product" | "service";
  name: string;
  qty: number;
  price: number;
  sale_price?: number;
  bulk_enabled?: boolean;
  bulk_price?: number | null;
  bulk_min_qty?: number | null;
  price_overridden?: boolean;
  is_bulk?: boolean;
  // Serialized item fields
  is_serialized?: boolean;
  serial_id?: string | null;
  serial_no?: string | null;
  // Service-specific
  warranty_enabled?: boolean;
  warranty_value?: number | null;
  warranty_unit?: string | null;
  duration_label?: string | null;
};

function applyBulkPricing(item: CartItem): CartItem {
  if (!item.bulk_enabled || !item.bulk_price || !item.bulk_min_qty) {
    return { ...item, is_bulk: false };
  }
  const meets = item.qty >= Number(item.bulk_min_qty);
  if (meets) {
    // Auto-apply bulk price unless user manually overrode and we're already at bulk
    if (!item.price_overridden) {
      return { ...item, price: Number(item.bulk_price), is_bulk: true };
    }
    return { ...item, is_bulk: true };
  }
  // Below threshold: revert to sale price (only if not overridden)
  if (!item.price_overridden && item.sale_price != null) {
    return { ...item, price: Number(item.sale_price), is_bulk: false };
  }
  return { ...item, is_bulk: false };
}

type Contact = { id: string; name: string; phone: string | null; address: string | null };

export function POSPage({ mode, autoOpenDue = false }: { mode: Mode; autoOpenDue?: boolean }) {
  const { lang } = useI18n();
  const { current } = useShop();
  const { user } = useAuth();
  const nav = useNavigate();

  const qc = useQueryClient();
  const { data: productsData = [], refetch } = useQuery(productsLiteQuery(current?.id ?? null));
  const products = productsData as unknown as Product[];
  const { data: servicesData = [] } = useQuery(servicesLiteQuery(current?.id ?? null));
  const services = servicesData as Service[];
  const [pickerTab, setPickerTab] = useState<"products" | "services">("products");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState<string>("0");
  const [delivery, setDelivery] = useState<string>("0");
  const [quickOpen, setQuickOpen] = useState(false);
  const [cashOpen, setCashOpen] = useState(false);
  const [dueOpen, setDueOpen] = useState(false);
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  useEffect(() => { if (autoOpenDue) setDueOpen(true); }, [autoOpenDue]);
  const [mobileTab, setMobileTab] = useState<"products" | "cart">("products");
  const [serialPick, setSerialPick] = useState<Product | null>(null);

  // View mode: grid (default) or list
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    if (typeof window === "undefined") return "grid";
    return (localStorage.getItem("pos-view") as "grid" | "list") || "grid";
  });
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("pos-view", viewMode);
  }, [viewMode]);

  const isSell = mode === "sell";
  const titleBn = isSell ? "বিক্রয়" : "ক্রয়";
  const titleEn = isSell ? "Sell" : "Purchase";
  const partyLabelBn = isSell ? "কাস্টমার" : "সাপ্লায়ার";
  const partyLabelEn = isSell ? "Customer" : "Supplier";

  const loadProducts = async () => {
    await qc.invalidateQueries({ queryKey: ["products"] });
    await refetch();
  };

  const filtered = useMemo(() => {
    // Hide parent placeholder products — they're just grouping shells for variants.
    const parentIds = new Set(
      products
        .map((p) => (p as unknown as { parent_product_id?: string | null }).parent_product_id)
        .filter((x): x is string => !!x),
    );
    const visible = products.filter((p) => !parentIds.has(p.id));
    const q = search.trim().toLowerCase();
    if (!q) return visible;
    return visible.filter((p) => {
      const vl = (p as unknown as { variant_label?: string | null }).variant_label ?? "";
      return p.name.toLowerCase().includes(q) || vl.toLowerCase().includes(q);
    });
  }, [products, search]);

  const handleScannedCode = (code: string) => {
    const c = code.trim();
    if (!c) return;
    const cl = c.toLowerCase();
    const match =
      products.find((p) => (p.barcode ?? "").toLowerCase() === cl) ||
      products.find((p) => (p.sku ?? "").toLowerCase() === cl);
    if (match) {
      addToCart(match);
      toast.success(lang === "bn" ? `যোগ হয়েছে: ${match.name}` : `Added: ${match.name}`);
    } else {
      setSearch(c);
      toast.error(lang === "bn" ? "এই বারকোডের পণ্য পাওয়া যায়নি" : "No product found for this barcode");
    }
  };

  // Listen for keyboard-emulating USB scanners anywhere on the POS page
  useHardwareScanner(handleScannedCode, { minLength: 4, maxGapMs: 50 });

  const addToCart = (p: Product) => {
    // Serialized products: open serial picker instead of direct add
    if (isSell && p.is_serialized) {
      setSerialPick(p);
      return;
    }
    let alreadyInCart = false;
    setCart((prev) => {
      const i = prev.findIndex((c) => c.product_id === p.id);
      if (i >= 0) {
        alreadyInCart = true;
        const copy = [...prev];
        const next = { ...copy[i], qty: copy[i].qty + 1 };
        copy[i] = applyBulkPricing(next);
        return copy;
      }
      const base = isSell ? Number(p.sale_price) : Number(p.cost_price);
      const newItem: CartItem = {
        product_id: p.id,
        name: p.name,
        qty: 1,
        price: base,
        sale_price: Number(p.sale_price),
        bulk_enabled: isSell ? Boolean(p.bulk_enabled) : false,
        bulk_price: p.bulk_price != null ? Number(p.bulk_price) : null,
        bulk_min_qty: p.bulk_min_qty != null ? Number(p.bulk_min_qty) : null,
      };
      return [...prev, applyBulkPricing(newItem)];
    });
    // Stay on the products tab so the user can keep adding more items.
    // A toast confirms the add and a badge on the Cart tab shows the count.
    toast.success(
      lang === "bn"
        ? `${p.name} ${alreadyInCart ? "এর পরিমাণ বাড়ানো হয়েছে" : "কার্টে যোগ হয়েছে"}`
        : `${p.name} ${alreadyInCart ? "qty increased" : "added to cart"}`,
      { duration: 1200 },
    );
  };

  const updateCart = (idx: number, patch: Partial<CartItem>) => {
    setCart((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it;
        const merged = { ...it, ...patch };
        // Mark price as overridden when user manually edits price
        if (Object.prototype.hasOwnProperty.call(patch, "price")) {
          merged.price_overridden = true;
        }
        // Recompute bulk pricing on qty changes
        if (Object.prototype.hasOwnProperty.call(patch, "qty")) {
          return applyBulkPricing(merged);
        }
        return merged;
      }),
    );
  };
  const removeCart = (idx: number) => setCart((prev) => prev.filter((_, i) => i !== idx));
  const clearCart = () => { setCart([]); setDiscount("0"); setDelivery("0"); };

  const subtotal = cart.reduce((s, it) => s + it.qty * it.price, 0);
  const grandTotal = Math.max(0, subtotal - (Number(discount) || 0) + (Number(delivery) || 0));

  return (
    <div className="container px-4 py-4">
      <div className="mb-1 text-xs text-muted-foreground">{titleEn}</div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => nav({ to: "/app/dashboard" })}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-extrabold md:text-2xl">{lang === "bn" ? titleBn : titleEn}</h1>
        </div>
      </div>

      {/* Mobile tabs */}
      <div className="mb-3 md:hidden">
        <Tabs value={mobileTab} onValueChange={(v) => setMobileTab(v as "products" | "cart")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="products">
              {lang === "bn" ? "পণ্য" : "Products"}
            </TabsTrigger>
            <TabsTrigger value="cart">
              {lang === "bn" ? "কার্ট" : "Cart"} ({lang === "bn" ? bnNum(cart.length) : cart.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Product picker */}
        <div className={`rounded-xl border bg-card ${mobileTab === "cart" ? "hidden md:block" : ""}`}>
          <div className="flex items-center justify-between border-b p-3">
            <div className="text-sm font-semibold">
              {lang === "bn" ? "নির্বাচন করুন" : "Select"}
            </div>
            {isSell && services.length > 0 && (
              <Tabs value={pickerTab} onValueChange={(v) => setPickerTab(v as "products" | "services")}>
                <TabsList className="h-8">
                  <TabsTrigger value="products" className="text-xs px-3">{lang === "bn" ? "পণ্য" : "Products"}</TabsTrigger>
                  <TabsTrigger value="services" className="text-xs px-3">{lang === "bn" ? "সার্ভিস" : "Services"}</TabsTrigger>
                </TabsList>
              </Tabs>
            )}
          </div>
          {pickerTab === "services" && isSell ? (
            <div className="p-3">
              <div className="relative mb-3">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={lang === "bn" ? "সার্ভিস খুঁজুন" : "Search service"} className="h-10 pl-9" />
              </div>
              <div className="max-h-[55vh] overflow-y-auto">
                <ul className="divide-y">
                  {services.filter((s) => !search.trim() || s.name.toLowerCase().includes(search.toLowerCase())).map((s) => {
                    const inCart = cart.find((c) => c.service_id === s.id);
                    const dur = durationToText(s, lang);
                    return (
                      <li key={s.id} className="flex items-center gap-3 py-2">
                        <div className="flex h-10 w-10 flex-none items-center justify-center rounded-md bg-muted">
                          {s.image_url ? <img src={s.image_url} alt={s.name} className="h-10 w-10 rounded-md object-cover" /> : <Wrench className="h-5 w-5 text-muted-foreground" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">
                            {s.name}
                            {inCart && <span className="ml-2 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">× {inCart.qty}</span>}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            {fmtMoney(Number(s.price), lang)}
                            {dur && <><span>·</span><Clock className="h-3 w-3" />{dur}</>}
                            {s.warranty_enabled && <Shield className="h-3 w-3 text-emerald-600" />}
                          </div>
                        </div>
                        <Button size="sm" onClick={() => {
                          setCart((prev) => {
                            const i = prev.findIndex((c) => c.service_id === s.id);
                            if (i >= 0) {
                              const copy = [...prev]; copy[i] = { ...copy[i], qty: copy[i].qty + 1 }; return copy;
                            }
                            return [...prev, {
                              product_id: null, service_id: s.id, item_type: "service",
                              name: s.name, qty: 1, price: Number(s.price),
                              warranty_enabled: s.warranty_enabled, warranty_value: s.warranty_value, warranty_unit: s.warranty_unit,
                              duration_label: s.duration_label,
                            }];
                          });
                          toast.success(`${s.name} ${lang === "bn" ? "যোগ হয়েছে" : "added"}`, { duration: 1000 });
                        }}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </li>
                    );
                  })}
                  {services.length === 0 && <li className="py-8 text-center text-sm text-muted-foreground">{lang === "bn" ? "কোনো সার্ভিস নেই" : "No services"}</li>}
                </ul>
              </div>
            </div>
          ) : (
          <>
          <div className="flex flex-wrap items-center gap-2 p-3">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={lang === "bn" ? "পণ্য খোঁজ করুন" : "Search product"}
                className="h-10 pl-9"
              />
            </div>
            <BarcodeScannerButton
              onDetected={handleScannedCode}
              className="h-10 w-10 flex-none"
            />
            <Button size="icon" className="h-10 w-10 flex-none" onClick={() => setQuickOpen(true)} aria-label="Quick add">
              <Plus className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-10 w-10 flex-none" onClick={loadProducts} aria-label="Refresh">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <div className="max-h-[60vh] overflow-y-auto px-3 pb-3">
            {filtered.length === 0 ? (
              <EmptyState icon={<Package className="h-6 w-6" />} title={lang === "bn" ? "কোনো পণ্য নেই" : "No products"} />
            ) : (
              <ul className="divide-y">
                {filtered.map((p) => {
                  const inCart = cart.find((c) => c.product_id === p.id);
                  return (
                  <li key={p.id} className="flex items-center gap-3 py-2">
                    <div className="flex h-10 w-10 flex-none items-center justify-center rounded-md bg-muted">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="h-10 w-10 rounded-md object-cover" />
                      ) : (
                        <Package className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {p.name}
                        {((p as unknown as { variant_label?: string | null }).variant_label) && (
                          <span className="ml-2 rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                            {(p as unknown as { variant_label?: string | null }).variant_label}
                          </span>
                        )}
                        {inCart && (
                          <span className="ml-2 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                            × {lang === "bn" ? bnNum(inCart.qty) : inCart.qty}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {lang === "bn" ? "মূল্য:" : "Price:"} {fmtMoney(isSell ? Number(p.sale_price) : Number(p.cost_price), lang)}
                        <span className="mx-1">·</span>
                        {lang === "bn" ? "স্টক:" : "Stock:"} {lang === "bn" ? bnNum(p.stock) : p.stock}
                      </div>
                    </div>
                    <div className="flex">
                      <Button size="sm" className="rounded-r-none px-3" onClick={() => addToCart(p)} aria-label={lang === "bn" ? "যোগ" : "Add"}>
                        <Plus className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" className="rounded-l-none border-l border-primary-foreground/20 px-2">
                            <ChevronDown className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => addToCart(p)}>
                            {lang === "bn" ? "১টি যোগ করুন" : "Add 1"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { addToCart(p); addToCart(p); }}>
                            {lang === "bn" ? "২টি যোগ করুন" : "Add 2"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </li>
                  );
                })}
              </ul>
            )}
          </div>
          </>
          )}
        </div>

        {/* Cart */}
        <div className={`rounded-xl border bg-card ${mobileTab === "products" ? "hidden md:block" : ""}`}>
          <div className="flex items-center justify-between border-b p-3">
            <div className="text-sm font-semibold">
              {lang === "bn" ? `পণ্য নির্বাচন করেছেন (${bnNum(cart.length)})` : `Selected items (${cart.length})`}
            </div>
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearCart}>
                {lang === "bn" ? "কার্ট খালি" : "Clear cart"}
              </Button>
            )}
          </div>
          <div className="max-h-[50vh] overflow-y-auto p-3">
            {cart.length === 0 ? (
              <EmptyState icon={<ShoppingCart className="h-6 w-6" />} title={lang === "bn" ? "কার্ট খালি" : "Cart is empty"} />
            ) : (
              <ul className="space-y-2">
                {cart.map((it, idx) => (
                  <li key={idx} className="rounded-lg border p-3">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="font-medium">{it.name}</div>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeCart(idx)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-[10px] uppercase text-muted-foreground">{lang === "bn" ? "পরিমাণ" : "Qty"}</Label>
                        <div className="flex items-center">
                          <Button variant="outline" size="icon" className="h-9 w-9 rounded-r-none"
                            onClick={() => updateCart(idx, { qty: Math.max(1, it.qty - 1) })}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Input type="number" value={it.qty} className="h-9 rounded-none text-center"
                            onChange={(e) => updateCart(idx, { qty: Math.max(1, Number(e.target.value) || 1) })} />
                          <Button variant="outline" size="icon" className="h-9 w-9 rounded-l-none"
                            onClick={() => updateCart(idx, { qty: it.qty + 1 })}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div>
                        <Label className="text-[10px] uppercase text-muted-foreground">
                          {lang === "bn" ? "মূল্য" : "Price"}
                          {it.is_bulk ? (
                            <span className="ml-1 rounded bg-primary/10 px-1 py-0.5 text-[9px] font-semibold text-primary">
                              [{lang === "bn" ? "বাল্ক রেট" : "Bulk Rate"}]
                            </span>
                          ) : null}
                        </Label>
                        <Input type="number" value={it.price} className="h-9"
                          onChange={(e) => updateCart(idx, { price: Number(e.target.value) || 0 })} />
                      </div>
                      <div>
                        <Label className="text-[10px] uppercase text-muted-foreground">{lang === "bn" ? "মোট" : "Total"}</Label>
                        <div className="flex h-9 items-center justify-end rounded-md border bg-muted/30 px-2 text-sm font-semibold">
                          {fmtMoney(it.qty * it.price, lang)}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Totals */}
          <div className="space-y-2 border-t p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{lang === "bn" ? "মোট" : "Subtotal"}</span>
              <span className="font-semibold">{fmtMoney(subtotal, lang)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">{lang === "bn" ? "ডিসকাউন্ট" : "Discount"}</span>
              <Input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} className="h-8 w-28 text-right" />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">{lang === "bn" ? "ডেলিভারি" : "Delivery"}</span>
              <Input type="number" value={delivery} onChange={(e) => setDelivery(e.target.value)} className="h-8 w-28 text-right" />
            </div>
            <div className="flex items-center justify-between border-t pt-2">
              <span className="text-base font-semibold">{lang === "bn" ? "সর্বমোট" : "Grand total"}</span>
              <span className="text-lg font-extrabold text-primary">{fmtMoney(grandTotal, lang)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 p-3">
            <Button
              variant="outline"
              className="h-12 border-emerald-500 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:hover:bg-emerald-950"
              disabled={cart.length === 0}
              onClick={() => setCashOpen(true)}
            >
              {lang === "bn" ? "নগদ টাকা →" : "Cash →"}
            </Button>
            <Button
              className="h-12 bg-amber-500 text-white hover:bg-amber-600"
              disabled={cart.length === 0}
              onClick={() => setDueOpen(true)}
            >
              {lang === "bn" ? "বাকি →" : "Due →"}
            </Button>
          </div>
        </div>
      </div>

      <QuickAddProductDialog
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        onAdded={(p) => { void loadProducts(); addToCart(p); }}
      />

      <SerialPickDialog
        open={serialPick !== null}
        onOpenChange={(v) => { if (!v) setSerialPick(null); }}
        productId={serialPick?.id ?? null}
        productName={serialPick?.name ?? ""}
        excludeSerialIds={cart.map((c) => c.serial_id).filter((x): x is string => !!x)}
        onPicked={(s) => {
          if (!serialPick) return;
          const p = serialPick;
          const base = Number(p.sale_price);
          setCart((prev) => [...prev, {
            product_id: p.id,
            name: `${p.name} • ${s.serial_no}`,
            qty: 1,
            price: base,
            sale_price: base,
            is_serialized: true,
            serial_id: s.id,
            serial_no: s.serial_no,
          }]);
          setSerialPick(null);
          toast.success(p.name + " • " + s.serial_no, { duration: 1200 });
        }}
      />

      <PaymentDialog
        open={cashOpen}
        onClose={() => setCashOpen(false)}
        mode={mode}
        kind="cash"
        cart={cart}
        subtotal={subtotal}
        discount={Number(discount) || 0}
        delivery={Number(delivery) || 0}
        grandTotal={grandTotal}
        onSaved={(inv) => { clearCart(); setCashOpen(false); void loadProducts(); if (inv) setInvoice(inv); }}
      />
      <PaymentDialog
        open={dueOpen}
        onClose={() => setDueOpen(false)}
        mode={mode}
        kind="due"
        cart={cart}
        subtotal={subtotal}
        discount={Number(discount) || 0}
        delivery={Number(delivery) || 0}
        grandTotal={grandTotal}
        partyLabelBn={partyLabelBn}
        partyLabelEn={partyLabelEn}
        onSaved={(inv) => { clearCart(); setDueOpen(false); void loadProducts(); if (inv) setInvoice(inv); }}
      />
      <InvoiceDialog
        open={!!invoice}
        onClose={() => {
          setInvoice(null);
          // After completing a transaction and closing the invoice, return to dashboard.
          nav({ to: "/app/dashboard" });
        }}
        data={invoice}
      />
    </div>
  );
}

function QuickAddProductDialog({
  open, onClose, onAdded,
}: { open: boolean; onClose: () => void; onAdded: (p: Product) => void }) {
  const { lang } = useI18n();
  const { current } = useShop();
  const [name, setName] = useState("");
  const [salePrice, setSalePrice] = useState("0");
  const [costPrice, setCostPrice] = useState("0");
  const [stock, setStock] = useState("0");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!open) { setName(""); setSalePrice("0"); setCostPrice("0"); setStock("0"); } }, [open]);

  const save = async () => {
    if (!current || !name.trim()) { toast.error(lang === "bn" ? "নাম দিন" : "Enter a name"); return; }
    setSaving(true);
    const { data, error } = await supabase
      .from("products")
      .insert({
        shop_id: current.id, name: name.trim(),
        sale_price: Number(salePrice) || 0,
        cost_price: Number(costPrice) || 0,
        stock: Number(stock) || 0,
        unit: "pcs",
      })
      .select("id,name,unit,cost_price,sale_price,stock,image_url")
      .single();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(lang === "bn" ? "যোগ হয়েছে" : "Added");
    onAdded(data as Product);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{lang === "bn" ? "দ্রুত পণ্য যোগ" : "Quick add product"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>{lang === "bn" ? "পণ্যের নাম" : "Product name"}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>{lang === "bn" ? "বিক্রয় মূল্য" : "Sale price"}</Label>
              <Input type="number" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>{lang === "bn" ? "ক্রয় মূল্য" : "Cost price"}</Label>
              <Input type="number" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>{lang === "bn" ? "মজুদ" : "Stock"}</Label>
            <Input type="number" value={stock} onChange={(e) => setStock(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{lang === "bn" ? "বাতিল" : "Cancel"}</Button>
          <Button onClick={save} disabled={saving}>{lang === "bn" ? "সেভ" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PaymentDialog(props: {
  open: boolean; onClose: () => void;
  mode: Mode; kind: "cash" | "due";
  cart: CartItem[]; subtotal: number; discount: number; delivery: number; grandTotal: number;
  partyLabelBn?: string; partyLabelEn?: string;
  onSaved: (invoice?: InvoiceData) => void;
}) {
  const { lang } = useI18n();
  const { current } = useShop();
  const { user } = useAuth();
  const isSell = props.mode === "sell";
  const isCash = props.kind === "cash";

  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [paid, setPaid] = useState<string>(String(props.grandTotal));
  const [comment, setComment] = useState("");
  const [partyName, setPartyName] = useState("");
  const [partyPhone, setPartyPhone] = useState("");
  const [partyAddress, setPartyAddress] = useState("");
  const [customInvoice, setCustomInvoice] = useState(false);
  const [invoiceNo, setInvoiceNo] = useState("");
  const [staffInfo, setStaffInfo] = useState(false);
  const [staffNote, setStaffNote] = useState("");
  const [sendMessage, setSendMessage] = useState(false);
  const [partyTab, setPartyTab] = useState<"customer" | "supplier">(isSell ? "customer" : "supplier");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (props.open) {
      setDate(new Date().toISOString().slice(0, 10));
      setPaid(String(props.grandTotal));
      setComment(""); setPartyName(""); setPartyPhone(""); setPartyAddress("");
      setCustomInvoice(false); setInvoiceNo(""); setStaffInfo(false); setStaffNote("");
      setSendMessage(false);
      setPartyTab(isSell ? "customer" : "supplier");
    }
  }, [props.open, props.grandTotal, isSell]);

  // Load contacts when picker opens or party tab changes
  useEffect(() => {
    if (!props.open || !current) return;
    const table = partyTab === "customer" ? "customers" : "suppliers";
    void supabase
      .from(table)
      .select("id,name,phone,address")
      .eq("shop_id", current.id)
      .is("deleted_at", null)
      .order("name")
      .then(({ data }) => setContacts((data as Contact[]) ?? []));
  }, [props.open, current, partyTab]);

  const pickContact = (c: Contact) => {
    setPartyName(c.name);
    setPartyPhone(c.phone ?? "");
    setPartyAddress(c.address ?? "");
    setPickerOpen(false);
  };

  const save = async () => {
    if (!current || !user) return;
    if (props.cart.length === 0) { toast.error(lang === "bn" ? "কার্ট খালি" : "Cart is empty"); return; }
    setSaving(true);

    try {
      const paidNum = isCash ? props.grandTotal : (Number(paid) || 0);
      const dueNum = Math.max(0, props.grandTotal - paidNum);
      const createdAt = new Date(date).toISOString();
      const note = [comment, staffInfo ? staffNote : ""].filter(Boolean).join(" | ") || null;

      // Find or create contact (only for due, or when name provided)
      let contactId: string | null = null;
      const partyTable = isSell ? "customers" : "suppliers";
      if (!isCash || partyName.trim()) {
        if (partyName.trim()) {
          // try find by phone
          if (partyPhone.trim()) {
            const { data: found } = await supabase
              .from(partyTable)
              .select("id")
              .eq("shop_id", current.id)
              .eq("phone", partyPhone.trim())
              .is("deleted_at", null)
              .maybeSingle();
            if (found) contactId = (found as { id: string }).id;
          }
          if (!contactId) {
            const { data: created, error: e1 } = await supabase
              .from(partyTable)
              .insert({
                shop_id: current.id,
                name: partyName.trim(),
                phone: partyPhone.trim() || null,
                address: partyAddress.trim() || null,
              })
              .select("id")
              .single();
            if (e1) throw e1;
            contactId = (created as { id: string }).id;
          }
        }
      }

      if (isSell) {
        const { data: sale, error: eS } = await supabase
          .from("sales")
          .insert({
            shop_id: current.id,
            customer_id: contactId,
            subtotal: props.subtotal,
            discount: props.discount,
            tax: 0,
            total: props.grandTotal,
            paid: paidNum,
            due: dueNum,
            payment_method: "cash",
            status: "completed",
            note,
            invoice_no: customInvoice && invoiceNo.trim() ? invoiceNo.trim() : null,
            created_by: user.id,
            created_at: createdAt,
          })
          .select("id")
          .single();
        if (eS) throw eS;
        const saleId = (sale as { id: string }).id;

        const items = props.cart.map((c) => ({
          sale_id: saleId,
          product_id: c.item_type === "service" ? null : c.product_id,
          service_id: c.item_type === "service" ? (c.service_id ?? null) : null,
          item_type: c.item_type ?? "product",
          name: c.name,
          qty: c.qty, price: c.price, total: c.qty * c.price,
          serial_id: c.serial_id ?? null,
        }));
        const { error: eI } = await supabase.from("sale_items").insert(items);
        if (eI) throw eI;

        // Mark sold serials
        for (const c of props.cart) {
          if (c.serial_id) {
            await supabase.from("product_serials")
              .update({ status: "sold", sale_id: saleId })
              .eq("id", c.serial_id);
          }
        }

        // stock decrement + movements
        for (const c of props.cart) {
          if (c.item_type === "service" || !c.product_id) {
            // Service sale: register warranty if applicable, skip stock
            if (c.item_type === "service" && c.service_id && c.warranty_enabled && c.warranty_value && c.warranty_unit) {
              const now = new Date();
              const expires = new Date(now);
              if (c.warranty_unit === "days") expires.setDate(expires.getDate() + c.warranty_value * c.qty);
              else if (c.warranty_unit === "months") expires.setMonth(expires.getMonth() + c.warranty_value);
              else if (c.warranty_unit === "years") expires.setFullYear(expires.getFullYear() + c.warranty_value);
              await supabase.from("service_warranties").insert({
                shop_id: current.id,
                service_id: c.service_id,
                sale_id: saleId,
                customer_id: contactId,
                customer_name: partyName.trim() || null,
                customer_phone: partyPhone.trim() || null,
                starts_at: now.toISOString(),
                expires_at: expires.toISOString(),
                status: "active",
              });
            }
            continue;
          }
          await supabase.from("stock_movements").insert({
            shop_id: current.id, product_id: c.product_id,
            qty: c.qty, type: "out", ref_table: "sales", ref_id: saleId,
            note: "sale", created_by: user.id,
          });
          const { data: prod } = await supabase
            .from("products").select("stock").eq("id", c.product_id).single();
          if (prod) {
            await supabase.from("products")
              .update({ stock: Math.max(0, Number((prod as { stock: number }).stock) - c.qty) })
              .eq("id", c.product_id);
          }
        }

        if (paidNum > 0) {
          await supabase.from("cash_movements").insert({
            shop_id: current.id, direction: "in", amount: paidNum,
            note: `sale ${saleId}`, ref_table: "sales", ref_id: saleId, created_by: user.id,
          });
        }
        if (dueNum > 0 && contactId) {
          const { data: cur } = await supabase.from("customers").select("due_balance").eq("id", contactId).single();
          await supabase.from("customers")
            .update({ due_balance: Number((cur as { due_balance: number } | null)?.due_balance ?? 0) + dueNum })
            .eq("id", contactId);
        }
      } else {
        const { data: pur, error: eP } = await supabase
          .from("purchases")
          .insert({
            shop_id: current.id,
            supplier_id: contactId,
            subtotal: props.subtotal,
            discount: props.discount,
            total: props.grandTotal,
            paid: paidNum,
            due: dueNum,
            payment_method: "cash",
            note,
            invoice_no: customInvoice && invoiceNo.trim() ? invoiceNo.trim() : null,
            created_by: user.id,
            created_at: createdAt,
          })
          .select("id")
          .single();
        if (eP) throw eP;
        const purId = (pur as { id: string }).id;

        const items = props.cart.map((c) => ({
          purchase_id: purId, product_id: c.product_id ?? null, name: c.name,
          qty: c.qty, price: c.price, total: c.qty * c.price,
        }));
        const { error: eI } = await supabase.from("purchase_items").insert(items);
        if (eI) throw eI;

        for (const c of props.cart) {
          if (!c.product_id) continue;
          await supabase.from("stock_movements").insert({
            shop_id: current.id, product_id: c.product_id,
            qty: c.qty, type: "in", ref_table: "purchases", ref_id: purId,
            note: "purchase", created_by: user.id,
          });
          const { data: prod } = await supabase
            .from("products").select("stock").eq("id", c.product_id).single();
          if (prod) {
            await supabase.from("products")
              .update({ stock: Number((prod as { stock: number }).stock) + c.qty })
              .eq("id", c.product_id);
          }
        }

        if (paidNum > 0) {
          await supabase.from("cash_movements").insert({
            shop_id: current.id, direction: "out", amount: paidNum,
            note: `purchase ${purId}`, ref_table: "purchases", ref_id: purId, created_by: user.id,
          });
        }
        if (dueNum > 0 && contactId) {
          const { data: cur } = await supabase.from("suppliers").select("due_balance").eq("id", contactId).single();
          await supabase.from("suppliers")
            .update({ due_balance: Number((cur as { due_balance: number } | null)?.due_balance ?? 0) + dueNum })
            .eq("id", contactId);
        }
      }

      toast.success(lang === "bn" ? "সংরক্ষিত হয়েছে" : "Saved successfully");
      if (sendMessage) toast.message(lang === "bn" ? "মেসেজ পাঠানোর সুবিধা শীঘ্রই আসছে" : "SMS feature coming soon");
      // Build invoice for printable popup
      const finalInvoiceNo = (customInvoice && invoiceNo.trim())
        ? invoiceNo.trim()
        : (typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()
            : Math.random().toString(36).slice(2, 14).toUpperCase());
      const invoice: InvoiceData = {
        mode: props.mode,
        shop: {
          name: current.name,
          address: (current as { address?: string | null }).address ?? null,
          phone: (current as { phone?: string | null }).phone ?? null,
          logo_url: (current as { logo_url?: string | null }).logo_url ?? null,
        },
        party: { name: partyName.trim() || null, phone: partyPhone.trim() || null, address: partyAddress.trim() || null },
        invoiceNo: finalInvoiceNo,
        date: createdAt,
        items: props.cart.map((c) => ({ name: c.name, qty: c.qty, price: c.price, total: c.qty * c.price })),
        subtotal: props.subtotal,
        discount: props.discount,
        delivery: 0,
        grandTotal: props.grandTotal,
        paid: paidNum,
        previousDue: 0,
        currentDue: dueNum,
      };
      props.onSaved(invoice);
    } catch (e) {
      const err = e as { message?: string };
      toast.error(err.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const partyLabel = lang === "bn" ? (props.partyLabelBn ?? (isSell ? "কাস্টমার" : "সাপ্লায়ার")) : (props.partyLabelEn ?? (isSell ? "Customer" : "Supplier"));
  const titleBn = isCash ? "নগদ পেমেন্ট" : "বাকির এন্ট্রি";
  const titleEn = isCash ? "Confirm Payment" : (isSell ? "Money Received Entry" : "Money Given Entry");

  return (
    <Dialog open={props.open} onOpenChange={(o) => !o && props.onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-center text-lg font-bold">{lang === "bn" ? titleBn : titleEn}</DialogTitle>
        </DialogHeader>

        {!isCash && (
          <Tabs value={partyTab} onValueChange={(v) => setPartyTab(v as "customer" | "supplier")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="customer">{lang === "bn" ? "কাস্টমার" : "CUSTOMER"}</TabsTrigger>
              <TabsTrigger value="supplier">{lang === "bn" ? "সাপ্লায়ার" : "SUPPLIER"}</TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {!isCash && (
          <div className="rounded-md bg-muted/60 py-2.5 text-center text-base font-bold">
            {lang === "bn" ? "মোট প্রদেয় : " : "Total payable: "}{fmtMoney(props.grandTotal, lang)}
          </div>
        )}

        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>{isSell ? (lang === "bn" ? "বিক্রির তারিখঃ" : "Sale date") : (lang === "bn" ? "ক্রয়ের তারিখঃ" : "Purchase date")}</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>
                {isCash
                  ? (lang === "bn" ? "টাকার পরিমাণ" : "Amount")
                  : (isSell
                      ? (lang === "bn" ? "ক্যাশ পেয়েছি " : "Cash received ")
                      : (lang === "bn" ? "ক্যাশ দিয়েছি " : "Cash given "))}
                <span className="text-rose-500">*</span>
              </Label>
              <Input type="number" value={paid} onChange={(e) => setPaid(e.target.value)} disabled={isCash} />
            </div>
          </div>

          <div className="rounded-md bg-muted/40 p-2 text-sm">
            <div className="flex justify-between">
              <span>{lang === "bn" ? "মোট প্রদেয়" : "Total payable"}</span>
              <span className="font-semibold">{fmtMoney(props.grandTotal, lang)}</span>
            </div>
            {!isCash && (
              <div className="flex justify-between text-amber-600">
                <span>{lang === "bn" ? "বাকি থাকবে" : "Will remain due"}</span>
                <span className="font-semibold">{fmtMoney(Math.max(0, props.grandTotal - (Number(paid) || 0)), lang)}</span>
              </div>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label>{partyLabel} {lang === "bn" ? "নাম" : "name"}</Label>
            <div className="flex gap-2">
              <Input value={partyName} onChange={(e) => setPartyName(e.target.value)} placeholder={lang === "bn" ? "নাম লিখুন" : "Enter name"} />
              <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon" className="flex-none" aria-label="Pick contact">
                    <UserRound className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-0" align="end">
                  <Command>
                    <CommandInput placeholder={lang === "bn" ? "খুঁজুন..." : "Search..."} />
                    <CommandList>
                      <CommandEmpty>{lang === "bn" ? "কেউ নেই" : "Nobody found"}</CommandEmpty>
                      <CommandGroup>
                        {contacts.map((c) => (
                          <CommandItem key={c.id} value={c.name} onSelect={() => pickContact(c)}>
                            <div>
                              <div className="text-sm font-medium">{c.name}</div>
                              {c.phone && <div className="text-xs text-muted-foreground">{c.phone}</div>}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>{lang === "bn" ? "মোবাইল" : "Mobile"}</Label>
              <Input value={partyPhone} onChange={(e) => setPartyPhone(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>{lang === "bn" ? "ঠিকানা" : "Address"}</Label>
              <Input value={partyAddress} onChange={(e) => setPartyAddress(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>{lang === "bn" ? "মন্তব্য" : "Comment"}</Label>
            <Textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)} />
          </div>

          <div className="space-y-2 rounded-md border p-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">{lang === "bn" ? "কাস্টম ইনভয়েস নাম্বার" : "Custom invoice number"}</Label>
              <Switch checked={customInvoice} onCheckedChange={setCustomInvoice} />
            </div>
            {customInvoice && (
              <Input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} placeholder="INV-001" />
            )}
            <div className="flex items-center justify-between">
              <Label className="text-sm">{lang === "bn" ? "কর্মচারীর তথ্য" : "Staff info"}</Label>
              <Switch checked={staffInfo} onCheckedChange={setStaffInfo} />
            </div>
            {staffInfo && (
              <Input value={staffNote} onChange={(e) => setStaffNote(e.target.value)} placeholder={lang === "bn" ? "কর্মচারীর নাম" : "Staff name"} />
            )}
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-sm">
                <MessageSquare className="h-4 w-4" />
                {lang === "bn" ? "মেসেজ পাঠান" : "Send message"}
                <span className="text-xs text-muted-foreground">({lang === "bn" ? "SMS অবশিষ্ট: ৩০" : "SMS left: 30"})</span>
              </Label>
              <Switch checked={sendMessage} onCheckedChange={setSendMessage} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={props.onClose}>{lang === "bn" ? "বাতিল" : "Cancel"}</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? (lang === "bn" ? "সংরক্ষণ হচ্ছে..." : "Saving...") : (isCash ? (lang === "bn" ? "টাকা পেয়েছেন" : "Confirm payment") : (isSell ? (lang === "bn" ? "বিক্রি করুন" : "Sell now") : (lang === "bn" ? "সেভ করুন" : "Save")))}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
