import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, bnNum } from "@/lib/i18n";
import { useShop } from "@/lib/shop";
import { PageHeader } from "@/components/app/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ClipboardList, Loader2, Phone, MapPin, Package } from "lucide-react";
import { toast } from "sonner";



type Order = {
  id: string; order_no: string | null; customer_name: string; customer_phone: string;
  customer_address: string | null; total: number; status: string; payment_method: string | null;
  note: string | null; created_at: string;
};
type OrderItem = { id: string; name: string; qty: number; price: number; total: number };

const STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"] as const;

function OrdersPage() {
  const { lang } = useI18n();
  const { current } = useShop();
  const qc = useQueryClient();
  const shopId = current?.id ?? null;
  const [openOrder, setOpenOrder] = useState<Order | null>(null);

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["mp-orders", shopId],
    enabled: !!shopId,
    queryFn: async () => {
      const { data } = await supabase.from("marketplace_orders" as never)
        .select("id,order_no,customer_name,customer_phone,customer_address,total,status,payment_method,note,created_at")
        .eq("shop_id", shopId!)
        .order("created_at", { ascending: false });
      return ((data as unknown) as Order[]) ?? [];
    },
  });

  const onOrder = orders.filter((o) => o.status === "pending");
  const ongoing = orders.filter((o) => o.status === "processing" || o.status === "shipped");
  const completed = orders.filter((o) => o.status === "delivered" || o.status === "cancelled");

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("marketplace_orders" as never).update({ status } as never).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(lang === "bn" ? "স্ট্যাটাস আপডেট" : "Status updated");
    await qc.invalidateQueries({ queryKey: ["mp-orders", shopId] });
    setOpenOrder((o) => o ? { ...o, status } : o);
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 pb-10">
      <PageHeader breadcrumb={`Online-shop / ${lang === "bn" ? "অর্ডার লিস্ট" : "Order List"}`} title="" />
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <Tabs defaultValue="on-order" className="mt-3">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="on-order">{lang === "bn" ? "নতুন" : "On Order"} ({onOrder.length})</TabsTrigger>
            <TabsTrigger value="ongoing">{lang === "bn" ? "চলমান" : "Ongoing"} ({ongoing.length})</TabsTrigger>
            <TabsTrigger value="completed">{lang === "bn" ? "সম্পন্ন" : "Completed"} ({completed.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="on-order" className="mt-3 space-y-2">
            {onOrder.length === 0 ? <EmptyOrders lang={lang} /> : onOrder.map((o) => <OrderRow key={o.id} o={o} lang={lang} onView={() => setOpenOrder(o)} />)}
          </TabsContent>
          <TabsContent value="ongoing" className="mt-3 space-y-2">
            {ongoing.length === 0 ? <EmptyOrders lang={lang} /> : ongoing.map((o) => <OrderRow key={o.id} o={o} lang={lang} onView={() => setOpenOrder(o)} />)}
          </TabsContent>
          <TabsContent value="completed" className="mt-3 space-y-2">
            {completed.length === 0 ? <EmptyOrders lang={lang} /> : completed.map((o) => <OrderRow key={o.id} o={o} lang={lang} onView={() => setOpenOrder(o)} />)}
          </TabsContent>
        </Tabs>
      )}

      <OrderDetailDialog order={openOrder} onClose={() => setOpenOrder(null)} onStatusChange={updateStatus} lang={lang} />
    </div>
  );
}

function EmptyOrders({ lang }: { lang: string }) {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <ClipboardList className="h-12 w-12 text-muted-foreground" />
      <p className="mt-2 text-muted-foreground">{lang === "bn" ? "কোনো অর্ডার নেই" : "No orders yet"}</p>
    </div>
  );
}

function statusColor(s: string) {
  switch (s) {
    case "pending": return "bg-amber-100 text-amber-800";
    case "processing": return "bg-blue-100 text-blue-800";
    case "shipped": return "bg-violet-100 text-violet-800";
    case "delivered": return "bg-emerald-100 text-emerald-800";
    case "cancelled": return "bg-red-100 text-red-800";
    default: return "bg-muted text-muted-foreground";
  }
}

function OrderRow({ o, lang, onView }: { o: Order; lang: string; onView: () => void }) {
  const date = new Date(o.created_at).toLocaleDateString();
  return (
    <button onClick={onView} className="w-full rounded-xl border bg-card p-3 text-left shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold">{o.order_no ?? `#${o.id.slice(0, 8)}`}</div>
          <div className="mt-0.5 truncate text-sm text-muted-foreground">{o.customer_name} • {o.customer_phone}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">{date}</div>
        </div>
        <div className="text-right">
          <div className="font-bold">৳ {lang === "bn" ? bnNum(o.total) : o.total}</div>
          <Badge className={`mt-1 ${statusColor(o.status)} hover:${statusColor(o.status)}`}>{o.status}</Badge>
        </div>
      </div>
    </button>
  );
}

function OrderDetailDialog({ order, onClose, onStatusChange, lang }: { order: Order | null; onClose: () => void; onStatusChange: (id: string, s: string) => void; lang: string }) {
  const { data: items = [] } = useQuery<OrderItem[]>({
    queryKey: ["mp-order-items", order?.id],
    enabled: !!order,
    queryFn: async () => {
      const { data } = await supabase.from("marketplace_order_items" as never)
        .select("id,name,qty,price,total").eq("order_id", order!.id);
      return ((data as unknown) as OrderItem[]) ?? [];
    },
  });

  return (
    <Dialog open={!!order} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{order?.order_no ?? (order ? `#${order.id.slice(0, 8)}` : "")}</DialogTitle>
        </DialogHeader>
        {order && (
          <div className="space-y-3 text-sm">
            <div className="rounded-md border bg-muted/40 p-3">
              <div className="font-semibold">{order.customer_name}</div>
              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Phone className="h-3 w-3" />{order.customer_phone}</div>
              {order.customer_address && <div className="mt-1 flex items-start gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3 mt-0.5" />{order.customer_address}</div>}
            </div>
            <div className="rounded-md border">
              <div className="border-b bg-muted/40 px-3 py-2 text-xs font-semibold">{lang === "bn" ? "আইটেম" : "Items"}</div>
              {items.length === 0 ? (
                <div className="flex items-center gap-2 px-3 py-3 text-xs text-muted-foreground"><Package className="h-4 w-4" />{lang === "bn" ? "কোনো আইটেম নেই" : "No items"}</div>
              ) : (
                <div className="divide-y">
                  {items.map((it) => (
                    <div key={it.id} className="flex justify-between px-3 py-2 text-xs">
                      <div className="min-w-0 truncate">{it.name} <span className="text-muted-foreground">× {lang === "bn" ? bnNum(it.qty) : it.qty}</span></div>
                      <div className="font-semibold">৳ {lang === "bn" ? bnNum(it.total) : it.total}</div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-between border-t bg-muted/40 px-3 py-2 text-sm font-bold">
                <span>{lang === "bn" ? "মোট" : "Total"}</span>
                <span>৳ {lang === "bn" ? bnNum(order.total) : order.total}</span>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{lang === "bn" ? "স্ট্যাটাস" : "Status"}</label>
              <Select value={order.status} onValueChange={(v) => onStatusChange(order.id, v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{lang === "bn" ? "বন্ধ" : "Close"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
export default OrdersPage;
