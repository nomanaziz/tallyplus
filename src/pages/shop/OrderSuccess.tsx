import { useEffect, useState } from "react";
import { Link, useParams } from "@/lib/router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Loader2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";

type Order = {
  id: string;
  order_no: string | null;
  customer_name: string;
  customer_phone: string;
  customer_address: string | null;
  total: number;
  subtotal: number;
  delivery_charge: number;
  status: string;
  payment_method: string | null;
  note: string | null;
  created_at: string;
  shop_id: string;
};

type OrderItem = {
  id: string;
  name: string;
  qty: number;
  price: number;
  total: number;
};

export default function OrderSuccessPage() {
  const { orderNo } = useParams<{ orderNo: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: o } = await supabase
        .from("marketplace_orders")
        .select("*")
        .eq("order_no", orderNo!)
        .maybeSingle();
      if (!alive) return;
      if (o) {
        setOrder(o as Order);
        const { data: its } = await supabase
          .from("marketplace_order_items")
          .select("id, name, qty, price, total")
          .eq("order_id", (o as { id: string }).id);
        if (alive) setItems((its as OrderItem[] | null) ?? []);
      }
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [orderNo]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <SiteHeader />
        <main className="flex flex-1 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></main>
        <SiteFooter />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <SiteHeader />
        <main className="container mx-auto flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
          <ShoppingBag className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">এই Order পাওয়া যায়নি অথবা আপনি লগইন নেই।</p>
          <Button asChild className="mt-3"><Link to="/shop">মার্কেটপ্লেসে যান</Link></Button>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="container mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <CheckCircle2 className="mb-2 h-14 w-14 text-green-600" />
          <h1 className="text-2xl font-bold">Order Confirmed</h1>
          <p className="text-sm text-muted-foreground">Order #{order.order_no}</p>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-4">
            <h3 className="mb-2 text-sm font-semibold">Items</h3>
            <div className="space-y-2">
              {items.map((it) => (
                <div key={it.id} className="flex justify-between text-sm">
                  <span>{it.name} × {it.qty}</span>
                  <span>৳{Number(it.total).toFixed(0)}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-between border-t pt-2 text-sm">
              <span>Subtotal</span><span>৳{Number(order.subtotal).toFixed(0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Delivery</span><span>৳{Number(order.delivery_charge).toFixed(0)}</span>
            </div>
            <div className="mt-1 flex justify-between border-t pt-2 text-base font-bold">
              <span>Total</span><span>৳{Number(order.total).toFixed(0)}</span>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4 text-sm">
            <div><span className="font-semibold">Status:</span> {order.status}</div>
            <div><span className="font-semibold">Payment:</span> {order.payment_method ?? "Cash on Delivery"}</div>
            <div className="mt-2 font-semibold">Delivery to:</div>
            <div>{order.customer_name} • {order.customer_phone}</div>
            <div className="text-muted-foreground">{order.customer_address}</div>
            {order.note && <div className="mt-1"><span className="font-semibold">Note:</span> {order.note}</div>}
          </div>

          <Button asChild variant="outline" className="w-full"><Link to="/shop">আরও কেনাকাটা করুন</Link></Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}