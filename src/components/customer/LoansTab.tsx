import { getNumLocale } from "@/lib/i18n";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { writeWithOffline } from "@/lib/useOfflineWrite";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, ArrowDownLeft, ArrowUpRight, Phone, HandCoins } from "lucide-react";
import { toast } from "sonner";

type Loan = {
  id: string;
  party_name: string;
  party_phone: string | null;
  type: "lent" | "borrowed";
  amount: number;
  paid_amount: number;
  loan_date: string;
  due_date: string | null;
  note: string | null;
  is_settled: boolean;
  settled_at: string | null;
};

type Payment = {
  id: string;
  loan_id: string;
  amount: number;
  paid_via: string;
  note: string | null;
  paid_date: string;
  created_at: string;
};

type Account = { id: string; name: string; kind: string };

function bdt(n: number) {
  return new Intl.NumberFormat(getNumLocale(), { maximumFractionDigits: 0 }).format(n) + " ৳";
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
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState<string>("");
  const [payAccountId, setPayAccountId] = useState<string>("");

  // Partial repay sheet
  const [payOpen, setPayOpen] = useState(false);
  const [payLoan, setPayLoan] = useState<Loan | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payVia, setPayVia] = useState<"cash" | "bkash" | "nagad" | "rocket" | "bank">("cash");
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payNote, setPayNote] = useState("");
  const [paySaving, setPaySaving] = useState(false);
  const [payHistory, setPayHistory] = useState<Payment[]>([]);

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

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data } = await supabase
        .from("consumer_accounts")
        .select("id,name,kind")
        .eq("user_id", user.id)
        .eq("is_archived", false)
        .order("name");
      const list = (data ?? []) as Account[];
      setAccounts(list);
      if (list[0]) {
        setAccountId((cur) => cur || list[0].id);
        setPayAccountId((cur) => cur || list[0].id);
      }
    })();
  }, [user]);

  const summary = useMemo(() => {
    let willGet = 0;
    let willGive = 0;
    for (const r of rows) {
      if (r.is_settled) continue;
      const outstanding = Math.max(Number(r.amount) - Number(r.paid_amount || 0), 0);
      if (r.type === "lent") willGet += outstanding;
      else willGive += outstanding;
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
    const res = await writeWithOffline({
      table: "consumer_loans",
      op: "insert",
      payload: {
        user_id: user.id,
        party_name: partyName.trim(),
        party_phone: partyPhone.trim() || null,
        type,
        amount: amt,
        loan_date: date,
        due_date: dueDate || null,
        note: note.trim() || null,
        account_id: accountId || null,
      },
    });
    setSaving(false);
    if (res.error) return toast.error(res.error);
    if (!res.queued) toast.success("যোগ হয়েছে — Cash on Hand-এ যোগ হলো");
    reset();
    setOpen(false);
    void load();
  };

  const openRepay = async (loan: Loan) => {
    setPayLoan(loan);
    const outstanding = Math.max(Number(loan.amount) - Number(loan.paid_amount || 0), 0);
    setPayAmount(String(outstanding));
    setPayVia("cash");
    setPayDate(new Date().toISOString().slice(0, 10));
    setPayNote("");
    if (!payAccountId && accounts[0]) setPayAccountId(accounts[0].id);
    setPayOpen(true);
    // Load history for this loan
    const { data } = await supabase
      .from("consumer_loan_payments")
      .select("*")
      .eq("loan_id", loan.id)
      .order("paid_date", { ascending: false });
    setPayHistory((data ?? []) as Payment[]);
  };

  const submitPayment = async () => {
    if (!user || !payLoan) return;
    const amt = Number(payAmount);
    if (!amt || amt <= 0) return toast.error("সঠিক টাকা দিন");
    const outstanding = Math.max(Number(payLoan.amount) - Number(payLoan.paid_amount || 0), 0);
    if (amt > outstanding + 0.001) return toast.error(`সর্বোচ্চ ${bdt(outstanding)} পরিশোধযোগ্য`);
    setPaySaving(true);
    const res = await writeWithOffline({
      table: "consumer_loan_payments",
      op: "insert",
      payload: {
        loan_id: payLoan.id,
        user_id: user.id,
        amount: amt,
        paid_via: payVia,
        paid_date: payDate,
        note: payNote.trim() || null,
        account_id: payAccountId || null,
      },
    });
    setPaySaving(false);
    if (res.error) return toast.error(res.error);
    if (!res.queued) toast.success("পরিশোধ যোগ হলো");
    setPayOpen(false);
    void load();
  };

  const removePayment = async (id: string) => {
    if (!confirm("এই পরিশোধ মুছবেন?")) return;
    const res = await writeWithOffline({
      table: "consumer_loan_payments",
      op: "delete",
      payload: { id },
    });
    if (res.error) return toast.error(res.error);
    setPayHistory((prev) => prev.filter((p) => p.id !== id));
    void load();
  };

  const remove = async (id: string) => {
    if (!confirm("Entry মুছবেন?")) return;
    const res = await writeWithOffline({
      table: "consumer_loans",
      op: "delete",
      payload: { id },
    });
    if (res.error) return toast.error(res.error);
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
              <li key={r.id} className={`px-4 py-3 ${r.is_settled ? "opacity-60" : ""}`}>
                <div className="flex items-center gap-3">
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
                  <button onClick={() => openRepay(r)} className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-500/10" aria-label="পরিশোধ">
                    <HandCoins className="h-4 w-4" />
                  </button>
                )}
                <button onClick={() => remove(r.id)} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="মুছুন">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                </div>
                {Number(r.paid_amount || 0) > 0 && !r.is_settled && (
                  <div className="ml-12 mt-2">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={r.type === "lent" ? "h-full bg-emerald-500" : "h-full bg-rose-500"}
                        style={{ width: `${Math.min(100, (Number(r.paid_amount) / Number(r.amount)) * 100)}%` }}
                      />
                    </div>
                    <div className="mt-1 text-[10px] text-muted-foreground">
                      পরিশোধ {bdt(Number(r.paid_amount))} • বাকি {bdt(Math.max(Number(r.amount) - Number(r.paid_amount), 0))}
                    </div>
                  </div>
                )}
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
            <div>
              <div className="mb-1 text-xs text-muted-foreground">
                {type === "lent" ? "কোন account থেকে দিচ্ছেন" : "কোন account-এ আসবে"}
              </div>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger><SelectValue placeholder="Account নির্বাচন" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-[10px] text-muted-foreground">এই account-এ স্বয়ংক্রিয়ভাবে balance update হবে — আয়/ব্যয়ে যোগ হবে না</p>
            </div>
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

      {/* Partial repayment sheet */}
      <Sheet open={payOpen} onOpenChange={setPayOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {payLoan?.type === "lent" ? "ফেরত পেলাম" : "পরিশোধ করলাম"} — {payLoan?.party_name}
            </SheetTitle>
          </SheetHeader>
          {payLoan && (
            <div className="mt-4 space-y-3">
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                মোট: <b>{bdt(Number(payLoan.amount))}</b> • পরিশোধ: <b>{bdt(Number(payLoan.paid_amount || 0))}</b> •{" "}
                বাকি:{" "}
                <b className={payLoan.type === "lent" ? "text-emerald-600" : "text-rose-600"}>
                  {bdt(Math.max(Number(payLoan.amount) - Number(payLoan.paid_amount || 0), 0))}
                </b>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setPayAmount(String(Math.max(Number(payLoan.amount) - Number(payLoan.paid_amount || 0), 0)))
                  }
                >
                  পুরোটা পরিশোধ
                </Button>
              </div>
              <Input
                inputMode="decimal"
                placeholder="পরিমাণ"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                className="h-12 text-lg"
              />
              <Select value={payVia} onValueChange={(v) => setPayVia(v as typeof payVia)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">নগদ</SelectItem>
                  <SelectItem value="bkash">bKash</SelectItem>
                  <SelectItem value="nagad">Nagad</SelectItem>
                  <SelectItem value="rocket">Rocket</SelectItem>
                  <SelectItem value="bank">Bank</SelectItem>
                </SelectContent>
              </Select>
              <div>
                <div className="mb-1 text-xs text-muted-foreground">
                  {payLoan.type === "lent" ? "কোন account-এ ফেরত পেলেন" : "কোন account থেকে দিচ্ছেন"}
                </div>
                <Select value={payAccountId} onValueChange={setPayAccountId}>
                  <SelectTrigger><SelectValue placeholder="Account" /></SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
              <Input placeholder="নোট (ইচ্ছাধীন)" value={payNote} onChange={(e) => setPayNote(e.target.value)} />
              <Button
                onClick={submitPayment}
                disabled={paySaving}
                className={`w-full ${payLoan.type === "lent" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"} text-white`}
              >
                {paySaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} সংরক্ষণ
              </Button>

              {payHistory.length > 0 && (
                <div className="mt-4">
                  <div className="mb-2 text-xs font-semibold text-muted-foreground">পরিশোধের ইতিহাস</div>
                  <ul className="divide-y rounded-md border">
                    {payHistory.map((p) => (
                      <li key={p.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                        <div className="flex-1">
                          <div className="font-medium">{bdt(Number(p.amount))} <span className="ml-1 text-[10px] uppercase text-muted-foreground">{p.paid_via}</span></div>
                          <div className="text-[11px] text-muted-foreground">{p.paid_date}{p.note ? ` • ${p.note}` : ""}</div>
                        </div>
                        <button onClick={() => removePayment(p.id)} className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}