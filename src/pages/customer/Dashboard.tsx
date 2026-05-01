import { useEffect, useState } from "react";
import { Link } from "@/lib/router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Wallet, ListChecks, NotebookPen, TrendingUp, TrendingDown, Loader2, ArrowDownLeft, ArrowUpRight } from "lucide-react";

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

      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <Link
          to="/customer/my-fordo"
          className="group rounded-2xl border bg-card p-3 shadow-sm transition hover:border-primary/40 sm:p-5"
        >
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary sm:h-10 sm:w-10">
              <ListChecks className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold sm:text-base">আমার ফর্দ</div>
              <div className="text-[10px] text-muted-foreground sm:text-xs">{fordoCount}টি ফর্দ</div>
            </div>
          </div>
        </Link>

        <Link
          to="/customer/notes"
          className="group rounded-2xl border bg-card p-3 shadow-sm transition hover:border-primary/40 sm:p-5"
        >
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 sm:h-10 sm:w-10">
              <NotebookPen className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold sm:text-base">নোট</div>
              <div className="text-[10px] text-muted-foreground sm:text-xs">{noteCount}টি নোট</div>
            </div>
          </div>
        </Link>

        <Link
          to="/customer/money"
          className="group rounded-2xl border bg-card p-3 shadow-sm transition hover:border-emerald-500/40 sm:p-5"
        >
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 sm:h-10 sm:w-10">
              <ArrowDownLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold sm:text-base">পাব</div>
              <div className="text-[10px] text-muted-foreground sm:text-xs">{bdt(willGet)}</div>
            </div>
          </div>
        </Link>

        <Link
          to="/customer/money"
          className="group rounded-2xl border bg-card p-3 shadow-sm transition hover:border-rose-500/40 sm:p-5"
        >
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-500/10 text-rose-600 sm:h-10 sm:w-10">
              <ArrowUpRight className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold sm:text-base">দেব</div>
              <div className="text-[10px] text-muted-foreground sm:text-xs">{bdt(willGive)}</div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
