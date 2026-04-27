import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { toast } from "sonner";

type Tx = {
  id: string;
  type: "income" | "expense";
  amount: number;
  category: string | null;
  note: string | null;
  tx_date: string;
};

const INCOME_CATS = ["বেতন", "ব্যবসা", "উপহার", "ভাতা", "অন্যান্য"];
const EXPENSE_CATS = ["খাবার", "যাতায়াত", "বাজার", "বিল", "চিকিৎসা", "শিক্ষা", "বিনোদন", "অন্যান্য"];

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

  const load = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("consumer_transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("tx_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) toast.error(error.message);
    setRows((data ?? []) as Tx[]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, [user]);

  const summary = useMemo(() => {
    const monthStart = new Date();
    monthStart.setDate(1);
    const since = monthStart.toISOString().slice(0, 10);
    let inc = 0;
    let exp = 0;
    for (const r of rows) {
      if (r.tx_date >= since) {
        if (r.type === "income") inc += Number(r.amount);
        else exp += Number(r.amount);
      }
    }
    return { inc, exp, balance: inc - exp };
  }, [rows]);

  const reset = () => {
    setAmount("");
    setCategory("");
    setNote("");
    setDate(new Date().toISOString().slice(0, 10));
    setType("expense");
  };

  const submit = async () => {
    if (!user) return;
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error("সঠিক টাকা দিন");
    setSaving(true);
    const { error } = await supabase.from("consumer_transactions").insert({
      user_id: user.id,
      type,
      amount: amt,
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">আয়-ব্যয়</h1>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" /> যোগ করুন
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-3xl">
            <SheetHeader>
              <SheetTitle>নতুন entry</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-3">
              <Tabs value={type} onValueChange={(v) => setType(v as "income" | "expense")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="expense" className="data-[state=active]:bg-rose-600 data-[state=active]:text-white">ব্যয়</TabsTrigger>
                  <TabsTrigger value="income" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">আয়</TabsTrigger>
                </TabsList>
              </Tabs>
              <Input
                inputMode="decimal"
                placeholder="পরিমাণ (টাকা)"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                className="h-12 text-lg"
              />
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
              <Button onClick={submit} disabled={saving} className="w-full">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} সংরক্ষণ
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>আয় (এই মাস)</span><TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-1 text-xl font-bold text-emerald-600">{bdt(summary.inc)}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>ব্যয় (এই মাস)</span><TrendingDown className="h-4 w-4 text-rose-600" />
          </div>
          <div className="mt-1 text-xl font-bold text-rose-600">{bdt(summary.exp)}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>ব্যালেন্স</span><Wallet className="h-4 w-4 text-primary" />
          </div>
          <div className={`mt-1 text-xl font-bold ${summary.balance >= 0 ? "text-foreground" : "text-rose-600"}`}>
            {bdt(summary.balance)}
          </div>
        </Card>
      </div>

      <Card>
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">এখনো কোনো entry নেই</div>
        ) : (
          <ul className="divide-y">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                <div className={`flex h-9 w-9 flex-none items-center justify-center rounded-full ${
                  r.type === "income" ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
                }`}>
                  {r.type === "income" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {r.category ?? (r.type === "income" ? "আয়" : "ব্যয়")}
                  </div>
                  {r.note && <div className="truncate text-xs text-muted-foreground">{r.note}</div>}
                  <div className="text-[11px] text-muted-foreground">{r.tx_date}</div>
                </div>
                <div className={`text-right text-sm font-bold ${r.type === "income" ? "text-emerald-600" : "text-rose-600"}`}>
                  {r.type === "income" ? "+" : "-"} {bdt(Number(r.amount))}
                </div>
                <button
                  onClick={() => remove(r.id)}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label="মুছুন"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
