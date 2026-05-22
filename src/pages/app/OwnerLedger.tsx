import { useNavigate } from "@/lib/router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MoreVertical, Pencil, Trash2, Wallet, ArrowDownCircle, ArrowUpCircle, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/lib/shop";
import { useAuth } from "@/lib/auth";
import { useI18n, fmtMoney } from "@/lib/i18n";
import { ownerTxnsQuery, type OwnerTxn } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/app/EmptyState";
import { StatCard, StatGrid } from "@/components/app/StatCard";
import { ActionTilePair } from "@/components/app/ActionTilePair";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { RequirePerm } from "@/components/app/RequirePerm";



function GuardedOwnerLedger() {
  return <RequirePerm group="expense"><OwnerLedgerPage /></RequirePerm>;
}

function OwnerLedgerPage() {
  const { lang, t } = useI18n();
  const { current } = useShop();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data = [], refetch } = useQuery(ownerTxnsQuery(current?.id ?? null));
  const list = data;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<OwnerTxn | null>(null);
  const [presetDir, setPresetDir] = useState<"invest" | "withdraw">("invest");

  const totals = useMemo(() => {
    let invest = 0, withdraw = 0;
    for (const r of list) {
      if (r.direction === "invest") invest += Number(r.amount);
      else withdraw += Number(r.amount);
    }
    return { invest, withdraw, net: invest - withdraw };
  }, [list]);

  const refresh = async () => { await qc.invalidateQueries({ queryKey: ["owner-txns"] }); await refetch(); };

  const onDelete = async (e: OwnerTxn) => {
    if (!confirm(t("p5_Delete_2"))) return;
    const { error } = await supabase.from("owner_transactions").update({ deleted_at: new Date().toISOString() }).eq("id", e.id);
    if (error) { toast.error(error.message); return; }
    toast.success(t("p5_Deleted_2"));
    void refresh();
  };

  return (
    <div className="container px-4 py-4">
      <div className="mb-1 text-xs text-muted-foreground">Owner Book</div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => nav({ to: "/app/dashboard" })}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Wallet className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-extrabold md:text-2xl">{t("p5_Owner_Book")}</h1>
        </div>
      </div>

      <ActionTilePair
        className="mt-4"
        tiles={[
          { label: t("p5_Owner_invested"), icon: <ArrowDownCircle className="h-5 w-5" />, tone: "success", onClick: () => { setEditing(null); setPresetDir("invest"); setOpen(true); } },
          { label: t("p5_Owner_withdrew"), icon: <ArrowUpCircle className="h-5 w-5" />, tone: "danger", onClick: () => { setEditing(null); setPresetDir("withdraw"); setOpen(true); } },
        ]}
      />

      <StatGrid className="mt-4">
        <StatCard icon={<ArrowDownCircle className="h-4 w-4" />} label={t("p5_Total_invest")} value={fmtMoney(totals.invest, lang)} tone="success" />
        <StatCard icon={<ArrowUpCircle className="h-4 w-4" />} label={t("p5_Total_withdraw")} value={fmtMoney(totals.withdraw, lang)} tone="danger" />
        <StatCard icon={<Wallet className="h-4 w-4" />} label={t("p5_Net_capital")} value={fmtMoney(totals.net, lang)} tone={totals.net >= 0 ? "primary" : "danger"} />
      </StatGrid>

      <div className="mt-4 rounded-xl border bg-card">
        {list.length === 0 ? (
          <EmptyState icon={<Wallet className="h-6 w-6" />} title={t("p5_No_transactions")} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("p5_Date")}</TableHead>
                <TableHead>{t("p5_Type")}</TableHead>
                <TableHead>{t("p5_Note")}</TableHead>
                <TableHead className="text-right">{t("p5_Amount")}</TableHead>
                <TableHead>{t("p5_Method_2")}</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-xs">{e.tx_date}</TableCell>
                  <TableCell>
                    {e.direction === "invest" ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        <ArrowDownCircle className="h-3 w-3" /> {t("p5_Invest")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
                        <ArrowUpCircle className="h-3 w-3" /> {t("p5_Withdraw")}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{e.note ?? "—"}</TableCell>
                  <TableCell className={"text-right font-semibold " + (e.direction === "invest" ? "text-emerald-700" : "text-rose-600")}>
                    {fmtMoney(Number(e.amount), lang)}
                  </TableCell>
                  <TableCell className="capitalize text-xs">{e.paid_via}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditing(e); setPresetDir(e.direction); setOpen(true); }}>
                          <Pencil className="mr-2 h-4 w-4" /> {t("p5_Edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => onDelete(e)}>
                          <Trash2 className="mr-2 h-4 w-4" /> {t("p5_Delete_3")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <OwnerTxnDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        defaultDirection={presetDir}
        onSaved={refresh}
      />

      {/* FAB for mobile */}
      <button
        aria-label="Add"
        onClick={() => { setEditing(null); setPresetDir("invest"); setOpen(true); }}
        className="fixed bottom-24 right-4 z-30 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg md:hidden"
      >
        <Plus className="h-6 w-6" />
      </button>
    </div>
  );
}

function OwnerTxnDialog({ open, onOpenChange, editing, defaultDirection, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; editing: OwnerTxn | null; defaultDirection: "invest" | "withdraw"; onSaved: () => void }) {
  const { lang, t } = useI18n();
  const { current } = useShop();
  const { user } = useAuth();
  const [direction, setDirection] = useState<"invest" | "withdraw">("invest");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [paidVia, setPaidVia] = useState<"cash" | "bkash" | "nagad" | "rocket" | "bank">("cash");
  const [txDate, setTxDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setDirection(editing?.direction ?? defaultDirection);
      setAmount(editing ? String(editing.amount) : "");
      setNote(editing?.note ?? "");
      setPaidVia(((editing?.paid_via as any) ?? "cash"));
      setTxDate(editing?.tx_date ?? new Date().toISOString().slice(0, 10));
    }
  }, [open, editing, defaultDirection]);

  const save = async () => {
    if (!current || !user) return;
    const amt = Number(amount);
    if (!amt || amt <= 0) { toast.error(t("p5_Enter_amount")); return; }
    setBusy(true);
    const payload = {
      shop_id: current.id,
      direction,
      amount: amt,
      note: note.trim() || null,
      paid_via: paidVia,
      tx_date: txDate,
      created_by: user.id,
    };
    let result;
    if (editing) {
      result = await supabase.from("owner_transactions").update(payload).eq("id", editing.id).select("id").single();
    } else {
      result = await supabase.from("owner_transactions").insert(payload).select("id").single();
    }
    if (result.error) { setBusy(false); toast.error(result.error.message); return; }

    // Mirror to cash_movements (only on insert; edits don't auto-correct cash)
    if (!editing) {
      const cashDir = direction === "invest" ? "in" : "out";
      await supabase.from("cash_movements").insert({
        shop_id: current.id,
        amount: amt,
        direction: cashDir,
        note: (direction === "invest" ? "মালিকের বিনিয়োগ" : "মালিকের উত্তোলন") + (note ? ` — ${note}` : ""),
        ref_table: "owner_transactions",
        ref_id: result.data?.id ?? null,
        created_by: user.id,
      });
    }
    setBusy(false);
    toast.success(t("p5_Saved"));
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? (t("p5_Edit")) : (t("p5_New_entry"))}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>{t("p5_Type")}</Label>
            <Select value={direction} onValueChange={(v) => setDirection(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="invest">{t("p5_Owner_invested")}</SelectItem>
                <SelectItem value="withdraw">{t("p5_Owner_withdrew")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>{t("p5_Amount")}</Label>
            <Input type="number" autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>{t("p5_Date")}</Label>
            <Input type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>{t("p5_Paid_via_2")}</Label>
            <Select value={paidVia} onValueChange={(v) => setPaidVia(v as typeof paidVia)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bkash">bKash</SelectItem>
                <SelectItem value="nagad">Nagad</SelectItem>
                <SelectItem value="rocket">Rocket</SelectItem>
                <SelectItem value="bank">Bank</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>{t("p5_Note")}</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("p5_Cancel")}</Button>
          <Button onClick={save} disabled={busy}>{busy ? "..." : t("p5_Save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
export default GuardedOwnerLedger;
