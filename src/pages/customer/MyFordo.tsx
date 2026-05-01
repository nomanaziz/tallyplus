import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "@/lib/router";
import {
  Loader2, Store, ListChecks, Plus, FileText, CalendarClock,
  Trash2, Pause, Play, Star, Check, X, Clock, Save, Copy, Calendar,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type Wishlist = {
  id: string;
  shop_id: string;
  customer_name: string;
  customer_phone: string;
  status: string;
  note: string | null;
  created_at: string;
};

type WLItem = {
  id: string;
  wishlist_id: string;
  name: string;
  qty: number | null;
  unit: string | null;
  price: number | null;
  fulfillment_status: string | null;
  done: boolean;
  position: number;
};

type Shop = { id: string; name: string };
type Template = { id: string; name: string; items: unknown; created_at: string };
type Schedule = {
  id: string;
  shop_id: string;
  recurrence: string;
  day_of_month: number | null;
  day_of_week: number | null;
  next_run_at: string;
  is_active: boolean;
  last_run_at: string | null;
};

export default function MyFordo() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Wishlist[]>([]);
  const [shops, setShops] = useState<Record<string, Shop>>({});
  const [templates, setTemplates] = useState<Template[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [favourites, setFavourites] = useState<Shop[]>([]);
  const [itemsByWl, setItemsByWl] = useState<Record<string, WLItem[]>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [monthFilter, setMonthFilter] = useState<string>("all");
  // Save-as-template dialog state
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveWlId, setSaveWlId] = useState<string | null>(null);
  const [saveName, setSaveName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      // Use a server-side unified resolver. It matches by consumer_user_id,
      // wishlist_customer_id (linked via phone) and customer_phone variants,
      // so fordo sent through the public link flow also shows up here.
      const { data: hist, error: histErr } = await supabase.functions.invoke(
        "consumer-fordo-history",
        { body: {} },
      );
      if (cancelled) return;
      const histAny = (hist ?? {}) as {
        wishlists?: Wishlist[];
        items?: WLItem[];
        shops?: Array<{ id: string; name: string }>;
      };
      const list = (histAny.wishlists ?? []) as Wishlist[];
      const itemsRows = (histAny.items ?? []) as WLItem[];
      const fnShops = (histAny.shops ?? []) as Array<{ id: string; name: string }>;
      if (histErr) {
        // Soft-fail: still show empty list rather than blocking the page.
        console.warn("consumer-fordo-history failed", histErr);
      }
      setItems(list);
      const map: Record<string, WLItem[]> = {};
      for (const it of itemsRows) {
        (map[it.wishlist_id] ||= []).push(it);
      }
      setItemsByWl(map);

      const [tplRes, schRes] = await Promise.all([
        supabase
          .from("consumer_fordo_templates")
          .select("id,name,items,created_at")
          .eq("consumer_user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("consumer_fordo_schedules")
          .select("id,shop_id,recurrence,day_of_month,day_of_week,next_run_at,is_active,last_run_at")
          .eq("consumer_user_id", user.id)
          .order("next_run_at", { ascending: true }),
      ]);
      if (cancelled) return;
      setTemplates((tplRes.data ?? []) as Template[]);
      setSchedules((schRes.data ?? []) as Schedule[]);
      // Load favourite shops
      const { data: favRows } = await supabase
        .from("consumer_favourite_shops")
        .select("shop_id")
        .eq("consumer_id", user.id);
      const favShopIds = (favRows ?? []).map((r) => r.shop_id as string);
      const shopMap: Record<string, Shop> = {};
      for (const s of fnShops) shopMap[s.id] = s as Shop;
      const extraIds = Array.from(new Set([
        ...((schRes.data ?? []) as Schedule[]).map((s) => s.shop_id),
        ...favShopIds,
      ])).filter((id) => !shopMap[id]);
      if (extraIds.length > 0) {
        const { data: ss } = await supabase.from("shops").select("id, name").in("id", extraIds);
        for (const s of (ss ?? []) as Shop[]) shopMap[s.id] = s;
      }
      setShops(shopMap);
      setFavourites(favShopIds.map((id) => shopMap[id]).filter(Boolean));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const deleteTemplate = async (id: string) => {
    if (!confirm("টেমপ্লেট মুছবেন?")) return;
    const { error } = await supabase.from("consumer_fordo_templates").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setTemplates((t) => t.filter((x) => x.id !== id));
    toast.success("মুছে ফেলা হয়েছে");
  };

  const wlTotal = (wlId: string) => {
    const arr = itemsByWl[wlId] ?? [];
    return arr.reduce((sum, it) => {
      const q = Number(it.qty) || 0;
      const pr = Number(it.price) || 0;
      return sum + (q && pr ? q * pr : pr);
    }, 0);
  };

  const fsBadge = (it: WLItem) => {
    const fs = it.fulfillment_status ?? (it.done ? "fulfilled" : "pending");
    if (fs === "fulfilled") return <span className="inline-flex items-center gap-0.5 rounded bg-success/15 px-1.5 py-0.5 text-[10px] font-medium text-success"><Check className="h-3 w-3" />পেয়েছে</span>;
    if (fs === "unavailable") return <span className="inline-flex items-center gap-0.5 rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] font-medium text-destructive"><X className="h-3 w-3" />নাই</span>;
    if (fs === "later") return <span className="inline-flex items-center gap-0.5 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-600"><Clock className="h-3 w-3" />পরে</span>;
    return null;
  };

  const toggleSchedule = async (s: Schedule) => {
    const { error } = await supabase
      .from("consumer_fordo_schedules")
      .update({ is_active: !s.is_active })
      .eq("id", s.id);
    if (error) return toast.error(error.message);
    setSchedules((arr) => arr.map((x) => (x.id === s.id ? { ...x, is_active: !x.is_active } : x)));
  };

  const deleteSchedule = async (id: string) => {
    if (!confirm("সময়সূচী মুছবেন?")) return;
    const { error } = await supabase.from("consumer_fordo_schedules").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setSchedules((arr) => arr.filter((x) => x.id !== id));
    toast.success("মুছে ফেলা হয়েছে");
  };

  const recurrenceLabel = (s: Schedule) => {
    if (s.recurrence === "monthly") return `প্রতি মাসে ${s.day_of_month} তারিখ`;
    if (s.recurrence === "weekly") {
      const days = ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহঃ", "শুক্র", "শনি"];
      return `প্রতি ${days[s.day_of_week ?? 0]}বার`;
    }
    return "একবার";
  };

  // ----- Month filter helpers -----
  const BN_MONTHS = [
    "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
    "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর",
  ];
  const monthKey = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };
  const monthLabel = (key: string) => {
    const [y, m] = key.split("-");
    return `${BN_MONTHS[Number(m) - 1]} ${y}`;
  };
  const monthCounts: Record<string, number> = {};
  for (const w of items) {
    const k = monthKey(w.created_at);
    monthCounts[k] = (monthCounts[k] || 0) + 1;
  }
  const monthOptions = Object.keys(monthCounts).sort((a, b) => (a < b ? 1 : -1));
  const filteredItems =
    monthFilter === "all" ? items : items.filter((w) => monthKey(w.created_at) === monthFilter);

  // ----- Save as template -----
  const openSaveTemplate = (w: Wishlist) => {
    const wlItems = itemsByWl[w.id] ?? [];
    if (wlItems.length === 0) return toast.error("এই ফর্দে কোনো পণ্য নেই");
    setSaveWlId(w.id);
    const shopName = shops[w.shop_id]?.name ?? "ফর্দ";
    const dt = new Date(w.created_at);
    setSaveName(`${shopName} — ${dt.toLocaleDateString("bn-BD", { day: "numeric", month: "short" })}`);
    setSaveOpen(true);
  };
  const confirmSaveTemplate = async () => {
    if (!user || !saveWlId) return;
    const name = saveName.trim();
    if (!name) return toast.error("একটি নাম দিন");
    const w = items.find((x) => x.id === saveWlId);
    const wlItems = itemsByWl[saveWlId] ?? [];
    const tplItems = wlItems.map((it) => ({
      name: it.name,
      qty: it.qty,
      unit: it.unit,
      price: it.price,
    }));
    setSaving(true);
    const { data, error } = await supabase
      .from("consumer_fordo_templates")
      .insert({
        consumer_user_id: user.id,
        name,
        note: w?.note ?? null,
        items: tplItems,
      } as never)
      .select("id,name,items,created_at")
      .single();
    setSaving(false);
    if (error) return toast.error(error.message);
    if (data) setTemplates((t) => [data as Template, ...t]);
    toast.success("টেমপ্লেট সংরক্ষণ করা হয়েছে");
    setSaveOpen(false);
  };

  // ----- Duplicate (reuse) -----
  const duplicateWishlist = (w: Wishlist) => {
    const wlItems = itemsByWl[w.id] ?? [];
    if (wlItems.length === 0) return toast.error("এই ফর্দে কোনো পণ্য নেই");
    const payload = {
      items: wlItems.map((it) => ({
        name: it.name,
        qty: it.qty != null ? String(it.qty) : "",
        unit: it.unit ?? "",
      })),
      note: w.note ?? "",
      shopId: w.shop_id,
    };
    try {
      sessionStorage.setItem(`fordo-dup-${w.id}`, JSON.stringify(payload));
    } catch {
      // ignore
    }
    navigate({ to: `/customer/create-fordo?duplicateFrom=${w.id}` });
  };

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">আমার ফর্দ</h1>
          <p className="text-sm text-muted-foreground">সব দোকানে পাঠানো ফর্দ</p>
        </div>
        <Link to="/customer/create-fordo">
          <Button size="sm"><Plus className="mr-1 h-4 w-4" /> নতুন ফর্দ তৈরি করুন</Button>
        </Link>
      </div>

      {/* Favourite shops */}
      {favourites.length > 0 && (
        <section className="space-y-2">
          <h2 className="flex items-center gap-1 text-sm font-bold">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-500" /> প্রিয় দোকান
          </h2>
          <div className="flex flex-wrap gap-2">
            {favourites.map((s) => (
              <Link
                key={s.id}
                to={`/customer/create-fordo?shopId=${s.id}`}
                className="inline-flex items-center gap-1 rounded-full border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent"
              >
                <Store className="h-3 w-3 text-primary" /> {s.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Schedules */}
      {schedules.length > 0 && (
        <section className="space-y-2">
          <h2 className="flex items-center gap-1 text-sm font-bold">
            <CalendarClock className="h-4 w-4" /> সময়সূচী
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {schedules.map((s) => (
              <Card key={s.id} className="flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">
                    {shops[s.shop_id]?.name ?? "Shop"}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {recurrenceLabel(s)} • পরবর্তী: {new Date(s.next_run_at).toLocaleString("bn-BD")}
                  </div>
                  {!s.is_active && (
                    <span className="mt-1 inline-flex rounded-full bg-muted px-2 py-0.5 text-[10px]">বন্ধ</span>
                  )}
                </div>
                <Button variant="ghost" size="icon" onClick={() => toggleSchedule(s)} aria-label="toggle">
                  {s.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => deleteSchedule(s.id)} aria-label="মুছুন">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Templates */}
      {templates.length > 0 && (
        <section className="space-y-2">
          <h2 className="flex items-center gap-1 text-sm font-bold">
            <FileText className="h-4 w-4" /> আমার টেমপ্লেট
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {templates.map((t) => {
              const count = Array.isArray(t.items) ? t.items.length : 0;
              return (
                <Card key={t.id} className="flex items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{t.name}</div>
                    <div className="text-[11px] text-muted-foreground">{count} পণ্য</div>
                  </div>
                  <Link to={`/customer/create-fordo?templateId=${t.id}`}>
                    <Button size="sm" variant="outline">ব্যবহার করুন</Button>
                  </Link>
                  <Button variant="ghost" size="icon" onClick={() => deleteTemplate(t.id)} aria-label="মুছুন">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
        <h2 className="text-sm font-bold">পাঠানো ফর্দ ({filteredItems.length})</h2>
        {monthOptions.length > 0 && (
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="h-8 w-[180px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সব মাস ({items.length})</SelectItem>
                {monthOptions.map((k) => (
                  <SelectItem key={k} value={k}>
                    {monthLabel(k)} ({monthCounts[k]})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      {items.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          <ListChecks className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
          এখনো কোনো ফর্দ পাঠানো হয়নি। দোকানের ফর্দ লিঙ্কে গিয়ে পাঠান।
        </Card>
      ) : filteredItems.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          এই মাসে কোনো ফর্দ পাঠানো হয়নি।
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filteredItems.map((w) => {
            const wlItems = itemsByWl[w.id] ?? [];
            const total = wlTotal(w.id);
            const isOpen = !!expanded[w.id];
            const statusLabel = w.status === "done" ? "সম্পন্ন" : w.status === "seen" ? "দেখেছে" : "নতুন";
            const statusCls = w.status === "done" ? "bg-success/15 text-success" : w.status === "seen" ? "bg-muted text-muted-foreground" : "bg-primary/15 text-primary";
            return (
              <Card key={w.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Store className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate font-semibold">{shops[w.shop_id]?.name ?? "Shop"}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(w.created_at).toLocaleString("bn-BD")}
                        </div>
                      </div>
                      <span className={`inline-flex flex-none items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${statusCls}`}>
                        {statusLabel}
                      </span>
                    </div>
                    {w.note && (
                      <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">📝 {w.note}</p>
                    )}
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{wlItems.length} পণ্য</span>
                      {total > 0 && (
                        <span className="font-bold text-primary tabular-nums">৳ {total.toLocaleString("bn-BD", { maximumFractionDigits: 2 })}</span>
                      )}
                    </div>
                    {wlItems.length > 0 && (
                      <>
                        <button
                          type="button"
                          onClick={() => setExpanded((m) => ({ ...m, [w.id]: !isOpen }))}
                          className="mt-2 text-xs font-medium text-primary hover:underline"
                        >
                          {isOpen ? "তালিকা লুকান" : "তালিকা দেখুন"}
                        </button>
                        {isOpen && (
                          <ul className="mt-2 divide-y rounded-md border bg-muted/30 text-xs">
                            {wlItems.map((it) => {
                              const q = Number(it.qty) || 0;
                              const pr = Number(it.price) || 0;
                              const line = q && pr ? q * pr : pr;
                              const fs = it.fulfillment_status ?? (it.done ? "fulfilled" : "pending");
                              return (
                                <li key={it.id} className="flex items-center justify-between gap-2 px-2 py-1.5">
                                  <div className="min-w-0 flex-1">
                                    <div className={`truncate font-medium ${fs === "unavailable" ? "text-muted-foreground line-through" : ""}`}>
                                      {it.name}
                                      {it.qty ? <span className="text-muted-foreground"> — {it.qty}{it.unit ? ` ${it.unit}` : ""}</span> : null}
                                    </div>
                                    <div className="mt-0.5">{fsBadge(it)}</div>
                                  </div>
                                  {line > 0 && (
                                    <span className="flex-none font-semibold tabular-nums text-foreground">৳{line.toLocaleString("bn-BD", { maximumFractionDigits: 2 })}</span>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                        {isOpen && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Button size="sm" variant="outline" onClick={() => duplicateWishlist(w)}>
                              <Copy className="mr-1 h-3.5 w-3.5" /> আবার পাঠান (নকল)
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => openSaveTemplate(w)}>
                              <Save className="mr-1 h-3.5 w-3.5" /> টেমপ্লেট সংরক্ষণ
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>টেমপ্লেট হিসেবে সংরক্ষণ</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>টেমপ্লেটের নাম</Label>
            <Input
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="যেমন: মাসিক বাজার"
              maxLength={80}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)}>বাতিল</Button>
            <Button disabled={saving} onClick={confirmSaveTemplate}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "সংরক্ষণ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
