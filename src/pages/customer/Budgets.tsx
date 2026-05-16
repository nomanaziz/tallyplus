import { useEffect, useMemo, useState } from "react";
import { Link } from "@/lib/router";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  ChevronLeft, ChevronRight, Calculator, Loader2, Plus, PieChart as PieIcon,
  Wallet, History as HistoryIcon, Copy,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ensureConsumerFinanceSetup, type ConsumerCategory } from "@/lib/consumer-finance";
import {
  bdt, fmtMonthBn, isRegularTx, loadMonthBudgets, loadMonthTransactions,
  monthStart, upsertBudget, copyPreviousMonthBudgets,
} from "@/lib/consumer-analytics";
import type { Budget, Tx } from "@/lib/consumer-analytics";

export default function CustomerBudgets() {
  const { user } = useAuth();
  const [anchor, setAnchor] = useState(() => monthStart(new Date()));
  const [cats, setCats] = useState<ConsumerCategory[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ name: string; current: number } | null>(null);
  const [editVal, setEditVal] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    await ensureConsumerFinanceSetup(user.id);
    const [catRes, b, t] = await Promise.all([
      supabase.from("consumer_categories").select("*").eq("user_id", user.id)
        .eq("kind", "expense").order("sort_order").order("name"),
      loadMonthBudgets(user.id, anchor),
      loadMonthTransactions(user.id, anchor),
    ]);
    setCats((catRes.data ?? []).filter((c: any) => !c.is_archived) as ConsumerCategory[]);
    setBudgets(b);
    setTxs(t);
    setLoading(false);
  };

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [user, anchor]);

  const spentByCat = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of txs) {
      if (!isRegularTx(r) || r.type !== "expense") continue;
      const k = r.category || "অন্যান্য";
      m.set(k, (m.get(k) ?? 0) + Number(r.amount));
    }
    return m;
  }, [txs]);

  const budgetByCat = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of budgets) m.set(b.category_name, Number(b.amount_limit));
    return m;
  }, [budgets]);

  const totals = useMemo(() => {
    let totalBudget = 0;
    for (const v of budgetByCat.values()) totalBudget += v;
    let totalSpent = 0;
    for (const v of spentByCat.values()) totalSpent += v;
    return { totalBudget, totalSpent };
  }, [budgetByCat, spentByCat]);

  const openEdit = (name: string) => {
    const cur = budgetByCat.get(name) ?? 0;
    setEditing({ name, current: cur });
    setEditVal(cur > 0 ? String(cur) : "");
  };

  const save = async () => {
    if (!user || !editing) return;
    const amt = Number(editVal || 0);
    if (amt < 0) return toast.error("সঠিক অঙ্ক দিন");
    setSaving(true);
    try {
      await upsertBudget(user.id, editing.name, anchor, amt);
      toast.success(amt > 0 ? "বাজেট সংরক্ষিত" : "বাজেট মুছে ফেলা হয়েছে");
      setEditing(null);
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "সংরক্ষণ ব্যর্থ");
    } finally {
      setSaving(false);
    }
  };

  const copyPrev = async () => {
    if (!user) return;
    try {
      const n = await copyPreviousMonthBudgets(user.id, anchor);
      if (n === 0) toast.message("গত মাসে কোনো বাজেট নেই");
      else toast.success(`${n} টি বাজেট কপি হয়েছে`);
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "ব্যর্থ");
    }
  };

  // Show: categories user has + categories with a budget but no matching cat row
  const rows = useMemo(() => {
    const names = new Set(cats.map((c) => c.name));
    const extra = Array.from(budgetByCat.keys()).filter((n) => !names.has(n));
    return [...cats.map((c) => c.name), ...extra];
  }, [cats, budgetByCat]);

  const goPrev = () => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1));
  const goNext = () => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">বাজেট</h1>
      </div>

      <div className="grid grid-cols-3 gap-1 rounded-xl border bg-card p-1 text-xs sm:text-sm">
        <Link to="/customer/money" className="flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 font-semibold text-muted-foreground hover:bg-accent">
          <Wallet className="h-4 w-4" /> Records
        </Link>
        <Link to="/customer/analytics" className="flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 font-semibold text-muted-foreground hover:bg-accent">
          <PieIcon className="h-4 w-4" /> Analysis
        </Link>
        <Link to="/customer/budgets" className="flex items-center justify-center gap-1.5 rounded-lg bg-primary px-2 py-1.5 font-semibold text-primary-foreground">
          <Calculator className="h-4 w-4" /> Budgets
        </Link>
      </div>

      <Card className="flex items-center justify-between p-3">
        <Button variant="ghost" size="icon" onClick={goPrev}><ChevronLeft className="h-5 w-5" /></Button>
        <div className="text-base font-bold">{fmtMonthBn(anchor)}</div>
        <Button variant="ghost" size="icon" onClick={goNext}><ChevronRight className="h-5 w-5" /></Button>
      </Card>

      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <Card className="p-3 sm:p-4">
          <div className="flex items-center justify-between gap-1 text-[11px] text-muted-foreground sm:text-xs">
            <span className="truncate">মোট বাজেট</span><Calculator className="h-3.5 w-3.5 text-primary sm:h-4 sm:w-4" />
          </div>
          <div className="mt-1 text-base font-bold text-primary sm:text-xl">{bdt(totals.totalBudget)}</div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="flex items-center justify-between gap-1 text-[11px] text-muted-foreground sm:text-xs">
            <span className="truncate">মোট খরচ</span>
          </div>
          <div className={`mt-1 text-base font-bold sm:text-xl ${totals.totalSpent > totals.totalBudget && totals.totalBudget > 0 ? "text-rose-600" : "text-rose-500"}`}>
            {bdt(totals.totalSpent)}
          </div>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={copyPrev}>
          <Copy className="mr-1 h-4 w-4" /> গত মাসের বাজেট কপি করুন
        </Button>
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          কোনো ব্যয় ক্যাটাগরি নেই। আগে আয়-ব্যয় পেইজে ক্যাটাগরি তৈরি করুন।
        </Card>
      ) : (
        <Card>
          <ul className="divide-y">
            {rows.map((name) => {
              const limit = budgetByCat.get(name) ?? 0;
              const spent = spentByCat.get(name) ?? 0;
              const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
              const over = limit > 0 && spent > limit;
              const remaining = limit - spent;
              const barColor = over ? "bg-rose-600" : pct >= 80 ? "bg-amber-500" : "bg-emerald-600";
              return (
                <li key={name} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{name}</div>
                      {limit > 0 ? (
                        <>
                          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                            <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
                          </div>
                          <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                            <span>খরচ: <b className="text-rose-600">{bdt(spent)}</b> / {bdt(limit)}</span>
                            <span className={over ? "font-semibold text-rose-600" : "text-emerald-700"}>
                              {over ? `${bdt(spent - limit)} বেশি` : `${bdt(remaining)} বাকি`}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="text-[11px] text-muted-foreground">খরচ: <b className="text-rose-600">{bdt(spent)}</b> · বাজেট নেই</div>
                      )}
                    </div>
                    <Button size="sm" variant={limit > 0 ? "outline" : "default"} onClick={() => openEdit(name)}>
                      {limit > 0 ? "পরিবর্তন" : <><Plus className="mr-1 h-3.5 w-3.5" /> বাজেট</>}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.name} — বাজেট সেট করুন</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              inputMode="decimal"
              placeholder="মাসিক বাজেট (টাকা)"
              value={editVal}
              onChange={(e) => setEditVal(e.target.value.replace(/[^0-9.]/g, ""))}
              className="h-12 text-lg"
            />
            <p className="text-xs text-muted-foreground">০ দিলে বাজেট মুছে যাবে।</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>বাতিল</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null} সংরক্ষণ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
