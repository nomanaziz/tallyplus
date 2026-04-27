import { useEffect, useState } from "react";
import { Link, useNavigate } from "@/lib/router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2, ArrowLeft, ArrowRight, Send, Search, Store, MapPin } from "lucide-react";
import { toast } from "sonner";

type Item = { name: string; qty: string; unit: string };
type Shop = { id: string; name: string; phone: string; logo_url: string | null; owner_id: string };

export default function CreateFordo() {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [items, setItems] = useState<Item[]>([{ name: "", qty: "", unit: "" }]);
  const [note, setNote] = useState("");
  const [phoneSearch, setPhoneSearch] = useState("");
  const [nameSearch, setNameSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Shop[]>([]);
  const [nearby, setNearby] = useState<Shop[]>([]);
  const [loadingNearby, setLoadingNearby] = useState(true);
  const [sending, setSending] = useState(false);
  const [profile, setProfile] = useState<{ division: string | null; district: string | null; upazila: string | null } | null>(null);

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
  }, [user]);

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

  const searchByPhone = async () => {
    const ph = phoneSearch.trim();
    if (!ph) return;
    setSearching(true);
    setResults([]);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/find-shops-by-phone`,
        {
          method: "POST",
          headers: { "content-type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
          body: JSON.stringify({ phone: ph }),
        },
      );
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "ত্রুটি");
      setResults((d.shops ?? []) as Shop[]);
      if ((d.shops ?? []).length === 0) toast.info("এই নম্বরে কোনো দোকান পাওয়া যায়নি");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSearching(false);
    }
  };

  const searchByName = async () => {
    const q = nameSearch.trim();
    if (q.length < 2) return;
    setSearching(true);
    const { data } = await supabase
      .from("shops")
      .select("id,name,phone,logo_url,owner_id")
      .ilike("name", `%${q}%`)
      .is("deleted_at", null)
      .limit(20);
    setResults((data ?? []) as Shop[]);
    setSearching(false);
    if ((data ?? []).length === 0) toast.info("কোনো দোকান পাওয়া যায়নি");
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
          <Button className="w-full" onClick={goNext}>
            পরবর্তী <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Card>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <Card className="p-4">
            <Label className="mb-2 block text-sm font-semibold">মোবাইল নম্বর দিয়ে দোকান খুঁজুন</Label>
            <div className="flex gap-2">
              <Input
                placeholder="01XXXXXXXXX"
                value={phoneSearch}
                onChange={(e) => setPhoneSearch(e.target.value)}
                inputMode="tel"
              />
              <Button onClick={searchByPhone} disabled={searching}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </Card>

          <Card className="p-4">
            <Label className="mb-2 block text-sm font-semibold">দোকানের নাম দিয়ে খুঁজুন</Label>
            <div className="flex gap-2">
              <Input
                placeholder="দোকানের নাম..."
                value={nameSearch}
                onChange={(e) => setNameSearch(e.target.value)}
              />
              <Button onClick={searchByName} disabled={searching}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </Card>

          {results.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">খোঁজার ফলাফল</h3>
              {results.map((s) => (
                <ShopRow key={s.id} shop={s} onSend={send} sending={sending} />
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
              nearby.map((s) => <ShopRow key={s.id} shop={s} onSend={send} sending={sending} />)
            )}
          </div>

          <Button variant="outline" onClick={() => setStep(1)} className="w-full">
            <ArrowLeft className="mr-2 h-4 w-4" /> পূর্বের ধাপ
          </Button>
        </div>
      )}
    </div>
  );
}

function ShopRow({ shop, onSend, sending }: { shop: Shop; onSend: (s: Shop) => void; sending: boolean }) {
  return (
    <Card className="flex items-center gap-3 p-3">
      <div className="flex h-10 w-10 flex-none items-center justify-center overflow-hidden rounded-xl bg-primary/10 text-primary">
        {shop.logo_url ? <img src={shop.logo_url} alt="" className="h-full w-full object-cover" /> : <Store className="h-5 w-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">{shop.name}</div>
        <div className="truncate text-xs text-muted-foreground">{shop.phone}</div>
      </div>
      <Button size="sm" onClick={() => onSend(shop)} disabled={sending}>
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="mr-1 h-4 w-4" /> পাঠান</>}
      </Button>
    </Card>
  );
}