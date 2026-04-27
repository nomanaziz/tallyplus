import { useEffect, useState } from "react";
import { Link, useNavigate, useSearch } from "@/lib/router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2, ArrowLeft, ArrowRight, Send, Search, Store, MapPin, Save, CalendarClock, Star } from "lucide-react";
import { toast } from "sonner";
import { VoiceFordoMic } from "@/components/app/VoiceFordoMic";
import { ScheduleFordoDialog } from "@/components/customer/ScheduleFordoDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

type Item = { name: string; qty: string; unit: string };
type Shop = { id: string; name: string; phone: string; logo_url: string | null; owner_id: string };

export default function CreateFordo() {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const search = useSearch() as { templateId?: string };
  const [step, setStep] = useState<1 | 2>(1);
  const [items, setItems] = useState<Item[]>([{ name: "", qty: "", unit: "" }]);
  const [note, setNote] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Shop[]>([]);
  const [nearby, setNearby] = useState<Shop[]>([]);
  const [loadingNearby, setLoadingNearby] = useState(true);
  const [sending, setSending] = useState(false);
  const [profile, setProfile] = useState<{ division: string | null; district: string | null; upazila: string | null } | null>(null);
  const [showSaveTpl, setShowSaveTpl] = useState(false);
  const [tplName, setTplName] = useState("");
  const [savingTpl, setSavingTpl] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [favourites, setFavourites] = useState<Shop[]>([]);
  const [favIds, setFavIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    void supabase
      .from("consumer_profiles")
      .select("division,district,upazila")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setProfile(data as never);
        void loadNearby(data as never);
      });
    void loadFavourites();
  }, [user]);

  const loadFavourites = async () => {
    if (!user) return;
    const { data: favRows } = await supabase
      .from("consumer_favourite_shops")
      .select("shop_id")
      .eq("consumer_id", user.id);
    const ids = (favRows ?? []).map((r) => r.shop_id as string);
    setFavIds(new Set(ids));
    if (ids.length === 0) {
      setFavourites([]);
      return;
    }
    const { data: ss } = await supabase
      .from("shops")
      .select("id,name,phone,logo_url,owner_id")
      .in("id", ids)
      .is("deleted_at", null);
    setFavourites((ss ?? []) as Shop[]);
  };

  const toggleFavourite = async (shop: Shop) => {
    if (!user) return toast.error("লগইন করুন");
    if (favIds.has(shop.id)) {
      const { error } = await supabase
        .from("consumer_favourite_shops")
        .delete()
        .eq("consumer_id", user.id)
        .eq("shop_id", shop.id);
      if (error) return toast.error(error.message);
      setFavIds((s) => {
        const n = new Set(s);
        n.delete(shop.id);
        return n;
      });
      setFavourites((arr) => arr.filter((x) => x.id !== shop.id));
      toast.success("প্রিয় তালিকা থেকে সরানো হয়েছে");
    } else {
      const { error } = await supabase
        .from("consumer_favourite_shops")
        .insert({ consumer_id: user.id, shop_id: shop.id } as never);
      if (error) return toast.error(error.message);
      setFavIds((s) => new Set(s).add(shop.id));
      setFavourites((arr) => (arr.find((x) => x.id === shop.id) ? arr : [shop, ...arr]));
      toast.success("✓ প্রিয় তালিকায় যোগ হয়েছে");
    }
  };

  // Preload template if ?templateId= is set
  useEffect(() => {
    if (!user || !search.templateId) return;
    const tplId = search.templateId;
    void (async () => {
      const { data } = await supabase
        .from("consumer_fordo_templates")
        .select("name,note,items")
        .eq("id", tplId)
        .eq("consumer_user_id", user.id)
        .maybeSingle();
      if (data) {
        const tplItems = (data.items as Array<{ name?: string; qty?: string | number | null; unit?: string | null }> | null) ?? [];
        const mapped: Item[] = tplItems.map((it) => ({
          name: it.name ?? "",
          qty: it.qty != null ? String(it.qty) : "",
          unit: it.unit ?? "",
        }));
        if (mapped.length > 0) setItems(mapped);
        if (data.note) setNote(data.note);
        toast.success(`টেমপ্লেট "${data.name}" লোড হয়েছে`);
      }
    })();
  }, [user, search.templateId]);

  const loadNearby = async (
    p: { division: string | null; district: string | null; upazila: string | null } | null,
  ) => {
    setLoadingNearby(true);
    // Get shops with location matching consumer's area, prioritised
    const { data: locs } = await supabase
      .from("seller_locations")
      .select("shop_id,division,district,upazila");
    if (!locs) {
      setNearby([]);
      setLoadingNearby(false);
      return;
    }
    const score = (l: { division: string | null; district: string | null; upazila: string | null }) => {
      if (!p) return 0;
      let s = 0;
      if (p.upazila && l.upazila === p.upazila) s += 4;
      if (p.district && l.district === p.district) s += 2;
      if (p.division && l.division === p.division) s += 1;
      return s;
    };
    const ranked = [...locs].sort((a, b) => score(b) - score(a)).slice(0, 24);
    const ids = ranked.map((l) => l.shop_id);
    if (ids.length === 0) {
      setNearby([]);
      setLoadingNearby(false);
      return;
    }
    const { data: shops } = await supabase
      .from("shops")
      .select("id,name,phone,logo_url,owner_id")
      .in("id", ids)
      .is("deleted_at", null);
    const byId: Record<string, Shop> = {};
    for (const s of (shops ?? []) as Shop[]) byId[s.id] = s;
    const ordered = ids.map((id) => byId[id]).filter(Boolean);
    setNearby(ordered);
    setLoadingNearby(false);
  };

  const updateItem = (i: number, k: keyof Item, v: string) => {
    setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)));
  };
  const addItem = () => setItems((a) => [...a, { name: "", qty: "", unit: "" }]);
  const removeItem = (i: number) => setItems((a) => a.length > 1 ? a.filter((_, idx) => idx !== i) : a);

  const goNext = () => {
    const valid = items.filter((it) => it.name.trim());
    if (valid.length === 0) return toast.error("অন্তত একটি পণ্য যোগ করুন");
    setStep(2);
  };

  const runSearch = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    const isPhone = /^[0-9+\-\s]{4,}$/.test(q);
    setSearching(true);
    setResults([]);
    try {
      if (isPhone) {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/find-shops-by-phone`,
          {
            method: "POST",
            headers: { "content-type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
            body: JSON.stringify({ phone: q }),
          },
        );
        const d = await res.json();
        if (!res.ok) throw new Error(d.error ?? "ত্রুটি");
        setResults((d.shops ?? []) as Shop[]);
        if ((d.shops ?? []).length === 0) toast.info("কোনো দোকান পাওয়া যায়নি");
      } else {
        if (q.length < 2) {
          toast.info("অন্তত ২ অক্ষর লিখুন");
          return;
        }
        const { data } = await supabase
          .from("shops")
          .select("id,name,phone,logo_url,owner_id")
          .ilike("name", `%${q}%`)
          .is("deleted_at", null)
          .limit(20);
        setResults((data ?? []) as Shop[]);
        if ((data ?? []).length === 0) toast.info("কোনো দোকান পাওয়া যায়নি");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSearching(false);
    }
  };

  const send = async (shop: Shop) => {
    if (!session?.access_token) return toast.error("লগইন করুন");
    setSending(true);
    try {
      const validItems = items
        .filter((it) => it.name.trim())
        .map((it) => ({ name: it.name, qty: it.qty || null, unit: it.unit || null }));
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/customer-create-wishlist`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ shop_id: shop.id, note, items: validItems }),
        },
      );
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "ত্রুটি");
      toast.success(`"${shop.name}" দোকানে ফর্দ পাঠানো হয়েছে`);
      navigate({ to: "/customer/my-fordo" });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link to="/customer/my-fordo" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold">নতুন ফর্দ তৈরি করুন</h1>
      </div>

      <div className="flex items-center gap-3 text-xs">
        <div className={`flex h-7 w-7 items-center justify-center rounded-full font-bold ${step === 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>1</div>
        <div className="text-sm">পণ্য</div>
        <div className="h-px flex-1 bg-border" />
        <div className={`flex h-7 w-7 items-center justify-center rounded-full font-bold ${step === 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>2</div>
        <div className="text-sm">দোকান বাছাই</div>
      </div>

      {step === 1 && (
        <Card className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold">পণ্যের তালিকা</h2>
              <p className="text-[11px] text-muted-foreground">
                মাইকে চাপ দিয়ে কথা বলে যোগ করুন
              </p>
            </div>
            <VoiceFordoMic
              onItems={(spoken) => {
                setItems((cur) => {
                  const next = [...cur];
                  let idx = 0;
                  for (const it of spoken) {
                    const emptyAt = next.findIndex((r) => !r.name.trim());
                    if (emptyAt >= 0 && idx === 0) {
                      next[emptyAt] = {
                        name: it.name,
                        qty: it.qty ?? next[emptyAt].qty,
                        unit: it.unit ?? next[emptyAt].unit,
                      };
                    } else {
                      next.push({
                        name: it.name,
                        qty: it.qty ?? "",
                        unit: it.unit ?? "",
                      });
                    }
                    idx++;
                  }
                  return next;
                });
              }}
            />
          </div>
          {items.map((it, i) => (
            <div key={i} className="grid grid-cols-12 gap-2">
              <Input
                className="col-span-6"
                placeholder="পণ্যের নাম"
                value={it.name}
                onChange={(e) => updateItem(i, "name", e.target.value)}
              />
              <Input
                className="col-span-3"
                placeholder="পরিমাণ"
                value={it.qty}
                onChange={(e) => updateItem(i, "qty", e.target.value)}
                inputMode="decimal"
              />
              <Input
                className="col-span-2"
                placeholder="একক"
                value={it.unit}
                onChange={(e) => updateItem(i, "unit", e.target.value)}
              />
              <Button
                variant="ghost"
                size="icon"
                className="col-span-1"
                onClick={() => removeItem(i)}
                aria-label="মুছুন"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addItem}>
            <Plus className="mr-1 h-4 w-4" /> আরও যোগ করুন
          </Button>
          <div className="space-y-1">
            <Label>নোট (ইচ্ছাধীন)</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="দোকানদারকে কোনো বার্তা?" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={() => {
              const valid = items.filter((it) => it.name.trim());
              if (valid.length === 0) { toast.error("অন্তত একটি পণ্য যোগ করুন"); return; }
              setTplName("");
              setShowSaveTpl(true);
            }}>
              <Save className="mr-1 h-4 w-4" /> টেমপ্লেট সংরক্ষণ
            </Button>
            <Button variant="outline" size="sm" onClick={() => {
              const valid = items.filter((it) => it.name.trim());
              if (valid.length === 0) { toast.error("অন্তত একটি পণ্য যোগ করুন"); return; }
              setShowSchedule(true);
            }}>
              <CalendarClock className="mr-1 h-4 w-4" /> সময়সূচী সেট করুন
            </Button>
          </div>
          <Button className="w-full" onClick={goNext}>
            এখনই পাঠান (দোকান বাছাই) <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Card>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <Card className="p-4">
            <Label className="mb-2 block text-sm font-semibold">দোকান খুঁজুন</Label>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void runSearch();
              }}
            >
              <Input
                placeholder="মোবাইল নম্বর বা দোকানের নাম..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button type="submit" disabled={searching}>
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </form>
          </Card>

          {favourites.length > 0 && (
            <div className="space-y-2">
              <h3 className="flex items-center gap-1 text-sm font-semibold">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-500" /> আপনার প্রিয় দোকান
              </h3>
              {favourites.map((s) => (
                <ShopRow
                  key={s.id}
                  shop={s}
                  onSend={send}
                  sending={sending}
                  isFav={favIds.has(s.id)}
                  onToggleFav={toggleFavourite}
                />
              ))}
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">খোঁজার ফলাফল</h3>
              {results.map((s) => (
                <ShopRow
                  key={s.id}
                  shop={s}
                  onSend={send}
                  sending={sending}
                  isFav={favIds.has(s.id)}
                  onToggleFav={toggleFavourite}
                />
              ))}
            </div>
          )}

          <div className="space-y-2">
            <h3 className="flex items-center gap-1 text-sm font-semibold">
              <MapPin className="h-4 w-4" /> আপনার এলাকার দোকান
            </h3>
            {!profile?.division && (
              <Card className="p-3 text-xs text-muted-foreground">
                আপনার ঠিকানা যোগ করলে কাছের দোকান আগে দেখাবে।{" "}
                <Link to="/customer/profile" className="text-primary underline">প্রোফাইল আপডেট</Link>
              </Card>
            )}
            {loadingNearby ? (
              <div className="flex h-20 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : nearby.length === 0 ? (
              <Card className="p-4 text-center text-sm text-muted-foreground">কোনো দোকান পাওয়া যায়নি</Card>
            ) : (
              nearby.map((s) => (
                <ShopRow
                  key={s.id}
                  shop={s}
                  onSend={send}
                  sending={sending}
                  isFav={favIds.has(s.id)}
                  onToggleFav={toggleFavourite}
                />
              ))
            )}
          </div>

          <Button variant="outline" onClick={() => setStep(1)} className="w-full">
            <ArrowLeft className="mr-2 h-4 w-4" /> পূর্বের ধাপ
          </Button>
        </div>
      )}

      {/* Save template dialog */}
      <Dialog open={showSaveTpl} onOpenChange={setShowSaveTpl}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>টেমপ্লেট হিসেবে সংরক্ষণ</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>টেমপ্লেটের নাম</Label>
            <Input
              value={tplName}
              onChange={(e) => setTplName(e.target.value)}
              placeholder="যেমন: মাসিক বাজার"
              maxLength={80}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveTpl(false)}>বাতিল</Button>
            <Button
              disabled={savingTpl}
              onClick={async () => {
                const name = tplName.trim();
                if (!name) return toast.error("একটি নাম দিন");
                if (!user) return toast.error("লগইন করুন");
                const validItems = items
                  .filter((it) => it.name.trim())
                  .map((it) => ({ name: it.name.trim(), qty: it.qty || null, unit: it.unit || null }));
                setSavingTpl(true);
                const { error } = await supabase.from("consumer_fordo_templates").insert({
                  consumer_user_id: user.id,
                  name,
                  note: note || null,
                  items: validItems,
                } as never);
                setSavingTpl(false);
                if (error) return toast.error(error.message);
                toast.success("টেমপ্লেট সংরক্ষণ করা হয়েছে");
                setShowSaveTpl(false);
              }}
            >
              {savingTpl ? <Loader2 className="h-4 w-4 animate-spin" /> : "সংরক্ষণ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ScheduleFordoDialog
        open={showSchedule}
        onOpenChange={setShowSchedule}
        items={items}
        note={note}
      />
    </div>
  );
}

function ShopRow({
  shop,
  onSend,
  sending,
  isFav,
  onToggleFav,
}: {
  shop: Shop;
  onSend: (s: Shop) => void;
  sending: boolean;
  isFav?: boolean;
  onToggleFav?: (s: Shop) => void;
}) {
  return (
    <Card className="flex items-center gap-3 p-3">
      <div className="flex h-10 w-10 flex-none items-center justify-center overflow-hidden rounded-xl bg-primary/10 text-primary">
        {shop.logo_url ? <img src={shop.logo_url} alt="" className="h-full w-full object-cover" /> : <Store className="h-5 w-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">{shop.name}</div>
        <div className="truncate text-xs text-muted-foreground">{shop.phone}</div>
      </div>
      {onToggleFav && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onToggleFav(shop)}
          aria-label={isFav ? "প্রিয় থেকে সরান" : "প্রিয় তালিকায় যোগ"}
        >
          <Star className={`h-4 w-4 ${isFav ? "fill-yellow-400 text-yellow-500" : "text-muted-foreground"}`} />
        </Button>
      )}
      <Button size="sm" onClick={() => onSend(shop)} disabled={sending}>
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="mr-1 h-4 w-4" /> পাঠান</>}
      </Button>
    </Card>
  );
}