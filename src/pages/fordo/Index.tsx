import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@/lib/router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Search, Send, Check, History, Store, X } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { saveFordoDraft, loadFordoDraft, clearFordoDraft } from "@/lib/fordo-draft";

type Item = { id: string; name: string; qty: string; unit: string };
type Shop = { id: string; name: string; phone: string | null; logo_url: string | null };

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

function newId() { return Math.random().toString(36).slice(2, 10); }

function normalizePhone(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("880")) return "+" + d;
  if (d.startsWith("01") && d.length === 11) return "+880" + d.slice(1);
  if (d.length === 10) return "+880" + d;
  return "+" + d;
}

export default function FordoPage() {
  const navigate = useNavigate();
  const { user, session } = useAuth();

  const [items, setItems] = useState<Item[]>([{ id: newId(), name: "", qty: "", unit: "" }]);
  const [note, setNote] = useState("");
  const [shop, setShop] = useState<Shop | null>(null);
  const [shopQuery, setShopQuery] = useState("");
  const [shopResults, setShopResults] = useState<Shop[]>([]);
  const [searching, setSearching] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // On mount: restore draft if any
  useEffect(() => {
    const d = loadFordoDraft();
    if (!d) return;
    if (d.items?.length) setItems(d.items.map((it) => ({ id: newId(), ...it })));
    if (d.note) setNote(d.note);
    if (d.shopId && d.shopName) {
      setShop({ id: d.shopId, name: d.shopName, phone: null, logo_url: d.shopLogo });
    }
    if (d.name) setName(d.name);
    if (d.phone) setPhone(d.phone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If logged-in customer + draft + everything ready, prompt auto-send (do not auto-fire)
  const isReturningWithDraft = useMemo(
    () => !!user && !!shop && items.some((x) => x.name.trim()) && !done,
    [user, shop, items, done],
  );

  const addItem = () => setItems((xs) => [...xs, { id: newId(), name: "", qty: "", unit: "" }]);
  const removeItem = (id: string) => setItems((xs) => xs.length === 1 ? xs : xs.filter((x) => x.id !== id));
  const updateItem = (id: string, patch: Partial<Item>) =>
    setItems((xs) => xs.map((x) => x.id === id ? { ...x, ...patch } : x));

  const searchShops = async () => {
    const q = shopQuery.trim();
    if (q.length < 2) { toast.info("অন্তত ২ অক্ষর লিখুন"); return; }
    setSearching(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/find-shops-by-name`, {
        method: "POST",
        headers: { "content-type": "application/json", apikey: SUPABASE_ANON },
        body: JSON.stringify({ name: q }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "ত্রুটি");
      setShopResults((d.shops ?? []) as Shop[]);
      if ((d.shops ?? []).length === 0) toast.info("কোনো দোকান পাওয়া যায়নি");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSearching(false);
    }
  };

  const validateBase = (): string | null => {
    const cleanItems = items.filter((x) => x.name.trim());
    if (cleanItems.length === 0) return "অন্তত একটি পণ্য যোগ করুন";
    if (!shop) return "একটি দোকান বাছাই করুন";
    if (name.trim().length < 2) return "আপনার নাম দিন";
    const ph = normalizePhone(phone);
    if (!ph || ph.length < 10) return "সঠিক মোবাইল নম্বর দিন";
    return null;
  };

  const persistDraft = () => {
    saveFordoDraft({
      items: items.map((it) => ({ name: it.name, qty: it.qty, unit: it.unit })),
      shopId: shop?.id ?? null,
      shopName: shop?.name ?? null,
      shopLogo: shop?.logo_url ?? null,
      name,
      phone,
      note,
    });
  };

  const sendAuthenticated = async (accessToken: string, shopId: string) => {
    const validItems = items
      .filter((it) => it.name.trim())
      .map((it) => ({ name: it.name.trim(), qty: it.qty || null, unit: it.unit || null }));
    const res = await fetch(`${SUPABASE_URL}/functions/v1/customer-create-wishlist`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        apikey: SUPABASE_ANON,
        authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ shop_id: shopId, note: note || null, items: validItems }),
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error ?? "ফর্দ পাঠানো যায়নি");
    return d as { ok: true; wishlist_id: string };
  };

  // Path A: not logged in → create account + send
  const handleCreateAndSend = async () => {
    const err = validateBase();
    if (err) return toast.error(err);
    if (!/^\d{4}$/.test(pin)) return toast.error("৪ সংখ্যার PIN তৈরি করুন");
    if (!shop) return;

    persistDraft(); // safety net

    setSubmitting(true);
    try {
      const ph = normalizePhone(phone);
      const signupRes = await fetch(`${SUPABASE_URL}/functions/v1/customer-signup-with-pin`, {
        method: "POST",
        headers: { "content-type": "application/json", apikey: SUPABASE_ANON },
        body: JSON.stringify({ phone: ph, full_name: name.trim(), pin }),
      });
      const sd = await signupRes.json();

      if (!signupRes.ok || sd.error) {
        if (sd.error === "phone_exists") {
          toast.message("এই নম্বরে account আছে — Login করুন। আপনার ফর্দ save করা আছে।", { duration: 4500 });
          // Send to home login with redirect-back
          navigate({
            to: "/",
            search: { mode: "login", role: "customer", phone: ph, redirect: "/fordo" } as never,
          });
          return;
        }
        if (sd.error === "rate_limit") return toast.error("একটু পরে আবার চেষ্টা করুন");
        return toast.error(sd.error || "Account তৈরি ব্যর্থ");
      }

      // Set session, then send fordo
      const { error: sessErr } = await supabase.auth.setSession({
        access_token: sd.access_token,
        refresh_token: sd.refresh_token,
      });
      if (sessErr) throw sessErr;

      await sendAuthenticated(sd.access_token, shop.id);
      clearFordoDraft();
      toast.success("Account তৈরি ও ফর্দ পাঠানো হয়েছে");
      setDone(true);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  // Path B: already logged in → just send
  const handleSendOnly = async () => {
    const err = validateBase();
    if (err) return toast.error(err);
    if (!shop || !session?.access_token) return;
    setSubmitting(true);
    try {
      await sendAuthenticated(session.access_token, shop.id);
      clearFordoDraft();
      toast.success("ফর্দ পাঠানো হয়েছে");
      setDone(true);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="flex min-h-screen flex-col bg-muted/30">
        <SiteHeader />
        <main className="flex flex-1 items-center justify-center p-4">
          <Card className="w-full max-w-sm p-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Check className="h-7 w-7" />
            </div>
            <h1 className="mt-3 text-xl font-bold">ধন্যবাদ!</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              আপনার ফর্দ <span className="font-semibold text-foreground">{shop?.name}</span>-কে পাঠানো হয়েছে।
            </p>
            <div className="mt-5 grid gap-2">
              <Button asChild>
                <Link to="/customer/my-fordo">
                  <History className="mr-2 h-4 w-4" />
                  আমার সব ফর্দ দেখুন
                </Link>
              </Button>
              <Button variant="outline" onClick={() => {
                setItems([{ id: newId(), name: "", qty: "", unit: "" }]);
                setNote("");
                setShop(null);
                setShopQuery("");
                setShopResults([]);
                setPin("");
                setDone(false);
              }}>নতুন ফর্দ শুরু করুন</Button>
            </div>
          </Card>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <SiteHeader />
      <main className="flex-1 pb-20">
        <div className="mx-auto max-w-md px-4 pt-6">
          <h1 className="text-2xl font-extrabold">ফর্দ পাঠান</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            পণ্য লিখুন, দোকান বাছুন, পাঠিয়ে দিন।
          </p>

          {/* (a) Items */}
          <Card className="mt-4 p-4">
            <div className="mb-2 text-sm font-semibold">পণ্যের তালিকা</div>
            <div className="space-y-2">
              {items.map((it) => (
                <div key={it.id} className="grid grid-cols-12 gap-1.5">
                  <Input
                    className="col-span-6"
                    placeholder="পণ্যের নাম"
                    value={it.name}
                    onChange={(e) => updateItem(it.id, { name: e.target.value })}
                  />
                  <Input
                    className="col-span-2"
                    placeholder="পরিমাণ"
                    inputMode="decimal"
                    value={it.qty}
                    onChange={(e) => updateItem(it.id, { qty: e.target.value })}
                  />
                  <Input
                    className="col-span-3"
                    placeholder="একক"
                    value={it.unit}
                    onChange={(e) => updateItem(it.id, { unit: e.target.value })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="col-span-1"
                    onClick={() => removeItem(it.id)}
                    disabled={items.length === 1}
                    aria-label="মুছুন"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" size="sm" className="mt-3 w-full" onClick={addItem}>
              <Plus className="mr-1 h-4 w-4" /> আরেকটি যোগ করুন
            </Button>
            <Input
              className="mt-3"
              placeholder="নোট (ঐচ্ছিক) — যেমন: সকাল ১০টার মধ্যে দিন"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Card>

          {/* (b) Shop picker */}
          <Card className="mt-3 p-4">
            <div className="mb-2 text-sm font-semibold">দোকান বাছাই করুন</div>
            {shop ? (
              <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-2.5">
                {shop.logo_url ? (
                  <img src={shop.logo_url} alt="" className="h-10 w-10 rounded-md border object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-card">
                    <Store className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{shop.name}</div>
                  {shop.phone && <div className="text-xs text-muted-foreground">{shop.phone}</div>}
                </div>
                <Button variant="ghost" size="icon" onClick={() => { setShop(null); setShopResults([]); }} aria-label="পরিবর্তন">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <Input
                    placeholder="দোকানের নাম লিখুন"
                    value={shopQuery}
                    onChange={(e) => setShopQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void searchShops(); } }}
                  />
                  <Button type="button" onClick={searchShops} disabled={searching}>
                    {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
                {shopResults.length > 0 && (
                  <div className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-lg border bg-card p-1">
                    {shopResults.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => { setShop(s); setShopResults([]); setShopQuery(""); }}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-accent"
                      >
                        {s.logo_url ? (
                          <img src={s.logo_url} alt="" className="h-8 w-8 rounded-md border object-cover" />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-md border bg-muted">
                            <Store className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{s.name}</div>
                          {s.phone && <div className="text-[11px] text-muted-foreground">{s.phone}</div>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </Card>

          {/* (c) Account / Send */}
          <Card className="mt-3 p-4">
            {user ? (
              isReturningWithDraft ? (
                <>
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
                    আপনি Login করেছেন ✓ — উপরের তথ্য মিলিয়ে নিচের button থেকে ফর্দ পাঠিয়ে দিন।
                  </div>
                  <Button className="mt-3 w-full" onClick={handleSendOnly} disabled={submitting}>
                    {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    ফর্দ পাঠান
                  </Button>
                </>
              ) : (
                <>
                  <div className="mb-2 text-sm font-semibold">আপনার তথ্য</div>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs">নাম</Label>
                      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="আপনার নাম" />
                    </div>
                    <div>
                      <Label className="text-xs">মোবাইল</Label>
                      <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" inputMode="tel" />
                    </div>
                  </div>
                  <Button className="mt-3 w-full" onClick={handleSendOnly} disabled={submitting}>
                    {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    ফর্দ পাঠান
                  </Button>
                </>
              )
            ) : (
              <>
                <div className="mb-2 text-sm font-semibold">নাম, মোবাইল ও PIN দিন</div>
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs">নাম</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="আপনার নাম" />
                  </div>
                  <div>
                    <Label className="text-xs">মোবাইল নম্বর</Label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" inputMode="tel" />
                  </div>
                  <div>
                    <Label className="text-xs">৪ সংখ্যার PIN তৈরি করুন</Label>
                    <Input
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="••••"
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                    />
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      পরে এই PIN ও মোবাইল দিয়ে আপনার সব ফর্দ দেখতে পারবেন।
                    </p>
                  </div>
                </div>
                <Button className="mt-3 w-full" onClick={handleCreateAndSend} disabled={submitting}>
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Account তৈরি করে ফর্দ পাঠান
                </Button>
                <p className="mt-2 text-center text-[11px] text-muted-foreground">
                  ইতিমধ্যে account আছে?{" "}
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => {
                      persistDraft();
                      navigate({
                        to: "/",
                        search: { mode: "login", role: "customer", redirect: "/fordo" } as never,
                      });
                    }}
                  >
                    Login করুন
                  </button>
                </p>
              </>
            )}
          </Card>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
