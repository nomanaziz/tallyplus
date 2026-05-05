import { useEffect, useMemo, useState } from "react";
import { Link } from "@/lib/router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Loader2, Plus, Minus, Trash2, TrendingUp, TrendingDown, Wallet,
  History as HistoryIcon, Crown,
} from "lucide-react";
import { toast } from "sonner";
import LoansTab from "@/components/customer/LoansTab";
import { monthKey, startOfMonth } from "@/lib/consumer-history-access";
import { VoiceTextMic } from "@/components/app/VoiceTextMic";
import { Coins } from "lucide-react";

type Tx = {
  id: string;
  type: "income" | "expense";
  amount: number;
  category: string | null;
  note: string | null;
  tx_date: string;
};

const INCOME_CATS = ["বেতন","ব্যবসার আয়","ফ্রিল্যান্স/পার্ট-টাইম","উপহার","বোনাস","বিনিয়োগ থেকে আয়","ভাড়া আয়","ভাতা/পেনশন","ধার ফেরত পেলাম","অন্যান্য"];
const EXPENSE_CATS = ["বাজার/খাবার","বাসা ভাড়া","ইউটিলিটি বিল (গ্যাস/বিদ্যুৎ/পানি)","ইন্টারনেট/মোবাইল","যাতায়াত","চিকিৎসা","শিক্ষা/পড়াশোনা","পোশাক","বিনোদন","দান/সদকাহ","ঋণ পরিশোধ","সঞ্চয়/বিনিয়োগ","ব্যবসায়িক খরচ","অন্যান্য"];

function bdt(n: number) {
  return new Intl.NumberFormat("bn-BD", { maximumFractionDigits: 0 }).format(n) + " ৳";
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
  const [cashBalance, setCashBalance] = useState<number>(0);

  const load = async () => {
    if (!user) return;
    const monthStart = startOfMonth(new Date()).toISOString().slice(0, 10);
    const [{ data, error }, { data: cash }] = await Promise.all([
      supabase
      .from("consumer_transactions")
      .select("*")
      .eq("user_id", user.id)
      .gte("tx_date", monthStart)
      .order("tx_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500),
      supabase.rpc("consumer_cash_summary"),
    ]);
    if (error) toast.error(error.message);
    setRows((data ?? []) as Tx[]);
    if (cash && typeof cash === "object" && "balance" in (cash as any)) {
      setCashBalance(Number((cash as any).balance) || 0);
    }
    setLoading(false);
  };

  useEffect(() => { void load(); }, [user]);

  const monthRows = useMemo(() => {
    const k = monthKey(new Date());
    return rows.filter((r) => r.tx_date.startsWith(k));
  }, [rows]);

  const summary = useMemo(() => {
    let inc = 0, exp = 0;
    for (const r of monthRows) {
      if (r.type === "income") inc += Number(r.amount);
      else exp += Number(r.amount);
    }
    return { inc, exp, balance: inc - exp };
  }, [monthRows]);

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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">আয়-ব্যয় ও দেনা-পাওনা</h1>
        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline">
            <Link to="/customer/history"><HistoryIcon className="mr-1 h-4 w-4" /> ইতিহাস</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/customer/subscription"><Crown className="mr-1 h-4 w-4" /> সাবস্ক্রিপশন</Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="money">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="money">আয়-ব্যয়</TabsTrigger>
          <TabsTrigger value="loans">দেনা-পাওনা</TabsTrigger>
        </TabsList>

        <TabsContent value="money" className="space-y-4">
          <div className="flex justify-end gap-2">
            <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => { setType("income"); setCategory(""); setOpen(true); }}>
              <Plus className="mr-1 h-4 w-4" /> আয়
            </Button>
            <Button size="sm" className="bg-rose-600 text-white hover:bg-rose-700" onClick={() => { setType("expense"); setCategory(""); setOpen(true); }}>
              <Minus className="mr-1 h-4 w-4" /> ব্যয়
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
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
              <div className={`mt-1 text-base font-bold sm:text-xl ${summary.balance >= 0 ? "text-foreground" : "text-rose-600"}`}>{bdt(summary.balance)}</div>
            </Card>
            <Card className="p-3 sm:p-4">
              <div className="flex items-center justify-between gap-1 text-[11px] text-muted-foreground sm:text-xs">
                <span className="truncate">হাতে নগদ</span><Coins className="h-3.5 w-3.5 shrink-0 text-amber-600 sm:h-4 sm:w-4" />
              </div>
              <div className={`mt-1 text-base font-bold sm:text-xl ${cashBalance >= 0 ? "text-amber-700" : "text-rose-600"}`}>{bdt(cashBalance)}</div>
              <div className="mt-0.5 text-[10px] text-muted-foreground">দেনা-পাওনা থেকে</div>
            </Card>
          </div>

          <Card>
            {loading ? (
              <div className="flex h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
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
                    <button onClick={() => remove(r.id)} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="মুছুন">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="border-primary/20 bg-primary/5 p-3 text-xs">
            পুরোনো মাসের আয়-ব্যয়ের পূর্ণ ইতিহাস দেখতে{" "}
            <Link to="/customer/history" className="font-semibold text-primary underline">ইতিহাস</Link> পেইজে যান, বা পুরোনো মাস unlock করতে{" "}
            <Link to="/customer/subscription" className="font-semibold text-primary underline">Subscription</Link> নিন।
          </Card>
        </TabsContent>

        <TabsContent value="loans">
          <LoansTab />
        </TabsContent>
      </Tabs>

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
            <div className="flex items-center gap-2">
              <Input
                placeholder={type === "expense" ? "কী কারণে খরচ? (ইচ্ছাধীন)" : "নোট (ইচ্ছাধীন)"}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="flex-1"
              />
              <VoiceTextMic
                size="sm"
                title="কথা বলে কারণ লিখুন"
                onText={(t) => setNote((prev) => (prev ? prev + " " + t : t))}
              />
            </div>
            <Button onClick={submit} disabled={saving} className={`w-full ${type === "income" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"} text-white`}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} সংরক্ষণ
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}