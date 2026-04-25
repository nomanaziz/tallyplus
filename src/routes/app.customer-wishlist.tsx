import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Share2, MessageCircle, Phone, Trash2, Check, RefreshCw, Loader2, ListChecks, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/lib/shop";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export const Route = createFileRoute("/app/customer-wishlist")({
  head: () => ({ meta: [{ title: "গ্রাহক ফর্দ — Tally Plus" }] }),
  component: CustomerWishlistPage,
});

type Wishlist = {
  id: string;
  shop_id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string | null;
  note: string | null;
  color: string;
  status: string;
  created_at: string;
};

type WishlistItem = {
  id: string;
  wishlist_id: string;
  name: string;
  qty: number | null;
  price: number | null;
  unit: string | null;
  position: number;
  done: boolean;
  fulfillment_status?: string;
  shopkeeper_note?: string | null;
};

const COLOR_BG: Record<string, string> = {
  default: "bg-card",
  mint: "bg-[oklch(0.94_0.05_150)]",
  peach: "bg-[oklch(0.94_0.06_60)]",
  lavender: "bg-[oklch(0.93_0.05_300)]",
  sky: "bg-[oklch(0.94_0.05_240)]",
  butter: "bg-[oklch(0.95_0.07_95)]",
};

const STATUS_LABEL: Record<string, { bn: string; en: string; cls: string }> = {
  new: { bn: "নতুন", en: "New", cls: "bg-primary/15 text-primary" },
  seen: { bn: "দেখা হয়েছে", en: "Seen", cls: "bg-muted text-muted-foreground" },
  done: { bn: "সম্পন্ন", en: "Done", cls: "bg-success/15 text-success" },
};

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("bn-BD", { dateStyle: "medium", timeStyle: "short" });
}

function CustomerWishlistPage() {
  const { current } = useShop();
  const { lang } = useI18n();
  const qc = useQueryClient();
  const [slug, setSlug] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  // Fetch slug from shops (we can read our own shop)
  useEffect(() => {
    if (!current?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("shops")
        .select("wishlist_slug")
        .eq("id", current.id)
        .maybeSingle();
      if (!cancelled) setSlug(((data as { wishlist_slug: string | null } | null)?.wishlist_slug) ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [current?.id]);

  const shareUrl = useMemo(() => {
    if (!slug || typeof window === "undefined") return "";
    return `${window.location.origin}/f/${slug}`;
  }, [slug]);

  const listQ = useQuery({
    queryKey: ["customer-wishlists", current?.id],
    queryFn: async () => {
      if (!current?.id) return [] as Wishlist[];
      const { data, error } = await supabase
        .from("customer_wishlists")
        .select("*")
        .eq("shop_id", current.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data as Wishlist[]) ?? [];
    },
    enabled: !!current?.id,
  });

  const copyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success(lang === "bn" ? "লিঙ্ক কপি হয়েছে" : "Link copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  const shareWA = () => {
    if (!shareUrl) return;
    const msg = encodeURIComponent(
      `${current?.name ?? "আমাদের দোকান"} — আপনার কেনাকাটার ফর্দ পাঠাতে এই লিঙ্কে ক্লিক করুন:\n${shareUrl}`,
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  const shareSMS = () => {
    if (!shareUrl) return;
    const msg = encodeURIComponent(
      `${current?.name ?? "আমাদের দোকান"} — ফর্দ পাঠাতে: ${shareUrl}`,
    );
    window.location.href = `sms:?body=${msg}`;
  };

  return (
    <div className="container max-w-5xl px-4 py-4">
      <div className="mb-2 text-xs text-muted-foreground">Home / গ্রাহক ফর্দ</div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="text-xl font-extrabold">
          {lang === "bn" ? "গ্রাহক ফর্দ" : "Customer Wishlists"}
        </h1>
        <Button variant="outline" size="sm" onClick={() => listQ.refetch()} disabled={listQ.isFetching}>
          <RefreshCw className={`mr-1 h-3.5 w-3.5 ${listQ.isFetching ? "animate-spin" : ""}`} />
          {lang === "bn" ? "রিফ্রেশ" : "Refresh"}
        </Button>
      </div>

      {/* Share card */}
      <div className="rounded-2xl border bg-gradient-to-br from-primary/10 to-card p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Share2 className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold">
              {lang === "bn" ? "এই লিঙ্কটি গ্রাহকদের সাথে শেয়ার করুন" : "Share this link with your customers"}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {lang === "bn"
                ? "গ্রাহক লিঙ্কে গিয়ে নাম, মোবাইল নাম্বার ও পণ্যের তালিকা পাঠাবে — আপনি এখানে পেয়ে যাবেন।"
                : "Customers open the link, fill name + phone + list — you receive it here."}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Input readOnly value={shareUrl || (lang === "bn" ? "তৈরি হচ্ছে..." : "Generating...")} className="h-9 bg-background font-mono text-xs" />
              <Button size="sm" variant="outline" onClick={copyLink} disabled={!shareUrl}>
                <Copy className="mr-1 h-3.5 w-3.5" />
                {lang === "bn" ? "কপি" : "Copy"}
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button size="sm" onClick={shareWA} disabled={!shareUrl} className="bg-[oklch(0.65_0.18_150)] text-white hover:bg-[oklch(0.6_0.18_150)]">
                <MessageCircle className="mr-1 h-3.5 w-3.5" /> WhatsApp
              </Button>
              <Button size="sm" variant="outline" onClick={shareSMS} disabled={!shareUrl}>
                SMS
              </Button>
              {shareUrl && (
                <a href={shareUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent">
                  <ExternalLink className="h-3.5 w-3.5" /> {lang === "bn" ? "প্রিভিউ" : "Preview"}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="mt-5">
        <h2 className="mb-2 text-sm font-bold text-muted-foreground">
          {lang === "bn" ? "সদ্য পাওয়া ফর্দ" : "Recent wishlists"}
        </h2>
        {listQ.isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-xl" />
            ))}
          </div>
        ) : (listQ.data?.length ?? 0) === 0 ? (
          <div className="rounded-2xl border border-dashed bg-muted/30 p-8 text-center">
            <ListChecks className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-2 text-sm font-semibold">
              {lang === "bn" ? "এখনো কোনো ফর্দ আসেনি" : "No wishlists yet"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {lang === "bn" ? "উপরের লিঙ্কটি গ্রাহকদের সাথে শেয়ার করুন।" : "Share the link above with your customers."}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {listQ.data!.map((w) => {
              const st = STATUS_LABEL[w.status] ?? STATUS_LABEL.new;
              return (
                <button
                  key={w.id}
                  onClick={() => setOpenId(w.id)}
                  className={`group rounded-2xl border p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${COLOR_BG[w.color] ?? COLOR_BG.default}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-bold">{w.customer_name}</div>
                      <div className="text-xs text-muted-foreground">{w.customer_phone}</div>
                    </div>
                    <Badge className={`${st.cls} hover:${st.cls}`} variant="secondary">
                      {lang === "bn" ? st.bn : st.en}
                    </Badge>
                  </div>
                  {w.customer_address && (
                    <div className="mt-2 line-clamp-1 text-xs text-muted-foreground">{w.customer_address}</div>
                  )}
                  <div className="mt-3 text-[11px] text-muted-foreground">{fmtTime(w.created_at)}</div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <WishlistDetailDialog
        wishlistId={openId}
        onOpenChange={(v) => !v && setOpenId(null)}
        onChange={() => qc.invalidateQueries({ queryKey: ["customer-wishlists", current?.id] })}
      />
    </div>
  );
}

function WishlistDetailDialog({
  wishlistId,
  onOpenChange,
  onChange,
}: {
  wishlistId: string | null;
  onOpenChange: (v: boolean) => void;
  onChange: () => void;
}) {
  const { lang } = useI18n();
  const open = !!wishlistId;
  const detailQ = useQuery({
    queryKey: ["customer-wishlist", wishlistId],
    queryFn: async () => {
      if (!wishlistId) return null;
      const { data: wl } = await supabase
        .from("customer_wishlists")
        .select("*")
        .eq("id", wishlistId)
        .maybeSingle();
      const { data: items } = await supabase
        .from("customer_wishlist_items")
        .select("*")
        .eq("wishlist_id", wishlistId)
        .order("position", { ascending: true });
      return {
        wishlist: wl as Wishlist | null,
        items: ((items as unknown) as WishlistItem[]) ?? [],
      };
    },
    enabled: open,
  });

  // Mark as seen on first open
  useEffect(() => {
    if (!wishlistId || !detailQ.data?.wishlist) return;
    if (detailQ.data.wishlist.status === "new") {
      void supabase.from("customer_wishlists").update({ status: "seen" }).eq("id", wishlistId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wishlistId, detailQ.data?.wishlist?.id]);

  const setFulfillment = async (it: WishlistItem, status: string) => {
    await supabase
      .from("customer_wishlist_items")
      .update({ fulfillment_status: status, done: status === "fulfilled" } as never)
      .eq("id", it.id);
    void detailQ.refetch();
  };

  const markDone = async () => {
    if (!wishlistId) return;
    await supabase.from("customer_wishlists").update({ status: "done" }).eq("id", wishlistId);
    onChange();
    onOpenChange(false);
  };

  const remove = async () => {
    if (!wishlistId) return;
    if (!confirm(lang === "bn" ? "এই ফর্দটি রিসাইকেল বিনে পাঠাবেন?" : "Move this wishlist to recycle bin?")) return;
    await supabase
      .from("customer_wishlists")
      .update({ deleted_at: new Date().toISOString() } as never)
      .eq("id", wishlistId);
    onChange();
    onOpenChange(false);
  };

  const updateItemPrice = async (it: WishlistItem, value: string) => {
    const v = value.trim() === "" ? null : Number(value);
    await supabase.from("customer_wishlist_items").update({ price: v } as never).eq("id", it.id);
    void detailQ.refetch();
  };

  const wl = detailQ.data?.wishlist;
  const items = detailQ.data?.items ?? [];
  const phoneDigits = wl?.customer_phone.replace(/[^0-9+]/g, "") ?? "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{wl?.customer_name || (lang === "bn" ? "ফর্দ" : "Wishlist")}</DialogTitle>
        </DialogHeader>
        {detailQ.isLoading || !wl ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{wl.customer_phone}</span>
                <div className="flex gap-1">
                  <a href={`tel:${phoneDigits}`} className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-xs hover:bg-accent">
                    <Phone className="h-3 w-3" /> Call
                  </a>
                  <a href={`https://wa.me/${phoneDigits.replace(/\+/g, "")}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-xs hover:bg-accent">
                    <MessageCircle className="h-3 w-3" /> WA
                  </a>
                </div>
              </div>
              {wl.customer_address && (
                <div className="mt-2 text-xs text-muted-foreground">{wl.customer_address}</div>
              )}
              <div className="mt-1 text-[11px] text-muted-foreground">{fmtTime(wl.created_at)}</div>
            </div>

            {wl.note && (
              <div className="rounded-lg border border-dashed bg-background p-3 text-sm">
                <div className="text-[11px] font-semibold text-muted-foreground">নোট</div>
                <div>{wl.note}</div>
              </div>
            )}

            <div className="rounded-lg border bg-background">
              <div className="flex items-center justify-between border-b px-3 py-2 text-xs font-bold text-muted-foreground">
                <span>{lang === "bn" ? "পণ্যের তালিকা" : "Items"} ({items.length})</span>
                <span>{lang === "bn" ? "একক দাম" : "Unit price"}</span>
              </div>
              <ul className="divide-y">
                {items.map((it) => {
                  const lineTotal = (Number(it.qty) || 0) && (Number(it.price) || 0)
                    ? (Number(it.qty) || 0) * (Number(it.price) || 0)
                    : (Number(it.price) || 0);
                  const fs = it.fulfillment_status ?? (it.done ? "fulfilled" : "pending");
                  return (
                    <li key={it.id} className="flex items-center gap-2 px-3 py-2">
                      <div className="flex flex-none gap-0.5">
                        <button
                          type="button"
                          title="পেয়েছে"
                          onClick={() => setFulfillment(it, fs === "fulfilled" ? "pending" : "fulfilled")}
                          className={`flex h-6 w-6 items-center justify-center rounded border text-xs ${fs === "fulfilled" ? "border-success bg-success text-white" : "border-muted-foreground/30 text-muted-foreground hover:bg-success/10"}`}
                        >
                          ✓
                        </button>
                        <button
                          type="button"
                          title="পায়নি"
                          onClick={() => setFulfillment(it, fs === "unavailable" ? "pending" : "unavailable")}
                          className={`flex h-6 w-6 items-center justify-center rounded border text-xs ${fs === "unavailable" ? "border-destructive bg-destructive text-white" : "border-muted-foreground/30 text-muted-foreground hover:bg-destructive/10"}`}
                        >
                          ✗
                        </button>
                        <button
                          type="button"
                          title="পরে দিবে"
                          onClick={() => setFulfillment(it, fs === "later" ? "pending" : "later")}
                          className={`flex h-6 w-6 items-center justify-center rounded border text-xs ${fs === "later" ? "border-amber-500 bg-amber-500 text-white" : "border-muted-foreground/30 text-muted-foreground hover:bg-amber-500/10"}`}
                        >
                          ⏳
                        </button>
                      </div>
                      <div className={`flex-1 text-sm ${fs === "fulfilled" ? "text-muted-foreground line-through" : ""}`}>
                        <div>{it.name}</div>
                        {(it.qty != null || it.unit) && (
                          <span className="text-xs text-muted-foreground">
                            {it.qty ?? ""} {it.unit ?? ""}
                          </span>
                        )}
                        {lineTotal > 0 && (
                          <span className="ml-2 text-xs font-semibold text-primary">= ৳ {lineTotal.toLocaleString("bn-BD", { maximumFractionDigits: 2 })}</span>
                        )}
                      </div>
                      <Input
                        defaultValue={it.price ?? ""}
                        onBlur={(e) => {
                          const v = e.target.value;
                          if ((v === "" ? null : Number(v)) !== it.price) updateItemPrice(it, v);
                        }}
                        placeholder="দাম"
                        inputMode="decimal"
                        className="h-8 w-20 text-right text-xs tabular-nums"
                      />
                    </li>
                  );
                })}
              </ul>
              <div className="flex items-center justify-between border-t bg-muted/40 px-3 py-2 text-sm">
                <span className="font-semibold">{lang === "bn" ? "মোট" : "Total"}</span>
                <span className="text-base font-extrabold tabular-nums text-primary">
                  ৳ {items.reduce((sum, it) => {
                    const q = Number(it.qty) || 0;
                    const pr = Number(it.price) || 0;
                    return sum + (q && pr ? q * pr : pr);
                  }, 0).toLocaleString("bn-BD", { maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        )}
        <DialogFooter className="flex-row gap-2 sm:justify-between">
          <Button variant="outline" onClick={remove} className="text-destructive hover:bg-destructive/10">
            <Trash2 className="mr-1 h-4 w-4" /> {lang === "bn" ? "মুছুন" : "Delete"}
          </Button>
          <Button onClick={markDone}>
            <Check className="mr-1 h-4 w-4" /> {lang === "bn" ? "সম্পন্ন" : "Mark done"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}