import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Calendar, RefreshCw, Send, Receipt } from "lucide-react";
import { useI18n, fmtMoney, bnNum } from "@/lib/i18n";
import { useShop } from "@/lib/shop";
import { fetchContactLedger, type LedgerRow } from "@/lib/contact-ledger";
import { PaymentEntryDialog, type PaymentDir } from "./PaymentEntryDialog";
import { DueReminderDialog } from "./DueReminderDialog";
import { EmptyState } from "./EmptyState";
import { ShareMenu } from "./ShareMenu";
import { buildStatementHtml } from "@/lib/statement-html";
import { generatePdfFromHtml } from "@/lib/share-document";

export type LedgerContact = {
  id: string;
  name: string;
  phone: string | null;
  due_balance: number;
  party: "customer" | "supplier";
  kind: "customer" | "supplier" | "employee";
};

export function ContactLedgerPanel({ contact, onChanged }: { contact: LedgerContact | null; onChanged?: () => void }) {
  const { lang } = useI18n();
  const { current } = useShop();

  const today = new Date().toISOString().slice(0, 10);
  const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [from, setFrom] = useState(yearAgo);
  const [to, setTo] = useState(today);
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);

  const [payOpen, setPayOpen] = useState(false);
  const [payDir, setPayDir] = useState<PaymentDir>("in");
  const [reminderOpen, setReminderOpen] = useState(false);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!contact || !current?.id) { setRows([]); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const data = await fetchContactLedger({
        shopId: current.id,
        party: contact.party,
        contactId: contact.id,
        fromIso: new Date(from + "T00:00:00").toISOString(),
        toIso: new Date(to + "T23:59:59").toISOString(),
      });
      if (!cancelled) { setRows(data); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [contact, current?.id, from, to, tick]);

  if (!contact) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState title={lang === "bn" ? "একজন কন্টাক্ট নির্বাচন করুন" : "Select a contact"} />
      </div>
    );
  }

  const totalGot = rows.reduce((a, r) => a + r.you_got, 0);
  const totalGave = rows.reduce((a, r) => a + r.you_gave, 0);
  const balance = Number(contact.due_balance || 0);

  const balanceLabel = (() => {
    if (contact.party === "customer") {
      if (balance > 0) return { text: lang === "bn" ? "পাবো" : "Will Get", cls: "text-emerald-600" };
      if (balance < 0) return { text: lang === "bn" ? "অগ্রিম" : "Advance", cls: "text-blue-600" };
      return { text: lang === "bn" ? "পরিশোধিত" : "Paid", cls: "text-muted-foreground" };
    }
    if (balance > 0) return { text: lang === "bn" ? "দিবো" : "Will Give", cls: "text-rose-600" };
    if (balance < 0) return { text: lang === "bn" ? "অগ্রিম দেওয়া" : "Advance Paid", cls: "text-blue-600" };
    return { text: lang === "bn" ? "পরিশোধিত" : "Settled", cls: "text-muted-foreground" };
  })();

  const fmtDt = (iso: string) => {
    const d = new Date(iso);
    const s = d.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
    return lang === "bn" ? bnNum(s) : s;
  };

  const kindLabel = contact.kind === "customer"
    ? (lang === "bn" ? "কাস্টমার" : "CUSTOMER")
    : contact.kind === "supplier"
      ? (lang === "bn" ? "সাপ্লায়ার" : "SUPPLIER")
      : (lang === "bn" ? "কর্মচারী" : "EMPLOYEE");

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0 flex items-center gap-3">
          <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-muted text-sm font-semibold uppercase">
            {contact.name.slice(0, 1)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold truncate">{contact.name}</span>
              <Badge variant="secondary" className="text-[10px]">{kindLabel}</Badge>
            </div>
            <div className="text-xs text-muted-foreground">{contact.phone ?? "—"}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">{lang === "bn" ? "ব্যালেন্স" : "Balance"}</div>
          <div className={`text-xl font-bold ${balanceLabel.cls}`}>
            {fmtMoney(Math.abs(balance), lang)}
            <span className="ml-1 text-xs font-normal">{balanceLabel.text}</span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/20 px-4 py-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Receipt className="h-4 w-4" />
            {lang === "bn" ? "ইনভয়েস" : "Invoice"}
          </Button>
          <div className="flex items-center gap-1.5 rounded-md border bg-background px-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 w-[140px] border-0 px-1 focus-visible:ring-0" />
            <span className="text-muted-foreground">–</span>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 w-[140px] border-0 px-1 focus-visible:ring-0" />
          </div>
          <Button variant="outline" size="icon" onClick={reload} className="h-9 w-9"><RefreshCw className="h-4 w-4" /></Button>
        </div>
        {contact.party === "customer" && balance > 0 && contact.phone && (
          <Button size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setReminderOpen(true)}>
            <Send className="h-4 w-4" />
            {lang === "bn" ? "রিমাইন্ডার পাঠান" : "Send Reminder"}
          </Button>
        )}
        <ShareMenu
          phone={contact.phone}
          filename={`statement-${contact.name.replace(/\s+/g, "_")}.pdf`}
          label={lang === "bn" ? "শেয়ার / পাঠান" : "Share"}
          text={
            lang === "bn"
              ? `প্রিয় ${contact.name},\n${current?.name ? current.name + " — " : ""}আপনার ${balance >= 0 ? "মোট বাকি" : "অগ্রিম"}: ${fmtMoney(Math.abs(balance), lang)}\nসময়কাল: ${from} থেকে ${to}\nবিস্তারিত PDF সংযুক্ত।\n\nধন্যবাদ।`
              : `Dear ${contact.name},\n${current?.name ? current.name + " — " : ""}Your ${balance >= 0 ? "outstanding balance" : "advance"}: ${fmtMoney(Math.abs(balance), lang)}\nPeriod: ${from} to ${to}\nPDF attached.\n\nThank you.`
          }
          buildPdf={() =>
            generatePdfFromHtml(
              buildStatementHtml({
                lang,
                shop: { name: current?.name ?? "", address: (current as any)?.address ?? null, phone: (current as any)?.phone ?? null },
                contact: { name: contact.name, phone: contact.phone },
                from,
                to,
                rows,
                balance,
                party: contact.party,
              }),
              "a4",
            )
          }
        />
      </div>

      {/* History table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted/50 text-xs uppercase">
            <tr>
              <th className="px-4 py-2 text-left font-medium">{lang === "bn" ? "বাকির ইতিহাস" : "Due History"}</th>
              <th className="px-4 py-2 text-right font-medium text-emerald-700">{lang === "bn" ? "পেলাম" : "YOU GOT"}</th>
              <th className="px-4 py-2 text-right font-medium text-rose-700">{lang === "bn" ? "দিলাম" : "YOU GAVE"}</th>
              <th className="px-4 py-2 text-right font-medium">{lang === "bn" ? "ব্যালেন্স" : "BALANCE"}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">{lang === "bn" ? "লোড হচ্ছে..." : "Loading..."}</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">{lang === "bn" ? "কোন লেনদেন নেই" : "No transactions"}</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b">
                  <td className="px-4 py-3">
                    <div className="text-sm">{fmtDt(r.date)}</div>
                    {r.note && <div className="text-xs text-muted-foreground">Note: {r.note}</div>}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-emerald-600">{r.you_got > 0 ? fmtMoney(r.you_got, lang) : "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-rose-600">{r.you_gave > 0 ? fmtMoney(r.you_gave, lang) : "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold">{fmtMoney(Math.abs(r.balance), lang)}</td>
                </tr>
              ))
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="bg-muted/40 font-semibold">
                <td className="px-4 py-2">{lang === "bn" ? "মোট" : "Total"}</td>
                <td className="px-4 py-2 text-right tabular-nums text-emerald-700">{fmtMoney(totalGot, lang)}</td>
                <td className="px-4 py-2 text-right tabular-nums text-rose-700">{fmtMoney(totalGave, lang)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{fmtMoney(Math.abs(balance), lang)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Action bar */}
      <div className="grid grid-cols-2 gap-2 border-t p-3">
        <Button
          className="h-12 bg-rose-500 hover:bg-rose-600 text-white text-base font-semibold"
          onClick={() => { setPayDir("out"); setPayOpen(true); }}
        >
          {lang === "bn" ? "দিলাম" : "Given"}
        </Button>
        <Button
          className="h-12 bg-emerald-500 hover:bg-emerald-600 text-white text-base font-semibold"
          onClick={() => { setPayDir("in"); setPayOpen(true); }}
        >
          {lang === "bn" ? "পেলাম" : "Received"}
        </Button>
      </div>

      <PaymentEntryDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        party={contact.party}
        contactId={contact.id}
        contactName={contact.name}
        defaultDirection={payDir}
        onSaved={() => { reload(); onChanged?.(); }}
      />
      <DueReminderDialog
        open={reminderOpen}
        onOpenChange={setReminderOpen}
        customer={contact.party === "customer" ? { id: contact.id, name: contact.name, phone: contact.phone, due_balance: balance } : null}
      />
    </div>
  );
}
