import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Phone, MessageCircle, ChevronLeft, ListChecks, Calendar, User2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/lib/shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/app/fordo-history")({
  head: () => ({ meta: [{ title: "ফর্দ ইতিহাস — Tally Plus" }] }),
  component: FordoHistoryPage,
});

type Wishlist = {
  id: string;
  shop_id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string | null;
  note: string | null;
  status: string;
  created_at: string;
};

type Item = {
  id: string;
  wishlist_id: string;
  name: string;
  qty: number | null;
  unit: string | null;
  price?: number | null;
  done: boolean;
  fulfillment_status?: string | null;
};

const MONTHS_BN = ["জানুয়ারি","ফেব্রুয়ারি","মার্চ","এপ্রিল","মে","জুন","জুলাই","আগস্ট","সেপ্টেম্বর","অক্টোবর","নভেম্বর","ডিসেম্বর"];

function normalizePhone(p: string): string {
  const digits = (p || "").replace(/\D/g, "");
  return digits.length >= 11 ? digits.slice(-11) : digits;
}

function monthKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return `${MONTHS_BN[m - 1]} ${y}`;
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("bn-BD", { dateStyle: "medium" });
}

function FordoHistoryPage() {
  const { current } = useShop();
  const [search, setSearch] = useState("");
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [openWishlistId, setOpenWishlistId] = useState<string | null>(null);
  const [monthFilter, setMonthFilter] = useState<string>("all");

  const wlQuery = useQuery({
    queryKey: ["fordo-history", current?.id],
    enabled: !!current?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_wishlists")
        .select("id, shop_id, customer_name, customer_phone, customer_address, note, status, created_at")
        .eq("shop_id", current!.id)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data || []) as Wishlist[];
    },
  });

  const itemsQuery = useQuery({
    queryKey: ["fordo-history-items", current?.id, (wlQuery.data || []).length],
    enabled: !!wlQuery.data && wlQuery.data.length > 0,
    queryFn: async () => {
      const ids = (wlQuery.data || []).map((w) => w.id);
      if (ids.length === 0) return [] as Item[];
      const { data, error } = await supabase
        .from("customer_wishlist_items")
        .select("id, wishlist_id, name, qty, unit, price, done, fulfillment_status")
        .in("wishlist_id", ids);
      if (error) throw error;
      return (data || []) as Item[];
    },
  });

  const itemsByWl = useMemo(() => {
    const map = new Map<string, Item[]>();
    (itemsQuery.data || []).forEach((it) => {
      const arr = map.get(it.wishlist_id) || [];
      arr.push(it);
      map.set(it.wishlist_id, arr);
    });
    return map;
  }, [itemsQuery.data]);

  // group customers by normalized phone
  const customers = useMemo(() => {
    const map = new Map<string, { phone: string; name: string; count: number; lastAt: string; total: number; ids: string[] }>();
    (wlQuery.data || []).forEach((w) => {
      const key = normalizePhone(w.customer_phone) || `name:${w.customer_name}`;
      const items = itemsByWl.get(w.id) || [];
      const total = items.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.qty) || 0), 0);
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
        existing.total += total;
        existing.ids.push(w.id);
        if (new Date(w.created_at) > new Date(existing.lastAt)) {
          existing.lastAt = w.created_at;
          existing.name = w.customer_name || existing.name;
        }
      } else {
        map.set(key, {
          phone: w.customer_phone || "",
          name: w.customer_name || "—",
          count: 1,
          lastAt: w.created_at,
          total,
          ids: [w.id],
        });
      }
    });
    return Array.from(map.entries()).map(([key, v]) => ({ key, ...v })).sort((a, b) => +new Date(b.lastAt) - +new Date(a.lastAt));
  }, [wlQuery.data, itemsByWl]);

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => c.name.toLowerCase().includes(q) || normalizePhone(c.phone).includes(q.replace(/\D/g, "")) || c.phone.includes(q));
  }, [customers, search]);

  const allMonths = useMemo(() => {
    const set = new Set<string>();
    (wlQuery.data || []).forEach((w) => set.add(monthKey(w.created_at)));
    return Array.from(set).sort().reverse();
  }, [wlQuery.data]);

  const filteredAll = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (wlQuery.data || []).filter((w) => {
      if (monthFilter !== "all" && monthKey(w.created_at) !== monthFilter) return false;
      if (!q) return true;
      return (
        (w.customer_name || "").toLowerCase().includes(q) ||
        (w.customer_phone || "").includes(q) ||
        normalizePhone(w.customer_phone).includes(q.replace(/\D/g, ""))
      );
    });
  }, [wlQuery.data, search, monthFilter]);

  // Customer drill-down
  const selectedCustomer = useMemo(() => {
    if (!selectedPhone) return null;
    return customers.find((c) => c.key === selectedPhone) || null;
  }, [selectedPhone, customers]);

  const customerWishlistsByMonth = useMemo(() => {
    if (!selectedCustomer) return [] as Array<{ month: string; wls: Wishlist[] }>;
    const wls = (wlQuery.data || []).filter((w) => selectedCustomer.ids.includes(w.id));
    const grouped = new Map<string, Wishlist[]>();
    wls.forEach((w) => {
      const k = monthKey(w.created_at);
      const arr = grouped.get(k) || [];
      arr.push(w);
      grouped.set(k, arr);
    });
    return Array.from(grouped.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1)).map(([month, wls]) => ({ month, wls }));
  }, [selectedCustomer, wlQuery.data]);

  const openWishlist = useMemo(() => {
    if (!openWishlistId) return null;
    return (wlQuery.data || []).find((w) => w.id === openWishlistId) || null;
  }, [openWishlistId, wlQuery.data]);

  const loading = wlQuery.isLoading || itemsQuery.isLoading;

  // ============ Customer Detail View ============
  if (selectedCustomer) {
    return (
      <div className="container max-w-4xl py-6 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setSelectedPhone(null)}>
          <ChevronLeft className="h-4 w-4 mr-1" /> তালিকায় ফিরুন
        </Button>

        <Card className="p-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <User2 className="h-5 w-5 text-primary" />
                <h1 className="text-xl font-bold">{selectedCustomer.name}</h1>
              </div>
              <p className="text-muted-foreground mt-1">{selectedCustomer.phone || "ফোন নেই"}</p>
              <div className="flex gap-3 mt-3 text-sm text-muted-foreground">
                <span>মোট ফর্দ: <b className="text-foreground">{selectedCustomer.count}</b></span>
                <span>মোট খরচ: <b className="text-foreground">৳{Math.round(selectedCustomer.total)}</b></span>
              </div>
            </div>
            {selectedCustomer.phone && (
              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm">
                  <a href={`tel:${selectedCustomer.phone}`}><Phone className="h-4 w-4 mr-1" />কল</a>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <a href={`https://wa.me/${normalizePhone(selectedCustomer.phone).replace(/^0/, "880")}`} target="_blank" rel="noreferrer">
                    <MessageCircle className="h-4 w-4 mr-1" />WhatsApp
                  </a>
                </Button>
              </div>
            )}
          </div>
        </Card>

        <Accordion type="multiple" defaultValue={customerWishlistsByMonth.slice(0, 1).map((g) => g.month)} className="space-y-2">
          {customerWishlistsByMonth.map((g) => (
            <AccordionItem key={g.month} value={g.month} className="border rounded-lg bg-card">
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="font-semibold">{monthLabel(g.month)}</span>
                  <Badge variant="secondary">{g.wls.length} ফর্দ</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-3">
                {g.wls.map((w) => {
                  const items = itemsByWl.get(w.id) || [];
                  const total = items.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.qty) || 0), 0);
                  return (
                    <div key={w.id} className="border rounded-md p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-muted-foreground">{fmtDate(w.created_at)}</div>
                        <Badge variant="outline">{items.length} আইটেম</Badge>
                      </div>
                      <ul className="text-sm space-y-1">
                        {items.map((it) => (
                          <li key={it.id} className="flex justify-between gap-2">
                            <span className={it.done ? "line-through text-muted-foreground" : ""}>
                              {it.name}
                              {it.qty ? <span className="text-muted-foreground"> — {it.qty}{it.unit ? ` ${it.unit}` : ""}</span> : null}
                            </span>
                            {it.price ? <span className="text-muted-foreground">৳{Number(it.price) * Number(it.qty || 1)}</span> : null}
                          </li>
                        ))}
                        {items.length === 0 && <li className="text-muted-foreground italic">কোনো আইটেম নেই</li>}
                      </ul>
                      {total > 0 && <div className="mt-2 text-right text-sm font-medium">মোট: ৳{Math.round(total)}</div>}
                    </div>
                  );
                })}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    );
  }

  // ============ Main List ============
  return (
    <div className="container max-w-5xl py-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">ফর্দ ইতিহাস</h1>
        <p className="text-muted-foreground text-sm mt-1">নাম বা মোবাইল নম্বর দিয়ে গ্রাহক খুঁজুন — সে কবে কী কিনেছিল দেখুন।</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="নাম বা মোবাইল নম্বর..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Tabs defaultValue="customers">
        <TabsList>
          <TabsTrigger value="customers">গ্রাহক তালিকা ({customers.length})</TabsTrigger>
          <TabsTrigger value="all">সব ফর্দ ({(wlQuery.data || []).length})</TabsTrigger>
        </TabsList>

        <TabsContent value="customers" className="mt-4">
          {loading ? (
            <div className="grid sm:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
          ) : filteredCustomers.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">কোনো গ্রাহক পাওয়া যায়নি</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {filteredCustomers.map((c) => (
                <Card
                  key={c.key}
                  onClick={() => setSelectedPhone(c.key)}
                  className="p-4 cursor-pointer hover:border-primary transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{c.name}</div>
                      <div className="text-sm text-muted-foreground truncate">{c.phone || "ফোন নেই"}</div>
                    </div>
                    <Badge variant="secondary">{c.count}টি ফর্দ</Badge>
                  </div>
                  <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                    <span>সর্বশেষ: {fmtDate(c.lastAt)}</span>
                    {c.total > 0 && <span className="font-medium text-foreground">৳{Math.round(c.total)}</span>}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all" className="mt-4 space-y-3">
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant={monthFilter === "all" ? "default" : "outline"} onClick={() => setMonthFilter("all")}>
              সব মাস
            </Button>
            {allMonths.map((m) => (
              <Button key={m} size="sm" variant={monthFilter === m ? "default" : "outline"} onClick={() => setMonthFilter(m)}>
                {monthLabel(m)}
              </Button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : filteredAll.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">কোনো ফর্দ পাওয়া যায়নি</p>
          ) : (
            <div className="space-y-2">
              {filteredAll.map((w) => {
                const items = itemsByWl.get(w.id) || [];
                return (
                  <Card
                    key={w.id}
                    onClick={() => setOpenWishlistId(w.id)}
                    className="p-3 cursor-pointer hover:border-primary transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{w.customer_name}</div>
                        <div className="text-xs text-muted-foreground">{w.customer_phone} • {fmtDate(w.created_at)}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="gap-1"><ListChecks className="h-3 w-3" />{items.length}</Badge>
                        <Badge variant="secondary">{w.status}</Badge>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!openWishlistId} onOpenChange={(o) => !o && setOpenWishlistId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{openWishlist?.customer_name} — {openWishlist ? fmtDate(openWishlist.created_at) : ""}</DialogTitle>
          </DialogHeader>
          {openWishlist && (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">{openWishlist.customer_phone}</div>
              <ul className="space-y-1 text-sm">
                {(itemsByWl.get(openWishlist.id) || []).map((it) => (
                  <li key={it.id} className="flex justify-between gap-2 border-b pb-1">
                    <span className={it.done ? "line-through text-muted-foreground" : ""}>
                      {it.name}
                      {it.qty ? <span className="text-muted-foreground"> — {it.qty}{it.unit ? ` ${it.unit}` : ""}</span> : null}
                    </span>
                    {it.price ? <span>৳{Number(it.price) * Number(it.qty || 1)}</span> : null}
                  </li>
                ))}
              </ul>
              {openWishlist.note && <p className="text-sm bg-muted p-2 rounded">📝 {openWishlist.note}</p>}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {loading && (
        <div className="fixed bottom-4 right-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}