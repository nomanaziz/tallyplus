import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users, Store, CreditCard, Receipt, Package, ShieldCheck,
  TrendingUp, Calendar, AlertCircle, Layers, ArrowLeftRight, Bell,
} from "lucide-react";
import { Link } from "@/lib/router";

type PlanRow = { name: string; count: number; revenue: number };

type Stats = {
  users: number;
  shops: number;
  activeSubs: number;
  pendingRequests: number;
  marketplaceProducts: number;
  marketplaceActive: number;
  listings: number;
  admins: number;
  expiringSoon: number;
  thisMonthSubs: number;
  totalRevenue: number;
  byPlan: PlanRow[];
  pendingTransfers: number;
  pendingSms: number;
  pendingWithdrawals: number;
  signupsToday: number;
  newShopsToday: number;
};

function fmtBdt(n: number) {
  return "৳" + Math.round(n).toLocaleString("en-BD");
}

function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<Array<{ id: string; title: string; body: string | null; link: string | null; type: string | null; created_at: string }>>([]);

  useEffect(() => {
    (async () => {
      const now = new Date();
      const nowIso = now.toISOString();
      const in7 = new Date(now.getTime() + 7 * 86400_000).toISOString();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

      const [
        u, s, sub, req, mp, mpa, list, admins, exp, mNew,
        activeSubsRows, plans,
        pTrans, pSms, pWd, sToday, shToday, recent,
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("shops").select("id", { count: "exact", head: true }).is("deleted_at", null),
        supabase.from("subscriptions").select("id", { count: "exact", head: true })
          .eq("status", "active").gt("expires_at", nowIso),
        supabase.from("subscription_requests").select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase.from("marketplace_products").select("id", { count: "exact", head: true }),
        supabase.from("marketplace_products").select("id", { count: "exact", head: true })
          .eq("is_active", true),
        supabase.from("marketplace_listings").select("id", { count: "exact", head: true }),
        supabase.from("user_roles").select("user_id", { count: "exact", head: true })
          .eq("role", "admin"),
        supabase.from("subscriptions").select("id", { count: "exact", head: true })
          .eq("status", "active").gt("expires_at", nowIso).lt("expires_at", in7),
        supabase.from("subscriptions").select("id", { count: "exact", head: true })
          .gte("created_at", monthStart),
        supabase.from("subscriptions").select("plan_id")
          .eq("status", "active").gt("expires_at", nowIso),
        supabase.from("subscription_plans").select("id,name_bn,name_en,price_bdt"),
        supabase.from("shop_transfer_requests").select("id", { count: "exact", head: true })
          .in("status", ["pending_payment","pending_recipient","pending_admin"]),
        supabase.from("sms_purchase_requests").select("id", { count: "exact", head: true })
          .eq("payment_status", "pending"),
        supabase.from("affiliate_withdrawals").select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase.from("profiles").select("id", { count: "exact", head: true })
          .gte("created_at", dayStart),
        supabase.from("shops").select("id", { count: "exact", head: true })
          .gte("created_at", dayStart).is("deleted_at", null),
        supabase.from("notifications").select("id,title,body,link,type,created_at")
          .order("created_at", { ascending: false }).limit(15),
      ]);

      const planMap = new Map<string, { name: string; price: number }>();
      ((plans.data as any[]) ?? []).forEach((p) => {
        planMap.set(p.id, { name: p.name_bn || p.name_en || "Plan", price: Number(p.price_bdt) || 0 });
      });
      const grouped = new Map<string, PlanRow>();
      let revenue = 0;
      ((activeSubsRows.data as any[]) ?? []).forEach((row) => {
        const p = planMap.get(row.plan_id);
        if (!p) return;
        const cur = grouped.get(row.plan_id) ?? { name: p.name, count: 0, revenue: 0 };
        cur.count += 1;
        cur.revenue += p.price;
        revenue += p.price;
        grouped.set(row.plan_id, cur);
      });
      const byPlan = Array.from(grouped.values()).sort((a, b) => b.count - a.count);

      setStats({
        users: u.count ?? 0,
        shops: s.count ?? 0,
        activeSubs: sub.count ?? 0,
        pendingRequests: req.count ?? 0,
        marketplaceProducts: mp.count ?? 0,
        marketplaceActive: mpa.count ?? 0,
        listings: list.count ?? 0,
        admins: admins.count ?? 0,
        expiringSoon: exp.count ?? 0,
        thisMonthSubs: mNew.count ?? 0,
        totalRevenue: revenue,
        byPlan,
        pendingTransfers: pTrans.count ?? 0,
        pendingSms: pSms.count ?? 0,
        pendingWithdrawals: pWd.count ?? 0,
        signupsToday: sToday.count ?? 0,
        newShopsToday: shToday.count ?? 0,
      });
      setActivity(((recent.data as any[]) ?? []) as any);
    })();
  }, []);

  const tiles = [
    { label: "Users", value: stats?.users, icon: Users },
    { label: "Shops", value: stats?.shops, icon: Store },
    { label: "Active subs", value: stats?.activeSubs, icon: CreditCard },
    { label: "Pending req.", value: stats?.pendingRequests, icon: Receipt },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-3 p-3 sm:space-y-4 sm:p-6">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Dashboard</h1>
        <p className="text-xs text-muted-foreground sm:text-sm">প্ল্যাটফর্মের সারসংক্ষেপ</p>
      </div>

      {/* New Subscription Orders — top priority */}
      <Link
        to={"/admin/subscription-requests" as never}
        className={`block rounded-xl border p-4 shadow-sm transition hover:shadow-md ${
          (stats?.pendingRequests ?? 0) > 0
            ? "border-amber-400 bg-amber-50"
            : "bg-card"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`flex h-11 w-11 items-center justify-center rounded-full ${
              (stats?.pendingRequests ?? 0) > 0 ? "bg-amber-200 text-amber-900" : "bg-muted text-muted-foreground"
            }`}>
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold">নতুন Subscription Orders</div>
              <div className="text-xs text-muted-foreground">Pending — click করে order page-এ যান</div>
            </div>
          </div>
          <div className="text-3xl font-extrabold tabular-nums">
            {stats?.pendingRequests ?? "—"}
          </div>
        </div>
      </Link>

      {/* Top stat strip */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <Card key={t.label}>
              <CardContent className="flex items-center justify-between gap-2 p-3">
                <div className="min-w-0">
                  <div className="truncate text-[11px] text-muted-foreground sm:text-xs">{t.label}</div>
                  <div className="text-lg font-bold sm:text-xl">{t.value ?? "—"}</div>
                </div>
                <Icon className="h-4 w-4 flex-none text-muted-foreground" />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Action-needed strip */}
      <Card>
        <CardHeader className="p-3 pb-1 sm:p-4 sm:pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            Needs Attention
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 p-3 pt-2 sm:grid-cols-5 sm:p-4 sm:pt-2">
          <ActionTile to="/admin/transfers" label="Transfers" value={stats?.pendingTransfers ?? "—"} icon={ArrowLeftRight} />
          <ActionTile to="/admin/subscription-requests" label="Sub. Requests" value={stats?.pendingRequests ?? "—"} icon={Receipt} />
          <ActionTile to="/admin/sms-gateways" label="SMS top-ups" value={stats?.pendingSms ?? "—"} icon={Bell} />
          <ActionTile to="/admin/affiliates" label="Withdrawals" value={stats?.pendingWithdrawals ?? "—"} icon={CreditCard} />
          <ActionTile to="/admin/users" label="Today signups" value={stats?.signupsToday ?? "—"} icon={Users} />
        </CardContent>
      </Card>

      {/* Subscription summary */}
      <Card>
        <CardHeader className="p-3 pb-1 sm:p-4 sm:pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <TrendingUp className="h-4 w-4 text-primary" />
            Subscription Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-3 pt-2 sm:p-4 sm:pt-2">
          <div className="grid grid-cols-3 gap-2">
            <MiniStat label="Active revenue" value={stats ? fmtBdt(stats.totalRevenue) : "—"} icon={CreditCard} />
            <MiniStat label="Expiring 7d" value={stats?.expiringSoon ?? "—"} icon={AlertCircle} tone="amber" />
            <MiniStat label="New (month)" value={stats?.thisMonthSubs ?? "—"} icon={Calendar} />
          </div>
          {stats && stats.byPlan.length > 0 && (
            <div className="overflow-hidden rounded-md border">
              <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2 bg-muted/50 px-3 py-1.5 text-[11px] font-medium uppercase text-muted-foreground sm:text-xs">
                <span>Plan</span>
                <span className="text-right">Active users</span>
                <span className="text-right">Revenue</span>
              </div>
              {stats.byPlan.map((p) => (
                <div key={p.name} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 border-t px-3 py-2 text-sm">
                  <span className="truncate font-medium">{p.name}</span>
                  <span className="text-right tabular-nums">{p.count}</span>
                  <span className="text-right tabular-nums text-muted-foreground">{fmtBdt(p.revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Marketplace + admin team */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card>
          <CardHeader className="p-3 pb-1 sm:p-4 sm:pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Package className="h-4 w-4 text-primary" /> Marketplace
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-2 p-3 pt-2 sm:p-4 sm:pt-2">
            <MiniStat label="Products" value={stats?.marketplaceProducts ?? "—"} icon={Package} />
            <MiniStat label="Active" value={stats?.marketplaceActive ?? "—"} icon={Layers} tone="emerald" />
            <MiniStat label="Listings" value={stats?.listings ?? "—"} icon={Store} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-3 pb-1 sm:p-4 sm:pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="h-4 w-4 text-primary" /> Admin Team
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-2 sm:p-4 sm:pt-2">
            <div className="text-2xl font-bold">{stats?.admins ?? "—"}</div>
            <div className="text-xs text-muted-foreground">Total platform admins</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader className="p-3 pb-1 sm:p-4 sm:pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Bell className="h-4 w-4 text-primary" /> Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {activity.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-muted-foreground">No recent activity</div>
          ) : (
            <ul className="divide-y">
              {activity.map((n) => (
                <li key={n.id}>
                  {n.link ? (
                    <Link to={n.link as never} className="block px-3 py-2 hover:bg-accent">
                      <ActivityItem {...n} />
                    </Link>
                  ) : (
                    <div className="px-3 py-2"><ActivityItem {...n} /></div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ActionTile({ to, label, value, icon: Icon }: { to: string; label: string; value: number | string; icon: React.ComponentType<{ className?: string }> }) {
  const num = typeof value === "number" ? value : 0;
  const tone = num > 0 ? "border-amber-300 bg-amber-50" : "bg-card";
  return (
    <Link to={to as never} className={`block rounded-md border p-2 transition hover:shadow-sm ${tone}`}>
      <div className="flex items-center justify-between gap-1">
        <span className="truncate text-[10px] text-muted-foreground sm:text-[11px]">{label}</span>
        <Icon className={`h-3.5 w-3.5 ${num > 0 ? "text-amber-700" : "text-muted-foreground"}`} />
      </div>
      <div className="mt-0.5 text-base font-bold tabular-nums sm:text-lg">{value}</div>
    </Link>
  );
}

function ActivityItem({ title, body, created_at }: { title: string; body: string | null; created_at: string }) {
  const dt = new Date(created_at);
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{title}</div>
        {body && <div className="truncate text-xs text-muted-foreground">{body}</div>}
      </div>
      <div className="flex-none text-[10px] text-muted-foreground">{dt.toLocaleString()}</div>
    </div>
  );
}

function MiniStat({
  label, value, icon: Icon, tone = "muted",
}: { label: string; value: number | string; icon: React.ComponentType<{ className?: string }>; tone?: "muted" | "amber" | "emerald" }) {
  const toneCls =
    tone === "amber" ? "text-amber-600" :
    tone === "emerald" ? "text-emerald-600" :
    "text-muted-foreground";
  return (
    <div className="rounded-md border bg-card p-2">
      <div className="flex items-center justify-between gap-1">
        <span className="truncate text-[10px] text-muted-foreground sm:text-[11px]">{label}</span>
        <Icon className={`h-3.5 w-3.5 ${toneCls}`} />
      </div>
      <div className="mt-0.5 text-base font-bold tabular-nums sm:text-lg">{value}</div>
    </div>
  );
}

export default AdminOverview;
