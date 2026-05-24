import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Minus, X, Package, ShoppingCart, ChevronDown, MessageSquare, RefreshCw, Search, UserRound, LayoutGrid, List as ListIcon, RotateCcw } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useNavigate } from "@/lib/router";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/lib/shop";
import { useAuth } from "@/lib/auth";
import { useI18n, fmtMoney, bnNum } from "@/lib/i18n";
import { productsLiteQuery } from "@/lib/queries";
import { servicesLiteQuery, durationToText, type Service } from "@/lib/services-queries";
import { writeWithOffline } from "@/lib/useOfflineWrite";
import { readCache } from "@/lib/offlineCache";
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
  const { lang, t } = useI18n();
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

  // Screen tier (mobile / tablet / desktop) for per-tier grid column preset
  const [tier, setTier] = useState<"mobile" | "tablet" | "desktop">(() => {
    if (typeof window === "undefined") return "desktop";
    const w = window.innerWidth;
    return w < 768 ? "mobile" : w < 1024 ? "tablet" : "desktop";
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => {
      const w = window.innerWidth;
      setTier(w < 768 ? "mobile" : w < 1024 ? "tablet" : "desktop");
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const defaultCols = { mobile: 3, tablet: 4, desktop: 7 } as const;
  const [colsByTier, setColsByTier] = useState<{ mobile: number; tablet: number; desktop: number }>(() => {
    if (typeof window === "undefined") return { ...defaultCols };
    try {
      const raw = localStorage.getItem("pos-grid-cols");
      if (raw) return { ...defaultCols, ...JSON.parse(raw) };
    } catch { /* ignore */ }
    return { ...defaultCols };
  });
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("pos-grid-cols", JSON.stringify(colsByTier));
  }, [colsByTier]);
  const cols = colsByTier[tier];
  const setCols = (n: number) => setColsByTier((prev) => ({ ...prev, [tier]: n }));
  const resetCols = () => setColsByTier((prev) => ({ ...prev, [tier]: defaultCols[tier] }));

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
      toast.success(t("p2c_addedX", { name: match.name }));
    } else {
      setSearch(c);
      toast.error(t("p2c_noBarcode"));
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
    // Stock guard (sell mode, store products only)
    if (isSell && p.id) {
      const inCartQty = cart.find((c) => c.product_id === p.id)?.qty ?? 0;
      const stock = Number(p.stock) || 0;
      if (stock <= 0) {
        toast.error(t("p2c_outAddFirst"));
        return;
      }
      if (inCartQty + 1 > stock) {
        toast.error(t("p2c_onlyNStock", { n: lang === "bn" ? bnNum(stock) : stock }));
        return;
      }
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
      (alreadyInCart ? t("p2c_qtyIncreasedX", { name: p.name }) : t("p2c_addedToCartX", { name: p.name })),
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
          // Stock cap (sell mode, store products only)
          if (isSell && merged.product_id) {
            const prod = products.find((pp) => pp.id === merged.product_id);
            const stock = Number(prod?.stock ?? 0);
            if (stock > 0 && merged.qty > stock) {
              toast.error(t("p2c_onlyNStock", { n: lang === "bn" ? bnNum(stock) : stock }));
              merged.qty = stock;
            } else if (stock <= 0) {
              toast.error(t("p2c_outOfStock"));
              merged.qty = 0;
            }
          }
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
    <div className="w-full px-3 py-3 xl:px-5">
      <div className="mb-1 text-xs text-muted-foreground">{titleEn}</div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => nav({ to: "/app/dashboard" })}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-extrabold md:text-2xl">{lang === "bn" ? titleBn : titleEn}</h1>
        </div>
        <div className="inline-flex rounded-full border bg-card p-0.5 shadow-sm">
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`flex h-7 w-9 items-center justify-center rounded-full transition-colors ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
            aria-label="Grid view"
            title={t("p2c_gridView")}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`flex h-7 w-9 items-center justify-center rounded-full transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
            aria-label="List view"
            title={t("p2c_listView")}
          >
            <ListIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Mobile/Tablet tabs */}
      <div className="mb-3 lg:hidden">
        <Tabs value={mobileTab} onValueChange={(v) => setMobileTab(v as "products" | "cart")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="products">
              {t("p2c_products")}
            </TabsTrigger>
            <TabsTrigger value="cart">
              {t("p2c_cart")} ({lang === "bn" ? bnNum(cart.length) : cart.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Top stat strip — colored pills like reference */}
      <div className="mb-3 hidden gap-2 lg:grid lg:grid-cols-3">
        <div className="rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 px-4 py-3 ring-1 ring-primary/20">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-primary/80">
            {t("p2c_cart")}
          </div>
          <div className="mt-0.5 text-2xl font-extrabold tabular-nums text-primary">
            {fmtMoney(subtotal, lang)}
          </div>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-amber-200/60 to-amber-100/30 px-4 py-3 ring-1 ring-amber-300/50 dark:from-amber-500/15 dark:to-amber-500/5 dark:ring-amber-400/30">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-900/80 dark:text-amber-200/90">
            {t("p2c_selectedItemsN", { n: "" }).replace(/\s*\(\)\s*/, "")}
          </div>
          <div className="mt-0.5 text-2xl font-extrabold tabular-nums text-amber-900 dark:text-amber-100">
            {lang === "bn" ? bnNum(cart.reduce((s, it) => s + it.qty, 0)) : cart.reduce((s, it) => s + it.qty, 0)}
          </div>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-emerald-200/60 to-emerald-100/30 px-4 py-3 ring-1 ring-emerald-300/50 dark:from-emerald-500/15 dark:to-emerald-500/5 dark:ring-emerald-400/30">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-900/80 dark:text-emerald-200/90">
            {lang === "bn" ? "লেনদেন" : "Lines"}
          </div>
          <div className="mt-0.5 text-2xl font-extrabold tabular-nums text-emerald-900 dark:text-emerald-100">
            {lang === "bn" ? bnNum(cart.length) : cart.length}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        {/* Product picker */}
        <div className={`rounded-xl border bg-card lg:col-span-8 ${mobileTab === "cart" ? "hidden lg:block" : ""}`}>
          <div className="flex items-center justify-between border-b p-3">
            <div className="text-sm font-semibold">
              {t("p2c_select")}
            </div>
            {isSell && services.length > 0 && (
              <Tabs value={pickerTab} onValueChange={(v) => setPickerTab(v as "products" | "services")}>
                <TabsList className="h-8">
                  <TabsTrigger value="products" className="text-xs px-3">{t("p2c_products")}</TabsTrigger>
                  <TabsTrigger value="services" className="text-xs px-3">{t("p2c_services")}</TabsTrigger>
                </TabsList>
              </Tabs>
            )}
          </div>
          {pickerTab === "services" && isSell ? (
            <div className="p-3">
              <div className="relative mb-3">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("p2c_searchService")} className="h-10 pl-9" />
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
                          toast.success(`${s.name} ${t("p2c_addedLower")}`, { duration: 1000 });
                        }}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </li>
                    );
                  })}
                  {services.length === 0 && <li className="py-8 text-center text-sm text-muted-foreground">{t("p2c_noServices")}</li>}
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
                placeholder={t("p2c_searchProduct")}
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
              <EmptyState icon={<Package className="h-6 w-6" />} title={t("p2c_noProducts")} />
            ) : viewMode === "grid" ? (
              <>
              <div className="mb-2 flex items-center gap-2 rounded-md border bg-muted/30 px-2 py-1.5">
                <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                  {lang === "bn" ? (tier === "mobile" ? "মোবাইল" : tier === "tablet" ? "ট্যাবলেট" : "ডেস্কটপ") : tier}
                </span>
                <Slider
                  value={[cols]}
                  min={2}
                  max={tier === "desktop" ? 12 : tier === "tablet" ? 8 : 6}
                  step={1}
                  onValueChange={(v) => setCols(v[0] ?? cols)}
                  className="flex-1"
                />
                <span className="w-6 text-center text-xs font-bold tabular-nums">{lang === "bn" ? bnNum(cols) : cols}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={resetCols} title={t("p2c_reset")}>
                  <RotateCcw className="h-3 w-3" />
                </Button>
              </div>
              <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
                {filtered.slice(0, 200).map((p) => {
                  const inCart = cart.find((c) => c.product_id === p.id);
                  const price = isSell ? Number(p.sale_price) : Number(p.cost_price);
                  const outOfStock = isSell && Number(p.stock) <= 0;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addToCart(p)}
                      disabled={outOfStock}
                      className={`group relative flex flex-col overflow-hidden rounded-xl border bg-card text-center shadow-sm transition-all hover:shadow-md ${inCart ? "ring-2 ring-primary bg-primary/5" : ""} ${outOfStock ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <div className="relative aspect-square w-full overflow-hidden bg-muted/30">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
                            <Package className="h-6 w-6" />
                          </div>
                        )}
                        {inCart && (
                          <span className="absolute left-1 top-1 rounded-full bg-primary px-1 py-px text-[9px] font-bold text-primary-foreground shadow">
                            ×{inCart.qty}
                          </span>
                        )}
                        <span className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow ring-1 ring-background transition-transform group-hover:scale-110">
                          <Plus className="h-3 w-3" strokeWidth={3} />
                        </span>
                      </div>
                      <div className="flex flex-1 flex-col items-center px-2 py-2">
                        <div className="line-clamp-2 min-h-[2.2em] text-[11px] font-medium leading-tight text-foreground">
                          {p.name}
                        </div>
                        <div className="mt-1 text-sm font-extrabold leading-none text-primary tabular-nums">
                          {fmtMoney(price, lang)}
                          {p.unit && <span className="ml-0.5 text-[9px] font-normal text-muted-foreground">/{p.unit}</span>}
                        </div>
                        <div className="mt-1 text-[10px] text-muted-foreground">
                          {t("p2c_stock")}:{" "}
                          <span className={p.stock <= 0 ? "font-semibold text-destructive" : "font-medium text-foreground/70"}>
                            {p.stock}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              </>
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
                        {t("p2c_priceColon")} {fmtMoney(isSell ? Number(p.sale_price) : Number(p.cost_price), lang)}
                        <span className="mx-1">·</span>
                        {t("p2c_stockColon")} {lang === "bn" ? bnNum(p.stock) : p.stock}
                      </div>
                    </div>
                    <div className="flex">
                      <Button size="sm" className="rounded-r-none px-3" onClick={() => addToCart(p)} disabled={isSell && Number(p.stock) <= 0} aria-label={t("p2c_add")}>
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
                            {t("p2c_add1")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { addToCart(p); addToCart(p); }}>
                            {t("p2c_add2")}
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
        <div className={`rounded-xl border bg-card lg:col-span-4 ${mobileTab === "products" ? "hidden lg:block" : ""}`}>
          <div className="flex items-center justify-between border-b p-3">
            <div className="text-sm font-semibold">
              {t("p2c_selectedItemsN", { n: lang === "bn" ? bnNum(cart.length) : cart.length })}
            </div>
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearCart}>
                {t("p2c_clearCart")}
              </Button>
            )}
          </div>
          <div className="max-h-[50vh] overflow-y-auto p-3">
            {cart.length === 0 ? (
              <EmptyState icon={<ShoppingCart className="h-6 w-6" />} title={t("p2c_cartEmpty")} />
            ) : (
              <table className="w-full text-xs">
                <thead className="text-[10px] uppercase text-muted-foreground">
                  <tr className="border-b">
                    <th className="w-6 py-1 text-left font-medium">#</th>
                    <th className="py-1 text-left font-medium">{t("p2c_item")}</th>
                    <th className="w-16 py-1 text-right font-medium">{t("p2c_price")}</th>
                    <th className="w-14 py-1 text-center font-medium">{t("p2c_qty")}</th>
                    <th className="w-16 py-1 text-right font-medium">{t("p2c_total")}</th>
                    <th className="w-7" />
                  </tr>
                </thead>
                <tbody>
                  {cart.map((it, idx) => (
                    <tr key={idx} className="border-b align-middle">
                      <td className="py-1 text-muted-foreground">{lang === "bn" ? bnNum(idx + 1) : idx + 1}</td>
                      <td className="py-1 pr-1">
                        <div className="line-clamp-2 break-words font-medium leading-tight">{it.name}</div>
                        {it.is_bulk && (
                          <span className="text-[9px] font-semibold text-primary">[{t("p2c_bulk")}]</span>
                        )}
                      </td>
                      <td className="py-1">
                        <Input type="number" value={it.price}
                          className="h-7 w-full px-1 text-right text-xs"
                          onChange={(e) => updateCart(idx, { price: Number(e.target.value) || 0 })} />
                      </td>
                      <td className="py-1">
                        <Input type="number" value={it.qty}
                          className="h-7 w-full px-1 text-center text-xs"
                          onChange={(e) => updateCart(idx, { qty: Math.max(1, Number(e.target.value) || 1) })} />
                      </td>
                      <td className="py-1 text-right font-semibold">{fmtMoney(it.qty * it.price, lang)}</td>
                      <td className="py-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeCart(idx)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Totals */}
          <div className="space-y-2 border-t p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("p2c_subtotal")}</span>
              <span className="font-semibold">{fmtMoney(subtotal, lang)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">{t("p2c_discount")}</span>
              <Input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} className="h-8 w-28 text-right" />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">{t("p2c_delivery")}</span>
              <Input type="number" value={delivery} onChange={(e) => setDelivery(e.target.value)} className="h-8 w-28 text-right" />
            </div>
            <div className="flex items-center justify-between border-t pt-2">
              <span className="text-base font-semibold">{t("p2c_grandTotal")}</span>
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
              {t("p2c_cashArrow")}
            </Button>
            <Button
              className="h-12 bg-amber-500 text-white hover:bg-amber-600"
              disabled={cart.length === 0}
              onClick={() => setDueOpen(true)}
            >
              {t("p2c_dueArrow")}
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
  const { lang, t } = useI18n();
  const { current } = useShop();
  const [name, setName] = useState("");
  const [salePrice, setSalePrice] = useState("0");
  const [costPrice, setCostPrice] = useState("0");
  const [stock, setStock] = useState("0");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!open) { setName(""); setSalePrice("0"); setCostPrice("0"); setStock("0"); } }, [open]);

  const save = async () => {
    if (!current || !name.trim()) { toast.error(t("p2c_enterName")); return; }
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
    toast.success(t("p2c_addedCap"));
    onAdded(data as Product);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("p2c_quickAddProduct")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>{t("p2c_productName")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>{t("p2c_salePrice")}</Label>
              <Input type="number" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>{t("p2c_costPrice")}</Label>
              <Input type="number" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>{t("p2c_stockA")}</Label>
            <Input type="number" value={stock} onChange={(e) => setStock(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{t("p2c_cancel")}</Button>
          <Button onClick={save} disabled={saving}>{t("p2c_save")}</Button>
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
  const { lang, t } = useI18n();
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
    if (props.cart.length === 0) { toast.error(t("p2c_cartEmpty")); return; }
    if (!partyName.trim()) { toast.error(t("p2c_nameRequired")); return; }
    if (!partyPhone.trim()) { toast.error(t("p2c_mobileRequired")); return; }
    setSaving(true);

    // ───────────────── Offline path ─────────────────
    // যখন network নেই, পুরো sale/purchase queue-এ গিয়ে stack হবে।
    // sale_id / purchase_id client-side এ generate, পরে flush হলে server এ যাবে।
    const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
    if (isOffline) {
      try {
        const paidNumO = isCash ? props.grandTotal : (Number(paid) || 0);
        const dueNumO = Math.max(0, props.grandTotal - paidNumO);
        const createdAtO = new Date(date).toISOString();
        const noteO = [comment, staffInfo ? staffNote : ""].filter(Boolean).join(" | ") || null;
        const partyTableO = isSell ? "customers" : "suppliers";

        // contact: try cache first, else generate id + queue insert
        let contactIdO: string | null = null;
        if (!isCash || partyName.trim()) {
          if (partyName.trim()) {
            if (partyPhone.trim()) {
              const cachedContacts = await readCache<Array<{ id: string; phone: string | null }>>(
                `${current.id}:contacts:${isSell ? "customer" : "supplier"}`,
              );
              const hit = cachedContacts?.find((c) => (c.phone ?? "") === partyPhone.trim());
              if (hit) contactIdO = hit.id;
            }
            if (!contactIdO) {
              contactIdO = crypto.randomUUID();
              await writeWithOffline({
                table: partyTableO,
                op: "insert",
                payload: {
                  id: contactIdO,
                  shop_id: current.id,
                  name: partyName.trim(),
                  phone: partyPhone.trim() || null,
                  address: partyAddress.trim() || null,
                },
              });
            }
          }
        }

        const txIdO = crypto.randomUUID();
        const prodCacheO = (await readCache<Array<{ id: string; stock: number }>>(`${current.id}:products-lite`)) ?? [];
        const stockMapO = new Map(prodCacheO.map((p) => [p.id, Number(p.stock || 0)]));

        if (isSell) {
          await writeWithOffline({
            table: "sales",
            op: "insert",
            payload: {
              id: txIdO,
              shop_id: current.id,
              customer_id: contactIdO,
              subtotal: props.subtotal,
              discount: props.discount,
              tax: 0,
              total: props.grandTotal,
              paid: paidNumO,
              due: dueNumO,
              payment_method: "cash",
              status: "completed",
              note: noteO,
              invoice_no: customInvoice && invoiceNo.trim() ? invoiceNo.trim() : null,
              created_by: user.id,
              created_at: createdAtO,
            },
          });

          const itemsO = props.cart.map((c) => ({
            sale_id: txIdO,
            product_id: c.item_type === "service" ? null : c.product_id,
            service_id: c.item_type === "service" ? (c.service_id ?? null) : null,
            item_type: c.item_type ?? "product",
            name: c.name,
            qty: c.qty,
            price: c.price,
            total: c.qty * c.price,
            serial_id: c.serial_id ?? null,
          }));
          await writeWithOffline({
            table: "sale_items",
            op: "insert",
            payload: itemsO as unknown as Record<string, unknown>,
          });

          for (const c of props.cart) {
            if ((c.item_type ?? "product") === "service" || !c.product_id) continue;
            await writeWithOffline({
              table: "stock_movements",
              op: "insert",
              payload: {
                shop_id: current.id,
                product_id: c.product_id,
                qty: c.qty,
                type: "out",
                ref_table: "sales",
                ref_id: txIdO,
                note: "sale",
                created_by: user.id,
              },
            });
            const cur = stockMapO.get(c.product_id) ?? 0;
            const next = Math.max(0, cur - c.qty);
            stockMapO.set(c.product_id, next);
            await writeWithOffline({
              table: "products",
              op: "update",
              payload: { set: { stock: next }, match: { id: c.product_id } },
            });
          }

          if (paidNumO > 0) {
            await writeWithOffline({
              table: "cash_movements",
              op: "insert",
              payload: {
                shop_id: current.id,
                direction: "in",
                amount: paidNumO,
                note: `sale ${txIdO}`,
                ref_table: "sales",
                ref_id: txIdO,
                created_by: user.id,
              },
            });
          }
          if (dueNumO > 0 && contactIdO) {
            const cCache = (await readCache<Array<{ id: string; due_balance: number | null }>>(`${current.id}:contacts:customer`)) ?? [];
            const curDue = Number(cCache.find((x) => x.id === contactIdO)?.due_balance ?? 0);
            await writeWithOffline({
              table: "customers",
              op: "update",
              payload: { set: { due_balance: curDue + dueNumO }, match: { id: contactIdO } },
            });
          }
        } else {
          await writeWithOffline({
            table: "purchases",
            op: "insert",
            payload: {
              id: txIdO,
              shop_id: current.id,
              supplier_id: contactIdO,
              subtotal: props.subtotal,
              discount: props.discount,
              total: props.grandTotal,
              paid: paidNumO,
              due: dueNumO,
              payment_method: "cash",
              note: noteO,
              invoice_no: customInvoice && invoiceNo.trim() ? invoiceNo.trim() : null,
              created_by: user.id,
              created_at: createdAtO,
            },
          });
          const itemsO = props.cart.map((c) => ({
            purchase_id: txIdO,
            product_id: c.product_id ?? null,
            name: c.name,
            qty: c.qty,
            price: c.price,
            total: c.qty * c.price,
          }));
          await writeWithOffline({
            table: "purchase_items",
            op: "insert",
            payload: itemsO as unknown as Record<string, unknown>,
          });
          for (const c of props.cart) {
            if (!c.product_id) continue;
            await writeWithOffline({
              table: "stock_movements",
              op: "insert",
              payload: {
                shop_id: current.id,
                product_id: c.product_id,
                qty: c.qty,
                type: "in",
                ref_table: "purchases",
                ref_id: txIdO,
                note: "purchase",
                created_by: user.id,
              },
            });
            const cur = stockMapO.get(c.product_id) ?? 0;
            const next = cur + c.qty;
            stockMapO.set(c.product_id, next);
            await writeWithOffline({
              table: "products",
              op: "update",
              payload: { set: { stock: next }, match: { id: c.product_id } },
            });
          }
          if (paidNumO > 0) {
            await writeWithOffline({
              table: "cash_movements",
              op: "insert",
              payload: {
                shop_id: current.id,
                direction: "out",
                amount: paidNumO,
                note: `purchase ${txIdO}`,
                ref_table: "purchases",
                ref_id: txIdO,
                created_by: user.id,
              },
            });
          }
          if (dueNumO > 0 && contactIdO) {
            const cCache = (await readCache<Array<{ id: string; due_balance: number | null }>>(`${current.id}:contacts:supplier`)) ?? [];
            const curDue = Number(cCache.find((x) => x.id === contactIdO)?.due_balance ?? 0);
            await writeWithOffline({
              table: "suppliers",
              op: "update",
              payload: { set: { due_balance: curDue + dueNumO }, match: { id: contactIdO } },
            });
          }
        }

        toast.success("📴 Offline সংরক্ষণ — online এ এলে cloud-এ auto-sync হবে");
        const finalInvoiceNoO = customInvoice && invoiceNo.trim()
          ? invoiceNo.trim()
          : txIdO.replace(/-/g, "").slice(0, 12).toUpperCase();
        const invoiceO: InvoiceData = {
          mode: props.mode,
          shop: {
            name: current.name,
            address: (current as { address?: string | null }).address ?? null,
            phone: (current as { phone?: string | null }).phone ?? null,
            logo_url: (current as { logo_url?: string | null }).logo_url ?? null,
          },
          party: { name: partyName.trim() || null, phone: partyPhone.trim() || null, address: partyAddress.trim() || null },
          invoiceNo: finalInvoiceNoO,
          date: createdAtO,
          items: props.cart.map((c) => ({ name: c.name, qty: c.qty, price: c.price, total: c.qty * c.price })),
          subtotal: props.subtotal,
          discount: props.discount,
          delivery: 0,
          grandTotal: props.grandTotal,
          paid: paidNumO,
          previousDue: 0,
          currentDue: dueNumO,
        };
        props.onSaved(invoiceO);
      } catch (e) {
        toast.error((e as Error).message ?? "Failed to save offline");
      } finally {
        setSaving(false);
      }
      return;
    }
    // ───────────────── End offline path ─────────────────

    try {
      // Stock guard for sales (race-safe: re-fetch latest stock)
      if (isSell) {
        const productIds = Array.from(new Set(
          props.cart
            .filter((c) => (c.item_type ?? "product") === "product" && c.product_id)
            .map((c) => c.product_id as string)
        ));
        if (productIds.length > 0) {
          const { data: stockRows } = await supabase
            .from("products")
            .select("id,name,stock")
            .in("id", productIds);
          const stockMap = new Map(
            ((stockRows as { id: string; name: string; stock: number }[]) ?? [])
              .map((r) => [r.id, r])
          );
          const aggregated = new Map<string, number>();
          for (const c of props.cart) {
            if ((c.item_type ?? "product") !== "product" || !c.product_id) continue;
            aggregated.set(c.product_id, (aggregated.get(c.product_id) ?? 0) + c.qty);
          }
          for (const [pid, qty] of aggregated) {
            const row = stockMap.get(pid);
            const stock = Number(row?.stock ?? 0);
            if (qty > stock) {
              toast.error(t("p2c_itemOnlyN", { name: row?.name ?? (t("p7_Item_3")), stock }));
              setSaving(false);
              return;
            }
          }
        }
      }

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

      toast.success(t("p2c_savedOk"));
      if (sendMessage) toast.message(t("p2c_smsSoon"));
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
      <DialogContent className="flex max-h-[90vh] max-w-lg flex-col overflow-hidden p-0">
        <DialogHeader>
          <DialogTitle className="border-b px-6 py-4 text-center text-lg font-bold">{lang === "bn" ? titleBn : titleEn}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {!isCash && (
          <Tabs value={partyTab} onValueChange={(v) => setPartyTab(v as "customer" | "supplier")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="customer">{t("p2c_customerCap")}</TabsTrigger>
              <TabsTrigger value="supplier">{t("p2c_supplierCap")}</TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {!isCash && (
          <div className="rounded-md bg-muted/60 py-2.5 text-center text-base font-bold">
            {t("p2c_totalPayableColon")}{fmtMoney(props.grandTotal, lang)}
          </div>
        )}

        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>{isSell ? (t("p2c_saleDate")) : (t("p2c_purchaseDate"))}</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>
                {isCash
                  ? (t("p2c_amount"))
                  : (isSell
                      ? (t("p2c_cashReceived"))
                      : (t("p2c_cashGiven")))}
                <span className="text-rose-500">*</span>
              </Label>
              <Input type="number" value={paid} onChange={(e) => setPaid(e.target.value)} disabled={isCash} />
            </div>
          </div>

          <div className="rounded-md bg-muted/40 p-2 text-sm">
            <div className="flex justify-between">
              <span>{t("p2c_totalPayable")}</span>
              <span className="font-semibold">{fmtMoney(props.grandTotal, lang)}</span>
            </div>
            {!isCash && (
              <div className="flex justify-between text-amber-600">
                <span>{t("p2c_willRemainDue")}</span>
                <span className="font-semibold">{fmtMoney(Math.max(0, props.grandTotal - (Number(paid) || 0)), lang)}</span>
              </div>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label>{partyLabel} {t("p2c_nameLower")}</Label>
            <div className="flex gap-2">
              <Input value={partyName} onChange={(e) => setPartyName(e.target.value)} placeholder={t("p2c_enterName2")} />
              <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon" className="flex-none" aria-label="Pick contact">
                    <UserRound className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-0" align="end">
                  <Command>
                    <CommandInput placeholder={t("p2c_searchDots")} />
                    <CommandList>
                      <CommandEmpty>{t("p2c_nobody")}</CommandEmpty>
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
              <Label>{t("p2c_mobile")}</Label>
              <Input value={partyPhone} onChange={(e) => setPartyPhone(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>{t("p2c_address")}</Label>
              <Input value={partyAddress} onChange={(e) => setPartyAddress(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>{t("p2c_comment")}</Label>
            <Textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)} />
          </div>

          <div className="space-y-2 rounded-md border p-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">{t("p2c_customInvoice")}</Label>
              <Switch checked={customInvoice} onCheckedChange={setCustomInvoice} />
            </div>
            {customInvoice && (
              <Input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} placeholder="INV-001" />
            )}
            <div className="flex items-center justify-between">
              <Label className="text-sm">{t("p2c_staffInfo")}</Label>
              <Switch checked={staffInfo} onCheckedChange={setStaffInfo} />
            </div>
            {staffInfo && (
              <Input value={staffNote} onChange={(e) => setStaffNote(e.target.value)} placeholder={t("p2c_staffName")} />
            )}
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-sm">
                <MessageSquare className="h-4 w-4" />
                {t("p2c_sendMessage")}
                <span className="text-xs text-muted-foreground">({t("p2c_smsLeft30")})</span>
              </Label>
              <Switch checked={sendMessage} onCheckedChange={setSendMessage} />
            </div>
          </div>
        </div>
        </div>

        <DialogFooter className="border-t px-6 py-3">
          <Button variant="ghost" onClick={props.onClose}>{t("p2c_cancel")}</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? (t("p2c_saving")) : (isCash ? (t("p2c_confirmPayment")) : (isSell ? (t("p2c_sellNow")) : (t("p2c_saveAction"))))}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
