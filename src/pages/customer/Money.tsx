import { useEffect, useMemo, useState } from "react";
import { Link } from "@/lib/router";
import { supabase } from "@/integrations/supabase/client";
import { writeWithOffline } from "@/lib/useOfflineWrite";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Loader2, Plus, Minus, Trash2, TrendingUp, TrendingDown, Wallet,
  History as HistoryIcon, Crown, Settings, ArrowLeftRight, Repeat,
} from "lucide-react";
import { toast } from "sonner";
import LoansTab from "@/components/customer/LoansTab";
import { monthKey, startOfMonth } from "@/lib/consumer-history-access";
import { VoiceTextMic } from "@/components/app/VoiceTextMic";
import { Coins } from "lucide-react";
import { ensureConsumerFinanceSetup, ACCOUNT_KIND_LABEL, type ConsumerAccount, type ConsumerCategory } from "@/lib/consumer-finance";
import { AccountsCategoriesDialog } from "@/components/customer/AccountsCategoriesDialog";
import { RecurringRulesTab } from "@/components/customer/RecurringRulesTab";

type Tx = {
  id: string;
  type: "income" | "expense";
  amount: number;
  category: string | null;
  note: string | null;
  tx_date: string;
  account_id?: string | null;
  subcategory_id?: string | null;
  transfer_group_id?: string | null;
  kind?: string | null;
};

function bdt(n: number) {
  return new Intl.NumberFormat("bn-BD", { maximumFractionDigits: 0 }).format(n) + " ৳";
}

export default function CustomerMoney() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"income" | "expense" | "transfer">("expense");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [accountId, setAccountId] = useState<string>("");
  const [toAccountId, setToAccountId] = useState<string>("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [cashBalance, setCashBalance] = useState<number>(0);
  const [accounts, setAccounts] = useState<ConsumerAccount[]>([]);
  const [cats, setCats] = useState<ConsumerCategory[]>([]);
  const [accBalances, setAccBalances] = useState<{ account_id: string; name: string; kind: string; balance: number }[]>([]);
  const [showSettings, setShowSettings] = useState(false);

  const load = async () => {
    if (!user) return;
    await ensureConsumerFinanceSetup(user.id);
    const monthStart = startOfMonth(new Date()).toISOString().slice(0, 10);
    // Materialise any due recurring entries before loading
    await supabase.rpc("consumer_run_recurring");
    const [{ data, error }, { data: cash }, accRes, catRes, balRes] = await Promise.all([
      supabase
      .from("consumer_transactions")
      .select("*")
      .eq("user_id", user.id)
      .gte("tx_date", monthStart)
      .order("tx_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500),
      supabase.rpc("consumer_cash_summary"),
      supabase.from("consumer_accounts").select("*").eq("user_id", user.id).order("name"),
      supabase.from("consumer_categories").select("*").eq("user_id", user.id).order("kind").order("sort_order").order("name"),
      supabase.rpc("consumer_account_balances"),
    ]);
    if (error) toast.error(error.message);
    setRows((data ?? []) as Tx[]);
    if (cash && typeof cash === "object" && "balance" in (cash as any)) {
      setCashBalance(Number((cash as any).balance) || 0);
    }
    setAccounts((accRes.data ?? []) as ConsumerAccount[]);
    setCats((catRes.data ?? []) as ConsumerCategory[]);
    setAccBalances((balRes.data ?? []) as any);
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
      if (r.transfer_group_id) continue; // exclude transfers from income/expense totals
      if (r.kind && r.kind !== "regular") continue; // exclude loan movements
      if (r.type === "income") inc += Number(r.amount);
      else exp += Number(r.amount);
    }
    return { inc, exp, balance: inc - exp };
  }, [monthRows]);

  const reset = () => {
    setAmount(""); setCategoryId(""); setNote(""); setAccountId(""); setToAccountId("");
    setDate(new Date().toISOString().slice(0, 10));
    setType("expense");
  };

  const submit = async () => {
    if (!user) return;
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error("সঠিক টাকা দিন");
    setSaving(true);
    if (type === "transfer") {
      if (!accountId || !toAccountId || accountId === toAccountId) {
        setSaving(false);
        return toast.error("দু'টি ভিন্ন অ্যাকাউন্ট বাছাই করুন");
      }
      const groupId = (crypto as any).randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
      const fromName = accounts.find((a) => a.id === accountId)?.name ?? "";
      const toName = accounts.find((a) => a.id === toAccountId)?.name ?? "";
      const { error } = await supabase.from("consumer_transactions").insert([
        { user_id: user.id, type: "expense", amount: amt, category: "ট্রান্সফার", note: `${fromName} → ${toName}${note ? " | " + note : ""}`, tx_date: date, account_id: accountId, transfer_group_id: groupId },
        { user_id: user.id, type: "income", amount: amt, category: "ট্রান্সফার", note: `${fromName} → ${toName}${note ? " | " + note : ""}`, tx_date: date, account_id: toAccountId, transfer_group_id: groupId },
      ]);
      setSaving(false);
      if (error) return toast.error(error.message);
      toast.success("ট্রান্সফার সম্পন্ন");
    } else {
      const cat = cats.find((c) => c.id === categoryId);
      const res = await writeWithOffline({
        table: "consumer_transactions",
        op: "insert",
        payload: {
          user_id: user.id, type, amount: amt,
          category: cat?.name ?? null,
          subcategory_id: cat?.parent_id ? cat.id : null,
          account_id: accountId || null,
          note: note.trim() || null,
          tx_date: date,
        },
      });
      setSaving(false);
      if (res.error) return toast.error(res.error);
      if (!res.queued) toast.success("যোগ হয়েছে");
    }
    reset();
    setOpen(false);
    void load();
  };

  const remove = async (id: string) => {
    if (!confirm("Entry মুছবেন?")) return;
    // If part of a transfer pair, delete both
    const row = rows.find((r) => r.id === id);
    if (row?.transfer_group_id) {
      await supabase.from("consumer_transactions").delete().eq("transfer_group_id", row.transfer_group_id);
    } else {
      const res = await writeWithOffline({ table: "consumer_transactions", op: "delete", payload: { id } });
      if (res.error) return toast.error(res.error);
    }
    void load();
  };

  const filteredCats = type !== "transfer" ? cats.filter((c) => c.kind === type && !c.is_archived) : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">আয়-ব্যয় ও দেনা-পাওনা</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowSettings(true)}>
            <Settings className="mr-1 h-4 w-4" /> অ্যাকাউন্ট/ক্যাটাগরি
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/customer/history"><HistoryIcon className="mr-1 h-4 w-4" /> ইতিহাস</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/customer/subscription"><Crown className="mr-1 h-4 w-4" /> সাবস্ক্রিপশন</Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="money">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="money">আয়-ব্যয়</TabsTrigger>
          <TabsTrigger value="recurring"><Repeat className="mr-1 h-3.5 w-3.5" /> অটো-এন্ট্রি</TabsTrigger>
          <TabsTrigger value="loans">দেনা-পাওনা</TabsTrigger>
        </TabsList>

        <TabsContent value="money" className="space-y-4">
          <div className="flex flex-wrap justify-end gap-2">
            <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => { setType("income"); setCategoryId(""); setOpen(true); }}>
              <Plus className="mr-1 h-4 w-4" /> আয়
            </Button>
            <Button size="sm" className="bg-rose-600 text-white hover:bg-rose-700" onClick={() => { setType("expense"); setCategoryId(""); setOpen(true); }}>
              <Minus className="mr-1 h-4 w-4" /> ব্যয়
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setType("transfer"); setOpen(true); }}>
              <ArrowLeftRight className="mr-1 h-4 w-4" /> ট্রান্সফার
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

          {accBalances.length > 0 && (
            <Card className="p-3">
              <div className="mb-2 text-xs font-semibold text-muted-foreground">অ্যাকাউন্ট ব্যালেন্স</div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {accBalances.map((b) => (
                  <div key={b.account_id} className="rounded-lg border p-2">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span className="truncate">{ACCOUNT_KIND_LABEL[b.kind] ?? b.kind}</span>
                    </div>
                    <div className="truncate text-sm font-medium">{b.name}</div>
                    <div className={`text-sm font-bold ${b.balance >= 0 ? "text-foreground" : "text-rose-600"}`}>{bdt(Number(b.balance))}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card>
            {loading ? (
              <div className="flex h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : monthRows.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">এই মাসে কোনো entry নেই</div>
            ) : (
              <ul className="divide-y">
                {monthRows.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                    <div className={`flex h-9 w-9 flex-none items-center justify-center rounded-full ${r.transfer_group_id ? "bg-sky-500/10 text-sky-600" : r.type === "income" ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"}`}>
                      {r.transfer_group_id ? <ArrowLeftRight className="h-4 w-4" /> : r.type === "income" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{r.category ?? (r.type === "income" ? "আয়" : "ব্যয়")}</div>
                      {r.note && <div className="truncate text-xs text-muted-foreground">{r.note}</div>}
                      <div className="text-[11px] text-muted-foreground">
                        {r.tx_date}
                        {r.account_id ? ` • ${accounts.find((a) => a.id === r.account_id)?.name ?? ""}` : ""}
                      </div>
                    </div>
                    <div className={`text-right text-sm font-bold ${r.transfer_group_id ? "text-sky-600" : r.type === "income" ? "text-emerald-600" : "text-rose-600"}`}>
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

        <TabsContent value="recurring">
          <RecurringRulesTab accounts={accounts} cats={cats} onChanged={() => void load()} />
        </TabsContent>

        <TabsContent value="loans">
          <LoansTab />
        </TabsContent>
      </Tabs>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader>
            <SheetTitle className={type === "income" ? "text-emerald-600" : type === "expense" ? "text-rose-600" : "text-sky-600"}>
              {type === "income" ? "নতুন আয় যোগ করুন" : type === "expense" ? "নতুন ব্যয় যোগ করুন" : "নতুন ট্রান্সফার"}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            <Input inputMode="decimal" placeholder="পরিমাণ (টাকা)" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} className="h-12 text-lg" />
            {type !== "transfer" ? (
              <>
                <Select value={categoryId || "__none__"} onValueChange={(v) => setCategoryId(v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="ক্যাটাগরি" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">নেই</SelectItem>
                    {filteredCats.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.parent_id ? "↳ " : ""}{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={accountId || "__none__"} onValueChange={(v) => setAccountId(v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="অ্যাকাউন্ট" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">কোনো অ্যাকাউন্ট নয়</SelectItem>
                    {accounts.filter((a) => !a.is_archived).map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name} ({ACCOUNT_KIND_LABEL[a.kind] ?? a.kind})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            ) : (
              <>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger><SelectValue placeholder="কোন অ্যাকাউন্ট থেকে" /></SelectTrigger>
                  <SelectContent>
                    {accounts.filter((a) => !a.is_archived).map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={toAccountId} onValueChange={setToAccountId}>
                  <SelectTrigger><SelectValue placeholder="কোন অ্যাকাউন্টে" /></SelectTrigger>
                  <SelectContent>
                    {accounts.filter((a) => !a.is_archived && a.id !== accountId).map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <div className="flex items-center gap-2">
              <Input
                placeholder="নোট (ঐচ্ছিক)"
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
            <Button onClick={submit} disabled={saving} className={`w-full text-white ${type === "income" ? "bg-emerald-600 hover:bg-emerald-700" : type === "expense" ? "bg-rose-600 hover:bg-rose-700" : "bg-sky-600 hover:bg-sky-700"}`}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} সংরক্ষণ
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <AccountsCategoriesDialog open={showSettings} onOpenChange={setShowSettings} onChanged={() => void load()} />
    </div>
  );
}