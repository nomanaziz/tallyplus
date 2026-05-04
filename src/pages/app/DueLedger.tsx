import { useEffect, useState } from "react";
import { useNavigate } from "@/lib/router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, FileText, RefreshCw, History } from "lucide-react";
import { useI18n, fmtMoney } from "@/lib/i18n";
import { useShop } from "@/lib/shop";
import { supabase } from "@/integrations/supabase/client";
import { DueTypePickerDialog, type DueDirection } from "@/components/app/DueTypePickerDialog";
import { MoneyDueEntryDialog } from "@/components/app/MoneyDueEntryDialog";
import { ContactLedgerPanel, type LedgerContact } from "@/components/app/ContactLedgerPanel";
import { icons, AppIcon } from "@/lib/icons";

type PartyTab = "customer" | "supplier" | "employee";
type Contact = { id: string; name: string; phone: string | null; due_balance: number; contact_kind?: string | null };

function DueLedgerPage() {
  const { lang } = useI18n();
  const { current } = useShop();
  const nav = useNavigate();
  const [tab, setTab] = useState<PartyTab>("customer");
  const [search, setSearch] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [totals, setTotals] = useState({ receivable: 0, payable: 0 });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [moneyOpen, setMoneyOpen] = useState(false);
  const [moneyDir, setMoneyDir] = useState<DueDirection>("giving");
  const [refreshTick, setRefreshTick] = useState(0);
  const [selected, setSelected] = useState<LedgerContact | null>(null);

  useEffect(() => {
    if (!current?.id) return;
    let cancelled = false;
    (async () => {
      let data: Contact[] = [];
      if (tab === "supplier") {
        const { data: rows } = await supabase
          .from("suppliers")
          .select("id,name,phone,due_balance")
          .eq("shop_id", current.id)
          .is("deleted_at", null)
          .order("created_at", { ascending: false });
        data = (rows ?? []) as Contact[];
      } else {
        const wantKind = tab === "employee" ? "employee" : "customer";
        const { data: rows } = await supabase
          .from("customers")
          .select("id,name,phone,due_balance,contact_kind")
          .eq("shop_id", current.id)
          .eq("contact_kind", wantKind)
          .is("deleted_at", null)
          .order("created_at", { ascending: false });
        data = (rows ?? []) as Contact[];
      }
      if (!cancelled) setContacts(data);

      const [{ data: c }, { data: s }] = await Promise.all([
        supabase.from("customers").select("due_balance").eq("shop_id", current.id).is("deleted_at", null),
        supabase.from("suppliers").select("due_balance").eq("shop_id", current.id).is("deleted_at", null),
      ]);
      if (!cancelled) {
        setTotals({
          receivable: (c ?? []).reduce((a, r) => a + Math.max(Number(r.due_balance || 0), 0), 0),
          payable: (s ?? []).reduce((a, r) => a + Math.max(Number(r.due_balance || 0), 0), 0),
        });
        if (selected) {
          const fresh = data.find((x) => x.id === selected.id);
          if (fresh) setSelected({ ...selected, due_balance: Number(fresh.due_balance || 0) });
        }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, tab, refreshTick]);

  const filtered = contacts.filter((c) =>
    !search.trim() || c.name.toLowerCase().includes(search.toLowerCase()) || (c.phone ?? "").includes(search),
  );

  const partyForTab: "customer" | "supplier" = tab === "supplier" ? "supplier" : "customer";

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-background px-4 py-3">
        <div className="flex items-center gap-2">
          <AppIcon name="due" className="h-6 w-6" />
          <h1 className="text-lg font-bold">{lang === "bn" ? "বাকির খাতা" : "Due Ledger"}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
            {lang === "bn" ? "মোট পাবো:" : "Receivable:"} {fmtMoney(totals.receivable, lang)}
          </span>
          <span className="rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
            {lang === "bn" ? "মোট দিবো:" : "Payable:"} {fmtMoney(totals.payable, lang)}
          </span>
          <Button variant="outline" className="h-10 gap-2" onClick={() => nav({ to: "/app/due-history" })}>
            <History className="h-4 w-4" />
            {lang === "bn" ? "বাকির ইতিহাস" : "History"}
          </Button>
          <Button className="h-10 gap-2" onClick={() => setPickerOpen(true)}>
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
            <Tabs value={tab} onValueChange={(v) => { setTab(v as PartyTab); setSelected(null); }}>
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
                {filtered.map((c) => {
                  const bal = Number(c.due_balance || 0);
                  const isActive = selected?.id === c.id;
                  const showRed = bal > 0;
                  const showAdvance = bal < 0;
                  return (
                    <li
                      key={c.id}
                      className={`flex cursor-pointer items-center justify-between gap-3 px-4 py-3 transition border-l-4 ${isActive ? "bg-accent border-primary" : "border-transparent hover:bg-accent/50"}`}
                      onClick={() => setSelected({
                        id: c.id,
                        name: c.name,
                        phone: c.phone,
                        due_balance: bal,
                        party: partyForTab,
                        kind: tab,
                      })}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{c.name}</div>
                        <div className="truncate text-xs text-muted-foreground">{c.phone ?? "—"}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div className={`text-sm font-semibold ${showRed ? "text-rose-600" : showAdvance ? "text-blue-600" : "text-muted-foreground"}`}>
                          {fmtMoney(Math.abs(bal), lang)}
                        </div>
                        {showRed && (
                          <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                            {tab === "supplier" ? (lang === "bn" ? "দিতে হবে" : "OWED") : (lang === "bn" ? "বাকি" : "DUE")}
                          </span>
                        )}
                        {showAdvance && (
                          <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                            {lang === "bn" ? "অগ্রিম" : "ADVANCE"}
                          </span>
                        )}
                        {!showRed && !showAdvance && (
                          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                            {lang === "bn" ? "পরিশোধিত" : "PAID"}
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Right: full ledger panel */}
        <ContactLedgerPanel contact={selected} onChanged={() => setRefreshTick((t) => t + 1)} />
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