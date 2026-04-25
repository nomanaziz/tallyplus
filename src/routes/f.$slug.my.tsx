import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  KeyRound,
  History,
  RefreshCw,
  LogOut,
  RotateCw,
  Save,
  Trash2,
  Check,
  X,
  Clock,
  Send,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/f/$slug/my")({
  head: () => ({
    meta: [
      { title: "আমার ফর্দ — ইতিহাস ও পুনরায় পাঠান" },
      { name: "description", content: "আপনার পাঠানো ফর্দ দেখুন এবং আবার পাঠান।" },
    ],
  }),
  component: MyWishlistsPage,
});

type Wishlist = {
  id: string;
  status: string;
  color: string;
  note: string | null;
  created_at: string;
};
type Item = {
  id: string;
  wishlist_id: string;
  name: string;
  qty: number | null;
  unit: string | null;
  price: number | null;
  position: number;
  fulfillment_status: string;
  shopkeeper_note: string | null;
  done: boolean;
};
type TemplateItem = { name: string; qty: number | null; unit: string | null; price: number | null };
type Template = { id: string; name: string; items: TemplateItem[]; created_at: string; updated_at: string };
type Customer = { id: string; name: string; phone: string; address: string | null; shop_id: string };
type Shop = { id: string; name: string; logo_url: string | null; phone: string | null };

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  new: { label: "নতুন", cls: "bg-primary/15 text-primary" },
  seen: { label: "দোকানদার দেখেছেন", cls: "bg-amber-500/15 text-amber-700" },
  done: { label: "সম্পন্ন", cls: "bg-success/15 text-success" },
};

const FULFILL_BADGE: Record<string, { label: string; icon: typeof Check; cls: string }> = {
  pending: { label: "অপেক্ষমান", icon: Clock, cls: "bg-muted text-muted-foreground" },
  fulfilled: { label: "পেয়েছি", icon: Check, cls: "bg-success/15 text-success" },
  unavailable: { label: "পাইনি", icon: X, cls: "bg-destructive/15 text-destructive" },
  later: { label: "পরে দিবে", icon: Clock, cls: "bg-amber-500/15 text-amber-700" },
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString("bn-BD", { dateStyle: "medium", timeStyle: "short" });
}

function MyWishlistsPage() {
  const { slug } = Route.useParams();
  const [token, setToken] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    customer: Customer;
    shop: Shop | null;
    wishlists: Wishlist[];
    items: Item[];
    templates: Template[];
  } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Try existing token from localStorage
  useEffect(() => {
    try {
      const t = localStorage.getItem(`wl-token-${slug}`);
      if (t) setToken(t);
    } catch {
      // ignore
    }
  }, [slug]);

  const fetchHistory = async (tok: string) => {
    setLoading(true);
    setErr(null);
    try {
      const { data: resp, error } = await supabase.functions.invoke("customer-wishlist-history", {
        body: { token: tok },
      });
      if (error || (resp as { error?: string })?.error) {
        const msg = (resp as { error?: string })?.error ?? error?.message ?? "Failed";
        setErr(msg);
        if (msg.includes("টোকেন")) {
          localStorage.removeItem(`wl-token-${slug}`);
          setToken(null);
        }
      } else {
        setData(resp as typeof data);
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) void fetchHistory(token);
  }, [token]);

  const login = async () => {
    if (!/^[0-9+\-\s()]{6,20}$/.test(phone.trim())) {
      toast.error("সঠিক মোবাইল নাম্বার দিন");
      return;
    }
    if (!/^\d{4,8}$/.test(pin.trim())) {
      toast.error("সঠিক PIN দিন");
      return;
    }
    setLoggingIn(true);
    try {
      const { data: resp, error } = await supabase.functions.invoke("customer-wishlist-login", {
        body: { slug, phone: phone.trim(), pin: pin.trim() },
      });
      const r = (resp ?? {}) as { ok?: boolean; token?: string; error?: string };
      if (r.error || error) {
        toast.error(r.error ?? error?.message ?? "Login failed");
      } else if (r.token) {
        localStorage.setItem(`wl-token-${slug}`, r.token);
        setToken(r.token);
        setPhone("");
        setPin("");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoggingIn(false);
    }
  };

  const logout = () => {
    localStorage.removeItem(`wl-token-${slug}`);
    setToken(null);
    setData(null);
  };

  const reuseWishlist = (wId: string) => {
    if (!data) return;
    const its = data.items.filter((i) => i.wishlist_id === wId);
    const payload = {
      name: data.customer.name,
      phone: data.customer.phone,
      address: data.customer.address ?? "",
      items: its.map((i) => ({ name: i.name, qty: i.qty, unit: i.unit, price: i.price })),
    };
    sessionStorage.setItem(`wl-reuse-${wId}`, JSON.stringify(payload));
    window.location.href = `/f/${slug}?reuse=${wId}`;
  };

  const reuseTemplate = (t: Template) => {
    if (!data) return;
    const payload = {
      name: data.customer.name,
      phone: data.customer.phone,
      address: data.customer.address ?? "",
      items: t.items,
    };
    sessionStorage.setItem(`wl-tpl-${t.id}`, JSON.stringify(payload));
    window.location.href = `/f/${slug}?tpl=${t.id}`;
  };

  const saveAsTemplate = async (wId: string) => {
    if (!token || !data) return;
    const name = prompt("টেমপ্লেটের নাম দিন (যেমন: মাসিক বাজার)", "মাসিক বাজার");
    if (!name?.trim()) return;
    const its = data.items
      .filter((i) => i.wishlist_id === wId)
      .map((i) => ({ name: i.name, qty: i.qty, unit: i.unit, price: i.price }));
    const { data: resp, error } = await supabase.functions.invoke("save-wishlist-template", {
      body: { token, action: "save", name: name.trim(), items: its },
    });
    const r = (resp ?? {}) as { ok?: boolean; error?: string };
    if (r.error || error) {
      toast.error(r.error ?? error?.message ?? "Failed");
    } else {
      toast.success("টেমপ্লেট সংরক্ষিত হয়েছে");
      void fetchHistory(token);
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!token) return;
    if (!confirm("এই টেমপ্লেট মুছে ফেলবেন?")) return;
    const { data: resp, error } = await supabase.functions.invoke("save-wishlist-template", {
      body: { token, action: "delete", id },
    });
    const r = (resp ?? {}) as { ok?: boolean; error?: string };
    if (r.error || error) toast.error(r.error ?? error?.message ?? "Failed");
    else {
      toast.success("মুছে ফেলা হয়েছে");
      void fetchHistory(token);
    }
  };

  // ==== Login screen ====
  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
            <KeyRound className="h-6 w-6" />
          </div>
          <h1 className="mt-3 text-center text-xl font-extrabold">আমার ফর্দ</h1>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            আপনার মোবাইল নাম্বার ও PIN দিয়ে লগইন করুন।
          </p>
          <div className="mt-5 space-y-3">
            <div>
              <Label htmlFor="lp">মোবাইল নাম্বার</Label>
              <Input
                id="lp"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01XXXXXXXXX"
                className="h-11"
                maxLength={20}
              />
            </div>
            <div>
              <Label htmlFor="lpin">PIN</Label>
              <Input
                id="lpin"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
                placeholder="৬-ডিজিটের PIN"
                className="h-11 tracking-[0.4em] tabular-nums"
                maxLength={8}
              />
            </div>
            <Button onClick={login} disabled={loggingIn} className="h-11 w-full text-base font-semibold">
              {loggingIn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
              লগইন
            </Button>
          </div>
          <Link
            to="/f/$slug"
            params={{ slug }}
            className="mt-4 block text-center text-xs text-muted-foreground underline"
          >
            নতুন ফর্দ পাঠান
          </Link>
        </div>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (err) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <div className="max-w-sm rounded-2xl border bg-card p-6 text-center shadow-sm">
          <p className="text-sm text-destructive">{err}</p>
          <Button onClick={logout} variant="outline" className="mt-3">
            আবার লগইন
          </Button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      <div className="mx-auto max-w-md px-4 pt-6">
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          {data.shop?.logo_url ? (
            <img src={data.shop.logo_url} alt="" className="h-12 w-12 rounded-xl border bg-card object-cover" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border bg-card text-lg font-bold text-muted-foreground">
              {data.shop?.name.charAt(0) ?? "S"}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-xs text-muted-foreground">আপনার দোকান</div>
            <h1 className="truncate text-lg font-extrabold leading-tight">{data.shop?.name ?? ""}</h1>
            <div className="text-[11px] text-muted-foreground">{data.customer.name} · {data.customer.phone}</div>
          </div>
          <Button size="sm" variant="outline" onClick={logout} title="লগআউট">
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="mb-3 flex gap-2">
          <Link
            to="/f/$slug"
            params={{ slug }}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-bold text-primary-foreground shadow-sm hover:opacity-95"
          >
            <Send className="h-4 w-4" /> নতুন ফর্দ
          </Link>
          <Button variant="outline" size="sm" onClick={() => token && fetchHistory(token)} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Templates */}
        {data.templates.length > 0 && (
          <div className="mb-5">
            <h2 className="mb-2 text-sm font-bold text-muted-foreground">সংরক্ষিত টেমপ্লেট</h2>
            <div className="space-y-2">
              {data.templates.map((t) => (
                <div key={t.id} className="rounded-xl border bg-card p-3 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-bold">{t.name}</div>
                      <div className="text-xs text-muted-foreground">{t.items.length}টি পণ্য · {fmt(t.updated_at)}</div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => deleteTemplate(t.id)} className="text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <Button onClick={() => reuseTemplate(t)} className="mt-2 w-full" size="sm">
                    <Send className="mr-1 h-3.5 w-3.5" /> এই টেমপ্লেট পাঠান
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* History */}
        <h2 className="mb-2 text-sm font-bold text-muted-foreground">আমার সব ফর্দ</h2>
        {data.wishlists.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-card p-6 text-center text-sm text-muted-foreground">
            <History className="mx-auto h-8 w-8 opacity-50" />
            <p className="mt-2">এখনো কোনো ফর্দ পাঠাননি।</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.wishlists.map((w) => (
              <WishlistCard
                key={w.id}
                w={w}
                items={data.items.filter((i) => i.wishlist_id === w.id)}
                onReuse={() => reuseWishlist(w.id)}
                onSaveTpl={() => saveAsTemplate(w.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function WishlistCard({
  w,
  items,
  onReuse,
  onSaveTpl,
}: {
  w: Wishlist;
  items: Item[];
  onReuse: () => void;
  onSaveTpl: () => void;
}) {
  const [open, setOpen] = useState(false);
  const totals = useMemo(() => {
    let total = 0;
    let fulfilled = 0;
    let unavailable = 0;
    let later = 0;
    let pending = 0;
    for (const it of items) {
      const q = Number(it.qty) || 0;
      const p = Number(it.price) || 0;
      total += q && p ? q * p : p;
      if (it.fulfillment_status === "fulfilled") fulfilled++;
      else if (it.fulfillment_status === "unavailable") unavailable++;
      else if (it.fulfillment_status === "later") later++;
      else pending++;
    }
    return { total, fulfilled, unavailable, later, pending };
  }, [items]);

  const status = STATUS_BADGE[w.status] ?? STATUS_BADGE.new;

  return (
    <div className="rounded-2xl border bg-card shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 p-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className={status.cls}>
              {status.label}
            </Badge>
            <span className="text-xs text-muted-foreground">{fmt(w.created_at)}</span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="rounded bg-muted px-1.5 py-0.5 font-semibold">{items.length} পণ্য</span>
            {totals.fulfilled > 0 && (
              <span className="rounded bg-success/15 px-1.5 py-0.5 font-semibold text-success">✓ {totals.fulfilled}</span>
            )}
            {totals.unavailable > 0 && (
              <span className="rounded bg-destructive/15 px-1.5 py-0.5 font-semibold text-destructive">✗ {totals.unavailable}</span>
            )}
            {totals.later > 0 && (
              <span className="rounded bg-amber-500/15 px-1.5 py-0.5 font-semibold text-amber-700">⏳ {totals.later}</span>
            )}
            <span className="ml-auto font-extrabold tabular-nums text-primary">৳ {totals.total.toLocaleString("bn-BD", { maximumFractionDigits: 2 })}</span>
          </div>
        </div>
        <ChevronRight className={`h-4 w-4 flex-none text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`} />
      </button>

      {open && (
        <div className="border-t">
          <ul className="divide-y">
            {items.map((it) => {
              const f = FULFILL_BADGE[it.fulfillment_status] ?? FULFILL_BADGE.pending;
              const Icon = f.icon;
              const lineTotal = (Number(it.qty) || 0) && (Number(it.price) || 0)
                ? (Number(it.qty) || 0) * (Number(it.price) || 0)
                : Number(it.price) || 0;
              return (
                <li key={it.id} className="flex items-start gap-2 p-3">
                  <div className={`mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full ${f.cls}`} title={f.label}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{it.name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {it.qty ?? "—"} {it.unit ?? ""} {it.price != null && `· ৳${it.price}`}
                    </div>
                    {it.shopkeeper_note && (
                      <div className="mt-1 rounded bg-muted/50 px-2 py-1 text-[11px] italic text-muted-foreground">
                        দোকানদার: {it.shopkeeper_note}
                      </div>
                    )}
                  </div>
                  <div className="flex-none text-right">
                    <div className="text-[11px] text-muted-foreground">{f.label}</div>
                    {lineTotal > 0 && (
                      <div className="text-xs font-semibold tabular-nums text-primary">৳ {lineTotal.toLocaleString("bn-BD", { maximumFractionDigits: 2 })}</div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          {w.note && (
            <div className="border-t bg-muted/30 px-3 py-2 text-xs">
              <span className="font-semibold">আপনার নোট:</span> {w.note}
            </div>
          )}
          <div className="flex gap-2 border-t bg-muted/30 p-2">
            <Button onClick={onReuse} size="sm" className="flex-1">
              <RotateCw className="mr-1 h-3.5 w-3.5" /> এটাই আবার পাঠান
            </Button>
            <Button onClick={onSaveTpl} size="sm" variant="outline">
              <Save className="mr-1 h-3.5 w-3.5" /> টেমপ্লেট
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}