import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownCircle, ArrowUpCircle, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/lib/shop";
import { useAuth } from "@/lib/auth";
import { useI18n, fmtMoney } from "@/lib/i18n";
import { cashMovementsQuery } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DataToolbar } from "@/components/app/DataToolbar";
import { EmptyState } from "@/components/app/EmptyState";
import { StatCard, StatGrid } from "@/components/app/StatCard";
import { ActionTilePair } from "@/components/app/ActionTilePair";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataPagination } from "@/components/app/DataPagination";
import { usePagination } from "@/hooks/use-pagination";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { BDT_DENOMS, DenominationPicker, cleanDenoms, denomTotal, type DenomCounts } from "@/components/app/DenominationPicker";
import { toast } from "sonner";

type Movement = {
  id: string;
  direction: string;
  amount: number;
  note: string | null;
  ref_table: string | null;
  created_at: string;
  denominations?: DenomCounts | null;
};



function CashboxPage() {
  const { lang } = useI18n();
  const { current } = useShop();
  const qc = useQueryClient();
  const { data: rawData = [], refetch } = useQuery(cashMovementsQuery(current?.id ?? null));
  const movements = rawData as unknown as Movement[];
  const [search, setSearch] = useState("");
  const [openDir, setOpenDir] = useState<"in" | "out" | null>(null);

  const totals = useMemo(() => {
    const cashIn = movements.filter((m) => m.direction === "in").reduce((s, m) => s + Number(m.amount), 0);
    const cashOut = movements.filter((m) => m.direction === "out").reduce((s, m) => s + Number(m.amount), 0);
    return { in: cashIn, out: cashOut, balance: cashIn - cashOut };
  }, [movements]);

  // Per-denomination ledger
  const noteLedger = useMemo(() => {
    const inC: Record<string, number> = {};
    const outC: Record<string, number> = {};
    const bySource: Record<string, { in: number; out: number }> = {};
    for (const m of movements) {
      const d = (m.denominations || {}) as DenomCounts;
      const src = m.ref_table || "manual";
      bySource[src] ??= { in: 0, out: 0 };
      bySource[src][m.direction === "in" ? "in" : "out"] += Number(m.amount);
      for (const k of BDT_DENOMS) {
        const n = Number(d[String(k)] || 0);
        if (!n) continue;
        if (m.direction === "in") inC[String(k)] = (inC[String(k)] || 0) + n;
        else outC[String(k)] = (outC[String(k)] || 0) + n;
      }
    }
    return { inC, outC, bySource };
  }, [movements]);

  const available: DenomCounts = useMemo(() => {
    const out: DenomCounts = {};
    for (const k of BDT_DENOMS) {
      const v = (noteLedger.inC[String(k)] || 0) - (noteLedger.outC[String(k)] || 0);
      if (v > 0) out[String(k)] = v;
    }
    return out;
  }, [noteLedger]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? movements.filter((m) => (m.note ?? "").toLowerCase().includes(q)) : movements;
  }, [movements, search]);
  const pg = usePagination(filtered, 25);

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ["cash"] });
    await refetch();
  };

  return (
    <div className="container px-4 py-4">
      <div className="mb-1 text-xs text-muted-foreground">Cashbox</div>
      <h1 className="text-xl font-extrabold md:text-2xl">{lang === "bn" ? "ক্যাশবক্স" : "Cashbox"}</h1>

      <ActionTilePair
        className="mt-4"
        tiles={[
          { label: lang === "bn" ? "জমা" : "Cash In", icon: <ArrowDownCircle className="h-5 w-5" />, tone: "success", onClick: () => setOpenDir("in") },
          { label: lang === "bn" ? "খরচ" : "Cash Out", icon: <ArrowUpCircle className="h-5 w-5" />, tone: "danger", onClick: () => setOpenDir("out") },
        ]}
      />

      <StatGrid className="mt-4">
        <StatCard
          icon={<ArrowDownCircle className="h-4 w-4" />}
          label={lang === "bn" ? "মোট জমা" : "Total in"}
          value={fmtMoney(totals.in, lang)}
          tone="success"
        />
        <StatCard
          icon={<ArrowUpCircle className="h-4 w-4" />}
          label={lang === "bn" ? "মোট খরচ" : "Total out"}
          value={fmtMoney(totals.out, lang)}
          tone="danger"
        />
        <StatCard
          icon={<Wallet className="h-4 w-4" />}
          label={lang === "bn" ? "ব্যালেন্স" : "Balance"}
          value={fmtMoney(totals.balance, lang)}
          tone="primary"
        />
      </StatGrid>

      <Tabs defaultValue="entries" className="mt-4">
        <TabsList>
          <TabsTrigger value="entries">{lang === "bn" ? "এন্ট্রি লিস্ট" : "Entries"}</TabsTrigger>
          <TabsTrigger value="ledger">{lang === "bn" ? "নোটের হিসাব" : "Note Ledger"}</TabsTrigger>
        </TabsList>

        <TabsContent value="entries" className="mt-4">
          <DataToolbar
            search={search}
            onSearch={setSearch}
            onRefresh={refresh}
            placeholder={lang === "bn" ? "নোট খুঁজুন" : "Search note"}
          />
          <div className="mt-3 rounded-xl border bg-card">
            {filtered.length === 0 ? (
              <EmptyState icon={<Wallet className="h-6 w-6" />} title={lang === "bn" ? "কোনো এন্ট্রি নেই" : "No entries"} />
            ) : (
              <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{lang === "bn" ? "তারিখ" : "Date"}</TableHead>
                    <TableHead>{lang === "bn" ? "উৎস" : "Source"}</TableHead>
                    <TableHead>{lang === "bn" ? "নোটের ভাঙতি" : "Notes"}</TableHead>
                    <TableHead>{lang === "bn" ? "ধরন" : "Type"}</TableHead>
                    <TableHead className="text-right">{lang === "bn" ? "পরিমাণ" : "Amount"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pg.paged.map((m) => {
                    const d = (m.denominations || {}) as DenomCounts;
                    const chips = BDT_DENOMS.filter((k) => Number(d[String(k)] || 0) > 0);
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="text-xs">{new Date(m.created_at).toLocaleString()}</TableCell>
                        <TableCell className="text-xs">
                          <span className="rounded bg-muted px-1.5 py-0.5 font-medium">
                            {sourceLabel(m.ref_table, lang)}
                          </span>
                          {m.note && <div className="mt-0.5 text-muted-foreground">{m.note}</div>}
                        </TableCell>
                        <TableCell>
                          {chips.length === 0 ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {chips.map((k) => (
                                <span
                                  key={k}
                                  className={`rounded px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${
                                    m.direction === "in" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                                  }`}
                                >
                                  ৳{k}×{d[String(k)]}
                                </span>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={m.direction === "in" ? "text-emerald-600 font-semibold" : "text-rose-600 font-semibold"}>
                            {m.direction === "in" ? (lang === "bn" ? "জমা" : "In") : (lang === "bn" ? "খরচ" : "Out")}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-semibold">{fmtMoney(Number(m.amount), lang)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <DataPagination
                page={pg.page}
                pageCount={pg.pageCount}
                pageSize={pg.pageSize}
                total={pg.total}
                from={pg.from}
                to={pg.to}
                onPageChange={pg.setPage}
                onPageSizeChange={pg.setPageSize}
              />
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="ledger" className="mt-4">
          <NoteLedgerView inC={noteLedger.inC} outC={noteLedger.outC} bySource={noteLedger.bySource} />
        </TabsContent>
      </Tabs>

      <CashEntryDialog
        direction={openDir}
        onClose={() => setOpenDir(null)}
        onSaved={refresh}
        available={available}
      />
    </div>
  );
}

function sourceLabel(ref: string | null, lang: string) {
  const map: Record<string, { bn: string; en: string }> = {
    sales: { bn: "বিক্রি", en: "Sale" },
    purchases: { bn: "ক্রয়", en: "Purchase" },
    expenses: { bn: "খরচ", en: "Expense" },
    payments: { bn: "পেমেন্ট", en: "Payment" },
    other_income: { bn: "অন্যান্য আয়", en: "Income" },
  };
  const k = ref ?? "manual";
  if (k === "manual") return lang === "bn" ? "ম্যানুয়াল" : "Manual";
  return map[k]?.[lang === "bn" ? "bn" : "en"] ?? k;
}

function NoteLedgerView({
  inC,
  outC,
  bySource,
}: {
  inC: Record<string, number>;
  outC: Record<string, number>;
  bySource: Record<string, { in: number; out: number }>;
}) {
  const { lang } = useI18n();
  let totalBal = 0;
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2 rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{lang === "bn" ? "নোট" : "Note"}</TableHead>
              <TableHead className="text-right text-emerald-700">{lang === "bn" ? "জমা সংখ্যা" : "In qty"}</TableHead>
              <TableHead className="text-right text-rose-700">{lang === "bn" ? "খরচ সংখ্যা" : "Out qty"}</TableHead>
              <TableHead className="text-right">{lang === "bn" ? "বর্তমান সংখ্যা" : "Balance qty"}</TableHead>
              <TableHead className="text-right">{lang === "bn" ? "বর্তমান টাকা" : "Balance ৳"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {BDT_DENOMS.map((d) => {
              const i = inC[String(d)] || 0;
              const o = outC[String(d)] || 0;
              const bal = i - o;
              const money = bal * d;
              totalBal += money;
              return (
                <TableRow key={d}>
                  <TableCell className="font-bold">৳{d}</TableCell>
                  <TableCell className="text-right tabular-nums text-emerald-700">{i || "—"}</TableCell>
                  <TableCell className="text-right tabular-nums text-rose-700">{o || "—"}</TableCell>
                  <TableCell className={`text-right tabular-nums font-semibold ${bal < 0 ? "text-rose-700" : ""}`}>{bal}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">{fmtMoney(money, lang)}</TableCell>
                </TableRow>
              );
            })}
            <TableRow>
              <TableCell colSpan={4} className="text-right font-bold">{lang === "bn" ? "মোট ব্যালেন্স (নোট হিসাবে)" : "Total balance (by notes)"}</TableCell>
              <TableCell className="text-right text-lg font-extrabold tabular-nums">{fmtMoney(totalBal, lang)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <div className="text-sm font-bold mb-2">{lang === "bn" ? "উৎস অনুযায়ী" : "By source"}</div>
        <div className="space-y-2">
          {Object.keys(bySource).length === 0 && (
            <div className="text-xs text-muted-foreground">{lang === "bn" ? "কোনো ডেটা নেই" : "No data"}</div>
          )}
          {Object.entries(bySource).map(([src, v]) => (
            <div key={src} className="rounded-lg border p-2">
              <div className="text-xs font-semibold">{sourceLabel(src === "manual" ? null : src, lang)}</div>
              <div className="mt-1 grid grid-cols-2 gap-2 text-xs">
                <div className="text-emerald-700">↓ {fmtMoney(v.in, lang)}</div>
                <div className="text-rose-700 text-right">↑ {fmtMoney(v.out, lang)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: "emerald" | "rose" | "primary" }) {
  const ring = tone === "emerald" ? "border-emerald-200 bg-emerald-50" : tone === "rose" ? "border-rose-200 bg-rose-50" : "border-primary/30 bg-primary/5";
  return (
    <div className={`rounded-xl border p-4 ${ring}`}>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {icon} {label}
      </div>
      <div className="mt-2 text-2xl font-extrabold">{value}</div>
    </div>
  );
}

function CashEntryDialog({
  direction,
  onClose,
  onSaved,
  available,
}: {
  direction: "in" | "out" | null;
  onClose: () => void;
  onSaved: () => void;
  available?: DenomCounts;
}) {
  const { lang } = useI18n();
  const { current } = useShop();
  const { user } = useAuth();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [counts, setCounts] = useState<DenomCounts>({});
  const [manualMode, setManualMode] = useState(false);
  const open = direction !== null;

  useEffect(() => {
    if (open) { setAmount(""); setNote(""); setCounts({}); setManualMode(false); }
  }, [open]);

  const denomSum = denomTotal(counts);
  const effectiveAmount = manualMode ? Number(amount) : denomSum;

  const save = async () => {
    if (!current || !user || !direction) return;
    const amt = effectiveAmount;
    if (!amt || amt <= 0) { toast.error(lang === "bn" ? "সঠিক পরিমাণ দিন" : "Enter amount"); return; }
    const denom = manualMode ? {} : cleanDenoms(counts);
    setBusy(true);
    const { error } = await supabase.from("cash_movements").insert({
      shop_id: current.id,
      direction,
      amount: amt,
      note: note.trim() || null,
      created_by: user.id,
      denominations: denom,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(lang === "bn" ? "সেভ হয়েছে" : "Saved");
    onClose();
    onSaved();
  };

  const isIn = direction === "in";
  const title = isIn
    ? (lang === "bn" ? "জমা যোগ করুন" : "Add Cash In")
    : (lang === "bn" ? "খরচ যোগ করুন" : "Add Cash Out");

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className={isIn ? "text-emerald-700" : "text-rose-700"}>
            <span className="inline-flex items-center gap-2">
              {isIn ? <ArrowDownCircle className="h-5 w-5" /> : <ArrowUpCircle className="h-5 w-5" />}
              {title}
            </span>
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
            <div>
              <div className="text-sm font-semibold">{lang === "bn" ? "ম্যানুয়াল পরিমাণ" : "Manual amount"}</div>
              <div className="text-[11px] text-muted-foreground">
                {lang === "bn" ? "নোট গণনা না করে সরাসরি টাকা লিখুন" : "Skip note counting, type amount directly"}
              </div>
            </div>
            <Switch checked={manualMode} onCheckedChange={setManualMode} />
          </div>

          {manualMode ? (
            <div className="grid gap-1.5">
              <Label>{lang === "bn" ? "পরিমাণ" : "Amount"}</Label>
              <Input type="number" autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
          ) : (
            <DenominationPicker
              counts={counts}
              onChange={setCounts}
              available={!isIn ? available : undefined}
            />
          )}

          <div className="grid gap-1.5">
            <Label>{lang === "bn" ? "নোট" : "Note"}</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{lang === "bn" ? "বাতিল" : "Cancel"}</Button>
          <Button
            onClick={save}
            disabled={busy || effectiveAmount <= 0}
            className={isIn ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}
          >
            {busy ? "..." : `${lang === "bn" ? "সেভ" : "Save"} • ${fmtMoney(effectiveAmount, lang)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CashboxPage;
