import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DateRangePicker } from "@/components/app/DateRangePicker";
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
  const { lang, t } = useI18n();
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
        <EmptyState title={t("p2b_selectContactA")} />
      </div>
    );
  }

  const totalGot = rows.reduce((a, r) => a + r.you_got, 0);
  const totalGave = rows.reduce((a, r) => a + r.you_gave, 0);
  const balance = Number(contact.due_balance || 0);

  const balanceLabel = (() => {
    if (contact.party === "customer") {
      if (balance > 0) return { text: t("p2b_willGet"), cls: "text-emerald-600" };
      if (balance < 0) return { text: t("p2b_advance"), cls: "text-blue-600" };
      return { text: t("p2b_paid"), cls: "text-muted-foreground" };
    }
    if (balance > 0) return { text: t("p2b_willGive"), cls: "text-rose-600" };
    if (balance < 0) return { text: t("p2b_advancePaid"), cls: "text-blue-600" };
    return { text: t("p2b_settled"), cls: "text-muted-foreground" };
  })();

  const fmtDt = (iso: string) => {
    const d = new Date(iso);
    const s = d.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
    return lang === "bn" ? bnNum(s) : s;
  };

  const kindLabel = contact.kind === "customer"
    ? (t("p2b_CUSTOMER"))
    : contact.kind === "supplier"
      ? (t("p2b_SUPPLIER"))
      : (t("p2b_EMPLOYEE"));

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
          <div className="text-xs text-muted-foreground">{t("p2b_balance")}</div>
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
            {t("p2b_invoice")}
          </Button>
          <DateRangePicker
            value={{ start: from, end: to }}
            onChange={(v) => { setFrom(v.start); setTo(v.end); }}
          />
          <Button variant="outline" size="icon" onClick={reload} className="h-9 w-9"><RefreshCw className="h-4 w-4" /></Button>
        </div>
        {contact.party === "customer" && balance > 0 && contact.phone && (
          <Button size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setReminderOpen(true)}>
            <Send className="h-4 w-4" />
            {t("p2b_sendReminder")}
          </Button>
        )}
        <ShareMenu
          phone={contact.phone}
          filename={`statement-${contact.name.replace(/\s+/g, "_")}.pdf`}
          label={t("p2b_share")}
          text={
            t("p2b_shareMsg", {
              name: contact.name,
              shop: current?.name ? current.name + " — " : "",
              kind: balance >= 0 ? t("p2b_outstanding") : t("p2b_advanceWord"),
              amt: fmtMoney(Math.abs(balance), lang),
              from,
              to,
            })
          }
          buildPdf={() =>
            generatePdfFromHtml(
              buildStatementHtml({
                lang,
                shop: { name: current?.name ?? "", address: current?.address ?? null, phone: current?.phone ?? null },
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
              <th className="px-4 py-2 text-left font-medium">{t("p2b_dueHistory")}</th>
              <th className="px-4 py-2 text-right font-medium text-emerald-700">{t("p2b_youGot")}</th>
              <th className="px-4 py-2 text-right font-medium text-rose-700">{t("p2b_youGave")}</th>
              <th className="px-4 py-2 text-right font-medium">{t("p2b_BALANCE")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">{t("p2b_loadingDots")}</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">{t("p2b_noTransactions2")}</td></tr>
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
                <td className="px-4 py-2">{t("p2b_total")}</td>
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
          {t("p2b_given")}
        </Button>
        <Button
          className="h-12 bg-emerald-500 hover:bg-emerald-600 text-white text-base font-semibold"
          onClick={() => { setPayDir("in"); setPayOpen(true); }}
        >
          {t("p2b_received")}
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
