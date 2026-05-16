import { useEffect, useMemo, useState } from "react";
import { Link } from "@/lib/router";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Wallet,
  PieChart as PieIcon, Calculator, Loader2, History as HistoryIcon,
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  LineChart, Line,
} from "recharts";
import {
  bdt, fmtMonthBn, isRegularTx, loadLastNMonths, loadMonthTransactions,
  CHART_COLORS, monthStart, toIsoDate,
} from "@/lib/consumer-analytics";
import type { Tx } from "@/lib/consumer-analytics";

const MONTH_LABELS_SHORT = ["জানু","ফেব","মার্চ","এপ্রিল","মে","জুন","জুলাই","আগস্ট","সেপ্ট","অক্টো","নভে","ডিসে"];

export default function CustomerAnalytics() {
  const { user } = useAuth();
  const [anchor, setAnchor] = useState(() => monthStart(new Date()));
  const [monthRows, setMonthRows] = useState<Tx[]>([]);
  const [trendRows, setTrendRows] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancel = false;
    setLoading(true);
    Promise.all([
      loadMonthTransactions(user.id, anchor),
      loadLastNMonths(user.id, 6),
    ]).then(([m, t]) => {
      if (cancel) return;
      setMonthRows(m);
      setTrendRows(t);
      setLoading(false);
    }).catch(() => !cancel && setLoading(false));
    return () => { cancel = true; };
  }, [user, anchor]);

  const summary = useMemo(() => {
    let inc = 0, exp = 0;
    for (const r of monthRows) {
      if (!isRegularTx(r)) continue;
      if (r.type === "income") inc += Number(r.amount);
      else exp += Number(r.amount);
    }
    return { inc, exp, balance: inc - exp };
  }, [monthRows]);

  // Expense by category (donut + list)
  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of monthRows) {
      if (!isRegularTx(r) || r.type !== "expense") continue;
      const k = r.category || "অন্যান্য";
      map.set(k, (map.get(k) ?? 0) + Number(r.amount));
    }
    const total = Array.from(map.values()).reduce((a, b) => a + b, 0);
    const arr = Array.from(map.entries())
      .map(([name, value], i) => ({
        name, value, color: CHART_COLORS[i % CHART_COLORS.length],
        pct: total > 0 ? (value / total) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);
    return { items: arr, total };
  }, [monthRows]);

  // Last 6 months: income vs expense
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

  // Daily expense trend (this month)
  const dailyTrend = useMemo(() => {
    const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
    const days: { day: number; exp: number }[] = [];
    for (let d = 1; d <= end; d++) days.push({ day: d, exp: 0 });
    for (const r of monthRows) {
      if (!isRegularTx(r) || r.type !== "expense") continue;
      const day = Number(r.tx_date.slice(8, 10));
      if (day >= 1 && day <= end) days[day - 1].exp += Number(r.amount);
    }
    return days;
  }, [monthRows, anchor]);

  const topCats = byCategory.items.slice(0, 5);

  const goPrev = () => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1));
  const goNext = () => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1));
  const isFutureNext = () => {
    const next = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1);
    return next > monthStart(new Date());
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">অ্যানালিটিক্স</h1>
      </div>

      {/* Money hub sub-nav */}
      <div className="grid grid-cols-3 gap-1 rounded-xl border bg-card p-1 text-xs sm:text-sm">
        <Link to="/customer/money" className="flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 font-semibold text-muted-foreground hover:bg-accent">
          <Wallet className="h-4 w-4" /> Records
        </Link>
        <Link to="/customer/analytics" className="flex items-center justify-center gap-1.5 rounded-lg bg-primary px-2 py-1.5 font-semibold text-primary-foreground">
          <PieIcon className="h-4 w-4" /> Analysis
        </Link>
        <Link to="/customer/budgets" className="flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 font-semibold text-muted-foreground hover:bg-accent">
          <Calculator className="h-4 w-4" /> Budgets
        </Link>
      </div>

      {/* Month switcher */}
      <Card className="flex items-center justify-between p-3">
        <Button variant="ghost" size="icon" onClick={goPrev}><ChevronLeft className="h-5 w-5" /></Button>
        <div className="text-base font-bold">{fmtMonthBn(anchor)}</div>
        <Button variant="ghost" size="icon" onClick={goNext} disabled={isFutureNext()}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Card className="p-3 sm:p-4">
          <div className="flex items-center justify-between gap-1 text-[11px] text-muted-foreground sm:text-xs">
            <span className="truncate">আয়</span><TrendingUp className="h-3.5 w-3.5 shrink-0 text-emerald-600 sm:h-4 sm:w-4" />
          </div>
          <div className="mt-1 text-base font-bold text-emerald-600 sm:text-xl">{bdt(summary.inc)}</div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="flex items-center justify-between gap-1 text-[11px] text-muted-foreground sm:text-xs">
            <span className="truncate">ব্যয়</span><TrendingDown className="h-3.5 w-3.5 shrink-0 text-rose-600 sm:h-4 sm:w-4" />
          </div>
          <div className="mt-1 text-base font-bold text-rose-600 sm:text-xl">{bdt(summary.exp)}</div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="flex items-center justify-between gap-1 text-[11px] text-muted-foreground sm:text-xs">
            <span className="truncate">ব্যালেন্স</span><Wallet className="h-3.5 w-3.5 shrink-0 text-primary sm:h-4 sm:w-4" />
          </div>
          <div className={`mt-1 text-base font-bold sm:text-xl ${summary.balance >= 0 ? "text-foreground" : "text-rose-600"}`}>
            {bdt(summary.balance)}
          </div>
        </Card>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Top 5 expense categories */}
          {topCats.length > 0 && (
            <Card className="p-3">
              <div className="mb-2 text-xs font-semibold text-muted-foreground">শীর্ষ ৫ ব্যয়ের ক্যাটাগরি</div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
                {topCats.map((c) => (
                  <div key={c.name} className="rounded-lg border p-2">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                      <span className="truncate text-xs font-medium">{c.name}</span>
                    </div>
                    <div className="mt-1 text-sm font-bold text-rose-600">{bdt(c.value)}</div>
                    <div className="text-[10px] text-muted-foreground">{c.pct.toFixed(1)}%</div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Donut: expense by category */}
          <Card className="p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <PieIcon className="h-4 w-4 text-primary" /> ব্যয়ের ভাগ (ক্যাটাগরি অনুযায়ী)
            </div>
            {byCategory.items.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">এই মাসে কোনো ব্যয় নেই</div>
            ) : (
              <>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={byCategory.items}
                        dataKey="value"
                        nameKey="name"
                        cx="50%" cy="50%"
                        innerRadius={55}
                        outerRadius={95}
                        paddingAngle={2}
                      >
                        {byCategory.items.map((c, i) => (
                          <Cell key={i} fill={c.color} stroke="hsl(var(--background))" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: any) => bdt(Number(v))}
                        contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* List with progress bars */}
                <div className="mt-3 space-y-2">
                  {byCategory.items.map((c) => (
                    <div key={c.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c.color }} />
                          <span className="truncate font-medium">{c.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-right">
                          <span className="font-bold text-rose-600">{bdt(c.value)}</span>
                          <span className="text-muted-foreground tabular-nums">{c.pct.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full" style={{ width: `${c.pct}%`, background: c.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>

          {/* Bar: last 6 months income vs expense */}
          <Card className="p-4">
            <div className="mb-2 text-sm font-semibold">গত ৬ মাসের আয় বনাম ব্যয়</div>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip
                    formatter={(v: any) => bdt(Number(v))}
                    contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="inc" name="আয়" fill="hsl(142 71% 45%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="exp" name="ব্যয়" fill="hsl(0 84% 60%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Line: daily expense trend */}
          <Card className="p-4">
            <div className="mb-2 text-sm font-semibold">দৈনিক ব্যয় ট্রেন্ড</div>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyTrend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip
                    formatter={(v: any) => bdt(Number(v))}
                    labelFormatter={(d) => `${d} তারিখ`}
                    contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  />
                  <Line type="monotone" dataKey="exp" stroke="hsl(0 84% 60%)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
