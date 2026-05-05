import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import type { ConsumerAccount, ConsumerCategory, RecurringRule } from "@/lib/consumer-finance";

const FREQ_LABEL: Record<string, string> = {
  daily: "প্রতিদিন", weekly: "সাপ্তাহিক", monthly: "মাসিক", yearly: "বাৎসরিক",
};

export function RecurringRulesTab({
  accounts, cats, onChanged,
}: { accounts: ConsumerAccount[]; cats: ConsumerCategory[]; onChanged?: () => void }) {
  const { user } = useAuth();
  const [rules, setRules] = useState<RecurringRule[]>([]);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [note, setNote] = useState("");
  const [freq, setFreq] = useState<RecurringRule["frequency"]>("monthly");
  const [nextRun, setNextRun] = useState(new Date().toISOString().slice(0, 10));

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("consumer_recurring_rules").select("*").eq("user_id", user.id).order("next_run_date");
    setRules((data ?? []) as RecurringRule[]);
  };
  useEffect(() => { void load(); }, [user]);

  const reset = () => { setAmount(""); setAccountId(""); setCategoryId(""); setNote(""); setFreq("monthly"); setNextRun(new Date().toISOString().slice(0, 10)); setType("expense"); };

  const save = async () => {
    if (!user) return;
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error("সঠিক টাকা দিন");
    const cat = cats.find((c) => c.id === categoryId);
    const { error } = await supabase.from("consumer_recurring_rules").insert({
      user_id: user.id, type, amount: amt,
      account_id: accountId || null,
      category: cat?.name ?? null,
      subcategory_id: cat?.parent_id ? cat.id : null,
      note: note.trim() || null,
      frequency: freq, next_run_date: nextRun, is_active: true,
    });
    if (error) return toast.error(error.message);
    toast.success("যোগ হয়েছে");
    reset(); setOpen(false); await load(); onChanged?.();
  };

  const toggle = async (id: string, v: boolean) => {
    await supabase.from("consumer_recurring_rules").update({ is_active: v }).eq("id", id);
    void load();
  };
  const remove = async (id: string) => {
    if (!confirm("রুল মুছবেন?")) return;
    await supabase.from("consumer_recurring_rules").delete().eq("id", id);
    void load(); onChanged?.();
  };
  const runNow = async () => {
    const { data, error } = await supabase.rpc("consumer_run_recurring");
    if (error) return toast.error(error.message);
    toast.success(`${data ?? 0} টি এন্ট্রি যোগ হয়েছে`);
    void load(); onChanged?.();
  };

  const filteredCats = cats.filter((c) => c.kind === type && !c.is_archived);

  return (
    <div className="space-y-3">
      <div className="flex justify-between gap-2">
        <Button size="sm" variant="outline" onClick={runNow}><RefreshCw className="h-4 w-4 mr-1" /> এখন চালান</Button>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> নতুন রুল</Button>
      </div>

      <Card>
        {rules.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">কোনো অটো-এন্ট্রি রুল নেই</div>
        ) : (
          <ul className="divide-y">
            {rules.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                <div className={`h-2 w-2 rounded-full ${r.type === "income" ? "bg-emerald-500" : "bg-rose-500"}`} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{r.category ?? (r.type === "income" ? "আয়" : "ব্যয়")} • {Number(r.amount).toLocaleString("bn-BD")} ৳</div>
                  <div className="text-xs text-muted-foreground">{FREQ_LABEL[r.frequency]} • পরবর্তী: {r.next_run_date}</div>
                </div>
                <Switch checked={r.is_active} onCheckedChange={(v) => toggle(r.id, v)} />
                <button onClick={() => remove(r.id)} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader><SheetTitle>নতুন অটো-এন্ট্রি রুল</SheetTitle></SheetHeader>
          <div className="mt-4 space-y-3">
            <Select value={type} onValueChange={(v) => setType(v as "income" | "expense")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="income">আয়</SelectItem>
                <SelectItem value="expense">ব্যয়</SelectItem>
              </SelectContent>
            </Select>
            <Input inputMode="decimal" placeholder="পরিমাণ" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} />
            <Select value={accountId || "__none__"} onValueChange={(v) => setAccountId(v === "__none__" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="অ্যাকাউন্ট" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">কোনো অ্যাকাউন্ট নয়</SelectItem>
                {accounts.filter((a) => !a.is_archived).map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={categoryId || "__none__"} onValueChange={(v) => setCategoryId(v === "__none__" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="ক্যাটাগরি" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">নেই</SelectItem>
                {filteredCats.map((c) => <SelectItem key={c.id} value={c.id}>{c.parent_id ? "↳ " : ""}{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={freq} onValueChange={(v) => setFreq(v as RecurringRule["frequency"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(FREQ_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <div>
              <label className="text-xs text-muted-foreground">পরবর্তী এন্ট্রির তারিখ</label>
              <Input type="date" value={nextRun} onChange={(e) => setNextRun(e.target.value)} />
            </div>
            <Input placeholder="নোট (ঐচ্ছিক)" value={note} onChange={(e) => setNote(e.target.value)} />
            <Button onClick={save} className="w-full">সংরক্ষণ</Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}