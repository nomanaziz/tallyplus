import { useEffect, useState } from "react";
import { Link } from "@/lib/router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Wallet, ListChecks, NotebookPen, TrendingUp, TrendingDown, Loader2, ArrowDownLeft, ArrowUpRight, ShoppingBag, GraduationCap, User } from "lucide-react";

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
        // Use the same unified resolver as MyFordo so phone-matched fordos
        // (sent via the public shop link before login) are also counted.
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
        <Shortcut to="/customer/my-fordo" label="আমার ফর্দ" sub={`${fordoCount}টি`} Icon={ListChecks} tone="primary" />
        <Shortcut to="/customer/my-orders" label="আমার অর্ডার" Icon={ShoppingBag} tone="primary" />
        <Shortcut to="/customer/money" label="আয়-ব্যয়" Icon={Wallet} tone="primary" />
        <Shortcut to="/customer/notes" label="নোট" sub={`${noteCount}টি`} Icon={NotebookPen} tone="amber" />
        <Shortcut to="/customer/money" label="পাব" sub={bdt(willGet)} Icon={ArrowDownLeft} tone="emerald" />
        <Shortcut to="/customer/money" label="দেব" sub={bdt(willGive)} Icon={ArrowUpRight} tone="rose" />
        <Shortcut to="/customer/training" label="ট্রেনিং" Icon={GraduationCap} tone="primary" />
        <Shortcut to="/customer/profile" label="ঠিকানা" Icon={User} tone="primary" />
      </div>
    </div>
  );
}

type Tone = "primary" | "amber" | "emerald" | "rose";
const TONE: Record<Tone, string> = {
  primary: "bg-primary/10 text-primary",
  amber: "bg-amber-500/10 text-amber-600",
  emerald: "bg-emerald-500/10 text-emerald-600",
  rose: "bg-rose-500/10 text-rose-600",
};

function Shortcut({
  to,
  label,
  sub,
  Icon,
  tone,
}: {
  to: string;
  label: string;
  sub?: string;
  Icon: React.ComponentType<{ className?: string }>;
  tone: Tone;
}) {
  return (
    <Link
      to={to}
      className="group flex flex-col items-center gap-1.5 rounded-2xl border bg-card p-3 text-center shadow-sm transition hover:border-primary/40 sm:p-4"
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-full sm:h-12 sm:w-12 ${TONE[tone]}`}>
        <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
      </div>
      <div className="text-[11px] font-semibold leading-tight sm:text-sm">{label}</div>
      {sub ? <div className="text-[10px] text-muted-foreground">{sub}</div> : null}
    </Link>
  );
}
