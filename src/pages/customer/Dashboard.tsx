import { useEffect, useState } from "react";
import { Link } from "@/lib/router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet, Loader2, Heart, User, StickyNote, GraduationCap, ShoppingBag, ListChecks, Wallet as WalletIcon, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";

type Tx = { id: string; type: string; amount: number; tx_date: string };

function bdt(n: number) {
  return new Intl.NumberFormat("bn-BD", { maximumFractionDigits: 0 }).format(n) + " ৳";
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

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const since = monthStart.toISOString().slice(0, 10);
      const [tx, fordoRes, notes, loans] = await Promise.all([
        supabase
          .from("consumer_transactions")
          .select("type, amount")
          .eq("user_id", user.id)
          .gte("tx_date", since),
        supabase.functions.invoke("consumer-fordo-history", { body: {} }),
        supabase
          .from("consumer_notes")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase
          .from("consumer_loans")
          .select("type, amount")
          .eq("user_id", user.id)
          .eq("is_settled", false),
      ]);
      if (cancelled) return;
      const rows = (tx.data ?? []) as Tx[];
      let inc = 0;
      let exp = 0;
      for (const r of rows) {
        if (r.type === "income") inc += Number(r.amount);
        else exp += Number(r.amount);
      }
      setIncome(inc);
      setExpense(exp);
      let lentSum = 0, borrowedSum = 0;
      for (const l of (loans.data ?? []) as Array<{ type: string; amount: number }>) {
        if (l.type === "lent") lentSum += Number(l.amount);
        else borrowedSum += Number(l.amount);
      }
      setWillGet(lentSum);
      setWillGive(borrowedSum);
      const fordoData = (fordoRes.data ?? {}) as { wishlists?: Array<{ id: string; deleted_at?: string | null }> };
      const fordoList = fordoData.wishlists ?? [];
      const activeFordoCount = fordoList.filter((w) => !w.deleted_at).length;
      setFordoCount(activeFordoCount);
      setNoteCount(notes.count ?? 0);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

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

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3">
        <Shortcut to="/customer/my-fordo" label="আমার ফর্দ" sub={`${fordoCount}টি`} icon={ListChecks} tone="violet" />
        <Shortcut to="/customer/my-orders" label="আমার অর্ডার" icon={ShoppingBag} tone="indigo" />
        <Shortcut to="/customer/favorite-shops" label="প্রিয় দোকান" icon={Heart} tone="rose" />
        <Shortcut to="/customer/money" label="আয়-ব্যয়" icon={WalletIcon} tone="emerald" />
        <Shortcut to="/customer/notes" label="নোট" sub={`${noteCount}টি`} icon={StickyNote} tone="amber" />
        <Shortcut to="/customer/money" label="পাব" sub={bdt(willGet)} icon={ArrowDownToLine} tone="green" />
        <Shortcut to="/customer/money" label="দেব" sub={bdt(willGive)} icon={ArrowUpFromLine} tone="red" />
        <Shortcut to="/customer/training" label="ট্রেনিং" icon={GraduationCap} tone="sky" />
        <Shortcut to="/customer/profile" label="প্রোফাইল" icon={User} tone="orange" />
      </div>
    </div>
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
  icon: Icon,
  tone = "indigo",
}: {
  to: string;
  label: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: keyof typeof TONE;
}) {
  return (
    <Link
      to={to}
      className="group flex flex-col items-center gap-1.5 rounded-2xl border bg-card p-3 text-center shadow-sm transition hover:border-primary/40 hover:shadow-md sm:p-4"
    >
      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl sm:h-14 sm:w-14 ${TONE[tone]}`}>
        <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
      </div>
      <div className="text-[11px] font-semibold leading-tight sm:text-sm">{label}</div>
      {sub ? <div className="text-[10px] text-muted-foreground">{sub}</div> : null}
    </Link>
  );
}
