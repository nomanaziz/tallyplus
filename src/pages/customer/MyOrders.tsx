import { useEffect, useState } from "react";
import { Link } from "@/lib/router";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Package, ShoppingBag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type OrderItem = { name: string; qty: number; price: number; total: number };

type Row = {
  id: string;
  order_no: string | null;
  shop_id: string;
  status: string;
  total: number;
  subtotal: number;
  delivery_charge: number;
  created_at: string;
  shops: { name: string; logo_url: string | null } | null;
  marketplace_order_items: OrderItem[];
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  processing: "default",
  shipped: "default",
  delivered: "default",
  cancelled: "destructive",
};

export default function MyOrdersPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) { if (alive) setLoading(false); return; }
      // Fetch the user's known phone numbers so we also match orders that
      // were placed before the consumer signed in (consumer_user_id NULL).
      let phones: string[] = [];
      const { data: ph } = await supabase.rpc("my_phones");
      if (Array.isArray(ph)) phones = (ph as string[]).filter(Boolean);

      let q = supabase
        .from("marketplace_orders")
        .select(
          "id, order_no, shop_id, status, total, subtotal, delivery_charge, created_at, marketplace_order_items(name, qty, price, total)"
        )
        .order("created_at", { ascending: false });

      if (phones.length > 0) {
        // Match either by user id OR by any known phone number.
        const phoneList = phones.map((p) => `"${p}"`).join(",");
        q = q.or(`consumer_user_id.eq.${u.user.id},customer_phone.in.(${phoneList})`);
      } else {
        q = q.eq("consumer_user_id", u.user.id);
      }

      const { data, error } = await q;
      if (error) console.error("[my-orders]", error);
      const orders = (data as unknown as Row[] | null) ?? [];
      // Fetch shop info separately to avoid relying on a PostgREST embed.
      const shopIds = Array.from(new Set(orders.map((o) => o.shop_id))).filter(Boolean);
      let shopMap = new Map<string, { name: string; logo_url: string | null }>();
      if (shopIds.length > 0) {
        const { data: shopsData } = await supabase
          .from("shops")
          .select("id, name, logo_url")
          .in("id", shopIds);
        for (const s of (shopsData ?? []) as Array<{ id: string; name: string; logo_url: string | null }>) {
          shopMap.set(s.id, { name: s.name, logo_url: s.logo_url });
        }
      }
      const enriched = orders.map((o) => ({ ...o, shops: shopMap.get(o.shop_id) ?? null }));
      if (alive) {
        setRows(enriched);
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ShoppingBag className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold">আমার অর্ডার</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border bg-card p-10 text-center">
          <Package className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">এখনো কোনো অর্ডার নেই।</p>
          <Button asChild className="mt-3"><Link to="/shop">মার্কেটপ্লেসে যান</Link></Button>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const items = r.marketplace_order_items ?? [];
            const totalQty = items.reduce((s, i) => s + Number(i.qty), 0);
            return (
              <Link
                key={r.id}
                to="/orders/$orderNo"
                params={{ orderNo: r.order_no ?? r.id }}
                className="block rounded-xl border bg-card p-4 transition hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    {r.shops?.logo_url ? (
                      <img src={r.shops.logo_url} alt={r.shops?.name ?? ""} className="h-10 w-10 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <Package className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{r.shops?.name ?? "Shop"}</div>
                      <div className="text-xs text-muted-foreground">
                        #{r.order_no} • {new Date(r.created_at).toLocaleDateString("bn-BD")}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={STATUS_VARIANT[r.status] ?? "secondary"}>{STATUS_LABEL[r.status] ?? r.status}</Badge>
                    <div className="mt-1 text-base font-bold">৳{Number(r.total).toFixed(0)}</div>
                  </div>
                </div>

                {items.length > 0 && (
                  <div className="mt-3 space-y-1 rounded-lg bg-muted/40 p-2.5">
                    {items.slice(0, 3).map((it, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-2 text-xs">
                        <div className="min-w-0 flex-1 truncate">
                          <span className="font-medium">{it.name}</span>
                          <span className="text-muted-foreground"> × {it.qty}</span>
                        </div>
                        <span className="shrink-0 font-semibold">৳{Number(it.total).toFixed(0)}</span>
                      </div>
                    ))}
                    {items.length > 3 && (
                      <div className="pt-0.5 text-[11px] text-muted-foreground">
                        + আরও {items.length - 3}টি পণ্য
                      </div>
                    )}
                    <div className="border-t pt-1 text-[11px] text-muted-foreground">
                      মোট {totalQty}টি পণ্য • Subtotal ৳{Number(r.subtotal).toFixed(0)}
                      {Number(r.delivery_charge) > 0 ? ` + ডেলিভারি ৳${Number(r.delivery_charge).toFixed(0)}` : ""}
                    </div>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
