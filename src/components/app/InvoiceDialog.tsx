import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, X, Printer, Receipt, Store } from "lucide-react";
import { useI18n, fmtMoney, bnNum } from "@/lib/i18n";
import { printInvoice, toBnWords, toEnWords } from "@/lib/print-invoice";

export type InvoiceItem = {
  name: string;
  qty: number;
  unit?: string | null;
  price: number;
  total: number;
};

export type InvoiceData = {
  mode: "sell" | "purchase";
  shop: { name: string; address?: string | null; phone?: string | null; logo_url?: string | null };
  party: { name?: string | null; phone?: string | null; address?: string | null };
  invoiceNo: string;
  date: string; // ISO
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  delivery: number;
  grandTotal: number;
  paid: number;
  previousDue?: number;
  currentDue?: number;
};

export function InvoiceDialog({
  open,
  onClose,
  data,
}: {
  open: boolean;
  onClose: () => void;
  data: InvoiceData | null;
}) {
  const { lang } = useI18n();
  if (!data) return null;
  const isSell = data.mode === "sell";

  const dueRemain = Math.max(0, data.grandTotal - data.paid);
  const prev = data.previousDue ?? 0;
  const cur = dueRemain;
  const tot = prev + cur;

  const print = () => {
    printInvoice(data, lang, "a4");
  };

  const printPOS = () => {
    printInvoice(data, lang, "pos");
  };

  const dt = new Date(data.date);
  const dtStr = lang === "bn"
    ? `${bnNum(dt.toLocaleDateString("en-GB"))}, ${dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}`
    : dt.toLocaleString();

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-0 gap-0 invoice-dialog-content">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-3 print:hidden">
          <div className="flex items-center gap-2 text-emerald-600 font-bold">
            <CheckCircle2 className="h-5 w-5" />
            <span>Successful</span>
          </div>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Invoice body */}
        <div id="invoice-print-area" className="px-6 py-5 text-sm text-foreground print:px-0 print:py-0">
          {/* Shop block */}
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 shrink-0 rounded-md border bg-muted flex items-center justify-center overflow-hidden">
              {data.shop.logo_url
                ? <img src={data.shop.logo_url} alt="" className="h-full w-full object-cover" />
                : <Store className="h-6 w-6 text-muted-foreground" />}
            </div>
            <div className="flex-1">
              <div className="font-bold">{data.shop.name}</div>
              {data.shop.address && <div className="text-xs text-muted-foreground">{data.shop.address}</div>}
              {data.shop.phone && <div className="text-xs text-muted-foreground">{data.shop.phone}</div>}
            </div>
          </div>

          <div className="my-3 text-center text-lg font-bold">
            {lang === "bn" ? "ইনভয়েস" : "Invoice"}
          </div>

          {/* Meta */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs border-y py-2">
            <div>
              <span className="font-semibold">{lang === "bn" ? (isSell ? "ক্রেতা: " : "সাপ্লায়ার: ") : (isSell ? "Customer: " : "Supplier: ")}</span>
              <span>{data.party.name || (lang === "bn" ? "[দেওয়া হয়নি]" : "[Not given]")}</span>
            </div>
            <div className="text-right">
              <span className="font-semibold">{lang === "bn" ? (isSell ? "বিক্রেতা: " : "কিনেছেন: ") : "Issued by: "}</span>
              <span>{data.shop.name}</span>
            </div>
            <div>
              <span className="font-semibold">{lang === "bn" ? "মোবাইল: " : "Mobile: "}</span>
              <span>{data.party.phone || (lang === "bn" ? "[দেওয়া হয়নি]" : "[Not given]")}</span>
            </div>
            <div className="text-right">
              <span className="font-semibold">{lang === "bn" ? "ইনভয়েস নম্বর: " : "Invoice no: "}</span>
              <span className="font-mono">{data.invoiceNo}</span>
            </div>
            <div>
              <span className="font-semibold">{lang === "bn" ? "ঠিকানা: " : "Address: "}</span>
              <span>{data.party.address || (lang === "bn" ? "[দেওয়া হয়নি]" : "[Not given]")}</span>
            </div>
            <div className="text-right">
              <span className="font-semibold">{lang === "bn" ? "তারিখ: " : "Date: "}</span>
              <span>{dtStr}</span>
            </div>
          </div>

          {/* Items table */}
          <table className="mt-3 w-full border-collapse text-xs">
            <thead>
              <tr className="bg-muted/50 [&>th]:border [&>th]:border-border [&>th]:px-2 [&>th]:py-1.5 [&>th]:text-left">
                <th className="w-8 text-center">#</th>
                <th>{lang === "bn" ? "পণ্যের নাম" : "Item"}</th>
                <th className="w-16 text-center">{lang === "bn" ? "পরিমান" : "Qty"}</th>
                <th className="w-16 text-center">{lang === "bn" ? "ইউনিট" : "Unit"}</th>
                <th className="w-24 text-right">{lang === "bn" ? "ইউনিট মূল্য" : "Unit price"}</th>
                <th className="w-24 text-right">{lang === "bn" ? "মোট" : "Total"}</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((it, i) => (
                <tr key={i} className="[&>td]:border [&>td]:border-border [&>td]:px-2 [&>td]:py-1.5">
                  <td className="text-center">{lang === "bn" ? bnNum(i + 1) + "।" : i + 1}</td>
                  <td>{it.name}</td>
                  <td className="text-center">{lang === "bn" ? bnNum(it.qty) : it.qty}</td>
                  <td className="text-center">{it.unit || "-"}</td>
                  <td className="text-right">{fmtMoney(it.price, lang)}</td>
                  <td className="text-right">{fmtMoney(it.total, lang)}</td>
                </tr>
              ))}
              <tr className="font-bold [&>td]:border [&>td]:border-border [&>td]:px-2 [&>td]:py-1.5">
                <td colSpan={2} className="text-center">{lang === "bn" ? "মোট" : "Total"}</td>
                <td className="text-center">{lang === "bn" ? bnNum(data.items.reduce((a, b) => a + Number(b.qty), 0)) : data.items.reduce((a, b) => a + Number(b.qty), 0)}</td>
                <td></td>
                <td></td>
                <td className="text-right">{fmtMoney(data.subtotal, lang)}</td>
              </tr>
            </tbody>
          </table>

          {/* Totals */}
          <div className="mt-4 grid grid-cols-2 gap-6 text-xs print-keep">
            <div className="space-y-1.5">
              <Row label={lang === "bn" ? "পূর্বের বাকি:" : "Previous due:"} value={fmtMoney(prev, lang)} />
              <Row label={lang === "bn" ? "বর্তমান বাকি:" : "Current due:"} value={fmtMoney(cur, lang)} />
              <div className="border-t pt-1.5">
                <Row label={lang === "bn" ? "টোটাল বাকি:" : "Total due:"} value={fmtMoney(tot, lang)} bold />
              </div>
            </div>
            <div className="space-y-1.5">
              <Row label={lang === "bn" ? "সাব টোটাল" : "Subtotal"} value={fmtMoney(data.subtotal, lang)} />
              <Row label={lang === "bn" ? "(-) ছাড়" : "(-) Discount"} value={fmtMoney(data.discount, lang)} />
              <Row label={lang === "bn" ? "ডেলিভারি" : "Delivery"} value={fmtMoney(data.delivery, lang)} />
              <div className="border-t pt-1.5">
                <Row label={lang === "bn" ? "মোট" : "Total"} value={fmtMoney(data.grandTotal, lang)} bold />
              </div>
              <Row label={lang === "bn" ? "পরিশোধিত" : "Paid"} value={fmtMoney(data.paid, lang)} />
              <Row label={lang === "bn" ? "বাকি আছে" : "Due remaining"} value={fmtMoney(dueRemain, lang)} />
            </div>
          </div>

          {/* Amount in words */}
          <div className="mt-4 text-xs print-keep">
            <div className="font-semibold">{lang === "bn" ? "এমাউন্ট (কথায়):" : "Amount (in words):"}</div>
            <div className="mt-0.5">{lang === "bn" ? toBnWords(Math.round(data.grandTotal)) + " টাকা" : toEnWords(Math.round(data.grandTotal)) + " taka"}</div>
          </div>

          {/* Signatures */}
          <div className="mt-8 grid grid-cols-2 gap-6 text-xs print-keep">
            <div className="text-center">
              <div className="border-t pt-1">{lang === "bn" ? "ক্রেতার স্বাক্ষর" : "Buyer signature"}</div>
            </div>
            <div className="text-center">
              <div className="border-t pt-1">{lang === "bn" ? "বিক্রেতার স্বাক্ষর" : "Seller signature"}</div>
            </div>
          </div>

          <div className="mt-4 text-[10px] text-muted-foreground">
            {lang === "bn" ? "প্রিন্ট করার সময়: " : "Printed at: "}{dtStr}
          </div>
        </div>

        {/* Print button */}
        <div className="border-t p-3 print:hidden">
          <div className="flex gap-2">
            <Button onClick={print} className="flex-1 gap-2 h-11">
              <Printer className="h-4 w-4" />
              {lang === "bn" ? "প্রিন্ট (A4)" : "Print (A4)"}
            </Button>
            <Button
              onClick={printPOS}
              variant="outline"
              size="icon"
              className="h-11 w-11 shrink-0"
              title={lang === "bn" ? "POS / থার্মাল রিসিট প্রিন্ট" : "POS / thermal receipt print"}
              aria-label={lang === "bn" ? "POS প্রিন্ট" : "POS print"}
            >
              <Receipt className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Hidden POS receipt area — only visible during pos-print */}
        <div id="pos-print-area" className="hidden">
          <div style={{ textAlign: "center", fontWeight: 700 }}>{data.shop.name}</div>
          {data.shop.address && (
            <div style={{ textAlign: "center", fontSize: 10 }}>{data.shop.address}</div>
          )}
          {data.shop.phone && (
            <div style={{ textAlign: "center", fontSize: 10 }}>{data.shop.phone}</div>
          )}
          <div style={{ textAlign: "center", fontWeight: 700, margin: "4px 0", borderTop: "1px dashed #000", borderBottom: "1px dashed #000", padding: "2px 0" }}>
            {lang === "bn" ? "ইনভয়েস" : "INVOICE"}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10 }}>
            <span>{lang === "bn" ? "নং:" : "No:"} {data.invoiceNo}</span>
            <span>{dtStr}</span>
          </div>
          {data.party.name && (
            <div style={{ fontSize: 10 }}>
              {lang === "bn" ? (isSell ? "ক্রেতা:" : "সাপ্লায়ার:") : (isSell ? "Customer:" : "Supplier:")} {data.party.name}
              {data.party.phone ? ` • ${data.party.phone}` : ""}
            </div>
          )}
          <div style={{ borderTop: "1px dashed #000", margin: "4px 0" }} />
          {data.items.map((it, i) => (
            <div key={i} style={{ marginBottom: 3 }}>
              <div style={{ fontWeight: 600 }}>{lang === "bn" ? bnNum(i + 1) + ". " : `${i + 1}. `}{it.name}</div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10 }}>
                <span>
                  {lang === "bn" ? bnNum(it.qty) : it.qty}{it.unit ? ` ${it.unit}` : ""} × {fmtMoney(it.price, lang)}
                </span>
                <span>{fmtMoney(it.total, lang)}</span>
              </div>
            </div>
          ))}
          <div style={{ borderTop: "1px dashed #000", margin: "4px 0" }} />
          <PosRow label={lang === "bn" ? "সাব টোটাল" : "Subtotal"} value={fmtMoney(data.subtotal, lang)} />
          {data.discount > 0 && <PosRow label={lang === "bn" ? "ছাড়" : "Discount"} value={`- ${fmtMoney(data.discount, lang)}`} />}
          {data.delivery > 0 && <PosRow label={lang === "bn" ? "ডেলিভারি" : "Delivery"} value={fmtMoney(data.delivery, lang)} />}
          <div style={{ borderTop: "1px solid #000", margin: "3px 0" }} />
          <PosRow label={lang === "bn" ? "মোট" : "TOTAL"} value={fmtMoney(data.grandTotal, lang)} bold />
          <PosRow label={lang === "bn" ? "পরিশোধিত" : "Paid"} value={fmtMoney(data.paid, lang)} />
          {dueRemain > 0 && <PosRow label={lang === "bn" ? "বাকি" : "Due"} value={fmtMoney(dueRemain, lang)} bold />}
          <div style={{ borderTop: "1px dashed #000", margin: "4px 0" }} />
          <div style={{ textAlign: "center", fontSize: 10, marginTop: 4 }}>
            {lang === "bn" ? "ধন্যবাদ!" : "Thank you!"}
          </div>
          {/* Perforation / cut line */}
          <div style={{ marginTop: 10, borderTop: "2px dashed #000", paddingTop: 4, textAlign: "center", fontSize: 9, letterSpacing: 1 }}>
            ✂ - - - - - - {lang === "bn" ? "এখানে কাটুন" : "CUT HERE"} - - - - - - ✂
          </div>
          <div style={{ height: 12 }} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-bold" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function PosRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: bold ? 700 : 400, fontSize: bold ? 12 : 11 }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
