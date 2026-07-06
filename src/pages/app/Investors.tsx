import { useMemo, useState } from "react";
import { Link, useNavigate } from "@/lib/router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/lib/shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/app/EmptyState";
import { RequirePerm } from "@/components/app/RequirePerm";
import { ArrowLeft, Plus, Search, Users, FileText, ChevronRight, Phone } from "lucide-react";
import { toast } from "sonner";
import { SOURCE_TYPES, SOURCE_TYPE_LABEL } from "@/lib/investor-emi";

function bdt(n: number) {
  return new Intl.NumberFormat("bn-BD", { maximumFractionDigits: 0 }).format(n) + " ৳";
}

type InvestorRow = {
  id: string;
  name: string;
  phone: string | null;
  source_type: string;
  source_name: string | null;
  is_active: boolean;
};

type LoanRow = { id: string; investor_id: string; principal: number; total_payable: number; status: string };
type PaymentRow = { loan_id: string; amount: number };

function InvestorsPageInner() {
  const { current } = useShop();
  const nav = useNavigate();
  const qc = useQueryClient();
  const shopId = current?.id ?? null;

  const investorsQ = useQuery({
    queryKey: ["investors", shopId],
    enabled: !!shopId,
    refetchOnMount: "always",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("investors")
        .select("id,name,phone,source_type,source_name,is_active")
        .eq("shop_id", shopId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as InvestorRow[];
    },
  });

  const loansQ = useQuery({
    queryKey: ["investor_loans", shopId],
    enabled: !!shopId,
    refetchOnMount: "always",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("investor_loans")
        .select("id,investor_id,principal,total_payable,status")
        .eq("shop_id", shopId!);
      if (error) throw error;
      return (data ?? []) as LoanRow[];
    },
  });

  const paymentsQ = useQuery({
    queryKey: ["investor_payments", shopId],
    enabled: !!shopId,
    refetchOnMount: "always",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("investor_payments")
        .select("loan_id,amount")
        .eq("shop_id", shopId!);
      if (error) throw error;
      return (data ?? []) as PaymentRow[];
    },
  });

  const perInvestor = useMemo(() => {
    const loans = loansQ.data ?? [];
    const pays = paymentsQ.data ?? [];
    const loanByInv = new Map<string, LoanRow[]>();
    for (const l of loans) {
      const arr = loanByInv.get(l.investor_id) ?? [];
      arr.push(l); loanByInv.set(l.investor_id, arr);
    }
    const paidByLoan = new Map<string, number>();
    for (const p of pays) paidByLoan.set(p.loan_id, (paidByLoan.get(p.loan_id) ?? 0) + Number(p.amount));
    const map = new Map<string, { taken: number; payable: number; paid: number; outstanding: number; loans: number }>();
    for (const [invId, arr] of loanByInv) {
      let taken = 0, payable = 0, paid = 0;
      for (const l of arr) {
        taken += Number(l.principal);
        payable += Number(l.total_payable);
        paid += paidByLoan.get(l.id) ?? 0;
      }
      map.set(invId, { taken, payable, paid, outstanding: payable - paid, loans: arr.length });
    }
    return map;
  }, [loansQ.data, paymentsQ.data]);

  const totals = useMemo(() => {
    let taken = 0, payable = 0, paid = 0;
    for (const v of perInvestor.values()) { taken += v.taken; payable += v.payable; paid += v.paid; }
    return { taken, payable, paid, outstanding: payable - paid };
  }, [perInvestor]);

  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const list = investorsQ.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((r) => r.name.toLowerCase().includes(q) || (r.phone ?? "").includes(q));
  }, [investorsQ.data, search]);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", address: "", source_type: "personal", source_name: "", note: "" });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!current) return;
    if (!form.name.trim()) return toast.error("নাম দিন");
    setSaving(true);
    const { error } = await supabase.from("investors").insert({
      shop_id: current.id,
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      source_type: form.source_type,
      source_name: form.source_name.trim() || null,
      note: form.note.trim() || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("বিনিয়োগকারী যোগ হয়েছে");
    setOpen(false);
    setForm({ name: "", phone: "", address: "", source_type: "personal", source_name: "", note: "" });
    qc.invalidateQueries({ queryKey: ["investors", shopId] });
  };

  return (
    <div className="container px-4 py-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => nav({ to: "/app/dashboard" })}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Users className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-extrabold md:text-xl">বিনিয়োগকারী</h1>
          <span className="ml-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
            মোট নেওয়া: {bdt(totals.taken)}
          </span>
          <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
            ফেরত: {bdt(totals.paid)}
          </span>
          <span className="rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">
            বাকি: {bdt(totals.outstanding)}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" variant="outline">
            <Link to="/app/investor-report"><FileText className="mr-1 h-4 w-4" /> রিপোর্ট</Link>
          </Button>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> নতুন বিনিয়োগকারী
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="নাম বা ফোন দিয়ে খুঁজুন" className="h-9 pl-8" />
      </div>

      {investorsQ.isLoading ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">লোড হচ্ছে…</Card>
      ) : filtered.length === 0 ? (
        <EmptyState title="কোনো বিনিয়োগকারী নেই — উপরে থেকে ‘নতুন বিনিয়োগকারী’ চাপুন" />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((inv) => {
            const s = perInvestor.get(inv.id) ?? { taken: 0, payable: 0, paid: 0, outstanding: 0, loans: 0 };
            return (
              <Link key={inv.id} to={`/app/investors/${inv.id}`}
                className="group flex items-center gap-3 rounded-xl border bg-card p-3 hover:border-primary/40 hover:shadow-sm transition">
                <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                  {(inv.name || "?").slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="truncate font-semibold">{inv.name}</div>
                    <span className="rounded-md border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {SOURCE_TYPE_LABEL[inv.source_type] ?? inv.source_type}
                    </span>
                  </div>
                  {inv.phone && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" /> {inv.phone}
                    </div>
                  )}
                  <div className="mt-1 flex flex-wrap gap-1 text-[11px]">
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-primary">নেওয়া {bdt(s.taken)}</span>
                    <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700">ফেরত {bdt(s.paid)}</span>
                    <span className="rounded bg-rose-50 px-1.5 py-0.5 text-rose-700">বাকি {bdt(s.outstanding)}</span>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground">{s.loans}টি loan</span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
              </Link>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>নতুন বিনিয়োগকারী</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>নাম *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>ফোন</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <Label>উৎস</Label>
                <Select value={form.source_type} onValueChange={(v) => setForm({ ...form, source_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SOURCE_TYPES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>উৎসের নাম (ব্যাংক/সমিতি/ব্যক্তির নাম)</Label>
              <Input value={form.source_name} onChange={(e) => setForm({ ...form, source_name: e.target.value })} />
            </div>
            <div>
              <Label>ঠিকানা</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div>
              <Label>নোট</Label>
              <Textarea rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>বাতিল</Button>
            <Button onClick={save} disabled={saving}>সংরক্ষণ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function InvestorsPage() {
  return <RequirePerm group="expense"><InvestorsPageInner /></RequirePerm>;
}