import { useEffect, useState } from "react";
import { Link } from "@/lib/router";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Wrench, Phone, MapPin, CalendarClock, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Booking = {
  id: string;
  shop_id: string;
  service_id: string;
  service_name: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string | null;
  scheduled_at: string | null;
  service_price: number;
  advance_amount: number;
  advance_paid: boolean;
  status: string;
  created_at: string;
};
type Shop = { id: string; name: string; logo_url: string | null; phone: string | null; slug: string | null; username: string | null };

const STATUS_LABEL: Record<string, string> = {
  pending: "অপেক্ষমান",
  confirmed: "নিশ্চিত",
  in_progress: "চলছে",
  completed: "সম্পন্ন",
  cancelled: "বাতিল",
};
const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  confirmed: "default",
  in_progress: "default",
  completed: "default",
  cancelled: "destructive",
};

export default function MyServicesPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [shops, setShops] = useState<Record<string, Shop>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const { data, error } = await supabase.functions.invoke("marketplace-public", {
        body: { action: "list-my-service-bookings" },
      });
      if (!alive) return;
      if (!error && data && !(data as { error?: string }).error) {
        const d = data as { bookings: Booking[]; shops: Record<string, Shop> };
        setBookings(d.bookings ?? []);
        setShops(d.shops ?? {});
      }
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div>
      <h1 className="mb-3 text-xl font-extrabold">আমার সার্ভিস</h1>
      {bookings.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border bg-card py-12 text-center text-muted-foreground">
          <Wrench className="h-10 w-10" />
          <div className="text-sm">এখনও কোনো সার্ভিস বুকিং নেই</div>
          <Link to="/shop" search={{ view: "services" } as never} className="text-sm font-semibold text-primary hover:underline">মার্কেটপ্লেসে যান</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => {
            const shop = shops[b.shop_id];
            return (
              <div key={b.id} className="rounded-2xl border bg-card p-3 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <Link to="/shop/service/$id" params={{ id: b.service_id }} className="font-bold hover:underline">
                      {b.service_name}
                    </Link>
                    {shop && (
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        {shop.logo_url ? (
                          <img src={shop.logo_url} alt="" className="h-4 w-4 rounded-full object-cover" />
                        ) : (
                          <Store className="h-3.5 w-3.5" />
                        )}
                        <span>{shop.name}</span>
                        {shop.phone && (
                          <a href={`tel:${shop.phone}`} className="ml-1 inline-flex items-center gap-0.5 text-primary">
                            <Phone className="h-3 w-3" /> {shop.phone}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                  <Badge variant={STATUS_VARIANT[b.status] ?? "secondary"}>{STATUS_LABEL[b.status] ?? b.status}</Badge>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {b.scheduled_at && (
                    <span className="inline-flex items-center gap-1"><CalendarClock className="h-3 w-3" /> {new Date(b.scheduled_at).toLocaleString("bn-BD")}</span>
                  )}
                  {b.customer_address && (
                    <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {b.customer_address}</span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-muted px-2 py-0.5">মূল্য: ৳{Number(b.service_price).toLocaleString("bn-BD")}</span>
                  {b.advance_amount > 0 && (
                    <span className={`rounded-full px-2 py-0.5 ${b.advance_paid ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"}`}>
                      অগ্রিম: ৳{Number(b.advance_amount).toLocaleString("bn-BD")} {b.advance_paid ? "(পেইড)" : "(বাকি)"}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}