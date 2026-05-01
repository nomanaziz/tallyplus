import { Link, useNavigate, useParams } from "@/lib/router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  ChevronUp,
  Copy,
  Loader2,
  LogOut,
  Plus,
  Save,
  ScrollText,
  Send,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";



type WL = {
  id: string;
  status: string;
  color: string;
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
  position: number;
  fulfillment_status: string | null;
  shopkeeper_note: string | null;
  done?: boolean;
};

type Template = {
  id: string;
  name: string;
  items: Array<{ name: string; qty?: number | null; unit?: string | null; price?: number | null }>;
  updated_at: string;
};

type HistoryResp = {
  ok?: boolean;
  error?: string;
  customer?: { id: string; name: string; phone: string; address: string | null };
  shop?: { id: string; name: string; logo_url: string | null; phone: string | null };
  wishlists?: WL[];
  items?: WLItem[];
  templates?: Template[];
};

const STATUS_LABEL: Record<string, { bn: string; cls: string }> = {
  new: { bn: "নতুন", cls: "bg-primary/15 text-primary" },
  seen: { bn: "দেখা হয়েছে", cls: "bg-muted text-muted-foreground" },
  done: { bn: "সম্পন্ন", cls: "bg-success/15 text-success" },
};

const FULFILL_LABEL: Record<string, string> = {
  pending: "অপেক্ষমাণ",
  available: "আছে",
  unavailable: "নেই",
  partial: "আংশিক",
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("bn-BD", { dateStyle: "medium", timeStyle: "short" });
}

function MyWishlistPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const tokenKey = `wl-token-${slug}`;
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [shopName, setShopName] = useState("");
  const [shopLogo, setShopLogo] = useState<string | null>(null);
  const [shopErr, setShopErr] = useState<string | null>(null);

  // Login state
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  // Dashboard state
  const [data, setData] = useState<HistoryResp | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [monthFilter, setMonthFilter] = useState<string>("all");
  // Save as template
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveWlId, setSaveWlId] = useState<string | null>(null);
  const [saveName, setSaveName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try {
      setToken(localStorage.getItem(tokenKey));
    } catch {
      // ignore
    }
  }, [tokenKey]);

  // Fetch shop branding
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: d, error } = await supabase.functions.invoke("wishlist-shop-info", {
          body: { slug },
        });
        if (cancelled) return;
        const r = (d ?? {}) as { shop_name?: string; shop_logo_url?: string | null; error?: string };
        if (error || r.error) {
          setShopErr(r.error ?? error?.message ?? "Shop not found");
        } else {
          setShopName(r.shop_name ?? "");
          setShopLogo(r.shop_logo_url ?? null);
        }
      } catch (e) {
        if (!cancelled) setShopErr((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // Fetch history when token present
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const { data: d, error } = await supabase.functions.invoke("customer-wishlist-history", {
          body: { token },
        });
        if (cancelled) return;
        const r = (d ?? {}) as HistoryResp;
        if (error || r.error || !r.ok) {
          // token expired or invalid → drop it and force re-login
          try {
            localStorage.removeItem(tokenKey);
          } catch {
            // ignore
          }
          setToken(null);
          if (r.error) toast.error(r.error);
        } else {
          setData(r);
        }
      } catch (e) {
        toast.error((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, tokenKey]);

  const itemsByWishlist = useMemo(() => {
    const map = new Map<string, WLItem[]>();
    (data?.items ?? []).forEach((it) => {
      const arr = map.get(it.wishlist_id) ?? [];
      arr.push(it);
      map.set(it.wishlist_id, arr);
    });
    return map;
  }, [data]);

  const handleLogin = async () => {
    if (!/^[0-9+\-\s()]{6,20}$/.test(phone.trim())) {
      toast.error("সঠিক মোবাইল নাম্বার দিন");
      return;
    }
    if (!/^\d{4,6}$/.test(pin.trim())) {
      toast.error("৪-৬ digit PIN দিন");
      return;
    }
    setLoggingIn(true);
    try {
      const { data: d, error } = await supabase.functions.invoke("customer-wishlist-login", {
        body: { slug, phone: phone.trim(), pin: pin.trim() },
      });
      const r = (d ?? {}) as { ok?: boolean; token?: string; error?: string };
      if (error || r.error || !r.ok || !r.token) {
        toast.error(r.error ?? error?.message ?? "লগইন ব্যর্থ");
        return;
      }
      try {
        localStorage.setItem(tokenKey, r.token);
      } catch {
        // ignore
      }
      setToken(r.token);
      toast.success("লগইন সফল");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem(tokenKey);
    } catch {
      // ignore
    }
    setToken(null);
    setData(null);
    setPin("");
  };

  const reuseWishlist = (wl: WL) => {
    const items = itemsByWishlist.get(wl.id) ?? [];
    try {
      sessionStorage.setItem(
        `wl-reuse-${wl.id}`,
        JSON.stringify({
          name: data?.customer?.name ?? "",
          phone: data?.customer?.phone ?? "",
          address: data?.customer?.address ?? "",
          items: items.map((it) => ({ name: it.name, qty: it.qty, unit: it.unit, price: it.price })),
        }),
      );
      navigate({ to: "/f/$slug", params: { slug }, search: { reuse: wl.id } });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const useTemplate = (tpl: Template) => {
    try {
      sessionStorage.setItem(
        `wl-tpl-${tpl.id}`,
        JSON.stringify({
          name: data?.customer?.name ?? "",
          phone: data?.customer?.phone ?? "",
          address: data?.customer?.address ?? "",
          items: tpl.items,
        }),
      );
      navigate({ to: "/f/$slug", params: { slug }, search: { tpl: tpl.id } });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  // ----- Save wishlist as template -----
  const openSaveTemplate = (wl: WL) => {
    const items = itemsByWishlist.get(wl.id) ?? [];
    if (items.length === 0) {
      toast.error("এই ফর্দে কোনো পণ্য নেই");
      return;
    }
    setSaveWlId(wl.id);
    const dt = new Date(wl.created_at);
    setSaveName(`${shopName} — ${dt.toLocaleDateString("bn-BD", { day: "numeric", month: "short" })}`);
    setSaveOpen(true);
  };
  const confirmSaveTemplate = async () => {
    if (!token || !saveWlId) return;
    const name = saveName.trim();
    if (!name) return toast.error("একটি নাম দিন");
    const items = (itemsByWishlist.get(saveWlId) ?? []).map((it) => ({
      name: it.name,
      qty: it.qty,
      unit: it.unit,
      price: it.price,
    }));
    setSaving(true);
    try {
      const { data: d, error } = await supabase.functions.invoke("save-wishlist-template", {
        body: { token, action: "save", name, items },
      });
      const r = (d ?? {}) as { ok?: boolean; id?: string; error?: string };
      if (error || r.error || !r.ok) {
        toast.error(r.error ?? error?.message ?? "সংরক্ষণ ব্যর্থ");
        return;
      }
      toast.success("টেমপ্লেট সংরক্ষণ করা হয়েছে");
      setSaveOpen(false);
      // Add to local list so user sees it immediately
      const newTpl: Template = {
        id: r.id ?? crypto.randomUUID(),
        name,
        items,
        updated_at: new Date().toISOString(),
      };
      setData((prev) => prev ? { ...prev, templates: [newTpl, ...(prev.templates ?? [])] } : prev);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  // ----- Month filter -----
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

  if (shopErr) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
        <div className="max-w-sm rounded-2xl border bg-card p-6 text-center shadow-sm">
          <X className="mx-auto h-10 w-10 text-destructive" />
          <h1 className="mt-3 text-lg font-bold">লিঙ্কটি পাওয়া যায়নি</h1>
          <p className="mt-1 text-sm text-muted-foreground">{shopErr}</p>
        </div>
      </div>
    );
  }

  // ---------- LOGIN VIEW ----------
  if (!token) {
    return (
      <div className="min-h-screen bg-muted/30 px-4 py-8">
        <div className="mx-auto max-w-sm">
          <Link
            to="/f/$slug"
            params={{ slug }}
            className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> ফর্দ পাঠানোর পেইজে ফিরে যান
          </Link>

          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              {shopLogo ? (
                <img src={shopLogo} alt="" className="h-12 w-12 rounded-xl border bg-card object-cover" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border bg-muted text-lg font-bold">
                  {shopName.charAt(0) || "?"}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">আমার ফর্দ</div>
                <h1 className="truncate text-lg font-extrabold leading-tight">{shopName}</h1>
              </div>
            </div>

            <p className="mb-4 text-sm text-muted-foreground">
              আপনার <span className="font-semibold text-foreground">মোবাইল নাম্বার</span> ও{" "}
              <span className="font-semibold text-foreground">PIN</span> দিয়ে এই দোকানে পাঠানো সব পুরাতন ফর্দ ও নোট দেখুন।
            </p>

            <div className="space-y-3">
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
                  type="password"
                  inputMode="numeric"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="৪-৬ digit"
                  className="h-11 tracking-[0.3em] tabular-nums"
                  maxLength={6}
                />
              </div>
              <Button onClick={handleLogin} disabled={loggingIn} className="h-11 w-full">
                {loggingIn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                দেখুন
              </Button>
            </div>

            <div className="mt-5 rounded-lg bg-muted/50 p-3 text-[11px] text-muted-foreground">
              💡 আগে এই দোকানে ফর্দ পাঠাননি? আগে{" "}
              <Link to="/f/$slug" params={{ slug }} className="font-semibold text-primary underline">
                একটি ফর্দ পাঠান
              </Link>{" "}
              — তখন আপনার জন্য একটি account তৈরি হবে।
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------- DASHBOARD VIEW ----------
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const wishlists = data?.wishlists ?? [];
  const templates = data?.templates ?? [];
  const customerName = data?.customer?.name ?? "গ্রাহক";

  const monthCounts: Record<string, number> = {};
  for (const w of wishlists) {
    const k = monthKey(w.created_at);
    monthCounts[k] = (monthCounts[k] || 0) + 1;
  }
  const monthOptions = Object.keys(monthCounts).sort((a, b) => (a < b ? 1 : -1));
  const filteredWishlists =
    monthFilter === "all" ? wishlists : wishlists.filter((w) => monthKey(w.created_at) === monthFilter);

  return (
    <div className="min-h-screen bg-muted/30 pb-24">
      <div className="mx-auto max-w-md px-4 pt-6">
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          {shopLogo ? (
            <img src={shopLogo} alt="" className="h-11 w-11 rounded-xl border bg-card object-cover" />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border bg-card text-base font-bold">
              {shopName.charAt(0)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-[11px] text-muted-foreground">{shopName}</div>
            <h1 className="truncate text-base font-extrabold leading-tight">স্বাগতম, {customerName}</h1>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} title="লগআউট">
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* My Wishlists */}
        <section className="mb-5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold">আমার ফর্দসমূহ ({filteredWishlists.length})</h2>
            {monthOptions.length > 0 && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <Select value={monthFilter} onValueChange={setMonthFilter}>
                  <SelectTrigger className="h-8 w-[160px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">সব মাস ({wishlists.length})</SelectItem>
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

          {wishlists.length === 0 ? (
            <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
              এখনও কোনো ফর্দ পাঠাননি।
            </div>
          ) : filteredWishlists.length === 0 ? (
            <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
              এই মাসে কোনো ফর্দ পাঠাননি।
            </div>
          ) : (
            <div className="space-y-2">
              {filteredWishlists.map((wl) => {
                const items = itemsByWishlist.get(wl.id) ?? [];
                const open = openId === wl.id;
                const status = STATUS_LABEL[wl.status] ?? STATUS_LABEL.new;
                return (
                  <div key={wl.id} className="overflow-hidden rounded-xl border bg-card shadow-sm">
                    <button
                      type="button"
                      onClick={() => setOpenId(open ? null : wl.id)}
                      className="flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-accent/40"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className={status.cls}>
                            {status.bn}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground">
                            {items.length} টি পণ্য
                          </span>
                        </div>
                        <div className="mt-1 truncate text-xs text-muted-foreground">{fmtTime(wl.created_at)}</div>
                        {wl.note && (
                          <div className="mt-1 line-clamp-1 text-xs text-foreground/80">📝 {wl.note}</div>
                        )}
                      </div>
                      {open ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>

                    {open && (
                      <div className="border-t bg-muted/20 p-3">
                        {items.length === 0 ? (
                          <p className="text-xs text-muted-foreground">কোনো পণ্য নেই।</p>
                        ) : (
                          <ul className="space-y-1.5">
                            {items.map((it) => (
                              <li
                                key={it.id}
                                className="flex items-start justify-between gap-2 rounded-md bg-background p-2 text-sm"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium">{it.name}</div>
                                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                                    {it.qty != null && (
                                      <span>
                                        {it.qty} {it.unit ?? ""}
                                      </span>
                                    )}
                                    {it.price != null && (
                                      <span className="font-semibold text-foreground">৳{it.price}</span>
                                    )}
                                    {it.fulfillment_status && it.fulfillment_status !== "pending" && (
                                      <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                                        {FULFILL_LABEL[it.fulfillment_status] ?? it.fulfillment_status}
                                      </Badge>
                                    )}
                                  </div>
                                  {it.shopkeeper_note && (
                                    <div className="mt-1 text-[11px] italic text-muted-foreground">
                                      💬 {it.shopkeeper_note}
                                    </div>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => reuseWishlist(wl)}
                          >
                            <Copy className="mr-1.5 h-3.5 w-3.5" /> নকল করে পাঠান
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openSaveTemplate(wl)}
                          >
                            <Save className="mr-1.5 h-3.5 w-3.5" /> টেমপ্লেট সংরক্ষণ
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Templates / Notes */}
        {templates.length > 0 && (
          <section className="mb-5">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-bold">আমার নোট/Templates ({templates.length})</h2>
            </div>
            <div className="space-y-2">
              {templates.map((tpl) => (
                <div key={tpl.id} className="rounded-xl border bg-card p-3 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <ScrollText className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="truncate">{tpl.name}</span>
                      </div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        {tpl.items?.length ?? 0} টি পণ্য
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => useTemplate(tpl)}>
                      <Send className="mr-1 h-3.5 w-3.5" /> পাঠান
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* New wishlist CTA */}
        <Link
          to="/f/$slug"
          params={{ slug }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-card py-4 text-sm font-semibold text-primary hover:bg-accent/40"
        >
          <Plus className="h-4 w-4" /> নতুন ফর্দ পাঠান
        </Link>
      </div>
    </div>
  );
}

export default MyWishlistPage;
