import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearch } from "@/lib/router";
import { Loader2, Plus, Send, Trash2, Check, X, Copy, MessageCircle, History, KeyRound, Settings2, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CatalogProductPicker, type CatalogProduct } from "@/components/app/CatalogProductPicker";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { VoiceFordoMic } from "@/components/app/VoiceFordoMic";

type SearchParams = { reuse?: string; tpl?: string };



type Item = { id: string; name: string; qty: string; unit: string; price: string };

const PALETTE: { key: string; label: string; bg: string; ring: string }[] = [
  { key: "default", label: "Default", bg: "bg-card", ring: "ring-border" },
  { key: "mint", label: "Mint", bg: "bg-[oklch(0.94_0.05_150)]", ring: "ring-[oklch(0.75_0.1_150)]" },
  { key: "peach", label: "Peach", bg: "bg-[oklch(0.94_0.06_60)]", ring: "ring-[oklch(0.75_0.12_60)]" },
  { key: "lavender", label: "Lavender", bg: "bg-[oklch(0.93_0.05_300)]", ring: "ring-[oklch(0.75_0.1_300)]" },
  { key: "sky", label: "Sky", bg: "bg-[oklch(0.94_0.05_240)]", ring: "ring-[oklch(0.75_0.1_240)]" },
  { key: "butter", label: "Butter", bg: "bg-[oklch(0.95_0.07_95)]", ring: "ring-[oklch(0.78_0.12_95)]" },
];

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

function PublicWishlistPage() {
  const { slug } = useParams();
  const search = useSearch();
  const [shopName, setShopName] = useState("");
  const [shopLogo, setShopLogo] = useState<string | null>(null);
  const [shopTypeCode, setShopTypeCode] = useState<string | null>(null);
  const [loadingShop, setLoadingShop] = useState(true);
  const [shopError, setShopError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [color, setColor] = useState<string>("mint");
  const [items, setItems] = useState<Item[]>([{ id: newId(), name: "", qty: "", unit: "", price: "" }]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [issuedPin, setIssuedPin] = useState<string | null>(null);
  const [savedToken, setSavedToken] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [hasExistingProfile, setHasExistingProfile] = useState(false);
  const [simpleMode, setSimpleMode] = useState(true);
  const [online, setOnline] = useState<boolean>(typeof navigator === "undefined" ? true : navigator.onLine);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const palette = useMemo(() => PALETTE.find((p) => p.key === color) ?? PALETTE[0], [color]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("wishlist-shop-info", {
          body: { slug },
        });
        if (cancelled) return;
        if (error || !data || (data as { error?: string }).error) {
          setShopError((data as { error?: string })?.error ?? error?.message ?? "Shop not found");
        } else {
          setShopName((data as { shop_name: string }).shop_name);
          setShopLogo((data as { shop_logo_url: string | null }).shop_logo_url);
          setShopTypeCode((data as { shop_type_code?: string | null }).shop_type_code ?? null);
        }
      } catch (e) {
        if (!cancelled) setShopError((e as Error).message);
      } finally {
        if (!cancelled) setLoadingShop(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // Pre-fill from a previous wishlist or template (passed via sessionStorage by /my page)
  useEffect(() => {
    if (!search.reuse && !search.tpl) return;
    try {
      const key = search.reuse ? `wl-reuse-${search.reuse}` : `wl-tpl-${search.tpl}`;
      const raw = sessionStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        name?: string;
        phone?: string;
        address?: string;
        items?: Array<{ name: string; qty?: number | null; unit?: string | null; price?: number | null }>;
      };
      if (parsed.name) setName(parsed.name);
      if (parsed.phone) setPhone(parsed.phone);
      if (parsed.address) setAddress(parsed.address);
      if (parsed.items && parsed.items.length > 0) {
        setItems(
          parsed.items.map((it) => ({
            id: newId(),
            name: it.name,
            qty: it.qty != null ? String(it.qty) : "",
            unit: it.unit ?? "",
            price: it.price != null ? String(it.price) : "",
          })),
        );
      }
    } catch {
      // ignore
    }
  }, [search.reuse, search.tpl]);

  // Load saved token + PIN-known flag for this slug from localStorage
  useEffect(() => {
    try {
      const t = localStorage.getItem(`wl-token-${slug}`);
      if (t) setSavedToken(t);
      const knownPhones = JSON.parse(localStorage.getItem(`wl-phones-${slug}`) ?? "[]") as string[];
      if (phone && knownPhones.includes(phone.replace(/[^\d+]/g, ""))) setHasExistingProfile(true);
    } catch {
      // ignore
    }
  }, [slug, phone]);

  const addItem = () => setItems((xs) => [...xs, { id: newId(), name: "", qty: "", unit: "", price: "" }]);
  const removeItem = (id: string) => setItems((xs) => xs.filter((x) => x.id !== id));
  const updateItem = (id: string, patch: Partial<Item>) =>
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const submit = async () => {
    const cleanItems = items
      .map((x) => ({ name: x.name.trim(), qty: x.qty.trim(), unit: x.unit.trim(), price: x.price.trim() }))
      .filter((x) => x.name.length > 0);
    if (!name.trim()) {
      toast.error("আপনার নাম দিন");
      return;
    }
    if (!/^[0-9+\-\s()]{6,20}$/.test(phone.trim())) {
      toast.error("সঠিক মোবাইল নাম্বার দিন");
      return;
    }
    if (!/^\d{4,6}$/.test(pinInput.trim())) {
      toast.error(
        hasExistingProfile
          ? "আপনার ৪-৬ digit PIN দিন"
          : "৪-৬ digit-এর একটি PIN তৈরি করুন",
      );
      return;
    }
    if (cleanItems.length === 0) {
      toast.error("অন্তত একটি পণ্য যোগ করুন");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("submit-wishlist", {
        body: {
          slug,
          customer_name: name.trim(),
          customer_phone: phone.trim(),
          customer_address: address.trim() || null,
          note: note.trim() || null,
          color,
          pin: pinInput.trim() || null,
          items: cleanItems.map((it) => ({
            name: it.name,
            qty: it.qty ? Number(it.qty) : null,
            price: it.price ? Number(it.price) : null,
            unit: it.unit || null,
          })),
        },
      });
      const resp = (data ?? {}) as {
        ok?: boolean;
        pin?: string | null;
        token?: string;
        error?: string;
      };
      const err = resp.error ?? error?.message;
      if (err) {
        toast.error(err);
      } else {
        if (resp.token) {
          try {
            localStorage.setItem(`wl-token-${slug}`, resp.token);
            const np = phone.trim().replace(/[^\d+]/g, "");
            const known = JSON.parse(localStorage.getItem(`wl-phones-${slug}`) ?? "[]") as string[];
            if (!known.includes(np)) {
              known.push(np);
              localStorage.setItem(`wl-phones-${slug}`, JSON.stringify(known));
            }
            setSavedToken(resp.token);
          } catch {
            // ignore
          }
        }
        if (resp.pin) setIssuedPin(resp.pin);
        setDone(true);
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setName("");
    setPhone("");
    setNote("");
    setPinInput("");
    setIssuedPin(null);
    setItems([{ id: newId(), name: "", qty: "", unit: "", price: "" }]);
    setDone(false);
  };

  if (loadingShop) {
    return (
      <div className="flex min-h-screen flex-col bg-muted/30">
        <SiteHeader />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
        <SiteFooter />
      </div>
    );
  }

  if (shopError) {
    return (
      <div className="flex min-h-screen flex-col bg-muted/30">
        <SiteHeader />
        <main className="flex flex-1 items-center justify-center p-6">
          <div className="max-w-sm rounded-2xl border bg-card p-6 text-center shadow-sm">
            <X className="mx-auto h-10 w-10 text-destructive" />
            <h1 className="mt-3 text-lg font-bold">লিঙ্কটি পাওয়া যায়নি</h1>
            <p className="mt-1 text-sm text-muted-foreground">{shopError}</p>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (done) {
    const personalUrl = typeof window !== "undefined" ? `${window.location.origin}/f/${slug}/my` : `/f/${slug}/my`;
    const copyText = async (txt: string, label: string) => {
      try {
        await navigator.clipboard.writeText(txt);
        toast.success(`${label} কপি হয়েছে`);
      } catch {
        toast.error("Copy failed");
      }
    };
    const waShare = () => {
      const msg = encodeURIComponent(
        `${shopName} — আমার ফর্দ দেখতে ও আবার পাঠাতে এই লিঙ্কে যান:\n${personalUrl}${issuedPin ? `\n\nPIN: ${issuedPin}` : ""}`,
      );
      window.open(`https://wa.me/?text=${msg}`, "_blank");
    };
    return (
      <div className="flex min-h-screen flex-col bg-muted/30">
        <SiteHeader />
        <main className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl border bg-card p-6 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
            <Check className="h-7 w-7" />
          </div>
          <h1 className="mt-3 text-xl font-bold">ধন্যবাদ!</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            আপনার ফর্দ <span className="font-semibold text-foreground">{shopName}</span>-কে পাঠানো হয়েছে। দোকানদার শীঘ্রই যোগাযোগ করবেন।
          </p>

          {issuedPin && (
            <div className="mt-5 rounded-xl border-2 border-primary/40 bg-primary/5 p-4 text-left">
              <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                <KeyRound className="h-4 w-4" /> আপনার গোপন PIN
              </div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <div className="text-3xl font-extrabold tracking-[0.4em] tabular-nums text-foreground">
                  {issuedPin}
                </div>
                <Button size="sm" variant="outline" onClick={() => copyText(issuedPin, "PIN")}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                এই PIN ও আপনার মোবাইল নাম্বার দিয়ে পরে আপনার সব ফর্দ দেখতে পারবেন। PIN সংরক্ষণ করুন বা স্ক্রিনশট নিন।
              </p>
            </div>
          )}

          <div className="mt-4 rounded-xl border bg-muted/40 p-3 text-left">
            <div className="text-[11px] font-semibold text-muted-foreground">আপনার ফর্দ লিঙ্ক</div>
            <div className="mt-1 flex items-center gap-2">
              <div className="flex-1 truncate font-mono text-xs">{personalUrl}</div>
              <Button size="sm" variant="outline" onClick={() => copyText(personalUrl, "লিঙ্ক")}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="mt-2 flex gap-2">
              <Button size="sm" onClick={waShare} className="flex-1 bg-[oklch(0.65_0.18_150)] text-white hover:bg-[oklch(0.6_0.18_150)]">
                <MessageCircle className="mr-1 h-3.5 w-3.5" /> WhatsApp এ পাঠান
              </Button>
            </div>
          </div>

          <Link
            to="/f/$slug/my"
            params={{ slug }}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-semibold hover:bg-accent"
          >
            <History className="h-4 w-4" /> আমার সব ফর্দ দেখুন
          </Link>

          <Button className="mt-2 w-full" variant="outline" onClick={reset}>
            নতুন ফর্দ শুরু করুন
          </Button>
        </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <SiteHeader />
      <main className="flex-1 pb-32">
      <div className="mx-auto max-w-md px-4 pt-6">
        {/* Shop header */}
        <div className="mb-3 flex items-center gap-3">
          {shopLogo ? (
            <img src={shopLogo} alt="" className="h-12 w-12 rounded-xl border bg-card object-cover" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border bg-card text-lg font-bold text-muted-foreground">
              {shopName.charAt(0)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-xs text-muted-foreground">আপনার ফর্দ পাঠাচ্ছেন</div>
            <h1 className="truncate text-lg font-extrabold leading-tight">{shopName}</h1>
          </div>
          <Link
            to="/f/$slug/my"
            params={{ slug }}
            className="flex-none rounded-lg border bg-card px-2.5 py-1.5 text-[11px] font-semibold hover:bg-accent"
            title="আমার ফর্দ"
          >
            <History className="mr-1 inline h-3.5 w-3.5" />
            আমার ফর্দ
          </Link>
        </div>

        {savedToken && (
          <div className="mb-3 rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs">
            <span className="font-semibold text-primary">আপনি এই দোকানে আগেও ফর্দ পাঠিয়েছেন।</span>{" "}
            <Link to="/f/$slug/my" params={{ slug }} className="underline">
              আগের ফর্দ দেখুন বা আবার পাঠান
            </Link>
          </div>
        )}

        {/* Internet hint */}
        <div className={`mb-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-[11px] ${online ? "border-muted-foreground/20 bg-muted/40 text-muted-foreground" : "border-destructive/40 bg-destructive/10 text-destructive"}`}>
          {online ? <Wifi className="h-3.5 w-3.5 flex-none" /> : <WifiOff className="h-3.5 w-3.5 flex-none" />}
          <span>
            {online
              ? "ফর্দ পাঠাতে ইন্টারনেট সংযোগ লাগবে। কথা বলে ফর্দ বানাতেও net লাগবে।"
              : "এখন ইন্টারনেট নেই — net চালু করে আবার চেষ্টা করুন।"}
          </span>
        </div>

        {/* Card */}
        <div className={`rounded-3xl border bg-card p-5 shadow-sm ring-1 ${palette.bg} ${palette.ring}`}>
          {/* Products first — main focus */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold">পণ্যের তালিকা</h2>
              <VoiceFordoMic
                onItems={(spoken) => {
                  setItems((cur) => {
                    // fill empty rows first, then append
                    const next = [...cur];
                    let idx = 0;
                    for (const text of spoken) {
                      const emptyAt = next.findIndex((r) => !r.name.trim());
                      if (emptyAt >= 0 && idx === 0) {
                        next[emptyAt] = { ...next[emptyAt], name: text };
                      } else {
                        next.push({ id: newId(), name: text, qty: "", unit: "", price: "" });
                      }
                      idx++;
                    }
                    return next;
                  });
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => setSimpleMode((v) => !v)}
              className="inline-flex items-center gap-1 rounded-full border bg-background/70 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-background"
            >
              <Settings2 className="h-3 w-3" />
              {simpleMode ? "বিস্তারিত" : "সহজ"}
            </button>
          </div>

          {simpleMode ? (
            <div className="mt-4 space-y-2">
              {items.map((it, idx) => (
                <div key={it.id} className="flex items-start gap-2">
                  <div className="mt-3 w-5 select-none text-center text-xs font-semibold text-muted-foreground">
                    {idx + 1}.
                  </div>
                  <Input
                    value={it.name}
                    onChange={(e) => updateItem(it.id, { name: e.target.value })}
                    placeholder="যেমন: ১ কেজি পোলাওর চাল"
                    className="h-11 flex-1 bg-background/70 text-[15px]"
                    maxLength={120}
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(it.id)}
                    className="mt-2 rounded-md p-2 text-muted-foreground hover:bg-background/60 hover:text-destructive"
                    aria-label="মুছুন"
                    disabled={items.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {items.map((it, idx) => (
                <div key={it.id} className="flex items-start gap-2">
                  <div className="mt-2 w-5 select-none text-center text-xs font-semibold text-muted-foreground">
                    {idx + 1}.
                  </div>
                  <div className="grid flex-1 grid-cols-12 gap-1.5">
                    <CatalogProductPicker
                      className="col-span-12"
                      inputClassName="h-10 bg-background/70"
                      value={it.name}
                      onChange={(v) => updateItem(it.id, { name: v })}
                      onSelect={(p: CatalogProduct) => {
                        updateItem(it.id, {
                          name: p.name_bn + (p.pack_size ? ` (${p.pack_size})` : ""),
                          unit: it.unit || p.base_unit || "",
                          price: it.price || (p.default_price != null ? String(p.default_price) : ""),
                        });
                      }}
                      shopTypeCode={shopTypeCode}
                      placeholder="পণ্যের নাম"
                    />
                    <Input
                      value={it.qty}
                      onChange={(e) => updateItem(it.id, { qty: e.target.value.replace(/[^0-9.]/g, "") })}
                      placeholder="পরিমাণ"
                      inputMode="decimal"
                      className="col-span-4 h-10 bg-background/70"
                    />
                    <Input
                      value={it.unit}
                      onChange={(e) => updateItem(it.id, { unit: e.target.value })}
                      placeholder="একক"
                      className="col-span-4 h-10 bg-background/70"
                      maxLength={16}
                    />
                    <Input
                      value={it.price}
                      onChange={(e) => updateItem(it.id, { price: e.target.value.replace(/[^0-9.]/g, "") })}
                      placeholder="দাম (দোকানদার দিবে)"
                      inputMode="decimal"
                      className="col-span-4 h-10 bg-background/70"
                      readOnly
                      title="দাম দোকানদার বসাবেন"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(it.id)}
                    className="mt-1.5 rounded-md p-1.5 text-muted-foreground hover:bg-background/60 hover:text-destructive"
                    aria-label="মুছুন"
                    disabled={items.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <Button type="button" variant="outline" onClick={addItem} className="mt-3 w-full bg-background/70">
            <Plus className="mr-1 h-4 w-4" /> আরও পণ্য যোগ করুন
          </Button>

          <p className="mt-3 rounded-lg bg-background/50 px-3 py-2 text-center text-[11px] text-muted-foreground">
            💡 দাম বসানোর দরকার নেই — দোকানদার ফর্দ পেয়ে দাম জানিয়ে দিবেন
          </p>

          <div className="mt-5">
            <textarea
              id="nt"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="নোট (ইচ্ছাধীন) — অতিরিক্ত নির্দেশনা থাকলে লিখুন"
              className="min-h-[64px] w-full rounded-md border bg-background/70 p-2 text-sm"
              maxLength={500}
            />
          </div>

          <div className="mt-5">
            <div className="text-xs font-semibold text-muted-foreground">কার্ডের রং</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {PALETTE.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setColor(p.key)}
                  className={`h-7 w-7 rounded-full border-2 ${p.bg} ${color === p.key ? "border-foreground" : "border-transparent"}`}
                  aria-label={p.label}
                />
              ))}
            </div>
          </div>

          {/* Compact customer info — at the very bottom, placeholders only */}
          <div className="mt-6 border-t pt-4">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="আপনার নাম"
                className="h-10 bg-background/70"
                maxLength={80}
              />
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="মোবাইল নাম্বার"
                className="h-10 bg-background/70"
                maxLength={20}
              />
              <Input
                inputMode="numeric"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder={hasExistingProfile ? "আপনার PIN" : "নতুন PIN (৪-৬ digit)"}
                className="h-10 bg-background/70 tracking-[0.3em] tabular-nums"
                maxLength={6}
              />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {hasExistingProfile
                ? "এই নাম্বারে আগে ফর্দ পাঠিয়েছেন — পুরোনো PIN-টিই দিন।"
                : "PIN ও মোবাইল দিয়ে পরে আপনার সব ফর্দ দেখতে পারবেন।"}
            </p>
          </div>
        </div>
      </div>

      {/* Sticky submit */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 p-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto max-w-md">
          <Button onClick={submit} disabled={submitting} className="h-12 w-full text-base font-semibold">
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            ফর্দ পাঠান
          </Button>
        </div>
      </div>
      </main>
      <SiteFooter />
    </div>
  );
}
export default PublicWishlistPage;
