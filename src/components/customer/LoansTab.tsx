import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, ArrowDownLeft, ArrowUpRight, CheckCircle2, Phone } from "lucide-react";
import { toast } from "sonner";

type Loan = {
  id: string;
  party_name: string;
  party_phone: string | null;
  type: "lent" | "borrowed";
  amount: number;
  loan_date: string;
  due_date: string | null;
  note: string | null;
  is_settled: boolean;
  settled_at: string | null;
};

function bdt(n: number) {
  return new Intl.NumberFormat("bn-BD", { maximumFractionDigits: 0 }).format(n) + " ৳";
}

export default function LoansTab() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"lent" | "borrowed">("lent");
  const [partyName, setPartyName] = useState("");
  const [partyPhone, setPartyPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");
  const [filter, setFilter] = useState<"all" | "unsettled" | "settled">("unsettled");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("consumer_loans")
      .select("*")
      .eq("user_id", user.id)
      .order("is_settled", { ascending: true })
      .order("loan_date", { ascending: false })
      .limit(500);
    if (error) toast.error(error.message);
    setRows((data ?? []) as Loan[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [user]);

  const summary = useMemo(() => {
    let willGet = 0;
    let willGive = 0;
    for (const r of rows) {
      if (r.is_settled) continue;
      if (r.type === "lent") willGet += Number(r.amount);
      else willGive += Number(r.amount);
    }
    return { willGet, willGive, net: willGet - willGive };
  }, [rows]);

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    if (filter === "settled") return rows.filter((r) => r.is_settled);
    return rows.filter((r) => !r.is_settled);
  }, [rows, filter]);

  const reset = () => {
    setPartyName(""); setPartyPhone(""); setAmount(""); setDueDate(""); setNote("");
    setDate(new Date().toISOString().slice(0, 10));
  };

  const submit = async () => {
    if (!user) return;
    if (!partyName.trim()) return toast.error("নাম দিন");
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error("সঠিক টাকা দিন");
    setSaving(true);
    const { error } = await supabase.from("consumer_loans").insert({
      user_id: user.id,
      party_name: partyName.trim(),
      party_phone: partyPhone.trim() || null,
      type,
      amount: amt,
      loan_date: date,
      due_date: dueDate || null,
      note: note.trim() || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("যোগ হয়েছে");
    reset();
    setOpen(false);
    void load();
  };

  const settle = async (loan: Loan) => {
    if (!confirm(`${loan.party_name} এর সাথে ${bdt(Number(loan.amount))} ${loan.type === "lent" ? "ফেরত পেলেন" : "পরিশোধ করলেন"}?`)) return;
    const { error } = await supabase
      .from("consumer_loans")
      .update({ is_settled: true, settled_at: new Date().toISOString() })
      .eq("id", loan.id);
    if (error) return toast.error(error.message);
    // Auto-create matching transaction
    if (user) {
      await supabase.from("consumer_transactions").insert({
        user_id: user.id,
        type: loan.type === "lent" ? "income" : "expense",
        amount: Number(loan.amount),
        category: loan.type === "lent" ? "ধার ফেরত পেলাম" : "ঋণ পরিশোধ",
        note: `${loan.party_name} — দেনা-পাওনা settle`,
        tx_date: new Date().toISOString().slice(0, 10),
      });
    }
    toast.success("Settle হয়েছে");
    void load();
  };

  const remove = async (id: string) => {
    if (!confirm("Entry মুছবেন?")) return;
    const { error } = await supabase.from("consumer_loans").delete().eq("id", id);
    if (error) return toast.error(error.message);
    void load();
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>পাব (ধার দিয়েছি)</span><ArrowDownLeft className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-1 text-xl font-bold text-emerald-600">{bdt(summary.willGet)}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>দেব (ঋণ আছে)</span><ArrowUpRight className="h-4 w-4 text-rose-600" />
          </div>
          <div className="mt-1 text-xl font-bold text-rose-600">{bdt(summary.willGive)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">নিট</div>
          <div className={`mt-1 text-xl font-bold ${summary.net >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{bdt(summary.net)}</div>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1">
          {(["unsettled","settled","all"] as const).map((f) => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
              {f === "unsettled" ? "বাকি" : f === "settled" ? "সম্পন্ন" : "সব"}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => { setType("lent"); setOpen(true); }}>
            <Plus className="mr-1 h-4 w-4" /> ধার দিলাম
          </Button>
          <Button size="sm" className="bg-rose-600 text-white hover:bg-rose-700" onClick={() => { setType("borrowed"); setOpen(true); }}>
            <Plus className="mr-1 h-4 w-4" /> ঋণ নিলাম
          </Button>
        </div>
      </div>

      <Card>
        {loading ? (
          <div className="flex h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">কোনো entry নেই</div>
        ) : (
          <ul className="divide-y">
            {filtered.map((r) => (
              <li key={r.id} className={`flex items-center gap-3 px-4 py-3 ${r.is_settled ? "opacity-60" : ""}`}>
                <div className={`flex h-9 w-9 flex-none items-center justify-center rounded-full ${r.type === "lent" ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"}`}>
                  {r.type === "lent" ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {r.party_name}
                    {r.is_settled && <span className="ml-2 text-[10px] text-success">✓ সম্পন্ন</span>}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    {r.party_phone && <a href={`tel:${r.party_phone}`} className="inline-flex items-center gap-0.5 hover:text-primary"><Phone className="h-2.5 w-2.5" />{r.party_phone}</a>}
                    <span>{r.loan_date}</span>
                    {r.due_date && !r.is_settled && <span className="text-amber-600">শেষ: {r.due_date}</span>}
                  </div>
                  {r.note && <div className="truncate text-xs text-muted-foreground">{r.note}</div>}
                </div>
                <div className={`text-right text-sm font-bold ${r.type === "lent" ? "text-emerald-600" : "text-rose-600"}`}>
                  {bdt(Number(r.amount))}
                </div>
                {!r.is_settled && (
                  <button onClick={() => settle(r)} className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-500/10" aria-label="Settle">
                    <CheckCircle2 className="h-4 w-4" />
                  </button>
                )}
                <button onClick={() => remove(r.id)} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="মুছুন">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader>
            <SheetTitle className={type === "lent" ? "text-emerald-600" : "text-rose-600"}>
              {type === "lent" ? "ধার দিলাম (পাওনা)" : "ঋণ নিলাম (দেনা)"}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            <Select value={type} onValueChange={(v) => setType(v as "lent" | "borrowed")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="lent">ধার দিলাম (পাওনা)</SelectItem>
                <SelectItem value="borrowed">ঋণ নিলাম (দেনা)</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="ব্যক্তির নাম" value={partyName} onChange={(e) => setPartyName(e.target.value)} className="h-12" />
            <Input placeholder="মোবাইল নাম্বার (ইচ্ছাধীন)" value={partyPhone} onChange={(e) => setPartyPhone(e.target.value)} inputMode="tel" />
            <Input
              inputMode="decimal"
              placeholder="পরিমাণ (টাকা)"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              className="h-12 text-lg"
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="mb-1 text-xs text-muted-foreground">তারিখ</div>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <div className="mb-1 text-xs text-muted-foreground">শেষ তারিখ (ইচ্ছাধীন)</div>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </div>
            <Input placeholder="নোট (ইচ্ছাধীন)" value={note} onChange={(e) => setNote(e.target.value)} />
            <Button onClick={submit} disabled={saving} className={`w-full ${type === "lent" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"} text-white`}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} সংরক্ষণ
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}