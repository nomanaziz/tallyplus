import { useEffect, useState } from "react";
import { Link } from "@/lib/router";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Package, ShoppingBag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
      const { data } = await supabase
        .from("marketplace_orders")
        .select("id, order_no, shop_id, status, total, subtotal, delivery_charge, created_at, shops(name, logo_url)")
        .eq("consumer_user_id", u.user.id)
        .order("created_at", { ascending: false });
      if (alive) {
        setRows((data as unknown as Row[] | null) ?? []);
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
          {rows.map((r) => (
            <Link
              key={r.id}
              to="/orders/$orderNo"
              params={{ orderNo: r.order_no ?? r.id }}
              className="block rounded-xl border bg-card p-4 transition hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {r.shops?.logo_url ? (
                    <img src={r.shops.logo_url} alt={r.shops?.name ?? ""} className="h-10 w-10 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{r.shops?.name ?? "Shop"}</div>
                    <div className="text-xs text-muted-foreground">#{r.order_no} • {new Date(r.created_at).toLocaleDateString("bn-BD")}</div>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={STATUS_VARIANT[r.status] ?? "secondary"}>{STATUS_LABEL[r.status] ?? r.status}</Badge>
                  <div className="mt-1 text-base font-bold">৳{Number(r.total).toFixed(0)}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}