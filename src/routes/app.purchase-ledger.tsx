import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, FileText, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/lib/shop";
import { useI18n, fmtMoney } from "@/lib/i18n";
import { purchasesListQuery, contactsQuery } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { DataToolbar } from "@/components/app/DataToolbar";
import { EmptyState } from "@/components/app/EmptyState";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { icons } from "@/lib/icons";

type Purchase = {
  id: string;
  invoice_no: string | null;
  supplier_id: string | null;
  total: number;
  paid: number;
  due: number;
  payment_method: string;
  created_at: string;
};
type Item = { id: string; name: string; qty: number; price: number; total: number };

export const Route = createFileRoute("/app/purchase-ledger")({
  component: PurchaseLedgerPage,
});

function PurchaseLedgerPage() {
  const { lang } = useI18n();
  const { current } = useShop();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data: raw = [], refetch } = useQuery(purchasesListQuery(current?.id ?? null));
  const list = raw as unknown as Purchase[];
  const { data: suppliers = [] } = useQuery(contactsQuery(current?.id ?? null, "suppliers"));
  const supMap = useMemo(() => Object.fromEntries((suppliers as { id: string; name: string }[]).map((s) => [s.id, s.name])), [suppliers]);

  const [search, setSearch] = useState("");
  const [details, setDetails] = useState<Purchase | null>(null);
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    if (!details) { setItems([]); return; }
    let cancel = false;
    (async () => {
      const { data } = await supabase.from("purchase_items").select("id,name,qty,price,total").eq("purchase_id", details.id);
      if (!cancel) setItems((data ?? []) as Item[]);
    })();
    return () => { cancel = true; };
  }, [details]);

  const totals = useMemo(() => list.reduce(
    (a, s) => ({ total: a.total + Number(s.total), paid: a.paid + Number(s.paid), due: a.due + Number(s.due) }),
    { total: 0, paid: 0, due: 0 }), [list]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? list.filter((p) => (p.invoice_no ?? "").toLowerCase().includes(q) || (supMap[p.supplier_id ?? ""] ?? "").toLowerCase().includes(q)) : list;
  }, [list, search, supMap]);

  const refresh = async () => { await qc.invalidateQueries({ queryKey: ["purchases"] }); await refetch(); };

  return (
    <div className="container px-4 py-4">
      <div className="mb-1 text-xs text-muted-foreground">Purchase Ledger</div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => nav({ to: "/app/dashboard" })}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <img src={icons.purchaseList} alt="" className="h-6 w-6" />
          <h1 className="text-xl font-extrabold md:text-2xl">{lang === "bn" ? "কেনার খাতা" : "Purchase Ledger"}</h1>
        </div>
        <Button className="h-10 gap-2" onClick={() => nav({ to: "/app/purchase" })}>
          <Plus className="h-4 w-4" />
          {lang === "bn" ? "নতুন কেনা" : "New purchase"}
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card label={lang === "bn" ? "মোট কেনা" : "Total purchases"} value={fmtMoney(totals.total, lang)} tone="primary" />
        <Card label={lang === "bn" ? "পরিশোধিত" : "Paid"} value={fmtMoney(totals.paid, lang)} tone="emerald" />
        <Card label={lang === "bn" ? "বাকি" : "Due"} value={fmtMoney(totals.due, lang)} tone="rose" />
      </div>

      <div className="mt-4">
        <DataToolbar search={search} onSearch={setSearch} onRefresh={refresh} placeholder={lang === "bn" ? "ইনভয়েস/সাপ্লায়ার" : "Invoice / supplier"} />
      </div>

      <div className="mt-4 rounded-xl border bg-card">
        {filtered.length === 0 ? (
          <EmptyState icon={<FileText className="h-6 w-6" />} title={lang === "bn" ? "কোনো কেনা নেই" : "No purchases"} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{lang === "bn" ? "তারিখ" : "Date"}</TableHead>
                <TableHead>{lang === "bn" ? "ইনভয়েস" : "Invoice"}</TableHead>
                <TableHead>{lang === "bn" ? "সাপ্লায়ার" : "Supplier"}</TableHead>
                <TableHead className="text-right">{lang === "bn" ? "মোট" : "Total"}</TableHead>
                <TableHead className="text-right">{lang === "bn" ? "পরিশোধ" : "Paid"}</TableHead>
                <TableHead className="text-right">{lang === "bn" ? "বাকি" : "Due"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id} onClick={() => setDetails(p)} className="cursor-pointer">
                  <TableCell className="text-xs">{new Date(p.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="font-mono text-xs">{p.invoice_no ?? p.id.slice(0, 8)}</TableCell>
                  <TableCell>{supMap[p.supplier_id ?? ""] ?? "—"}</TableCell>
                  <TableCell className="text-right font-semibold">{fmtMoney(Number(p.total), lang)}</TableCell>
                  <TableCell className="text-right text-emerald-600">{fmtMoney(Number(p.paid), lang)}</TableCell>
                  <TableCell className="text-right text-rose-600">{fmtMoney(Number(p.due), lang)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={!!details} onOpenChange={(o) => !o && setDetails(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{lang === "bn" ? "ক্রয় বিস্তারিত" : "Purchase details"}</DialogTitle>
          </DialogHeader>
          {items.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">—</div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>{lang === "bn" ? "পণ্য" : "Item"}</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">{lang === "bn" ? "দর" : "Price"}</TableHead><TableHead className="text-right">{lang === "bn" ? "মোট" : "Total"}</TableHead></TableRow></TableHeader>
              <TableBody>
                {items.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell>{it.name}</TableCell>
                    <TableCell className="text-right">{it.qty}</TableCell>
                    <TableCell className="text-right">{fmtMoney(Number(it.price), lang)}</TableCell>
                    <TableCell className="text-right font-semibold">{fmtMoney(Number(it.total), lang)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Card({ label, value, tone }: { label: string; value: string; tone: "primary" | "emerald" | "rose" }) {
  const cls = tone === "emerald" ? "border-emerald-200 bg-emerald-50" : tone === "rose" ? "border-rose-200 bg-rose-50" : "border-primary/30 bg-primary/5";
  return (
    <div className={`rounded-xl border p-4 ${cls}`}>
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-extrabold">{value}</div>
    </div>
  );
}
