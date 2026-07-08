import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Minus, X, Package, ShoppingCart, ChevronDown, MessageSquare, RefreshCw, Search, UserRound, LayoutGrid, List as ListIcon, RotateCcw, Trash2, ShoppingBag, CalendarClock, Hash, Banknote, CreditCard, Zap } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useNavigate } from "@/lib/router";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/lib/shop";
import { useAuth } from "@/lib/auth";
import { useI18n, fmtMoney, bnNum } from "@/lib/i18n";
import { useCostHide } from "@/lib/costHide";
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
  category_id?: string | null;
  track_stock?: boolean | null;
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
  line_discount_pct?: number;
  line_discount_amt?: number;
  line_discount_mode?: "pct" | "amt";
  unit_label?: string;
  // Purchase extras
  expiry_date?: string | null;
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
  const { hidden: costHidden } = useCostHide();
  const maskMoney = (v: number) => (costHidden ? "৳ ••••" : fmtMoney(v, lang));
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
  const [showOutOfStock, setShowOutOfStock] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string | "all">("all");
  const [categories, setCategories] = useState<Array<{ id: string; name: string; parent_id: string | null }>>([]);
  const [quickStockProduct, setQuickStockProduct] = useState<Product | null>(null);
  const [walkIn, setWalkIn] = useState(true);

  // Load shop categories for the picker dropdown
  useEffect(() => {
    if (!current?.id) { setCategories([]); return; }
    void supabase
      .from("categories")
      .select("id,name,parent_id")
      .eq("shop_id", current.id)
      .order("name")
      .then(({ data }) => setCategories((data as Array<{ id: string; name: string; parent_id: string | null }>) ?? []));
  }, [current?.id]);

  // Realtime: when products change (stock update, new product), refresh the list automatically
  useEffect(() => {
    if (!current?.id) return;
    const channel = supabase
      .channel(`pos-products-${current.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products", filter: `shop_id=eq.${current.id}` },
        () => { void qc.invalidateQueries({ queryKey: ["products"] }); },
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [current?.id, qc]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState<string>("0");
  const [discountMode, setDiscountMode] = useState<"amt" | "pct">("amt");
  const [delivery, setDelivery] = useState<string>("0");
  const [quickOpen, setQuickOpen] = useState(false);
  const [othersOpen, setOthersOpen] = useState(false);
  const [othersName, setOthersName] = useState("");
  const [othersPrice, setOthersPrice] = useState("");
  const [othersQty, setOthersQty] = useState("1");
  const [othersCost, setOthersCost] = useState("");
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
    // Cache-bust: remove cached query data so the offline cache layer can't return stale stock.
    qc.removeQueries({ queryKey: ["products"] });
    await qc.invalidateQueries({ queryKey: ["products"] });
    await refetch();
    toast.success(lang === "bn" ? "তালিকা আপডেট হয়েছে" : "List refreshed", { duration: 1200 });
  };

  const filtered = useMemo(() => {
    // Hide parent placeholder products — they're just grouping shells for variants.
    const parentIds = new Set(
      products
        .map((p) => (p as unknown as { parent_product_id?: string | null }).parent_product_id)
        .filter((x): x is string => !!x),
    );
    let visible = products.filter((p) => !parentIds.has(p.id));
    // Sell mode: hide out-of-stock by default unless "Show all" toggle is on.
    // When offline, cached stock may be stale (0) — don't hide products.
    const onlineForFilter = typeof navigator === "undefined" ? true : navigator.onLine;
    if (isSell && !showOutOfStock && onlineForFilter) {
      visible = visible.filter((p) => (p.track_stock === false) || Number(p.stock) > 0);
    }
    // Category filter (includes children when a parent is selected)
    if (categoryFilter !== "all") {
      const ids = new Set<string>([categoryFilter]);
      categories.forEach((c) => { if (c.parent_id === categoryFilter) ids.add(c.id); });
      visible = visible.filter((p) => p.category_id && ids.has(p.category_id));
    }
    const q = search.trim().toLowerCase();
    if (!q) return visible;
    return visible.filter((p) => {
      const vl = (p as unknown as { variant_label?: string | null }).variant_label ?? "";
      return p.name.toLowerCase().includes(q) || vl.toLowerCase().includes(q);
    });
  }, [products, search, isSell, showOutOfStock, categoryFilter, categories]);

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
    // Stock guard (sell mode, store products only).
    // Skip when product doesn't track stock, or when offline (cached stock
    // may be stale — don't block sales the user knows are valid).
    const onlineNow = typeof navigator === "undefined" ? true : navigator.onLine;
    if (isSell && p.id && p.track_stock !== false && onlineNow) {
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
        line_discount_mode: "amt",
        line_discount_amt: 0,
        line_discount_pct: 0,
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
          const onlineNow = typeof navigator === "undefined" ? true : navigator.onLine;
          if (isSell && merged.product_id && onlineNow) {
            const prod = products.find((pp) => pp.id === merged.product_id);
            if (prod?.track_stock === false) return applyBulkPricing(merged);
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
  const clearCart = () => { setCart([]); setDiscount("0"); setDelivery("0"); setDiscountMode("amt"); };

  const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

  const subtotal = round2(cart.reduce((s, it) => s + it.qty * it.price, 0));
  const lineDiscAmount = (it: CartItem) => {
    const gross = it.qty * it.price;
    if (it.line_discount_mode === "amt") {
      return Math.min(gross, Math.max(0, Number(it.line_discount_amt) || 0));
    }
    return gross * (Math.max(0, Math.min(100, Number(it.line_discount_pct) || 0)) / 100);
  };
  const lineTotal = (it: CartItem) => round2(Math.max(0, it.qty * it.price - lineDiscAmount(it)));
  const subtotalAfterLineDisc = round2(cart.reduce((s, it) => s + lineTotal(it), 0));
  const totalDiscValue = round2(
    discountMode === "pct"
      ? subtotalAfterLineDisc * (Number(discount) || 0) / 100
      : Number(discount) || 0,
  );
  const grandTotal = round2(Math.max(0, subtotalAfterLineDisc - totalDiscValue + (Number(delivery) || 0)));

  // Today's stats (sell or purchase mode)
  const todayKey = new Date().toISOString().slice(0, 10);
  const { data: todayStats } = useQuery({
    queryKey: ["pos-today-stats", current?.id, mode, todayKey],
    enabled: !!current?.id,
    queryFn: async () => {
      if (!current?.id) return { total: 0, items: 0, txns: 0 };
      const start = new Date(todayKey + "T00:00:00").toISOString();
      const table = mode === "sell" ? "sales" : "purchases";
      const itemsTable = mode === "sell" ? "sale_items" : "purchase_items";
      const fk = mode === "sell" ? "sale_id" : "purchase_id";
      const { data: txs } = await supabase
        .from(table)
        .select("id,total")
        .eq("shop_id", current.id)
        .is("deleted_at", null)
        .gte("created_at", start);
      const rows = (txs as { id: string; total: number }[]) ?? [];
      const total = rows.reduce((s, r) => s + Number(r.total || 0), 0);
      let items = 0;
      if (rows.length > 0) {
        const ids = rows.map((r) => r.id);
        const { data: its } = await supabase
          .from(itemsTable)
          .select("qty")
          .in(fk, ids);
        items = (((its as unknown) as { qty: number }[]) ?? []).reduce((s, r) => s + Number(r.qty || 0), 0);
      }
      return { total, items, txns: rows.length };
    },
  });

  // F1 → cash checkout, F2 → due (sell mode only)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (e.key === "F1") {
        e.preventDefault();
        if (cart.length > 0) setCashOpen(true);
      } else if (e.key === "F2") {
        e.preventDefault();
        if (cart.length > 0 && mode === "sell") setDueOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, discount, delivery, mode, lang]);

  const unitOptions = [
    { v: "piece", bn: "পিস", en: "Piece" },
    { v: "packet", bn: "প্যাকেট", en: "Packet" },
    { v: "bottle", bn: "বোতল", en: "Bottle" },
    { v: "can", bn: "ক্যান", en: "Can" },
    { v: "kg", bn: "কেজি", en: "Kg" },
    { v: "liter", bn: "লিটার", en: "Liter" },
    { v: "dozen", bn: "ডজন", en: "Dozen" },
  ];
  const unitLabel = (v?: string) => {
    const u = unitOptions.find((x) => x.v === v);
    if (!u) return v || (lang === "bn" ? "পিস" : "Piece");
    return lang === "bn" ? `${u.bn} (${u.en})` : `${u.en} (${u.bn})`;
  };

  const totalDiscPctDisplay = discountMode === "pct"
    ? (Number(discount) || 0)
    : (subtotalAfterLineDisc > 0
        ? Math.round((totalDiscValue / subtotalAfterLineDisc) * 100)
        : 0);

  return (
    <div className="w-full px-3 py-3 xl:px-5">
      {/* ───── Top header bar (reference image style) ───── */}
      <div className="mb-3 flex flex-wrap items-center gap-3 rounded-2xl border bg-card px-3 py-2 shadow-sm">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => nav({ to: "/app/dashboard" })}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
            <ShoppingBag className="h-4 w-4" strokeWidth={2.5} />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold">{lang === "bn" ? (isSell ? "POS সিস্টেম" : "ক্রয় সিস্টেম") : (isSell ? "POS System" : "Purchase System")}</div>
            <div className="text-[10px] text-muted-foreground">{lang === "bn" ? "পয়েন্ট অফ সেল" : "Point of Sale"}</div>
          </div>
        </div>

        {/* Center stats — hide on mobile to keep header compact */}
        <div className="ml-auto hidden flex-wrap items-center gap-2 md:flex">
          <div className="rounded-xl bg-primary/10 px-3 py-1.5 text-center ring-1 ring-primary/20">
            <div className="text-[10px] font-semibold text-primary/80">{lang === "bn" ? (isSell ? "আজকের বিক্রয়" : "আজকের ক্রয়") : (isSell ? "Today's Sales" : "Today's Purchase")}</div>
            <div className="text-sm font-extrabold tabular-nums text-primary">{fmtMoney(todayStats?.total ?? 0, lang)}</div>
          </div>
          <div className="rounded-xl bg-amber-100 px-3 py-1.5 text-center ring-1 ring-amber-200 dark:bg-amber-500/15 dark:ring-amber-400/30">
            <div className="text-[10px] font-semibold text-amber-800 dark:text-amber-200">{lang === "bn" ? "আইটেম বিক্রি" : "Items Sold"}</div>
            <div className="text-sm font-extrabold tabular-nums text-amber-900 dark:text-amber-100">{todayStats?.items ?? 0}</div>
          </div>
          <div className="rounded-xl bg-emerald-100 px-3 py-1.5 text-center ring-1 ring-emerald-200 dark:bg-emerald-500/15 dark:ring-emerald-400/30">
            <div className="text-[10px] font-semibold text-emerald-800 dark:text-emerald-200">{lang === "bn" ? "লেনদেন" : "Txns"}</div>
            <div className="text-sm font-extrabold tabular-nums text-emerald-900 dark:text-emerald-100">{todayStats?.txns ?? 0}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden text-right md:block">
            <div className="text-xs font-semibold">{user?.email?.split("@")[0] ?? "User"}</div>
            <div className="text-[10px] text-muted-foreground">{current?.name ?? ""}</div>
          </div>
        </div>
      </div>

      {/* Mobile/Tablet tabs */}
      <div className="mb-3 lg:hidden">
        <Tabs value={mobileTab} onValueChange={(v) => setMobileTab(v as "products" | "cart")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="products">{t("p2c_products")}</TabsTrigger>
            <TabsTrigger value="cart">{t("p2c_cart")} ({cart.length})</TabsTrigger>
          </TabsList>
        </Tabs>
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
          <div className="space-y-2 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={lang === "bn" ? "পণ্যের নাম, SKU বা বারকোড লিখুন (এন্টার চাপুন)..." : "Search product name, SKU or barcode..."}
                  className="h-10 pl-9"
                />
              </div>
              <BarcodeScannerButton onDetected={handleScannedCode} className="h-10 px-3 flex-none" label={lang === "bn" ? "বারকোড / SKU" : "Barcode / SKU"} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="h-10 inline-flex items-center gap-1 rounded-md border bg-background px-3 text-xs font-medium text-foreground/80 hover:bg-accent"
                  >
                    {categoryFilter === "all"
                      ? (lang === "bn" ? "সব ক্যাটাগরি" : "All Categories")
                      : (categories.find((c) => c.id === categoryFilter)?.name ?? (lang === "bn" ? "ক্যাটাগরি" : "Category"))}
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto w-56">
                  <DropdownMenuItem onClick={() => setCategoryFilter("all")}>
                    {lang === "bn" ? "সব ক্যাটাগরি" : "All Categories"}
                  </DropdownMenuItem>
                  {categories.filter((c) => !c.parent_id).map((parent) => {
                    const subs = categories.filter((c) => c.parent_id === parent.id);
                    return (
                      <div key={parent.id}>
                        <DropdownMenuItem onClick={() => setCategoryFilter(parent.id)} className="font-semibold">
                          {parent.name}
                        </DropdownMenuItem>
                        {subs.map((s) => (
                          <DropdownMenuItem key={s.id} onClick={() => setCategoryFilter(s.id)} className="pl-6 text-xs">
                            ↳ {s.name}
                          </DropdownMenuItem>
                        ))}
                      </div>
                    );
                  })}
                  {categories.length === 0 && (
                    <div className="px-2 py-3 text-center text-xs text-muted-foreground">
                      {lang === "bn" ? "কোনো ক্যাটাগরি নেই" : "No categories"}
                    </div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              {isSell && (
                <label className="inline-flex h-10 items-center gap-2 rounded-md border bg-background px-3 text-xs font-medium text-foreground/80">
                  <Switch checked={showOutOfStock} onCheckedChange={setShowOutOfStock} />
                  {lang === "bn" ? "স্টক ছাড়াও দেখাও" : "Show out of stock"}
                </label>
              )}
              <Button size="icon" variant="outline" className="h-10 w-10 flex-none" onClick={() => setQuickOpen(true)} aria-label="Quick add" title={lang === "bn" ? "দ্রুত যোগ" : "Quick add"}>
                <Plus className="h-4 w-4" />
              </Button>
              {isSell && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-10 flex-none gap-1 px-2 text-xs font-semibold"
                  onClick={() => nav({ to: "/app/quick-order" })}
                  title={lang === "bn" ? "দ্রুত বিক্রি" : "Quick sell"}
                >
                  <Zap className="h-3.5 w-3.5" />
                  Quick
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="h-10 flex-none gap-1 px-2 text-xs font-semibold"
                onClick={() => { setOthersName(""); setOthersPrice(""); setOthersQty("1"); setOthersCost(""); setOthersOpen(true); }}
                title={lang === "bn" ? "আদার্স / দ্রুত বিক্রি" : "Others / Quick sell"}
              >
                <Package className="h-3.5 w-3.5" />
                {lang === "bn" ? "আদার্স" : "Others"}
              </Button>
              <Button variant="outline" size="icon" className="h-10 w-10 flex-none" onClick={loadProducts} aria-label="Refresh">
                <RefreshCw className="h-4 w-4" />
              </Button>
              <div className="ml-auto inline-flex rounded-full border bg-card p-0.5 shadow-sm">
                <button type="button" onClick={() => setViewMode("grid")}
                  className={`flex h-7 w-9 items-center justify-center rounded-full transition-colors ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}>
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => setViewMode("list")}
                  className={`flex h-7 w-9 items-center justify-center rounded-full transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}>
                  <ListIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            {/* F-key shortcut row — desktop only */}
            <div className="hidden flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-medium text-muted-foreground md:flex">
              <span><kbd className="rounded bg-muted px-1 py-px text-[10px]">F1</kbd>: {lang === "bn" ? "চেকআউট" : "Checkout"}</span>
              <span><kbd className="rounded bg-muted px-1 py-px text-[10px]">F2</kbd>: {lang === "bn" ? "বাকি" : "Due"}</span>
              <span><kbd className="rounded bg-muted px-1 py-px text-[10px]">F3</kbd>: {lang === "bn" ? "ড্রয়ার" : "Drawer"}</span>
              <span><kbd className="rounded bg-muted px-1 py-px text-[10px]">F4</kbd>: {lang === "bn" ? "আর্থ" : "Earn"}</span>
              <span><kbd className="rounded bg-muted px-1 py-px text-[10px]">F5</kbd>: {lang === "bn" ? "প্রিন্ট" : "Print"}</span>
            </div>
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
                      onClick={() => {
                        if (outOfStock) { setQuickStockProduct(p); return; }
                        addToCart(p);
                      }}
                      className={"group relative flex flex-col rounded-xl border bg-card p-2 shadow-sm transition hover:border-primary/40 hover:shadow-md " + (outOfStock ? "opacity-70" : "")}
                    >
                      {/* qty badge — top-left of whole card */}
                      {inCart && (
                        <span className="absolute left-1.5 top-1.5 z-10 rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground shadow ring-1 ring-background">
                          ×{lang === "bn" ? bnNum(inCart.qty) : inCart.qty}
                        </span>
                      )}
                      {/* + button — top-right of whole card */}
                      <span className="absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow ring-1 ring-background transition-transform group-hover:scale-110">
                        <Plus className="h-4 w-4" strokeWidth={3} />
                      </span>
                      <div className="relative mx-auto mt-3 h-16 w-16 overflow-hidden rounded-lg bg-muted/30">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
                            <Package className="h-6 w-6" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col items-center justify-center px-2 py-2">
                        <div className="line-clamp-1 text-sm font-semibold leading-tight text-foreground">
                          {p.name}
                        </div>
                        {((p as unknown as { variant_label?: string | null }).variant_label) && (
                          <div className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground">
                            {(p as unknown as { variant_label?: string | null }).variant_label}
                          </div>
                        )}
                        <div className="mt-1 text-lg font-extrabold leading-none text-primary tabular-nums">
                          {costHidden ? "৳ ••••" : `৳${Math.round(price)}`}
                        </div>
                        <div className="mt-1 text-[10px] text-muted-foreground">
                          {lang === "bn" ? "স্টক" : "Stock"}:{" "}
                          <span className={p.stock <= 0 ? "font-semibold text-destructive" : "font-medium text-foreground/70"}>
                            {p.stock} {p.unit || ""}
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
                      <Button size="sm" className="rounded-r-none px-3" onClick={() => {
                        if (isSell && Number(p.stock) <= 0) { setQuickStockProduct(p); return; }
                        addToCart(p);
                      }} aria-label={t("p2c_add")}>
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
          <div className="flex items-center justify-between border-b bg-primary/5 p-3">
            <div className="inline-flex items-center gap-2 text-sm font-bold text-primary">
              <ShoppingCart className="h-4 w-4" />
              {lang === "bn" ? "কার্ট" : "Cart"} ({cart.length})
            </div>
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearCart}>
                {lang === "bn" ? "খালি" : "Clear"}
              </Button>
            )}
          </div>
          <div className="max-h-[55vh] space-y-2 overflow-y-auto p-3">
            {cart.length === 0 ? (
              <EmptyState icon={<ShoppingCart className="h-6 w-6" />} title={t("p2c_cartEmpty")} />
            ) : (
              cart.map((it, idx) => {
                const prod = it.product_id ? products.find((p) => p.id === it.product_id) : null;
                const lt = lineTotal(it);
                 return (
                   <div key={idx} className={isSell ? "rounded-xl border bg-card p-2.5 shadow-sm" : "border-b border-border/60 px-2 py-2 last:border-0"}>
                    {/* Header row */}
                    <div className="flex items-start gap-2">
                      <div className="flex h-10 w-10 flex-none items-center justify-center overflow-hidden rounded-md bg-muted">
                        {prod?.image_url ? (
                          <img src={prod.image_url} alt={it.name} className="h-full w-full object-cover" />
                        ) : (
                          <Package className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="line-clamp-1 text-sm font-semibold leading-tight">
                          {it.name}
                          {(it.unit_label || prod?.unit) && (
                            <span className="ml-1 text-[10px] font-normal text-muted-foreground">· {it.unit_label || prod?.unit}</span>
                          )}
                        </div>
                        {(prod?.sku || prod?.barcode) && (
                          <div className="text-[10px] text-muted-foreground">SKU: {prod?.sku || prod?.barcode}</div>
                        )}
                      </div>
                      <button type="button" onClick={() => removeCart(idx)}
                        className="text-destructive/70 hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Purchase-only: editable cost price + expiry + serial */}
                    {!isSell && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground">{lang === "bn" ? "ক্রয়মূল্য" : "Cost"}</span>
                        <div className="inline-flex items-center rounded-md border bg-background">
                          <span className="px-1.5 text-[11px] text-muted-foreground">৳</span>
                          <input
                            type="number"
                            step="0.01"
                            value={costHidden ? "" : it.price}
                            placeholder={costHidden ? "••••" : undefined}
                            onChange={(e) => updateCart(idx, { price: Math.max(0, Number(e.target.value) || 0) })}
                            className="h-7 w-20 bg-transparent text-right text-[11px] font-semibold tabular-nums outline-none"
                          />
                        </div>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              title={lang === "bn" ? "মেয়াদ" : "Expiry"}
                              className={`inline-flex h-7 items-center gap-1 rounded-md border px-1.5 text-[10px] ${it.expiry_date ? "border-amber-400 bg-amber-50 text-amber-700" : "text-muted-foreground"}`}
                            >
                              <CalendarClock className="h-3.5 w-3.5" />
                              {it.expiry_date ? it.expiry_date : (lang === "bn" ? "মেয়াদ" : "Expiry")}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-2" align="start">
                            <div className="flex items-center gap-2">
                              <Input
                                type="date"
                                value={it.expiry_date ?? ""}
                                onChange={(e) => updateCart(idx, { expiry_date: e.target.value || null })}
                                className="h-8 w-40"
                              />
                              {it.expiry_date && (
                                <Button size="sm" variant="ghost" className="h-8 px-2 text-[11px]"
                                  onClick={() => updateCart(idx, { expiry_date: null })}>
                                  {lang === "bn" ? "মুছুন" : "Clear"}
                                </Button>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                        {prod?.is_serialized && (
                          <button
                            type="button"
                            title={lang === "bn" ? "সিরিয়াল" : "Serial"}
                            onClick={() => setSerialPick(prod)}
                            className={`inline-flex h-7 items-center gap-1 rounded-md border px-1.5 text-[10px] ${it.serial_no ? "border-primary/50 bg-primary/10 text-primary" : "text-muted-foreground"}`}
                          >
                            <Hash className="h-3.5 w-3.5" />
                            {it.serial_no ? it.serial_no : (lang === "bn" ? "সিরিয়াল" : "Serial")}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Discount only (mode toggle: % or ৳) */}
                    <div className="mt-1.5 flex items-center justify-end gap-1.5">
                      {lineDiscAmount(it) > 0 && (
                        <span className="text-[10px] font-semibold text-destructive tabular-nums">
                          −{maskMoney(round2(lineDiscAmount(it)))}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground">{lang === "bn" ? "ছাড়" : "Disc"}</span>
                      <Input
                        type="number"
                        value={(it.line_discount_mode === "amt" ? it.line_discount_amt : it.line_discount_pct) ?? 0}
                        className="h-7 w-20 text-right text-[11px] tabular-nums"
                        onChange={(e) => {
                          const raw = Number(e.target.value) || 0;
                          if (it.line_discount_mode === "amt") {
                            updateCart(idx, { line_discount_amt: Math.max(0, raw) });
                          } else {
                            updateCart(idx, { line_discount_pct: Math.max(0, Math.min(100, raw)) });
                          }
                        }}
                      />
                      <div className="inline-flex overflow-hidden rounded-md border text-[10px] font-bold">
                        <button type="button"
                          onClick={() => updateCart(idx, { line_discount_mode: "pct", line_discount_amt: 0 })}
                          className={`px-1.5 py-1 ${(it.line_discount_mode ?? "pct") === "pct" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"}`}>%</button>
                        <button type="button"
                          onClick={() => updateCart(idx, { line_discount_mode: "amt", line_discount_pct: 0 })}
                          className={`px-1.5 py-1 ${it.line_discount_mode === "amt" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"}`}>৳</button>
                      </div>
                    </div>

                    {/* Quick add + qty stepper + line total */}
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      {isSell ? (
                        <div className="inline-flex gap-1">
                          {[1, 2, 5].map((n) => (
                            <button key={n} type="button"
                              onClick={() => updateCart(idx, { qty: it.qty + n })}
                              className="rounded-md border bg-primary/10 px-1 py-0.5 text-[10px] font-bold text-primary hover:bg-primary/20">
                              +{n}
                            </button>
                          ))}
                        </div>
                      ) : <span />}
                      <div className="inline-flex items-center rounded-md border">
                        <button type="button" onClick={() => updateCart(idx, { qty: Math.max(1, it.qty - 1) })}
                          className="flex h-7 w-7 items-center justify-center text-muted-foreground hover:text-foreground">
                          <Minus className="h-3 w-3" />
                        </button>
                        <input type="number" value={it.qty}
                          onChange={(e) => updateCart(idx, { qty: Math.max(1, Number(e.target.value) || 1) })}
                          className="h-7 w-10 border-x bg-transparent text-center text-xs font-semibold tabular-nums outline-none" />
                        <button type="button" onClick={() => updateCart(idx, { qty: it.qty + 1 })}
                          className="flex h-7 w-7 items-center justify-center text-muted-foreground hover:text-foreground">
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="text-right">
                        <div className="text-[9px] uppercase text-muted-foreground">{lang === "bn" ? "মোট" : "Total"}</div>
                        <div className="text-sm font-extrabold tabular-nums text-primary">{maskMoney(lt)}</div>
                      </div>
                    </div>

                    {it.is_bulk && (
                      <div className="mt-1 text-[9px] font-semibold text-primary">[{t("p2c_bulk")} pricing applied]</div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Totals */}
          <div className="space-y-2 border-t p-3 text-sm">
            {/* Bulk-discount-all helper */}
            <div className="flex items-center justify-between gap-2 rounded-md bg-muted/30 px-2 py-1.5">
              <span className="text-[11px] text-muted-foreground">{lang === "bn" ? "সকল আইটেমে ডিসকাউন্ট একসাথে:" : "Discount all items:"}</span>
              <Button size="sm" variant="outline" className="h-6 text-[10px]"
                onClick={() => {
                  const v = window.prompt(lang === "bn" ? "ডিসকাউন্ট % (০-১০০)" : "Discount % (0-100)", "0");
                  if (v === null) return;
                  const pct = Math.max(0, Math.min(100, Number(v) || 0));
                  setCart((prev) => prev.map((it) => ({ ...it, line_discount_pct: pct })));
                }}>
                {lang === "bn" ? "প্রয়োগ করুন" : "Apply"}
              </Button>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">{lang === "bn" ? "ছাড়" : "Discount"}</span>
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  value={discount}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (discountMode === "pct") {
                      const n = Math.max(0, Math.min(100, Number(v) || 0));
                      setDiscount(String(n));
                    } else {
                      setDiscount(v);
                    }
                  }}
                  className="h-8 w-24 text-right" />
                <div className="inline-flex overflow-hidden rounded-md border text-[10px] font-bold">
                  <button type="button"
                    onClick={() => { setDiscountMode("pct"); setDiscount("0"); }}
                    className={`px-2 py-1 ${discountMode === "pct" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"}`}>%</button>
                  <button type="button"
                    onClick={() => { setDiscountMode("amt"); setDiscount("0"); }}
                    className={`px-2 py-1 ${discountMode === "amt" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"}`}>৳</button>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">{t("p2c_delivery")}</span>
              <Input type="number" value={delivery} onChange={(e) => setDelivery(e.target.value)} className="h-8 w-28 text-right" />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{lang === "bn" ? "সাবটোটাল" : "Subtotal"}</span>
              <span className="tabular-nums">{maskMoney(subtotalAfterLineDisc)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{lang === "bn" ? "ছাড়" : "Discount"} ({totalDiscPctDisplay}%)</span>
              <span className="tabular-nums">-{maskMoney(totalDiscValue)}</span>
            </div>
            <div className="flex items-center justify-between border-t pt-2">
              <span className="text-base font-bold">{lang === "bn" ? "মোট:" : "Total:"}</span>
              <span className="text-xl font-extrabold text-primary tabular-nums">{maskMoney(grandTotal)}</span>
            </div>
          </div>

          <div className={`grid ${isSell ? "grid-cols-2" : "grid-cols-1"} gap-2 p-3`}>
            <Button
              className="h-12 text-sm font-bold"
              disabled={cart.length === 0}
              onClick={() => setCashOpen(true)}
            >
              <ShoppingBag className="mr-1.5 h-4 w-4" />
              {lang === "bn" ? "ক্যাশ (F1)" : "Cash (F1)"}
            </Button>
            {isSell && (
              <Button
                variant="outline"
                className="h-12 border-2 text-sm font-bold"
                disabled={cart.length === 0}
                onClick={() => setDueOpen(true)}
              >
                {lang === "bn" ? "বাকি (F2)" : "Due (F2)"}
              </Button>
            )}
          </div>
        </div>
      </div>

      <QuickAddProductDialog
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        onAdded={(p) => { void loadProducts(); addToCart(p); }}
      />

      <Dialog open={othersOpen} onOpenChange={setOthersOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{lang === "bn" ? "আদার্স / দ্রুত বিক্রি পণ্য" : "Others / Quick-sell item"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>{lang === "bn" ? "পণ্যের নাম" : "Product name"} *</Label>
              <Input value={othersName} onChange={(e) => setOthersName(e.target.value)} autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>{lang === "bn" ? "দাম" : "Price"} *</Label>
                <Input type="number" inputMode="decimal" value={othersPrice} onChange={(e) => setOthersPrice(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>{lang === "bn" ? "পরিমাণ" : "Qty"}</Label>
                <Input type="number" inputMode="decimal" value={othersQty} onChange={(e) => setOthersQty(e.target.value)} />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {lang === "bn"
                ? "এই পণ্য ইনভেন্টরিতে যোগ হবে না, শুধু বর্তমান ইনভয়েসে লাইন হিসেবে থাকবে।"
                : "This item is not added to inventory — it only appears as a line on the current invoice."}
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOthersOpen(false)}>{t("p2c_cancel")}</Button>
            <Button
              onClick={() => {
                const nm = othersName.trim();
                const pr = Number(othersPrice);
                const qt = Number(othersQty);
                if (!nm) { toast.error(lang === "bn" ? "নাম দিন" : "Enter name"); return; }
                if (!pr || pr <= 0) { toast.error(lang === "bn" ? "দাম দিন" : "Enter price"); return; }
                if (!qt || qt <= 0) { toast.error(lang === "bn" ? "পরিমাণ দিন" : "Enter qty"); return; }
                setCart((prev) => [
                  ...prev,
                  {
                    product_id: null,
                    item_type: "product",
                    name: nm,
                    qty: qt,
                    price: pr,
                    sale_price: pr,
                    line_discount_mode: "amt",
                    line_discount_amt: 0,
                    line_discount_pct: 0,
                  } as CartItem,
                ]);
                setOthersOpen(false);
                toast.success(lang === "bn" ? "কার্টে যোগ হয়েছে" : "Added to cart");
              }}
            >
              {lang === "bn" ? "কার্টে যোগ" : "Add to cart"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <QuickStockDialog
        product={quickStockProduct}
        onClose={() => setQuickStockProduct(null)}
        onUpdated={(p, newStock) => {
          void loadProducts();
          // Add to cart immediately if stock now available
          if (newStock > 0) addToCart({ ...p, stock: newStock });
        }}
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
        cart={cart.map((it) => ({
          ...it,
          price: it.qty > 0 ? round2(lineTotal(it) / it.qty) : it.price,
        }))}
        subtotal={subtotalAfterLineDisc}
        discount={totalDiscValue}
        delivery={Number(delivery) || 0}
        grandTotal={grandTotal}
        onSaved={(inv) => { clearCart(); setCashOpen(false); void loadProducts(); if (inv) setInvoice(inv); }}
      />
      <PaymentDialog
        open={dueOpen}
        onClose={() => setDueOpen(false)}
        mode={mode}
        kind="due"
        cart={cart.map((it) => ({
          ...it,
          price: it.qty > 0 ? round2(lineTotal(it) / it.qty) : it.price,
        }))}
        subtotal={subtotalAfterLineDisc}
        discount={totalDiscValue}
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
        }}
        data={invoice}
      />
    </div>
  );
}

function QuickAddProductDialog({
  open, onClose, onAdded,
}: { open: boolean; onClose: () => void; onAdded: (p: Product) => void }) {
  return _OriginalQuickAddProductDialog({ open, onClose, onAdded });
}

function QuickStockDialog({ product, onClose, onUpdated }: {
  product: Product | null;
  onClose: () => void;
  onUpdated: (p: Product, newStock: number) => void;
}) {
  const { lang } = useI18n();
  const [qty, setQty] = useState("1");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (product) setQty("1"); }, [product?.id]);
  const save = async () => {
    if (!product) return;
    const add = Number(qty);
    if (!add || add <= 0) { toast.error(lang === "bn" ? "পরিমাণ লিখুন" : "Enter quantity"); return; }
    setBusy(true);
    const newStock = Number(product.stock || 0) + add;
    const { error } = await supabase.from("products").update({ stock: newStock }).eq("id", product.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(lang === "bn" ? "স্টক আপডেট হয়েছে" : "Stock updated");
    onUpdated(product, newStock);
    onClose();
  };
  return (
    <Dialog open={!!product} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{lang === "bn" ? "স্টক যোগ করুন" : "Add stock"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="text-sm">
            <span className="font-semibold">{product?.name}</span>
            <span className="ml-2 text-muted-foreground">
              {lang === "bn" ? "বর্তমান স্টক" : "Current stock"}: {product?.stock ?? 0}
            </span>
          </div>
          <div className="grid gap-1.5">
            <Label>{lang === "bn" ? "যে পরিমাণ যোগ করবেন" : "Quantity to add"}</Label>
            <Input type="number" autoFocus value={qty} onChange={(e) => setQty(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{lang === "bn" ? "বাতিল" : "Cancel"}</Button>
          <Button onClick={save} disabled={busy}>
            {busy ? "..." : (lang === "bn" ? "যোগ করে বিক্রয়ে আনুন" : "Add & continue")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function _OriginalQuickAddProductDialog({
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
  // Walking customer (sell-only): when ON, no customer details required.
  const [walkInCustomer, setWalkInCustomer] = useState<boolean>(isSell);
  // Walking seller (purchase-only): when ON, no supplier details required.
  const [walkInSeller, setWalkInSeller] = useState<boolean>(false);
  // Payment method (cash | online) — applies to both sell and purchase.
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "online">("cash");

  // Live SMS balance for this shop (replaces hardcoded "30")
  const [smsBalance, setSmsBalance] = useState<number | null>(null);
  useEffect(() => {
    if (!props.open || !current?.id) return;
    let cancelled = false;
    void supabase
      .from("shop_sms_balance")
      .select("balance")
      .eq("shop_id", current.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setSmsBalance(Number((data as { balance?: number } | null)?.balance ?? 0));
      });
    return () => { cancelled = true; };
  }, [props.open, current?.id]);

  useEffect(() => {
    if (props.open) {
      setDate(new Date().toISOString().slice(0, 10));
      setPaid(String(props.grandTotal));
      setComment(""); setPartyName(""); setPartyPhone(""); setPartyAddress("");
      setCustomInvoice(false); setInvoiceNo(""); setStaffInfo(false); setStaffNote("");
      setSendMessage(false);
      setPartyTab(isSell ? "customer" : "supplier");
      setWalkInCustomer(isSell);
      setWalkInSeller(false);
      setPaymentMethod("cash");
    }
  }, [props.open, props.grandTotal, isSell]);

  // Auto-disable SMS toggle if phone is missing/invalid or balance is empty
  useEffect(() => {
    if (sendMessage && (partyPhone.replace(/\D/g, "").length < 11 || (smsBalance ?? 0) <= 0)) {
      setSendMessage(false);
    }
  }, [partyPhone, sendMessage, smsBalance]);

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
    // Sell + walking customer: skip all customer validation.
    // Otherwise: only name is required. Mobile/address optional.
    // Purchase mode keeps existing behavior (supplier name required, phone optional).
    const skipParty = (isSell && walkInCustomer) || (!isSell && walkInSeller);
    if (!skipParty) {
      if (!partyName.trim()) { toast.error(t("p2c_nameRequired")); return; }
    }
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
        const walkingNameO = lang === "bn" ? "ওয়াকিং কাস্টমার" : "Walking customer";
        if (skipParty) {
          const cachedContactsW = await readCache<Array<{ id: string; name: string; phone: string | null }>>(
            `${current.id}:contacts:${isSell ? "customer" : "supplier"}`,
          );
          const hitW = cachedContactsW?.find((c) => c.name === walkingNameO && !c.phone);
          if (hitW) {
            contactIdO = hitW.id;
          } else {
            contactIdO = crypto.randomUUID();
            await writeWithOffline({
              table: partyTableO,
              op: "insert",
              payload: {
                id: contactIdO,
                shop_id: current.id,
                name: walkingNameO,
                phone: null,
                address: null,
              },
            });
          }
        } else if (!isCash || partyName.trim()) {
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
              payment_method: paymentMethod as "cash",
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

          if (paidNumO > 0 && paymentMethod === "cash") {
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
              payment_method: paymentMethod as "cash",
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
          if (paidNumO > 0 && paymentMethod === "cash") {
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
      const walkingName = lang === "bn" ? "ওয়াকিং কাস্টমার" : "Walking customer";
      if (skipParty) {
        // Find or create the shared "Walking customer" contact so invoice/ledger shows a name.
        const { data: found } = await supabase
          .from(partyTable)
          .select("id")
          .eq("shop_id", current.id)
          .eq("name", walkingName)
          .is("phone", null)
          .is("deleted_at", null)
          .maybeSingle();
        if (found) {
          contactId = (found as { id: string }).id;
        } else {
          const { data: created, error: eW } = await supabase
            .from(partyTable)
            .insert({ shop_id: current.id, name: walkingName })
            .select("id")
            .single();
          if (eW) throw eW;
          contactId = (created as { id: string }).id;
        }
      } else if (!isCash || partyName.trim()) {
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
            payment_method: paymentMethod as "cash",
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

        if (paidNum > 0 && paymentMethod === "cash") {
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
            payment_method: paymentMethod as "cash",
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

        if (paidNum > 0 && paymentMethod === "cash") {
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

          {isSell && (
            <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
              <Label className="text-sm">
                {lang === "bn" ? "ওয়াকিং কাস্টমার (নাম/মোবাইল লাগবে না)" : "Walking customer (skip name/mobile)"}
              </Label>
              <Switch checked={walkInCustomer} onCheckedChange={setWalkInCustomer} />
            </div>
          )}
          {!isSell && (
            <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
              <Label className="text-sm">
                {lang === "bn" ? "ক্যাশ ক্রয় / ওয়াকিং সেলার (সাপ্লায়ার লাগবে না)" : "Cash purchase / Walking seller (skip supplier)"}
              </Label>
              <Switch checked={walkInSeller} onCheckedChange={setWalkInSeller} />
            </div>
          )}

          {/* Payment method selector — applies to both sell + purchase */}
          <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
            <Label className="text-sm">{lang === "bn" ? "পেমেন্ট মাধ্যম" : "Payment method"}</Label>
            <div className="inline-flex overflow-hidden rounded-md border text-xs font-semibold">
              <button type="button" onClick={() => setPaymentMethod("cash")}
                className={`flex items-center gap-1 px-3 py-1.5 ${paymentMethod === "cash" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"}`}>
                <Banknote className="h-3.5 w-3.5" />{lang === "bn" ? "ক্যাশ" : "Cash"}
              </button>
              <button type="button" onClick={() => setPaymentMethod("online")}
                className={`flex items-center gap-1 px-3 py-1.5 ${paymentMethod === "online" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"}`}>
                <CreditCard className="h-3.5 w-3.5" />{lang === "bn" ? "অনলাইন" : "Online"}
              </button>
            </div>
          </div>

          {!((isSell && walkInCustomer) || (!isSell && walkInSeller)) && (
          <>
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
              <Label>{t("p2c_mobile")} <span className="text-xs text-muted-foreground">({lang === "bn" ? "ঐচ্ছিক" : "optional"})</span></Label>
              <Input value={partyPhone} onChange={(e) => setPartyPhone(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>{t("p2c_address")} <span className="text-xs text-muted-foreground">({lang === "bn" ? "ঐচ্ছিক" : "optional"})</span></Label>
              <Input value={partyAddress} onChange={(e) => setPartyAddress(e.target.value)} />
            </div>
          </div>
          </>
          )}

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
            {partyPhone.replace(/\D/g, "").length >= 11 && (
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-sm">
                  <MessageSquare className="h-4 w-4" />
                  {t("p2c_sendMessage")}
                  <span className={`text-xs ${(smsBalance ?? 0) > 0 ? "text-muted-foreground" : "text-destructive"}`}>
                    ({lang === "bn" ? "SMS অবশিষ্ট" : "SMS left"}: {smsBalance ?? "…"})
                  </span>
                </Label>
                <Switch checked={sendMessage} onCheckedChange={setSendMessage} disabled={(smsBalance ?? 0) <= 0} />
              </div>
            )}
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
