import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, FileText, RefreshCw, History, Calendar } from "lucide-react";
import { useI18n, fmtMoney } from "@/lib/i18n";
import { useShop } from "@/lib/shop";
import { supabase } from "@/integrations/supabase/client";
import { DueTypePickerDialog, type DueDirection } from "@/components/app/DueTypePickerDialog";
import { MoneyDueEntryDialog } from "@/components/app/MoneyDueEntryDialog";
import { EmptyState } from "@/components/app/EmptyState";
import { icons } from "@/lib/icons";



type PartyTab = "customer" | "supplier" | "employee";
type Contact = { id: string; name: string; phone: string | null; due_balance: number };

function DueLedgerPage() {
  const { lang } = useI18n();
  const { current } = useShop();
  const [tab, setTab] = useState<PartyTab>("customer");
  const [search, setSearch] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [totals, setTotals] = useState({ receivable: 0, payable: 0 });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [moneyOpen, setMoneyOpen] = useState(false);
  const [moneyDir, setMoneyDir] = useState<DueDirection>("giving");
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    if (!current?.id) return;
    let cancelled = false;
    (async () => {
      const table = tab === "supplier" ? "suppliers" : "customers";
      const { data } = await supabase
        .from(table)
        .select("id,name,phone,due_balance")
        .eq("shop_id", current.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (!cancelled) setContacts((data ?? []) as Contact[]);

      const [{ data: c }, { data: s }] = await Promise.all([
        supabase.from("customers").select("due_balance").eq("shop_id", current.id).is("deleted_at", null),
        supabase.from("suppliers").select("due_balance").eq("shop_id", current.id).is("deleted_at", null),
      ]);
      if (!cancelled) {
        setTotals({
          receivable: (c ?? []).reduce((a, r) => a + Number(r.due_balance || 0), 0),
          payable: (s ?? []).reduce((a, r) => a + Number(r.due_balance || 0), 0),
        });
      }
    })();
    return () => { cancelled = true; };
  }, [current?.id, tab, refreshTick]);

  const filtered = contacts.filter((c) =>
    !search.trim() || c.name.toLowerCase().includes(search.toLowerCase()) || (c.phone ?? "").includes(search),
  );

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-background px-4 py-3">
        <div className="flex items-center gap-2">
          <img src={icons.due} alt="" className="h-6 w-6" />
          <h1 className="text-lg font-bold">{lang === "bn" ? "বাকির খাতা" : "Due Ledger"}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            {lang === "bn" ? "মোট পাবো:" : "Receivable:"} {fmtMoney(totals.receivable, lang)}
          </span>
          <span className="rounded-full border bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
            {lang === "bn" ? "মোট দিবো:" : "Payable:"} {fmtMoney(totals.payable, lang)}
          </span>
          <Button variant="outline" size="sm" className="gap-1.5">
            <History className="h-4 w-4" />
            {lang === "bn" ? "বাকির ইতিহাস" : "History"}
          </Button>
          <Button onClick={() => setPickerOpen(true)} size="sm" className="gap-1.5 bg-foreground text-background hover:bg-foreground/90">
            <Plus className="h-4 w-4" />
            {lang === "bn" ? "নতুন বাকি" : "New Due"}
          </Button>
        </div>
      </div>

      {/* Two-pane layout */}
      <div className="grid flex-1 grid-cols-1 md:grid-cols-[380px_1fr] overflow-hidden">
        {/* Left: contacts */}
        <div className="flex flex-col border-r overflow-hidden">
          <div className="border-b p-3 space-y-3">
            <Tabs value={tab} onValueChange={(v) => setTab(v as PartyTab)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="customer">{lang === "bn" ? "কাস্টমার" : "Customer"}</TabsTrigger>
                <TabsTrigger value="supplier">{lang === "bn" ? "সাপ্লায়ার" : "Supplier"}</TabsTrigger>
                <TabsTrigger value="employee">{lang === "bn" ? "কর্মচারী" : "Employee"}</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={lang === "bn" ? "কন্টাক্ট খোঁজ করুন" : "Search contact"} className="pl-8" />
              </div>
              <Button variant="outline" size="icon" onClick={() => setRefreshTick((t) => t + 1)}><RefreshCw className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon"><FileText className="h-4 w-4" /></Button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                {lang === "bn" ? "আপনার কোন লেনদেন নেই" : "No transactions found"}
              </div>
            ) : (
              <ul className="divide-y">
                {filtered.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-accent/50 cursor-pointer">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{c.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{c.phone ?? "—"}</div>
                    </div>
                    <div className={`text-sm font-semibold ${Number(c.due_balance) > 0 ? "text-emerald-600" : "text-muted-foreground"}`}>
                      {fmtMoney(Number(c.due_balance || 0), lang)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right: detail empty */}
        <div className="flex flex-col">
          <div className="flex items-center justify-end gap-2 border-b bg-background px-4 py-2">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Calendar className="h-4 w-4" />
              <span>Jan 01, 2000 - Dec 31, 2026</span>
            </Button>
            <Button variant="outline" size="icon"><RefreshCw className="h-4 w-4" /></Button>
          </div>
          <div className="flex flex-1 items-center justify-center">
            <EmptyState title={lang === "bn" ? "আপনার কোন লেনদেন নেই" : "No transactions yet"} />
          </div>
        </div>
      </div>

      <DueTypePickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPickMoney={(dir) => { setMoneyDir(dir); setMoneyOpen(true); }}
      />
      <MoneyDueEntryDialog
        open={moneyOpen}
        onOpenChange={setMoneyOpen}
        defaultDirection={moneyDir}
        onSaved={() => setRefreshTick((t) => t + 1)}
      />
    </div>
  );
}

export default DueLedgerPage;
