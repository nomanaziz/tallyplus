import { getNumLocale } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Printer, Store, FileText, Phone, Download } from "lucide-react";
import { toast } from "sonner";
import { downloadFordoSlip } from "@/lib/fordo-pdf";

type Item = {
  id: string;
  name: string;
  qty: number | null;
  unit: string | null;
  price: number | null;
  shopkeeper_note: string | null;
  fulfillment_status: string | null;
  done: boolean;
  position: number;
};
type Wishlist = {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string | null;
  note: string | null;
  status: string;
  created_at: string;
  share_token: string;
  allow_public_check?: boolean;
};
type Shop = { id: string; name: string; logo_url: string | null } | null;

export default function SharedFordoPage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wl, setWl] = useState<Wishlist | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [shop, setShop] = useState<Shop>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!token) {
        setError("invalid_token");
        setLoading(false);
        return;
      }
      const { data, error: rpcErr } = await supabase.rpc(
        "get_shared_fordo" as never,
        { _token: token } as never,
      );
      if (cancelled) return;
      if (rpcErr) {
        setError(rpcErr.message);
      } else {
        const r = (data ?? {}) as {
          ok?: boolean;
          error?: string;
          wishlist?: Wishlist;
          items?: Item[];
          shop?: Shop;
        };
        if (!r.ok) {
          setError(r.error ?? "not_found");
        } else {
          setWl(r.wishlist ?? null);
          setItems((r.items ?? []) as Item[]);
          setShop(r.shop ?? null);
        }
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [token]);

  // Realtime subscription on items so multiple viewers stay in sync
  useEffect(() => {
    if (!wl?.id) return;
    const ch = supabase
      .channel(`shared-fordo-${wl.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "customer_wishlist_items", filter: `wishlist_id=eq.${wl.id}` },
        (payload) => {
          const updated = payload.new as Partial<Item> & { id: string };
          setItems((prev) => prev.map((it) => it.id === updated.id ? { ...it, ...updated } as Item : it));
        },
      )
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [wl?.id]);

  async function toggleItem(item: Item, next: boolean) {
    if (!token) return;
    setToggling(item.id);
    setItems((prev) => prev.map((it) => it.id === item.id ? { ...it, done: next } : it));
    const { data, error: err } = await supabase.rpc(
      "toggle_shared_fordo_item" as never,
      { _token: token, _item_id: item.id, _done: next } as never,
    );
    setToggling(null);
    const r = (data ?? {}) as { ok?: boolean; error?: string };
    if (err || !r.ok) {
      // revert
      setItems((prev) => prev.map((it) => it.id === item.id ? { ...it, done: !next } : it));
      toast.error(r.error === "not_allowed" ? "মালিক টিক দেওয়ার অনুমতি বন্ধ রেখেছেন" : "আপডেট ব্যর্থ হয়েছে");
    }
  }

  function handleDownload() {
    if (!wl) return;
    downloadFordoSlip({
      customerName: wl.customer_name,
      customerPhone: wl.customer_phone,
      shopName: shop?.name || null,
      note: wl.note,
      createdAt: wl.created_at,
      withPrices: items.some((i) => Number(i.price) > 0),
      items: items.map((i) => ({ name: i.name, qty: i.qty, unit: i.unit, price: i.price, done: i.done })),
    });
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !wl) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
        <FileText className="h-10 w-10 text-muted-foreground" />
        <h1 className="text-lg font-bold">ফর্দটি খুঁজে পাওয়া যায়নি</h1>
        <p className="text-sm text-muted-foreground">
          এই লিংকটি ভুল হতে পারে অথবা এটি আর সক্রিয় নেই।
        </p>
      </div>
    );
  }

  const total = items.reduce((sum, it) => {
    const q = Number(it.qty) || 0;
    const pr = Number(it.price) || 0;
    return sum + (q && pr ? q * pr : pr);
  }, 0);
  const doneCount = items.filter((i) => i.done).length;
  const canCheck = wl.allow_public_check !== false;

  return (
    <div className="mx-auto max-w-2xl px-3 py-4 print:max-w-none print:px-0 print:py-0">
      <div className="mb-3 flex items-center justify-between print:hidden">
        <h1 className="text-lg font-bold">শেয়ার করা ফর্দ</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleDownload}>
            <Download className="mr-1 h-4 w-4" /> ডাউনলোড
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="mr-1 h-4 w-4" /> প্রিন্ট
          </Button>
        </div>
      </div>

      {items.length > 0 && (
        <div className="mb-2 flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-xs print:hidden">
          <span className="font-medium">কেনা হয়েছে: {doneCount}/{items.length}</span>
          {canCheck ? (
            <span className="text-muted-foreground">প্রতিটা পণ্য কেনা হলে টিক দিন — মালিক লাইভ দেখবে</span>
          ) : (
            <span className="text-muted-foreground">মালিক টিক দেওয়ার অনুমতি বন্ধ রেখেছেন</span>
          )}
        </div>
      )}

      <Card className="space-y-3 p-4 print:rounded-none print:border-0 print:p-2 print:shadow-none">
        {shop && (
          <div className="flex items-center gap-2 border-b pb-2">
            {shop.logo_url ? (
              <img src={shop.logo_url} alt={shop.name} className="h-9 w-9 rounded object-cover" />
            ) : (
              <Store className="h-5 w-5 text-primary" />
            )}
            <div className="text-sm font-bold">{shop.name}</div>
          </div>
        )}

        <div className="space-y-0.5 text-sm">
          <div className="font-semibold">{wl.customer_name}</div>
          {wl.customer_phone && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Phone className="h-3 w-3" /> {wl.customer_phone}
            </div>
          )}
          {wl.customer_address && (
            <div className="text-xs text-muted-foreground">{wl.customer_address}</div>
          )}
          <div className="text-[11px] text-muted-foreground">
            তারিখ: {new Date(wl.created_at).toLocaleString(getNumLocale())}
          </div>
        </div>

        {wl.note && (
          <div className="rounded bg-muted px-2 py-1.5 text-xs">
            <span className="font-semibold">নোট: </span>{wl.note}
          </div>
        )}

        <div className="overflow-hidden rounded border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-xs">
              <tr>
                <th className="w-8 px-2 py-1.5 text-center print:hidden">✓</th>
                <th className="px-2 py-1.5 text-left">পণ্য</th>
                <th className="px-2 py-1.5 text-right">পরিমাণ</th>
                <th className="px-2 py-1.5 text-right">দাম</th>
                <th className="px-2 py-1.5 text-right">মোট</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr><td colSpan={5} className="px-2 py-3 text-center text-xs text-muted-foreground">কোনো পণ্য নেই</td></tr>
              )}
              {items.map((it) => {
                const q = Number(it.qty) || 0;
                const pr = Number(it.price) || 0;
                const line = q && pr ? q * pr : pr;
                return (
                  <tr key={it.id} className={`border-t ${it.done ? "bg-emerald-50/50" : ""}`}>
                    <td className="px-2 py-1.5 text-center print:hidden">
                      <Checkbox
                        checked={!!it.done}
                        disabled={!canCheck || toggling === it.id}
                        onCheckedChange={(v) => toggleItem(it, v === true)}
                      />
                    </td>
                    <td className={`px-2 py-1.5 ${it.done ? "text-muted-foreground line-through" : ""}`}>{it.name}</td>
                    <td className="px-2 py-1.5 text-right">
                      {it.qty != null ? `${it.qty}${it.unit ? ` ${it.unit}` : ""}` : "—"}
                    </td>
                    <td className="px-2 py-1.5 text-right">{pr ? `৳${pr}` : "—"}</td>
                    <td className="px-2 py-1.5 text-right">{line ? `৳${line}` : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
            {total > 0 && (
              <tfoot>
                <tr className="border-t bg-muted/50">
                  <td colSpan={4} className="px-2 py-1.5 text-right text-xs font-semibold">মোট</td>
                  <td className="px-2 py-1.5 text-right font-bold">৳{total.toLocaleString(getNumLocale())}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <div className="text-center text-[10px] text-muted-foreground print:mt-2">
          এই ফর্দটি শুধু দেখার জন্য — সম্পাদনা করা যাবে না
        </div>
      </Card>
    </div>
  );
}