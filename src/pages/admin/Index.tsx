import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Store, CreditCard, Receipt, Package } from "lucide-react";



type Stats = {
  users: number;
  shops: number;
  activeSubs: number;
  pendingRequests: number;
  marketplaceProducts: number;
};

function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    (async () => {
      const nowIso = new Date().toISOString();
      const [u, s, sub, req, mp] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("shops").select("id", { count: "exact", head: true }).is("deleted_at", null),
        supabase
          .from("subscriptions")
          .select("id", { count: "exact", head: true })
          .eq("status", "active")
          .gt("expires_at", nowIso),
        supabase
          .from("subscription_requests")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase.from("marketplace_products").select("id", { count: "exact", head: true }),
      ]);
      setStats({
        users: u.count ?? 0,
        shops: s.count ?? 0,
        activeSubs: sub.count ?? 0,
        pendingRequests: req.count ?? 0,
        marketplaceProducts: mp.count ?? 0,
      });
    })();
  }, []);

  const cards = [
    { label: "Total Users", value: stats?.users, icon: Users },
    { label: "Active Shops", value: stats?.shops, icon: Store },
    { label: "Active Subscriptions", value: stats?.activeSubs, icon: CreditCard },
    { label: "Pending Payment Requests", value: stats?.pendingRequests, icon: Receipt },
    { label: "Marketplace Products", value: stats?.marketplaceProducts, icon: Package },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-sm text-muted-foreground">প্ল্যাটফর্মের সারসংক্ষেপ</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{c.value ?? "—"}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default AdminOverview;
