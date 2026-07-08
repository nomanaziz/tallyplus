import { useCallback, useEffect, useState } from "react";
import { Link } from "@/lib/router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Loader2,
  ShoppingBag,
  ListChecks,
  Heart,
  Wrench,
  Store,
  StickyNote,
  BookOpen,
  BarChart3,
  PiggyBank,
  GraduationCap,
  UserCog,
  History as HistoryIcon,
  CreditCard,
} from "lucide-react";
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
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">স্বাগতম 👋</h1>
        <p className="text-sm text-muted-foreground">এই মাসের একটি সংক্ষিপ্ত সারসংক্ষেপ</p>
      </div>

      {/* KPI summary — matches business dashboard "divide-x" table look */}
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="grid grid-cols-3 divide-x">
          <KpiCell label="আয়" value={bdt(income)} tone="text-emerald-600" Icon={TrendingUp} />
          <KpiCell label="ব্যয়" value={bdt(expense)} tone="text-rose-600" Icon={TrendingDown} />
          <KpiCell label="ব্যালেন্স" value={bdt(balance)} tone={balance >= 0 ? "text-primary" : "text-rose-600"} Icon={Wallet} />
        </div>
        <div className="grid grid-cols-3 divide-x border-t">
          <KpiLink to="/customer/money" label="পাব (পাওনা)" value={bdt(willGet)} tone="text-emerald-600" />
          <KpiLink to="/customer/money" label="দেব (দেনা)" value={bdt(willGive)} tone="text-rose-600" />
          <KpiLink to="/customer/money" label="হাতে নগদ" value={bdt(cashOnHand)} tone={cashOnHand >= 0 ? "text-amber-600" : "text-rose-600"} />
        </div>
        <div className="hidden border-t md:grid md:grid-cols-4 md:divide-x">
          <KpiLink to="/customer/my-orders" label="মোট অর্ডার" value={`${bn(orderCount)}টি`} tone="text-indigo-600" />
          <KpiLink to="/customer/my-fordo" label="আমার ফর্দ" value={`${bn(fordoCount)}টি`} tone="text-violet-600" />
          <KpiLink to="/customer/favorite-shops" label="প্রিয় দোকান" value={`${bn(favShopCount)}টি`} tone="text-pink-600" />
          <KpiLink to="/customer/my-services" label="সার্ভিস বুকিং" value={`${bn(serviceCount)}টি`} tone="text-amber-600" />
        </div>
      </div>

      {user ? <CustomerDashboardCharts userId={user.id} /> : null}

      {/* Grouped quick-menu sections — matches business dashboard layout */}
      <div className="space-y-3">
        <Section
          title="শপিং ও মার্কেটপ্লেস"
          items={[
            { to: "/customer/marketplace", label: "মার্কেটপ্লেস", Icon: Store },
            { to: "/customer/my-orders", label: "আমার অর্ডার", Icon: ShoppingBag },
            { to: "/customer/my-fordo", label: "ফর্দ", Icon: ListChecks },
            { to: "/customer/favorite-shops", label: "প্রিয় দোকান", Icon: Heart },
            { to: "/customer/my-services", label: "সার্ভিস", Icon: Wrench },
          ]}
        />
        <Section
          title="টাকা-পয়সা"
          items={[
            { to: "/customer/money", label: "টাকা", Icon: Wallet },
            { to: "/customer/cash-book", label: "ক্যাশ বুক", Icon: BookOpen },
            { to: "/customer/analytics", label: "বিশ্লেষণ", Icon: BarChart3 },
            { to: "/customer/budgets", label: "বাজেট", Icon: PiggyBank },
          ]}
        />
        <Section
          title="ব্যক্তিগত ও অন্যান্য"
          items={[
            { to: "/customer/notes", label: "নোট", Icon: StickyNote },
            { to: "/customer/history", label: "ইতিহাস", Icon: HistoryIcon },
            { to: "/customer/subscription", label: "সাবস্ক্রিপশন", Icon: CreditCard },
            { to: "/customer/training", label: "ট্রেনিং", Icon: GraduationCap },
            { to: "/customer/profile", label: "প্রোফাইল", Icon: UserCog },
          ]}
        />
      </div>
    </div>
  );
}

function KpiCell({ label, value, tone, Icon }: { label: string; value: string; tone: string; Icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="p-3 text-center md:p-4">
      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground md:text-sm">
        <Icon className={`h-3.5 w-3.5 ${tone}`} />
        <span>{label}</span>
      </div>
      <div className={`mt-1 text-base font-bold md:text-2xl ${tone}`}>{value}</div>
    </div>
  );
}

function KpiLink({ to, label, value, tone }: { to: string; label: string; value: string; tone: string }) {
  return (
    <Link to={to} className="p-3 text-center hover:bg-accent/40 md:p-4">
      <div className="text-xs text-muted-foreground md:text-sm">{label}</div>
      <div className={`mt-1 text-base font-bold md:text-xl ${tone}`}>{value}</div>
    </Link>
  );
}

function Section({
  title,
  items,
}: {
  title: string;
  items: { to: string; label: string; Icon: React.ComponentType<{ className?: string }> }[];
}) {
  return (
    <div className="rounded-xl border bg-card p-3 shadow-sm md:p-4">
      <div className="px-1 pb-2 text-sm font-bold md:text-base">{title}</div>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-8 md:gap-3 lg:grid-cols-10">
        {items.map((it) => (
          <Link
            key={it.to}
            to={it.to as never}
            className="group flex flex-col items-center gap-1 rounded-lg p-2 text-center hover:bg-accent"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm md:h-12 md:w-12">
              <it.Icon className="h-6 w-6 md:h-7 md:w-7" />
            </span>
            <span className="text-[11px] font-semibold leading-tight md:text-[13px]">{it.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
