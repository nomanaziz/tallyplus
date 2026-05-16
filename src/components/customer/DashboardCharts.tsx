import { useEffect, useMemo, useState } from "react";
import { Link } from "@/lib/router";
import { Card } from "@/components/ui/card";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";
import { PieChart as PieIcon, TrendingUp, BarChart3, ArrowRight, Loader2 } from "lucide-react";
import {
  bdt, isRegularTx, loadLastNMonths, loadMonthTransactions,
  CHART_COLORS, monthStart,
} from "@/lib/consumer-analytics";
import type { Tx } from "@/lib/consumer-analytics";

const MONTH_LABELS_SHORT = ["জানু","ফেব","মার্চ","এপ্রিল","মে","জুন","জুলাই","আগস্ট","সেপ্ট","অক্টো","নভে","ডিসে"];

export function CustomerDashboardCharts({ userId }: { userId: string }) {
  const [monthRows, setMonthRows] = useState<Tx[]>([]);
  const [trendRows, setTrendRows] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const anchor = useMemo(() => monthStart(new Date()), []);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    Promise.all([
      loadMonthTransactions(userId, anchor),
      loadLastNMonths(userId, 6),
    ]).then(([m, t]) => {
      if (cancel) return;
      setMonthRows(m);
      setTrendRows(t);
      setLoading(false);
    }).catch(() => !cancel && setLoading(false));
    return () => { cancel = true; };
  }, [userId, anchor]);

  const summary = useMemo(() => {
    let inc = 0, exp = 0;
    for (const r of monthRows) {
      if (!isRegularTx(r)) continue;
      if (r.type === "income") inc += Number(r.amount);
      else exp += Number(r.amount);
    }
    return { inc, exp, balance: inc - exp };
  }, [monthRows]);

  const incomeVsExpense = useMemo(() => {
    const data = [
      { name: "আয়", value: summary.inc, color: "hsl(142 71% 45%)" },
      { name: "ব্যয়", value: summary.exp, color: "hsl(0 84% 60%)" },
    ].filter((d) => d.value > 0);
    return data;
  }, [summary]);

  const topCats = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of monthRows) {
      if (!isRegularTx(r) || r.type !== "expense") continue;
      const k = r.category || "অন্যান্য";
      map.set(k, (map.get(k) ?? 0) + Number(r.amount));
    }
    const total = Array.from(map.values()).reduce((a, b) => a + b, 0);
    return Array.from(map.entries())
      .map(([name, value], i) => ({
        name, value, color: CHART_COLORS[i % CHART_COLORS.length],
        pct: total > 0 ? (value / total) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [monthRows]);

  const monthlyTrend = useMemo(() => {
    const now = new Date();
    const buckets: Record<string, { label: string; inc: number; exp: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      buckets[k] = { label: MONTH_LABELS_SHORT[d.getMonth()], inc: 0, exp: 0 };
    }
    for (const r of trendRows) {
      if (!isRegularTx(r)) continue;
      const k = r.tx_date.slice(0, 7);
      if (!buckets[k]) continue;
      if (r.type === "income") buckets[k].inc += Number(r.amount);
      else buckets[k].exp += Number(r.amount);
    }
    return Object.values(buckets);
  }, [trendRows]);

  const hasAnyData = summary.inc > 0 || summary.exp > 0 || monthlyTrend.some((m) => m.inc > 0 || m.exp > 0);

  if (loading) {
    return (
      <Card className="flex h-48 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  if (!hasAnyData) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground">📊 আর্থিক বিশ্লেষণ</h2>
        <Link
          to="/customer/analytics"
          className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          বিস্তারিত <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {/* Donut: income vs expense */}
        <Link to="/customer/analytics" className="block">
          <Card className="relative overflow-hidden p-4 transition hover:border-primary/40 hover:shadow-md">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <PieIcon className="h-4 w-4 text-primary" /> এই মাসের আয় বনাম ব্যয়
            </div>
            {incomeVsExpense.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">এই মাসে কোনো লেনদেন নেই</div>
            ) : (
              <div className="relative h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={incomeVsExpense}
                      dataKey="value"
                      nameKey="name"
                      cx="50%" cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                    >
                      {incomeVsExpense.map((c, i) => (
                        <Cell key={i} fill={c.color} stroke="hsl(var(--background))" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: any) => bdt(Number(v))}
                      contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-[10px] text-muted-foreground">ব্যালেন্স</div>
                  <div className={`text-base font-bold ${summary.balance >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {bdt(summary.balance)}
                  </div>
                </div>
              </div>
            )}
            <div className="mt-2 flex justify-center gap-4 text-xs">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full" style={{ background: "hsl(142 71% 45%)" }} />
                আয় <span className="font-semibold text-emerald-600">{bdt(summary.inc)}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full" style={{ background: "hsl(0 84% 60%)" }} />
                ব্যয় <span className="font-semibold text-rose-600">{bdt(summary.exp)}</span>
              </span>
            </div>
          </Card>
        </Link>

        {/* Area: last 6 months */}
        <Link to="/customer/analytics" className="block">
          <Card className="p-4 transition hover:border-primary/40 hover:shadow-md">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <TrendingUp className="h-4 w-4 text-primary" /> গত ৬ মাসের ট্রেন্ড
            </div>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrend} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cIncGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(142 71% 45%)" stopOpacity={0.55} />
                      <stop offset="100%" stopColor="hsl(142 71% 45%)" stopOpacity={0.04} />
                    </linearGradient>
                    <linearGradient id="cExpGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(0 84% 60%)" stopOpacity={0.55} />
                      <stop offset="100%" stopColor="hsl(0 84% 60%)" stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                  <Tooltip
                    formatter={(v: any) => bdt(Number(v))}
                    contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="inc" name="আয়" stroke="hsl(142 71% 45%)" strokeWidth={2} fill="url(#cIncGrad)" />
                  <Area type="monotone" dataKey="exp" name="ব্যয়" stroke="hsl(0 84% 60%)" strokeWidth={2} fill="url(#cExpGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Link>
      </div>

      {/* Top 5 expense categories */}
      {topCats.length > 0 && (
        <Link to="/customer/analytics" className="block">
          <Card className="p-4 transition hover:border-primary/40 hover:shadow-md">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <BarChart3 className="h-4 w-4 text-primary" /> শীর্ষ ৫ ব্যয়ের ক্যাটাগরি
            </div>
            <div className="space-y-2.5">
              {topCats.map((c) => (
                <div key={c.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c.color }} />
                      <span className="truncate font-medium">{c.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-right">
                      <span className="font-bold text-rose-600">{bdt(c.value)}</span>
                      <span className="w-10 text-muted-foreground tabular-nums">{c.pct.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${c.pct}%`, background: c.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Link>
      )}
    </div>
  );
}