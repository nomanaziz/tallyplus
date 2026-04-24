import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ArrowDownCircle, ArrowUpCircle, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/lib/shop";
import { useAuth } from "@/lib/auth";
import { useI18n, fmtMoney } from "@/lib/i18n";
import { cashMovementsQuery } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataToolbar } from "@/components/app/DataToolbar";
import { EmptyState } from "@/components/app/EmptyState";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

type Movement = {
  id: string;
  direction: string;
  amount: number;
  note: string | null;
  ref_table: string | null;
  created_at: string;
};

export const Route = createFileRoute("/app/cashbox")({
  component: CashboxPage,
});

function CashboxPage() {
  const { lang } = useI18n();
  const { current } = useShop();
  const qc = useQueryClient();
  const { data: rawData = [], refetch } = useQuery(cashMovementsQuery(current?.id ?? null));
  const movements = rawData as unknown as Movement[];
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const totals = useMemo(() => {
    const cashIn = movements.filter((m) => m.direction === "in").reduce((s, m) => s + Number(m.amount), 0);
    const cashOut = movements.filter((m) => m.direction === "out").reduce((s, m) => s + Number(m.amount), 0);
    return { in: cashIn, out: cashOut, balance: cashIn - cashOut };
  }, [movements]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? movements.filter((m) => (m.note ?? "").toLowerCase().includes(q)) : movements;
  }, [movements, search]);

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ["cash"] });
    await refetch();
  };

  return (
    <div className="container px-4 py-4">
      <div className="mb-1 text-xs text-muted-foreground">Cashbox</div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-extrabold md:text-2xl">{lang === "bn" ? "ক্যাশবক্স" : "Cashbox"}</h1>
        <Button className="h-10 gap-2" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          {lang === "bn" ? "নতুন এন্ট্রি" : "New entry"}
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard
          icon={<ArrowDownCircle className="h-5 w-5 text-emerald-600" />}
          label={lang === "bn" ? "মোট জমা" : "Total in"}
          value={fmtMoney(totals.in, lang)}
          tone="emerald"
        />
        <SummaryCard
          icon={<ArrowUpCircle className="h-5 w-5 text-rose-600" />}
          label={lang === "bn" ? "মোট খরচ" : "Total out"}
          value={fmtMoney(totals.out, lang)}
          tone="rose"
        />
        <SummaryCard
          icon={<Wallet className="h-5 w-5 text-primary" />}
          label={lang === "bn" ? "ব্যালেন্স" : "Balance"}
          value={fmtMoney(totals.balance, lang)}
          tone="primary"
        />
      </div>

      <div className="mt-4">
        <DataToolbar
          search={search}
          onSearch={setSearch}
          onRefresh={refresh}
          placeholder={lang === "bn" ? "নোট খুঁজুন" : "Search note"}
        />
      </div>

      <div className="mt-4 rounded-xl border bg-card">
        {filtered.length === 0 ? (
          <EmptyState icon={<Wallet className="h-6 w-6" />} title={lang === "bn" ? "কোনো এন্ট্রি নেই" : "No entries"} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{lang === "bn" ? "তারিখ" : "Date"}</TableHead>
                <TableHead>{lang === "bn" ? "নোট" : "Note"}</TableHead>
                <TableHead>{lang === "bn" ? "ধরন" : "Type"}</TableHead>
                <TableHead className="text-right">{lang === "bn" ? "পরিমাণ" : "Amount"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="text-xs">{new Date(m.created_at).toLocaleString()}</TableCell>
                  <TableCell>{m.note ?? "—"}</TableCell>
                  <TableCell>
                    <span className={m.direction === "in" ? "text-emerald-600 font-semibold" : "text-rose-600 font-semibold"}>
                      {m.direction === "in" ? (lang === "bn" ? "জমা" : "In") : (lang === "bn" ? "খরচ" : "Out")}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-semibold">{fmtMoney(Number(m.amount), lang)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <CashEntryDialog open={open} onOpenChange={setOpen} onSaved={refresh} />
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

function CashEntryDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; onSaved: () => void }) {
  const { lang } = useI18n();
  const { current } = useShop();
  const { user } = useAuth();
  const [direction, setDirection] = useState<"in" | "out">("in");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) { setDirection("in"); setAmount(""); setNote(""); }
  }, [open]);

  const save = async () => {
    if (!current || !user) return;
    const amt = Number(amount);
    if (!amt || amt <= 0) { toast.error(lang === "bn" ? "সঠিক পরিমাণ দিন" : "Enter amount"); return; }
    setBusy(true);
    const { error } = await supabase.from("cash_movements").insert({
      shop_id: current.id,
      direction,
      amount: amt,
      note: note.trim() || null,
      created_by: user.id,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(lang === "bn" ? "সেভ হয়েছে" : "Saved");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{lang === "bn" ? "নতুন এন্ট্রি" : "New entry"}</DialogTitle>
        </DialogHeader>
        <Tabs value={direction} onValueChange={(v) => setDirection(v as "in" | "out")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="in" className="data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-700">
              {lang === "bn" ? "জমা" : "Cash in"}
            </TabsTrigger>
            <TabsTrigger value="out" className="data-[state=active]:bg-rose-100 data-[state=active]:text-rose-700">
              {lang === "bn" ? "খরচ" : "Cash out"}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>{lang === "bn" ? "পরিমাণ" : "Amount"}</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>{lang === "bn" ? "নোট" : "Note"}</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{lang === "bn" ? "বাতিল" : "Cancel"}</Button>
          <Button onClick={save} disabled={busy}>{busy ? "..." : lang === "bn" ? "সেভ" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
