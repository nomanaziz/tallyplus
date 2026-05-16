import { useCallback, useEffect, useState } from "react";
import { Link } from "@/lib/router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Loader2,
  ShoppingBag,
  ListChecks,
  Heart,
  Wrench,
  ArrowDownCircle,
  ArrowUpCircle,
} from "lucide-react";
import { icons } from "@/lib/icons";
import { InstallAppCard } from "@/components/app/InstallAppCard";
import { CustomerDashboardCharts } from "@/components/customer/DashboardCharts";

type Tx = { id: string; type: string; amount: number; tx_date: string; kind?: string | null; transfer_group_id?: string | null };
type LoanSummary = { type: "lent" | "borrowed"; amount: number; paid_amount: number };

function bdt(n: number) {
  return new Intl.NumberFormat("bn-BD", { maximumFractionDigits: 0 }).format(n) + " ৳";
}

function bn(n: number) {
  return new Intl.NumberFormat("bn-BD").format(n);
}

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [income, setIncome] = useState(0);
  const [expense, setExpense] = useState(0);
  const [fordoCount, setFordoCount] = useState(0);
  const [noteCount, setNoteCount] = useState(0);
  const [willGet, setWillGet] = useState(0);
  const [willGive, setWillGive] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [favShopCount, setFavShopCount] = useState(0);
  const [serviceCount, setServiceCount] = useState(0);
  const [cashOnHand, setCashOnHand] = useState(0);

  const loadDashboard = useCallback(async () => {
    if (!user) return;
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const since = monthStart.toISOString().slice(0, 10);
    const [tx, fordoRes, notes, loans, favShops, phonesRes, services, cashSummary] = await Promise.all([
      supabase
        .from("consumer_transactions")
        .select("type, amount, kind, transfer_group_id")
        .eq("user_id", user.id)
        .gte("tx_date", since),
      supabase.functions.invoke("consumer-fordo-history", { body: {} }),
      supabase
        .from("consumer_notes")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("consumer_loans")
        .select("type, amount, paid_amount")
        .eq("user_id", user.id)
        .eq("is_settled", false),
      supabase
        .from("consumer_favourite_shops")
        .select("id", { count: "exact", head: true })
        .eq("consumer_id", user.id),
      supabase.rpc("my_phones"),
      supabase.functions.invoke("marketplace-public", {
        body: { action: "list-my-service-bookings" },
      }),
      supabase.rpc("consumer_cash_summary"),
    ]);

    const rows = (tx.data ?? []) as Tx[];
    let inc = 0;
    let exp = 0;
    for (const r of rows) {
      if (r.transfer_group_id) continue;
      if (r.kind && r.kind !== "regular") continue;
      if (r.type === "income") inc += Number(r.amount);
      else exp += Number(r.amount);
    }
    setIncome(inc);
    setExpense(exp);

    let lentSum = 0;
    let borrowedSum = 0;
    for (const l of (loans.data ?? []) as LoanSummary[]) {
      const outstanding = Math.max(Number(l.amount) - Number(l.paid_amount || 0), 0);
      if (l.type === "lent") lentSum += outstanding;
      else borrowedSum += outstanding;
    }
    setWillGet(lentSum);
    setWillGive(borrowedSum);

    if (cashSummary.data && typeof cashSummary.data === "object" && "balance" in (cashSummary.data as Record<string, unknown>)) {
      setCashOnHand(Number((cashSummary.data as { balance?: number }).balance) || 0);
    }

    const fordoData = (fordoRes.data ?? {}) as { wishlists?: Array<{ id: string; deleted_at?: string | null }> };
    const fordoList = fordoData.wishlists ?? [];
    const activeFordoCount = fordoList.filter((w) => !w.deleted_at).length;
    setFordoCount(activeFordoCount);
    setNoteCount(notes.count ?? 0);
    setFavShopCount(favShops.count ?? 0);

    const phones = Array.isArray(phonesRes.data) ? (phonesRes.data as string[]).filter(Boolean) : [];
    let oq = supabase
      .from("marketplace_orders")
      .select("id", { count: "exact", head: true });
    if (phones.length > 0) {
      const phoneList = phones.map((p) => `"${p}"`).join(",");
      oq = oq.or(`consumer_user_id.eq.${user.id},customer_phone.in.(${phoneList})`);
    } else {
      oq = oq.eq("consumer_user_id", user.id);
    }
    const { count: oCount } = await oq;
    setOrderCount(oCount ?? 0);

    const sd = (services.data ?? {}) as { bookings?: Array<unknown> };
    setServiceCount((sd.bookings ?? []).length);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`customer-dashboard-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "consumer_loans", filter: `user_id=eq.${user.id}` }, () => {
        void loadDashboard();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "consumer_loan_payments", filter: `user_id=eq.${user.id}` }, () => {
        void loadDashboard();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "consumer_cash_movements", filter: `user_id=eq.${user.id}` }, () => {
        void loadDashboard();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(ch);
    };
  }, [loadDashboard, user]);

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const balance = income - expense;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">স্বাগতম 👋</h1>
        <p className="text-sm text-muted-foreground">এই মাসের একটি সংক্ষিপ্ত সারসংক্ষেপ</p>
      </div>

      <InstallAppCard />

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Card className="p-3 sm:p-4">
          <div className="flex items-center justify-between gap-1 text-[11px] text-muted-foreground sm:text-xs">
            <span className="truncate">আয়</span>
            <TrendingUp className="h-3.5 w-3.5 shrink-0 text-emerald-600 sm:h-4 sm:w-4" />
          </div>
          <div className="mt-1 text-base font-bold text-emerald-600 sm:mt-2 sm:text-2xl">{bdt(income)}</div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="flex items-center justify-between gap-1 text-[11px] text-muted-foreground sm:text-xs">
            <span className="truncate">ব্যয়</span>
            <TrendingDown className="h-3.5 w-3.5 shrink-0 text-rose-600 sm:h-4 sm:w-4" />
          </div>
          <div className="mt-1 text-base font-bold text-rose-600 sm:mt-2 sm:text-2xl">{bdt(expense)}</div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="flex items-center justify-between gap-1 text-[11px] text-muted-foreground sm:text-xs">
            <span className="truncate">ব্যালেন্স</span>
            <Wallet className="h-3.5 w-3.5 shrink-0 text-primary sm:h-4 sm:w-4" />
          </div>
          <div className={`mt-1 text-base font-bold sm:mt-2 sm:text-2xl ${balance >= 0 ? "text-foreground" : "text-rose-600"}`}>
            {bdt(balance)}
          </div>
        </Card>
      </div>

      {user ? <CustomerDashboardCharts userId={user.id} /> : null}

      {/* মোট সারসংক্ষেপ — দেনা, পাওনা, total order, ফর্দ, প্রিয় দোকান, সার্ভিস */}
      <div>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">মোট সারসংক্ষেপ</h2>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <StatCard label="পাব (পাওনা)" value={bdt(willGet)} Icon={ArrowDownCircle} tone="text-emerald-600" to="/customer/money" />
          <StatCard label="দেব (দেনা)" value={bdt(willGive)} Icon={ArrowUpCircle} tone="text-rose-600" to="/customer/money" />
          <StatCard label="হাতে নগদ" value={bdt(cashOnHand)} Icon={Wallet} tone={cashOnHand >= 0 ? "text-amber-600" : "text-rose-600"} to="/customer/money" />
          <StatCard label="মোট অর্ডার" value={`${bn(orderCount)}টি`} Icon={ShoppingBag} tone="text-indigo-600" to="/customer/my-orders" />
          <StatCard label="আমার ফর্দ" value={`${bn(fordoCount)}টি`} Icon={ListChecks} tone="text-violet-600" to="/customer/my-fordo" />
          <StatCard label="প্রিয় দোকান" value={`${bn(favShopCount)}টি`} Icon={Heart} tone="text-pink-600" to="/customer/favorite-shops" />
          <StatCard label="সার্ভিস বুকিং" value={`${bn(serviceCount)}টি`} Icon={Wrench} tone="text-amber-600" to="/customer/my-services" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3">
        <Shortcut to="/customer/my-fordo" label="আমার ফর্দ" sub={`${fordoCount}টি`} img={icons.wishlist} tone="violet" />
        <Shortcut to="/customer/my-orders" label="আমার অর্ডার" img={icons.order} tone="indigo" />
        <Shortcut to="/customer/favorite-shops" label="প্রিয় দোকান" img={icons.favorite} tone="rose" />
        <Shortcut to="/customer/money" label="আয়-ব্যয়" img={icons.money} tone="emerald" />
        <Shortcut to="/customer/notes" label="নোট" sub={`${noteCount}টি`} img={icons.note} tone="amber" />
        <Shortcut to="/customer/training" label="ট্রেনিং" img={icons.customerTraining} tone="sky" />
        <Shortcut to="/customer/profile" label="প্রোফাইল" img={icons.profile} tone="orange" />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  Icon,
  tone,
  to,
}: {
  label: string;
  value: string;
  Icon: React.ComponentType<{ className?: string }>;
  tone: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="block rounded-2xl border bg-card p-3 shadow-sm transition hover:border-primary/40 hover:shadow-md sm:p-4"
    >
      <div className="flex items-center justify-between gap-1 text-[11px] text-muted-foreground sm:text-xs">
        <span className="truncate">{label}</span>
        <Icon className={`h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4 ${tone}`} />
      </div>
      <div className={`mt-1 text-base font-bold sm:mt-2 sm:text-xl ${tone}`}>{value}</div>
    </Link>
  );
}

const TONE: Record<string, string> = {
  violet: "bg-violet-100 text-violet-700",
  indigo: "bg-indigo-100 text-indigo-700",
  rose: "bg-rose-100 text-rose-700",
  emerald: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-700",
  green: "bg-green-100 text-green-700",
  red: "bg-red-100 text-red-700",
  sky: "bg-sky-100 text-sky-700",
  orange: "bg-orange-100 text-orange-700",
};

function Shortcut({
  to,
  label,
  sub,
  img: Img,
  tone = "indigo",
}: {
  to: string;
  label: string;
  sub?: string;
  img: React.ComponentType<{ className?: string }>;
  tone?: keyof typeof TONE;
}) {
  return (
    <Link
      to={to}
      className="group flex flex-col items-center gap-1.5 rounded-2xl border bg-card p-3 text-center shadow-sm transition hover:border-primary/40 hover:shadow-md sm:p-4"
    >
      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl sm:h-14 sm:w-14 ${TONE[tone]}`}>
        <Img className="h-7 w-7 sm:h-8 sm:w-8" />
      </div>
      <div className="text-[11px] font-semibold leading-tight sm:text-sm">{label}</div>
      {sub ? <div className="text-[10px] text-muted-foreground">{sub}</div> : null}
    </Link>
  );
}
