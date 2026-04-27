import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/router";
import { Loader2, Store, ListChecks, Plus, FileText, CalendarClock, Trash2, Pause, Play, Star } from "lucide-react";
import { toast } from "sonner";

type Wishlist = {
  id: string;
  shop_id: string;
  customer_name: string;
  customer_phone: string;
  status: string;
  note: string | null;
  created_at: string;
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
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Wishlist[]>([]);
  const [shops, setShops] = useState<Record<string, Shop>>({});
  const [templates, setTemplates] = useState<Template[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [favourites, setFavourites] = useState<Shop[]>([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      const { data: wls } = await supabase
        .from("customer_wishlists")
        .select("id, shop_id, customer_name, customer_phone, status, note, created_at")
        .eq("consumer_user_id", user.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(100);
      if (cancelled) return;
      const list = (wls ?? []) as Wishlist[];
      setItems(list);
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
      const ids = Array.from(new Set([
        ...list.map((w) => w.shop_id),
        ...((schRes.data ?? []) as Schedule[]).map((s) => s.shop_id),
        ...favShopIds,
      ]));
      if (ids.length > 0) {
        const { data: ss } = await supabase.from("shops").select("id, name").in("id", ids);
        const map: Record<string, Shop> = {};
        for (const s of (ss ?? []) as Shop[]) map[s.id] = s;
        setShops(map);
        setFavourites(favShopIds.map((id) => map[id]).filter(Boolean));
      }
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

      <h2 className="pt-2 text-sm font-bold">পাঠানো ফর্দ</h2>
      {items.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          <ListChecks className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
          এখনো কোনো ফর্দ পাঠানো হয়নি। দোকানের ফর্দ লিঙ্কে গিয়ে পাঠান।
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((w) => (
            <Card key={w.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Store className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{shops[w.shop_id]?.name ?? "Shop"}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(w.created_at).toLocaleString("bn-BD")}
                  </div>
                  {w.note && (
                    <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{w.note}</p>
                  )}
                  <div className="mt-2 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium capitalize">
                    {w.status}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
