import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Send, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/f/$slug")({
  head: () => ({
    meta: [
      { title: "গ্রাহক ফর্দ — পণ্যের তালিকা পাঠান" },
      { name: "description", content: "আপনার দোকানদারকে কেনাকাটার তালিকা পাঠান।" },
    ],
  }),
  component: PublicWishlistPage,
});

type Item = { id: string; name: string; qty: string; unit: string };

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
  const { slug } = Route.useParams();
  const [shopName, setShopName] = useState("");
  const [shopLogo, setShopLogo] = useState<string | null>(null);
  const [loadingShop, setLoadingShop] = useState(true);
  const [shopError, setShopError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [color, setColor] = useState<string>("mint");
  const [items, setItems] = useState<Item[]>([{ id: newId(), name: "", qty: "", unit: "" }]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

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

  const addItem = () => setItems((xs) => [...xs, { id: newId(), name: "", qty: "", unit: "" }]);
  const removeItem = (id: string) => setItems((xs) => xs.filter((x) => x.id !== id));
  const updateItem = (id: string, patch: Partial<Item>) =>
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const submit = async () => {
    const cleanItems = items
      .map((x) => ({ name: x.name.trim(), qty: x.qty.trim(), unit: x.unit.trim() }))
      .filter((x) => x.name.length > 0);
    if (!name.trim()) {
      toast.error("আপনার নাম দিন");
      return;
    }
    if (!/^[0-9+\-\s()]{6,20}$/.test(phone.trim())) {
      toast.error("সঠিক মোবাইল নাম্বার দিন");
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
          items: cleanItems.map((it) => ({
            name: it.name,
            qty: it.qty ? Number(it.qty) : null,
            unit: it.unit || null,
          })),
        },
      });
      const err = (data as { error?: string })?.error ?? error?.message;
      if (err) {
        toast.error(err);
      } else {
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
    setAddress("");
    setNote("");
    setItems([{ id: newId(), name: "", qty: "", unit: "" }]);
    setDone(false);
  };

  if (loadingShop) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (shopError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
        <div className="max-w-sm rounded-2xl border bg-card p-6 text-center shadow-sm">
          <X className="mx-auto h-10 w-10 text-destructive" />
          <h1 className="mt-3 text-lg font-bold">লিঙ্কটি পাওয়া যায়নি</h1>
          <p className="mt-1 text-sm text-muted-foreground">{shopError}</p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
        <div className="max-w-sm rounded-2xl border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
            <Check className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-xl font-bold">ধন্যবাদ!</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            আপনার ফর্দ <span className="font-semibold text-foreground">{shopName}</span>-কে পাঠানো হয়েছে। দোকানদার শীঘ্রই যোগাযোগ করবেন।
          </p>
          <Button className="mt-6 w-full" onClick={reset}>
            নতুন ফর্দ শুরু করুন
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-32">
      <div className="mx-auto max-w-md px-4 pt-6">
        {/* Shop header */}
        <div className="mb-4 flex items-center gap-3">
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
        </div>

        {/* Card */}
        <div className={`rounded-3xl border bg-card p-5 shadow-sm ring-1 ${palette.bg} ${palette.ring}`}>
          <h2 className="text-base font-bold">আপনার তথ্য</h2>
          <div className="mt-3 space-y-3">
            <div>
              <Label htmlFor="cn">আপনার নাম</Label>
              <Input id="cn" value={name} onChange={(e) => setName(e.target.value)} placeholder="যেমন: করিম" className="h-11 bg-background/70" maxLength={80} />
            </div>
            <div>
              <Label htmlFor="cp">মোবাইল নাম্বার</Label>
              <Input id="cp" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" className="h-11 bg-background/70" maxLength={20} />
            </div>
            <div>
              <Label htmlFor="ca">ঠিকানা (ইচ্ছাধীন)</Label>
              <Input id="ca" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="বাসা / এলাকা" className="h-11 bg-background/70" maxLength={200} />
            </div>
          </div>

          <h2 className="mt-6 text-base font-bold">পণ্যের তালিকা</h2>
          <div className="mt-2 space-y-2">
            {items.map((it, idx) => (
              <div key={it.id} className="flex items-start gap-2">
                <div className="mt-2 w-5 select-none text-center text-xs font-semibold text-muted-foreground">{idx + 1}.</div>
                <div className="grid flex-1 grid-cols-12 gap-1.5">
                  <Input
                    value={it.name}
                    onChange={(e) => updateItem(it.id, { name: e.target.value })}
                    placeholder="পণ্যের নাম"
                    className="col-span-7 h-10 bg-background/70"
                    maxLength={120}
                  />
                  <Input
                    value={it.qty}
                    onChange={(e) => updateItem(it.id, { qty: e.target.value.replace(/[^0-9.]/g, "") })}
                    placeholder="পরিমাণ"
                    inputMode="decimal"
                    className="col-span-2 h-10 bg-background/70"
                  />
                  <Input
                    value={it.unit}
                    onChange={(e) => updateItem(it.id, { unit: e.target.value })}
                    placeholder="একক"
                    className="col-span-3 h-10 bg-background/70"
                    maxLength={16}
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

          <Button type="button" variant="outline" onClick={addItem} className="mt-3 w-full bg-background/70">
            <Plus className="mr-1 h-4 w-4" /> আরও পণ্য যোগ করুন
          </Button>

          <div className="mt-5">
            <Label htmlFor="nt">নোট (ইচ্ছাধীন)</Label>
            <textarea
              id="nt"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="অতিরিক্ত নির্দেশনা থাকলে লিখুন"
              className="mt-1 min-h-[72px] w-full rounded-md border bg-background/70 p-2 text-sm"
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
        </div>
      </div>

      {/* Sticky submit */}
      <div className="fixed inset-x-0 bottom-0 border-t bg-background/95 p-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto max-w-md">
          <Button onClick={submit} disabled={submitting} className="h-12 w-full text-base font-semibold">
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            ফর্দ পাঠান
          </Button>
        </div>
      </div>
    </div>
  );
}