import { useNavigate } from "@/lib/router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Plus, Printer, ReceiptText, Search, ShoppingCart, Trash2, X, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/lib/shop";
import { useI18n, type Lang } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RequirePerm } from "@/components/app/RequirePerm";
import { toast } from "sonner";



type StoreProduct = {
  id: string;
  name: string;
  sale_price: number;
  cost_price: number;
  unit: string | null;
  stock: number;
  sku: string | null;
  barcode: string | null;
};

type Row = {
  tempId: string;
  productId: string | null;
  name: string;
  price: number;
  cost: number;
  unit: string;
  qty: number;
  isExternal: boolean;
  available: boolean; // for print toggle
};

function tid() {
  return Math.random().toString(36).slice(2, 10);
}

function FieldBox({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="group flex h-16 flex-col items-stretch justify-between rounded-xl border bg-background px-2 py-1.5 transition-colors focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30">
      <span className="text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="flex flex-1 items-center justify-center">{children}</div>
    </label>
  );
}

function QuickOrderPage() {
  return (
    <RequirePerm group="sell">
      <QuickOrderInner />
    </RequirePerm>
  );
}

function QuickOrderInner() {
  const { current } = useShop();
  const { lang } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [allowExternal, setAllowExternal] = useState(true);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<StoreProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDrop, setShowDrop] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [rows, setRows] = useState<Row[]>([]);
  const [showOpt, setShowOpt] = useState(false);
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custAddress, setCustAddress] = useState("");
  const [note, setNote] = useState("");
  const [printOpen, setPrintOpen] = useState(false);
  const [converting, setConverting] = useState(false);

  // Active tab (mobile/tablet)
  const [activeTab, setActiveTab] = useState<"products" | "cart">("products");

  // View mode
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    if (typeof window === "undefined") return "grid";
    return (localStorage.getItem("quick-order-view") as "grid" | "list") || "grid";
  });
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("quick-order-view", viewMode);
  }, [viewMode]);

  // Grid pagination
  const PAGE_SIZE = 30;
  const [gridProducts, setGridProducts] = useState<StoreProduct[]>([]);
  const [gridPage, setGridPage] = useState(0);
  const [gridLoading, setGridLoading] = useState(false);
  const [gridDone, setGridDone] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Debounced query for grid (separate from list-mode autosuggest)
  const [gridQuery, setGridQuery] = useState("");
  useEffect(() => {
    const t = window.setTimeout(() => setGridQuery(query.trim()), 250);
    return () => window.clearTimeout(t);
  }, [query]);

  // Reset grid when shop / search / view changes
  useEffect(() => {
    if (viewMode !== "grid") return;
    setGridProducts([]);
    setGridPage(0);
    setGridDone(false);
  }, [viewMode, current?.id, gridQuery]);

  // Fetch a page
  useEffect(() => {
    if (viewMode !== "grid" || !current?.id || gridDone) return;
    let cancelled = false;
    (async () => {
      setGridLoading(true);
      const from = gridPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let qb = supabase
        .from("products")
        .select("id,name,sale_price,cost_price,unit,stock,sku,barcode,image_url")
        .eq("shop_id", current.id)
        .is("deleted_at", null)
        .order("name", { ascending: true })
        .range(from, to);
      const q = gridQuery.replace(/[%,]/g, "");
      if (q) qb = qb.or(`name.ilike.%${q}%,sku.ilike.%${q}%,barcode.ilike.%${q}%`);
      const { data, error } = await qb;
      if (cancelled) return;
      if (error) {
        toast.error(error.message);
        setGridLoading(false);
        return;
      }
      const fetched = (data as StoreProduct[]) ?? [];
      setGridProducts((prev) => (gridPage === 0 ? fetched : [...prev, ...fetched]));
      if (fetched.length < PAGE_SIZE) setGridDone(true);
      setGridLoading(false);
    })();
    return () => { cancelled = true; };
  }, [viewMode, current?.id, gridPage, gridDone, gridQuery]);

  // Infinite scroll
  useEffect(() => {
    if (viewMode !== "grid") return;
    const node = sentinelRef.current;
    if (!node) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !gridLoading && !gridDone) {
        setGridPage((p) => p + 1);
      }
    }, { rootMargin: "400px" });
    io.observe(node);
    return () => io.disconnect();
  }, [viewMode, gridLoading, gridDone, gridProducts.length]);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const debTimer = useRef<number | null>(null);

  // Debounced product search
  useEffect(() => {
    if (!current?.id) return;
    const q = query.trim();
    if (!q) {
      setSuggestions([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    if (debTimer.current) window.clearTimeout(debTimer.current);
    debTimer.current = window.setTimeout(async () => {
      const escaped = q.replace(/[%,]/g, "");
      const { data } = await supabase
        .from("products")
        .select("id,name,sale_price,cost_price,unit,stock,sku,barcode")
        .eq("shop_id", current.id)
        .is("deleted_at", null)
        .or(`name.ilike.%${escaped}%,sku.ilike.%${escaped}%,barcode.ilike.%${escaped}%`)
        .limit(8);
      setSuggestions((data as StoreProduct[]) ?? []);
      setSearching(false);
      setActiveIdx(0);
    }, 150);
    return () => {
      if (debTimer.current) window.clearTimeout(debTimer.current);
    };
  }, [query, current?.id]);

  const addStoreProduct = (p: StoreProduct) => {
    setRows((rs) => {
      const idx = rs.findIndex((r) => r.productId === p.id);
      if (idx >= 0) {
        const next = rs.slice();
        next[idx] = { ...next[idx], qty: (Number(next[idx].qty) || 0) + 1 };
        return next;
      }
      return [
        ...rs,
        {
          tempId: tid(),
          productId: p.id,
          name: p.name,
          price: Number(p.sale_price) || 0,
          cost: Number(p.cost_price) || 0,
          unit: p.unit || "pcs",
          qty: 1,
          isExternal: false,
          available: true,
        },
      ];
    });
    setQuery("");
    setSuggestions([]);
    setShowDrop(false);
    if (viewMode === "list") setTimeout(() => inputRef.current?.focus(), 30);
  };

  const addExternal = (name: string) => {
    if (!allowExternal) {
      toast.error(lang === "bn" ? "এই পণ্য দোকানে নেই" : "Product not in your store");
      return;
    }
    setRows((rs) => [
      ...rs,
      {
        tempId: tid(),
        productId: null,
        name: name.trim(),
        price: 0,
        cost: 0,
        unit: "pcs",
        qty: 1,
        isExternal: true,
        available: true,
      },
    ]);
    setQuery("");
    setSuggestions([]);
    setShowDrop(false);
    setTimeout(() => inputRef.current?.focus(), 30);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (suggestions.length > 0 && activeIdx >= 0 && activeIdx < suggestions.length) {
        addStoreProduct(suggestions[activeIdx]);
      } else if (query.trim()) {
        addExternal(query);
      }
    } else if (e.key === "Escape") {
      setShowDrop(false);
    }
  };

  const updateRow = (id: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.tempId === id ? { ...r, ...patch } : r)));
  const removeRow = (id: string) => setRows((rs) => rs.filter((r) => r.tempId !== id));

  const total = useMemo(
    () => rows.reduce((s, r) => s + (Number(r.qty) || 0) * (Number(r.price) || 0), 0),
    [rows],
  );
  const totalCost = useMemo(
    () => rows.reduce((s, r) => s + (Number(r.qty) || 0) * (Number(r.cost) || 0), 0),
    [rows],
  );
  const totalProfit = total - totalCost;

  const cartQtyMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) if (r.productId) m.set(r.productId, (m.get(r.productId) || 0) + r.qty);
    return m;
  }, [rows]);

  const convertToSale = async () => {
    if (!current?.id || !user) return;
    if (rows.length === 0) {
      toast.error(lang === "bn" ? "কোনো পণ্য যোগ করুন" : "Add at least one item");
      return;
    }
    if (rows.some((r) => !r.name.trim() || r.qty <= 0)) {
      toast.error(lang === "bn" ? "প্রতিটি পণ্যের নাম ও পরিমাণ দিন" : "Each item needs a name and qty");
      return;
    }
    setConverting(true);
    try {
      // Optional customer
      let customerId: string | null = null;
      if (custName.trim()) {
        if (custPhone.trim()) {
          const { data: found } = await supabase
            .from("customers")
            .select("id")
            .eq("shop_id", current.id)
            .eq("phone", custPhone.trim())
            .is("deleted_at", null)
            .maybeSingle();
          if (found) customerId = (found as { id: string }).id;
        }
        if (!customerId) {
          const { data: created, error: e1 } = await supabase
            .from("customers")
            .insert({
              shop_id: current.id,
              name: custName.trim(),
              phone: custPhone.trim() || null,
              address: custAddress.trim() || null,
            })
            .select("id")
            .single();
          if (e1) throw e1;
          customerId = (created as { id: string }).id;
        }
      }

      const subtotal = total;
      const costTotal = totalCost;
      const profitAmt = subtotal - costTotal;
      const { data: sale, error: eS } = await supabase
        .from("sales")
        .insert({
          shop_id: current.id,
          customer_id: customerId,
          subtotal,
          discount: 0,
          tax: 0,
          total: subtotal,
          paid: subtotal,
          due: 0,
          cost_total: costTotal,
          profit: profitAmt,
          payment_method: "cash",
          status: "completed",
          note: note.trim() || null,
          created_by: user.id,
        })
        .select("id")
        .single();
      if (eS) throw eS;
      const saleId = (sale as { id: string }).id;

      const items = rows.map((r) => ({
        sale_id: saleId,
        product_id: r.productId,
        name: r.name,
        qty: r.qty,
        price: r.price,
        cost: r.cost,
        total: r.qty * r.price,
      }));
      const { error: eI } = await supabase.from("sale_items").insert(items);
      if (eI) throw eI;

      // Stock decrement only for store products
      for (const r of rows) {
        if (!r.productId) continue;
        await supabase.from("stock_movements").insert({
          shop_id: current.id,
          product_id: r.productId,
          qty: r.qty,
          type: "out",
          ref_table: "sales",
          ref_id: saleId,
          note: "quick-order",
          created_by: user.id,
        });
        const { data: prod } = await supabase
          .from("products")
          .select("stock")
          .eq("id", r.productId)
          .single();
        if (prod) {
          await supabase
            .from("products")
            .update({ stock: Math.max(0, Number((prod as { stock: number }).stock) - r.qty) })
            .eq("id", r.productId);
        }
      }

      await supabase.from("cash_movements").insert({
        shop_id: current.id,
        direction: "in",
        amount: subtotal,
        note: `quick-order sale ${saleId}`,
        ref_table: "sales",
        ref_id: saleId,
        created_by: user.id,
      });

      toast.success(lang === "bn" ? "বিক্রি তৈরি হয়েছে" : "Sale created");
      navigate({ to: "/app/sales-ledger" });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="container max-w-[1600px] space-y-4 px-3 py-4 pb-28 sm:px-4">
      <div className="text-xs text-muted-foreground">
        Home / {lang === "bn" ? "দ্রুত বিক্রি" : "Quick Sell"}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-xl font-extrabold">
          <ReceiptText className="h-5 w-5 text-primary" />
          {lang === "bn" ? "দ্রুত বিক্রি" : "Quick Sell"}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-full border bg-card p-0.5 shadow-sm">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`flex h-7 w-9 items-center justify-center rounded-full transition-colors ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
              aria-label="Grid view"
              title={lang === "bn" ? "গ্রিড ভিউ" : "Grid view"}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`flex h-7 w-9 items-center justify-center rounded-full transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
              aria-label="List view"
              title={lang === "bn" ? "লিস্ট ভিউ" : "List view"}
            >
              <ListIcon className="h-3.5 w-3.5" />
            </button>
          </div>
          <label className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs shadow-sm">
            <Switch checked={allowExternal} onCheckedChange={setAllowExternal} />
            <span className="font-medium">
              {lang === "bn" ? "বাইরের পণ্য" : "External"}
            </span>
          </label>
        </div>
      </div>

      {/* Mobile/Tablet tabs */}
      <div className="flex gap-1 rounded-xl border bg-card p-1 shadow-sm lg:hidden">
        <button
          type="button"
          onClick={() => setActiveTab("products")}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${activeTab === "products" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:bg-accent"}`}
        >
          {lang === "bn" ? "পণ্য" : "Products"}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("cart")}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${activeTab === "cart" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:bg-accent"}`}
        >
          <span className="inline-flex items-center gap-1.5">
            <ShoppingCart className="h-3.5 w-3.5" />
            {lang === "bn" ? "কার্ট" : "Cart"}
            {rows.length > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${activeTab === "cart" ? "bg-primary-foreground text-primary" : "bg-primary text-primary-foreground"}`}>{rows.length}</span>
            )}
          </span>
        </button>
      </div>

      <div className="lg:grid lg:grid-cols-12 lg:gap-4 lg:items-start">
      {/* === PRODUCTS COLUMN === */}
      <div className={`${activeTab === "products" ? "block" : "hidden"} space-y-4 lg:block lg:col-span-8`}>
      {/* Smart input */}
      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowDrop(true);
            }}
            onFocus={() => { if (viewMode === "list") setShowDrop(true); }}
            onBlur={() => setTimeout(() => setShowDrop(false), 150)}
            onKeyDown={onKeyDown}
            placeholder={viewMode === "grid"
              ? (lang === "bn" ? "পণ্য খুঁজুন..." : "Search products...")
              : (lang === "bn" ? "পণ্য টাইপ করুন... (Enter চাপুন)" : "Type product... (press Enter)")}
            className="h-11 pl-9 text-base"
          />
          {viewMode === "list" && showDrop && query.trim() && (
            <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-auto rounded-xl border bg-popover shadow-lg">
              {searching ? (
                <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> {lang === "bn" ? "খুঁজছে..." : "Searching..."}
                </div>
              ) : suggestions.length > 0 ? (
                <ul>
                  {suggestions.map((p, i) => (
                    <li
                      key={p.id}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        addStoreProduct(p);
                      }}
                      className={`flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm ${i === activeIdx ? "bg-accent" : "hover:bg-accent/60"}`}
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium">{p.name}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {lang === "bn" ? "মজুদ" : "Stock"}: {p.stock} {p.unit || "pcs"}
                        </div>
                      </div>
                      <div className="flex-none text-right">
                        <div className="text-sm font-bold">৳{Number(p.sale_price).toFixed(0)}</div>
                        <div className="text-[11px] text-muted-foreground">/{p.unit || "pcs"}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  {allowExternal ? (
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        addExternal(query);
                      }}
                      className="flex w-full items-center gap-2 rounded-md p-1.5 text-left hover:bg-accent"
                    >
                      <Plus className="h-4 w-4 text-muted-foreground" />
                      <span>
                        <b>"{query.trim()}"</b> {lang === "bn" ? "দোকানের বাইরে যোগ করুন" : "add as external item"}
                      </span>
                    </button>
                  ) : (
                    <span>{lang === "bn" ? "এই পণ্য দোকানে নেই" : "Not in your store"}</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          {viewMode === "grid"
            ? (lang === "bn" ? "নিচের গ্রিড থেকে + চেপে কার্টে যোগ করুন।" : "Tap + on a card to add to cart.")
            : (lang === "bn" ? "দোকানের পণ্য বাছাই করলে দাম ও একক স্বয়ংক্রিয় আসবে।" : "Pick a store product and price + unit auto-fill.")}
        </p>
      </div>

      {/* Grid view: paginated product picker */}
      {viewMode === "grid" && (
        <div className="rounded-2xl border bg-card p-3 shadow-sm sm:p-4">
          {gridProducts.length === 0 && !gridLoading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-sm text-muted-foreground">
              <ImageOff className="h-8 w-8 opacity-50" />
              <div>{gridQuery
                ? (lang === "bn" ? "এই নামে কোনো পণ্য পাওয়া যায়নি" : "No products match")
                : (lang === "bn" ? "এই দোকানে এখনো কোনো পণ্য নেই" : "No products in this shop yet")}</div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7">
              {gridProducts.map((p) => (
                <ProductGridCard
                  key={p.id}
                  product={p}
                  inCartQty={cartQtyMap.get(p.id) || 0}
                  onAdd={addStoreProduct}
                />
              ))}
            </div>
          )}
          <div ref={sentinelRef} className="h-8" />
          {gridLoading && (
            <div className="flex justify-center py-3 text-xs text-muted-foreground">
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              {lang === "bn" ? "লোড হচ্ছে..." : "Loading..."}
            </div>
          )}
          {gridDone && gridProducts.length > 0 && (
            <div className="py-2 text-center text-[11px] text-muted-foreground">
              {lang === "bn" ? `মোট ${gridProducts.length} টি পণ্য` : `${gridProducts.length} products`}
            </div>
          )}
        </div>
      )}

      </div>

      {/* === CART COLUMN === */}
      <div className={`${activeTab === "cart" ? "block" : "hidden"} space-y-4 lg:block lg:col-span-4`}>
      {/* Items */}
      <div className="rounded-2xl border bg-card shadow-sm">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-12 text-center text-sm text-muted-foreground">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <ShoppingCart className="h-7 w-7 opacity-60" />
            </div>
            <div className="font-medium">
              {lang === "bn" ? "এখনো কোনো পণ্য যোগ হয়নি" : "No items yet"}
            </div>
            <div className="mt-1 text-xs">
              {lang === "bn"
                ? "উপরের সার্চ বক্সে পণ্য খুঁজুন বা নতুন নাম লিখুন।"
                : "Search above or type a new product name."}
            </div>
          </div>
        ) : (
          <ul className="divide-y">
            {rows.map((r, idx) => {
              const lineTotal = (Number(r.price) || 0) * (Number(r.qty) || 0);
              const lineProfit = ((Number(r.price) || 0) - (Number(r.cost) || 0)) * (Number(r.qty) || 0);
              return (
                <li key={r.tempId} className="space-y-3 p-4">
                  {/* Top row: serial + name + delete */}
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                      {idx + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      {r.isExternal ? (
                        <Input
                          value={r.name}
                          onChange={(e) => updateRow(r.tempId, { name: e.target.value })}
                          className="h-9 text-sm font-semibold"
                          placeholder={lang === "bn" ? "পণ্যের নাম" : "Product name"}
                        />
                      ) : (
                        <div className="line-clamp-2 break-words text-base font-semibold leading-snug">
                          {r.name}
                        </div>
                      )}
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {r.isExternal ? (
                          <Badge
                            variant="secondary"
                            className="h-5 rounded-full px-2 text-[10px] font-medium"
                          >
                            {lang === "bn" ? "বাইরের পণ্য" : "External"}
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="h-5 gap-1 rounded-full bg-success/10 px-2 text-[10px] font-medium text-success hover:bg-success/15"
                          >
                            <Check className="h-3 w-3" />
                            {lang === "bn" ? "দোকানের পণ্য" : "In store"}
                          </Badge>
                        )}
                        {r.isExternal ? (
                          <Input
                            value={r.unit}
                            onChange={(e) => updateRow(r.tempId, { unit: e.target.value })}
                            className="h-5 w-16 rounded-full px-2 text-[11px]"
                            maxLength={10}
                            placeholder={lang === "bn" ? "একক" : "Unit"}
                          />
                        ) : (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            /{r.unit}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeRow(r.tempId)}
                      className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      aria-label="remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Inputs row: ক্রয় / বিক্রয় / পরিমাণ */}
                  <div className="grid grid-cols-3 gap-2">
                    <FieldBox label={lang === "bn" ? "ক্রয়" : "Cost"}>
                      <Input
                        type="number"
                        inputMode="decimal"
                        value={r.cost || ""}
                        onChange={(e) => updateRow(r.tempId, { cost: Number(e.target.value) || 0 })}
                        className="h-7 border-0 bg-transparent p-0 text-center text-base font-bold shadow-none focus-visible:ring-0"
                        placeholder="0"
                      />
                    </FieldBox>
                    <FieldBox label={lang === "bn" ? "বিক্রয়" : "Sell"}>
                      <Input
                        type="number"
                        inputMode="decimal"
                        value={r.price || ""}
                        onChange={(e) => updateRow(r.tempId, { price: Number(e.target.value) || 0 })}
                        className="h-7 border-0 bg-transparent p-0 text-center text-base font-bold shadow-none focus-visible:ring-0"
                        placeholder="0"
                      />
                    </FieldBox>
                    <FieldBox label={lang === "bn" ? "পরিমাণ" : "Qty"}>
                      <Input
                        type="number"
                        inputMode="decimal"
                        value={r.qty}
                        onChange={(e) => updateRow(r.tempId, { qty: Number(e.target.value) || 0 })}
                        className="h-7 border-0 bg-transparent p-0 text-center text-base font-bold shadow-none focus-visible:ring-0"
                        min={0}
                      />
                    </FieldBox>
                  </div>

                  {/* Line summary */}
                  <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-1.5 text-[11px]">
                    <span className="text-muted-foreground">
                      {lang === "bn" ? "লাভ" : "Profit"}:{" "}
                      <span
                        className={`font-semibold ${lineProfit >= 0 ? "text-success" : "text-destructive"}`}
                      >
                        ৳{lineProfit.toFixed(0)}
                      </span>
                    </span>
                    <span className="text-muted-foreground">
                      {lang === "bn" ? "মোট" : "Total"}:{" "}
                      <span className="text-sm font-bold text-foreground">
                        ৳{lineTotal.toFixed(0)}
                      </span>
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {rows.length > 0 && (
          <div className="space-y-2 border-t bg-muted/30 px-4 py-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{lang === "bn" ? "মোট ক্রয়" : "Total cost"}</span>
              <span className="tabular-nums">৳ {totalCost.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold">{lang === "bn" ? "মোট লাভ" : "Total profit"}</span>
              <span
                className={`font-bold tabular-nums ${totalProfit >= 0 ? "text-success" : "text-destructive"}`}
              >
                ৳ {totalProfit.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between border-t pt-2">
              <span className="text-base font-bold">{lang === "bn" ? "মোট বিক্রয়" : "Total sell"}</span>
              <span className="text-xl font-extrabold tabular-nums text-primary">
                ৳ {total.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Optional customer */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setShowOpt((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs font-semibold text-primary shadow-sm transition-colors hover:bg-accent"
        >
          {showOpt ? (
            <>
              <X className="h-3.5 w-3.5" />
              {lang === "bn" ? "গ্রাহকের তথ্য লুকান" : "Hide customer info"}
            </>
          ) : (
            <>
              <Plus className="h-3.5 w-3.5" />
              {lang === "bn" ? "গ্রাহকের তথ্য (ইচ্ছাধীন)" : "Customer info (optional)"}
            </>
          )}
        </button>
        {showOpt && (
          <div className="grid gap-3 rounded-2xl border bg-card p-4 shadow-sm sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {lang === "bn" ? "গ্রাহকের নাম" : "Customer name"}
              </Label>
              <Input value={custName} onChange={(e) => setCustName(e.target.value)} className="h-10" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {lang === "bn" ? "মোবাইল" : "Phone"}
              </Label>
              <Input value={custPhone} onChange={(e) => setCustPhone(e.target.value)} className="h-10" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {lang === "bn" ? "ঠিকানা" : "Address"}
              </Label>
              <Input value={custAddress} onChange={(e) => setCustAddress(e.target.value)} className="h-10" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {lang === "bn" ? "নোট" : "Note"}
              </Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} className="h-10" />
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="sticky bottom-2 z-10 flex flex-col gap-2 rounded-2xl border bg-background/95 p-3 shadow-lg backdrop-blur">
        <Button
          variant="outline"
          className="flex-1 h-12 text-base font-semibold"
          onClick={() => setPrintOpen(true)}
          disabled={rows.length === 0}
        >
          <Printer className="mr-2 h-5 w-5" />
          {lang === "bn" ? "প্রিন্ট ফর্দ" : "Print Order"}
        </Button>
        <Button
          className="flex-1 h-12 text-base font-semibold"
          onClick={convertToSale}
          disabled={converting || rows.length === 0}
        >
          {converting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ReceiptText className="mr-2 h-5 w-5" />}
          {lang === "bn" ? "বিক্রিতে রূপান্তর" : "Convert to Sale"}
        </Button>
      </div>

      </div>
      </div>

      <PrintDialog
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        rows={rows}
        onChange={setRows}
        shopName={current?.name || ""}
        custName={custName}
        custPhone={custPhone}
        lang={lang}
      />
    </div>
  );
}

function PrintDialog({
  open,
  onClose,
  rows,
  onChange,
  shopName,
  custName,
  custPhone,
  lang,
}: {
  open: boolean;
  onClose: () => void;
  rows: Row[];
  onChange: (rows: Row[]) => void;
  shopName: string;
  custName: string;
  custPhone: string;
  lang: Lang;
}) {
  const update = (id: string, patch: Partial<Row>) =>
    onChange(rows.map((r) => (r.tempId === id ? { ...r, ...patch } : r)));

  const total = rows
    .filter((r) => r.available)
    .reduce((s, r) => s + r.price * r.qty, 0);

  const handlePrint = () => {
    window.print();
  };

  const now = new Date().toLocaleString("bn-BD", { dateStyle: "medium", timeStyle: "short" });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg print:max-w-none print:border-0 print:shadow-none">
        <DialogHeader className="print:hidden">
          <DialogTitle>{lang === "bn" ? "প্রিন্ট প্রিভিউ" : "Print Preview"}</DialogTitle>
        </DialogHeader>

        <div className="quick-print-area">
          <div className="text-center">
            <div className="text-base font-extrabold">{shopName}</div>
            <div className="text-xs">{lang === "bn" ? "গ্রাহক ফর্দ" : "Customer Order"}</div>
          </div>
          <div className="my-2 border-t border-dashed" />
          {(custName || custPhone) && (
            <div className="mb-1 text-xs">
              {custName && <div>{lang === "bn" ? "গ্রাহক" : "Customer"}: {custName}</div>}
              {custPhone && <div>{lang === "bn" ? "মোবাইল" : "Phone"}: {custPhone}</div>}
            </div>
          )}
          <div className="text-[11px] text-muted-foreground print:text-black">{now}</div>
          <div className="my-2 border-t border-dashed" />

          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground print:text-black">
                <th className="w-6 text-left">✓</th>
                <th className="text-left">{lang === "bn" ? "পণ্য" : "Item"}</th>
                <th className="w-14 text-right">{lang === "bn" ? "পরিমাণ" : "Qty"}</th>
                <th className="w-20 text-right">{lang === "bn" ? "দাম" : "Price"}</th>
                <th className="w-20 text-right">{lang === "bn" ? "মোট" : "Total"}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.tempId} className={r.available ? "" : "opacity-50 line-through"}>
                  <td className="py-1">
                    <button
                      type="button"
                      onClick={() => update(r.tempId, { available: !r.available })}
                      className={`print:hidden flex h-5 w-5 items-center justify-center rounded border ${r.available ? "border-success bg-success text-white" : "border-destructive text-destructive"}`}
                      aria-label="toggle"
                    >
                      {r.available ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    </button>
                    <span className="hidden print:inline">{r.available ? "✓" : "✗"}</span>
                  </td>
                  <td className="py-1">
                    {i + 1}. {r.name}
                  </td>
                  <td className="py-1 text-right">
                    {r.qty} {r.unit}
                  </td>
                  <td className="py-1 text-right">
                    <input
                      type="number"
                      value={r.price || ""}
                      onChange={(e) => update(r.tempId, { price: Number(e.target.value) || 0 })}
                      className="w-16 rounded border bg-background px-1 py-0.5 text-right text-sm print:border-0 print:bg-transparent"
                    />
                  </td>
                  <td className="py-1 text-right">৳{(r.price * r.qty).toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="my-2 border-t border-dashed" />
          <div className="flex items-center justify-between text-base font-extrabold">
            <span>{lang === "bn" ? "মোট" : "Total"}</span>
            <span>৳ {total.toFixed(2)}</span>
          </div>
        </div>

        <div className="mt-3 flex justify-end gap-2 print:hidden">
          <Button variant="ghost" onClick={onClose}>
            {lang === "bn" ? "বন্ধ" : "Close"}
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            {lang === "bn" ? "প্রিন্ট" : "Print"}
          </Button>
        </div>
      </DialogContent>

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .quick-print-area, .quick-print-area * { visibility: visible !important; }
          .quick-print-area { position: fixed; inset: 0; padding: 16px; background: white; color: black; }
        }
      `}</style>
    </Dialog>
  );
}

export default QuickOrderPage;

const ProductGridCard = memo(function ProductGridCard({
  product,
  inCartQty,
  onAdd,
}: {
  product: StoreProduct;
  inCartQty: number;
  onAdd: (p: StoreProduct) => void;
}) {
  const inCart = inCartQty > 0;
  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-xl border bg-background transition-all hover:shadow-md ${inCart ? "ring-2 ring-primary/60" : ""}`}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-muted/40">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
            <ImageOff className="h-8 w-8" />
          </div>
        )}
        {inCart && (
          <span className="absolute left-1.5 top-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground shadow">
            ×{inCartQty}
          </span>
        )}
        <button
          type="button"
          onClick={() => onAdd(product)}
          aria-label="Add to cart"
          className="absolute bottom-1.5 right-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-2 ring-background transition-transform hover:scale-110 active:scale-95"
        >
          <Plus className="h-4 w-4" strokeWidth={3} />
        </button>
      </div>
      <div className="space-y-0.5 p-2">
        <div className="flex items-baseline gap-1">
          <span className="text-sm font-extrabold text-primary">৳{Number(product.sale_price).toFixed(0)}</span>
          <span className="text-[10px] text-muted-foreground">/{product.unit || "pcs"}</span>
        </div>
        <div className="line-clamp-2 min-h-[2.1em] text-[11px] font-medium leading-tight text-foreground">
          {product.name}
        </div>
        <div className="text-[10px] text-muted-foreground">
          Stock: <span className={product.stock <= 0 ? "text-destructive font-semibold" : ""}>{product.stock}</span>
        </div>
      </div>
    </div>
  );
});
