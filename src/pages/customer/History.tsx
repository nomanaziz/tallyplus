import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@/lib/router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, ChevronLeft, ChevronRight, Lock, Crown, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { toast } from "sonner";
import {
  canAccessMonthDetail,
  freeMonthsLabel,
  monthKey,
  startOfMonth,
  addMonths,
  type ConsumerSub,
} from "@/lib/consumer-history-access";

type Tx = {
  id: string;
  type: "income" | "expense";
  amount: number;
  category: string | null;
  note: string | null;
  tx_date: string;
  kind?: string | null;
  transfer_group_id?: string | null;
};

function bdt(n: number) {
  return new Intl.NumberFormat("bn-BD", { maximumFractionDigits: 0 }).format(n) + " ৳";
}
function monthLabelBn(d: Date) {
  return d.toLocaleDateString("bn-BD", { month: "long", year: "numeric" });
}

export default function CustomerHistory() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [rows, setRows] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMonth, setViewMonth] = useState<Date>(addMonths(startOfMonth(new Date()), -1));
  const [sub, setSub] = useState<ConsumerSub>(null);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const since = addMonths(startOfMonth(new Date()), -120).toISOString().slice(0, 10);
      const [{ data, error }, { data: s }] = await Promise.all([
        supabase
          .from("consumer_transactions")
          .select("*")
          .eq("user_id", user.id)
          .gte("tx_date", since)
          .order("tx_date", { ascending: false })
          .limit(5000),
        supabase
          .from("subscriptions")
          .select("expires_at, plan:subscription_plans(code)")
          .eq("user_id", user.id)
          .eq("status", "active")
          .gt("expires_at", new Date().toISOString())
          .like("plan.code", "consumer_history_%")
          .order("expires_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (error) toast.error(error.message);
      setRows((data ?? []) as Tx[]);
      if (s) {
        const planCode = (s.plan as { code?: string } | null)?.code ?? null;
        setSub({ plan_code: planCode, expires_at: s.expires_at });
      }
      setLoading(false);
    })();
  }, [user]);

  const monthRows = useMemo(() => {
    const k = monthKey(viewMonth);
    return rows.filter((r) => r.tx_date.startsWith(k));
  }, [rows, viewMonth]);

  const summary = useMemo(() => {
    let inc = 0, exp = 0;
    for (const r of monthRows) {
      if (r.transfer_group_id) continue;
      if (r.kind && r.kind !== "regular") continue;
      if (r.type === "income") inc += Number(r.amount);
      else exp += Number(r.amount);
    }
    return { inc, exp, balance: inc - exp };
  }, [monthRows]);

  const isFutureOrCurrent = monthKey(viewMonth) >= monthKey(new Date());
  const canSeeDetail = canAccessMonthDetail(viewMonth, sub);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">আয়-ব্যয় ইতিহাস</h1>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button size="icon" variant="outline" onClick={() => setViewMonth((d) => addMonths(d, -1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center">
          <div className="text-base font-semibold">{monthLabelBn(viewMonth)}</div>
          <div className="text-[10px] text-muted-foreground">{freeMonthsLabel()}</div>
        </div>
        <Button size="icon" variant="outline" disabled={isFutureOrCurrent} onClick={() => setViewMonth((d) => addMonths(d, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Card className="p-3 sm:p-4">
          <div className="flex items-center justify-between gap-1 text-[11px] text-muted-foreground sm:text-xs">
            <span className="truncate">আয়</span>
            <TrendingUp className="h-3.5 w-3.5 shrink-0 text-emerald-600 sm:h-4 sm:w-4" />
          </div>
          <div className="mt-1 text-base font-bold text-emerald-600 sm:text-xl">{bdt(summary.inc)}</div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="flex items-center justify-between gap-1 text-[11px] text-muted-foreground sm:text-xs">
            <span className="truncate">ব্যয়</span>
            <TrendingDown className="h-3.5 w-3.5 shrink-0 text-rose-600 sm:h-4 sm:w-4" />
          </div>
          <div className="mt-1 text-base font-bold text-rose-600 sm:text-xl">{bdt(summary.exp)}</div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="flex items-center justify-between gap-1 text-[11px] text-muted-foreground sm:text-xs">
            <span className="truncate">ব্যালেন্স</span>
            <Wallet className="h-3.5 w-3.5 shrink-0 text-primary sm:h-4 sm:w-4" />
          </div>
          <div className={`mt-1 text-base font-bold sm:text-xl ${summary.balance >= 0 ? "text-foreground" : "text-rose-600"}`}>
            {bdt(summary.balance)}
          </div>
        </Card>
      </div>

      <Card>
        {loading ? (
          <div className="flex h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : !canSeeDetail ? (
          <div className="flex flex-col items-center gap-3 p-8 text-center">
            <Lock className="h-8 w-8 text-muted-foreground/60" />
            <div className="text-sm font-medium">এই মাসের বিস্তারিত হিস্ট্রি লক করা</div>
            <div className="text-xs text-muted-foreground">এই মাস ও পূর্বের ২ মাস ফ্রি। তার আগের details দেখতে subscription নিন।</div>
            <Button size="sm" onClick={() => nav({ to: "/customer/subscription" })}>
              <Crown className="mr-1 h-4 w-4" /> Subscription দেখুন
            </Button>
          </div>
        ) : monthRows.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">এই মাসে কোনো entry নেই</div>
        ) : (
          <ul className="divide-y">
            {monthRows.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                <div className={`flex h-9 w-9 flex-none items-center justify-center rounded-full ${r.type === "income" ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"}`}>
                  {r.type === "income" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{r.category ?? (r.type === "income" ? "আয়" : "ব্যয়")}</div>
                  {r.note && <div className="truncate text-xs text-muted-foreground">{r.note}</div>}
                  <div className="text-[11px] text-muted-foreground">{r.tx_date}</div>
                </div>
                <div className={`text-right text-sm font-bold ${r.type === "income" ? "text-emerald-600" : "text-rose-600"}`}>
                  {r.type === "income" ? "+" : "-"} {bdt(Number(r.amount))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="border-primary/20 bg-primary/5 p-3 text-xs">
        পুরোনো মাসের পূর্ণ ইতিহাস unlock করতে{" "}
        <Link to="/customer/subscription" className="font-semibold text-primary underline">
          সাবস্ক্রিপশন
        </Link>{" "}
        দেখুন।
      </Card>
    </div>
  );
}