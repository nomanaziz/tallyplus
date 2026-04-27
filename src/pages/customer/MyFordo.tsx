import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Loader2, Store, ListChecks } from "lucide-react";

type Wishlist = {
  id: string;
  shop_id: string;
  customer_name: string;
  customer_phone: string;
  status: string;
  note: string | null;
  created_at: string;
};

type Shop = { id: string; name: string };

export default function MyFordo() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Wishlist[]>([]);
  const [shops, setShops] = useState<Record<string, Shop>>({});

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      const { data: wls } = await supabase
        .from("customer_wishlists")
        .select("id, shop_id, customer_name, customer_phone, status, note, created_at")
        .eq("consumer_user_id", user.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(100);
      if (cancelled) return;
      const list = (wls ?? []) as Wishlist[];
      setItems(list);
      const ids = Array.from(new Set(list.map((w) => w.shop_id)));
      if (ids.length > 0) {
        const { data: ss } = await supabase.from("shops").select("id, name").in("id", ids);
        const map: Record<string, Shop> = {};
        for (const s of (ss ?? []) as Shop[]) map[s.id] = s;
        setShops(map);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">আমার ফর্দ</h1>
        <p className="text-sm text-muted-foreground">সব দোকানে পাঠানো ফর্দ</p>
      </div>

      {items.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          <ListChecks className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
          এখনো কোনো ফর্দ পাঠানো হয়নি। দোকানের ফর্দ লিঙ্কে গিয়ে পাঠান।
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((w) => (
            <Card key={w.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Store className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{shops[w.shop_id]?.name ?? "Shop"}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(w.created_at).toLocaleString("bn-BD")}
                  </div>
                  {w.note && (
                    <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{w.note}</p>
                  )}
                  <div className="mt-2 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium capitalize">
                    {w.status}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
