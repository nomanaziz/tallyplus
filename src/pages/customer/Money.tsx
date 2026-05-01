import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Plus, Minus, Trash2, TrendingUp, TrendingDown, Wallet, ChevronLeft, ChevronRight, Lock, Crown } from "lucide-react";
import { toast } from "sonner";
import LoansTab from "@/components/customer/LoansTab";
import { canAccessMonthDetail, freeMonthsLabel, monthKey, startOfMonth, addMonths, type ConsumerSub } from "@/lib/consumer-history-access";

type Tx = {
  id: string;
  type: "income" | "expense";
  amount: number;
  category: string | null;
  note: string | null;
  tx_date: string;
};

type Plan = {
  id: string;
  code: string;
  name_bn: string;
  description_bn: string | null;
  price_bdt: number;
  duration_days: number;
};

const INCOME_CATS = ["বেতন","ব্যবসার আয়","ফ্রিল্যান্স/পার্ট-টাইম","উপহার","বোনাস","বিনিয়োগ থেকে আয়","ভাড়া আয়","ভাতা/পেনশন","ধার ফেরত পেলাম","অন্যান্য"];
const EXPENSE_CATS = ["বাজার/খাবার","বাসা ভাড়া","ইউটিলিটি বিল (গ্যাস/বিদ্যুৎ/পানি)","ইন্টারনেট/মোবাইল","যাতায়াত","চিকিৎসা","শিক্ষা/পড়াশোনা","পোশাক","বিনোদন","দান/সদকাহ","ঋণ পরিশোধ","সঞ্চয়/বিনিয়োগ","ব্যবসায়িক খরচ","অন্যান্য"];

function bdt(n: number) {
  return new Intl.NumberFormat("bn-BD", { maximumFractionDigits: 0 }).format(n) + " ৳";
}

function monthLabelBn(d: Date) {
  return d.toLocaleDateString("bn-BD", { month: "long", year: "numeric" });
}

export default function CustomerMoney() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  const [viewMonth, setViewMonth] = useState<Date>(startOfMonth(new Date()));
  const [sub, setSub] = useState<ConsumerSub>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [showPlans, setShowPlans] = useState(false);

  const load = async () => {
    if (!user) return;
    // Load 24 months at once for performance; older fetched on demand
    const since = addMonths(startOfMonth(new Date()), -24).toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("consumer_transactions")
      .select("*")
      .eq("user_id", user.id)
      .gte("tx_date", since)
      .order("tx_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(2000);
    if (error) toast.error(error.message);
    setRows((data ?? []) as Tx[]);
    setLoading(false);
  };

  const loadSub = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("subscriptions")
      .select("expires_at, plan:subscription_plans(code)")
      .eq("user_id", user.id)
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString())
      .like("plan.code", "consumer_history_%")
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      const planCode = (data.plan as { code?: string } | null)?.code ?? null;
      setSub({ plan_code: planCode, expires_at: data.expires_at });
    }
  };

  const loadPlans = async () => {
    const { data } = await supabase
      .from("subscription_plans")
      .select("id, code, name_bn, description_bn, price_bdt, duration_days")
      .like("code", "consumer_history_%")
      .eq("is_active", true)
      .order("price_bdt");
    setPlans((data ?? []) as Plan[]);
  };

  useEffect(() => {
    void load();
    void loadSub();
    void loadPlans();
  }, [user]);

  // Filter transactions for the viewed month
  const monthRows = useMemo(() => {
    const start = monthKey(viewMonth);
    return rows.filter((r) => r.tx_date.startsWith(start));
  }, [rows, viewMonth]);

  const summary = useMemo(() => {
    let inc = 0, exp = 0;
    for (const r of monthRows) {
      if (r.type === "income") inc += Number(r.amount);
      else exp += Number(r.amount);
    }
    return { inc, exp, balance: inc - exp };
  }, [monthRows]);

  const isCurrentMonth = monthKey(viewMonth) === monthKey(new Date());
  const canSeeDetail = canAccessMonthDetail(viewMonth, sub);

  const reset = () => {
    setAmount(""); setCategory(""); setNote("");
    setDate(new Date().toISOString().slice(0, 10));
    setType("expense");
  };

  const submit = async () => {
    if (!user) return;
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error("সঠিক টাকা দিন");
    setSaving(true);
    const { error } = await supabase.from("consumer_transactions").insert({
      user_id: user.id, type, amount: amt,
      category: category || null,
      note: note.trim() || null,
      tx_date: date,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("যোগ হয়েছে");
    reset();
    setOpen(false);
    void load();
  };

  const remove = async (id: string) => {
    if (!confirm("Entry মুছবেন?")) return;
    const { error } = await supabase.from("consumer_transactions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    void load();
  };

  const requestPlan = async (plan: Plan) => {
    if (!user) return;
    const { error } = await supabase.from("subscription_requests").insert({
      user_id: user.id, plan_id: plan.id, status: "pending",
    });
    if (error) return toast.error(error.message);
    toast.success("আবেদন পাঠানো হয়েছে — Admin approve করলে চালু হবে");
    setShowPlans(false);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">আয়-ব্যয় ও দেনা-পাওনা</h1>

      <Tabs defaultValue="money">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="money">আয়-ব্যয়</TabsTrigger>
          <TabsTrigger value="loans">দেনা-পাওনা</TabsTrigger>
        </TabsList>

        <TabsContent value="money" className="space-y-4">
          {/* Month navigator */}
          <div className="flex items-center justify-between gap-2">
            <Button size="icon" variant="outline" onClick={() => setViewMonth((d) => addMonths(d, -1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center">
              <div className="text-base font-semibold">{monthLabelBn(viewMonth)}</div>
              <div className="text-[10px] text-muted-foreground">{freeMonthsLabel()}</div>
            </div>
            <Button size="icon" variant="outline" disabled={isCurrentMonth} onClick={() => setViewMonth((d) => addMonths(d, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Add buttons (only for current month) */}
          {isCurrentMonth && (
            <div className="flex justify-end gap-2">
              <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => { setType("income"); setCategory(""); setOpen(true); }}>
                <Plus className="mr-1 h-4 w-4" /> আয়
              </Button>
              <Button size="sm" className="bg-rose-600 text-white hover:bg-rose-700" onClick={() => { setType("expense"); setCategory(""); setOpen(true); }}>
                <Minus className="mr-1 h-4 w-4" /> ব্যয়
              </Button>
            </div>
          )}

          {/* Summary tiles - always visible */}
          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="p-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>আয়</span><TrendingUp className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="mt-1 text-xl font-bold text-emerald-600">{bdt(summary.inc)}</div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>ব্যয়</span><TrendingDown className="h-4 w-4 text-rose-600" />
              </div>
              <div className="mt-1 text-xl font-bold text-rose-600">{bdt(summary.exp)}</div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>ব্যালেন্স</span><Wallet className="h-4 w-4 text-primary" />
              </div>
              <div className={`mt-1 text-xl font-bold ${summary.balance >= 0 ? "text-foreground" : "text-rose-600"}`}>{bdt(summary.balance)}</div>
            </Card>
          </div>

          {/* Detail list — gated */}
          <Card>
            {loading ? (
              <div className="flex h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : !canSeeDetail ? (
              <div className="flex flex-col items-center gap-3 p-8 text-center">
                <Lock className="h-8 w-8 text-muted-foreground/60" />
                <div className="text-sm font-medium">এই মাসের বিস্তারিত হিস্ট্রি লক করা</div>
                <div className="text-xs text-muted-foreground">পূর্বের ৩ মাস ফ্রি। তার আগের details দেখতে subscription নিন।</div>
                <Button size="sm" onClick={() => setShowPlans(true)}>
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
                    {isCurrentMonth && (
                      <button onClick={() => remove(r.id)} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="মুছুন">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {sub?.plan_code && (
            <Card className="border-primary/30 bg-primary/5 p-3 text-xs">
              <Crown className="mr-1 inline h-3.5 w-3.5 text-primary" />
              <span className="font-medium">Subscription সক্রিয়:</span> {sub.plan_code === "consumer_history_1y" ? "১ বছর" : sub.plan_code === "consumer_history_5y" ? "৫ বছর" : "১০ বছর"} • শেষ: {sub.expires_at?.slice(0, 10)}
            </Card>
          )}
        </TabsContent>

        <TabsContent value="loans">
          <LoansTab />
        </TabsContent>
      </Tabs>

      {/* Add transaction sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader>
            <SheetTitle className={type === "income" ? "text-emerald-600" : "text-rose-600"}>
              {type === "income" ? "নতুন আয় যোগ করুন" : "নতুন ব্যয় যোগ করুন"}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            <Input inputMode="decimal" placeholder="পরিমাণ (টাকা)" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} className="h-12 text-lg" />
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="ক্যাটাগরি" /></SelectTrigger>
              <SelectContent>
                {(type === "income" ? INCOME_CATS : EXPENSE_CATS).map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <Input placeholder="নোট (ইচ্ছাধীন)" value={note} onChange={(e) => setNote(e.target.value)} />
            <Button onClick={submit} disabled={saving} className={`w-full ${type === "income" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"} text-white`}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} সংরক্ষণ
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Subscription plans dialog */}
      <Dialog open={showPlans} onOpenChange={setShowPlans}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>হিস্ট্রি Subscription</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">পূর্বের ৩ মাস সবসময় ফ্রি। আরো পুরাতন বিস্তারিত হিস্ট্রি দেখার জন্য plan নিন।</p>
            {plans.length === 0 ? (
              <p className="text-sm text-muted-foreground">Plan লোড হচ্ছে…</p>
            ) : plans.map((p) => (
              <Card key={p.id} className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{p.name_bn}</div>
                    {p.description_bn && <div className="text-xs text-muted-foreground">{p.description_bn}</div>}
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-primary">{bdt(Number(p.price_bdt))}</div>
                    <div className="text-[10px] text-muted-foreground">{p.duration_days} দিনের জন্য</div>
                  </div>
                </div>
                <Button size="sm" className="mt-2 w-full" onClick={() => requestPlan(p)}>আবেদন করুন</Button>
              </Card>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPlans(false)}>বন্ধ করুন</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}