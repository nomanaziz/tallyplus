import type { InvoiceData } from "@/components/app/InvoiceDialog";
import { bnNum, fmtMoney, type Lang } from "@/lib/i18n";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}

function formatDate(date: string, lang: Lang) {
  const dt = new Date(date);
  return lang === "bn"
    ? `${bnNum(dt.toLocaleDateString("en-GB"))}, ${dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}`
    : dt.toLocaleString();
}

function posRow(label: string, value: string, bold = false) {
  return `<div style="display:flex;justify-content:space-between;font-size:${bold ? 12 : 11}px;font-weight:${bold ? 700 : 400};gap:8px"><span>${escapeHtml(label)}</span><span style="text-align:right">${escapeHtml(value)}</span></div>`;
}

export function buildInvoiceHtml(
  data: InvoiceData,
  lang: Lang,
  mode: "a4" | "pos" = "a4",
  options: { autoPrint?: boolean } = { autoPrint: true },
) {
  const isSell = data.mode === "sell";
  const dueRemain = Math.max(0, data.grandTotal - data.paid);
  const prev = data.previousDue ?? 0;
  const cur = dueRemain;
  const tot = prev + cur;
  const dtStr = formatDate(data.date, lang);
  const totalQty = data.items.reduce((sum, item) => sum + Number(item.qty || 0), 0);

  const rows = data.items
    .map(
      (item, index) => `
        <tr>
          <td class="center">${lang === "bn" ? bnNum(index + 1) + "।" : index + 1}</td>
          <td>${escapeHtml(item.name)}</td>
          <td class="center">${escapeHtml(lang === "bn" ? bnNum(item.qty) : String(item.qty))}</td>
          <td class="center">${escapeHtml(item.unit || (lang === "bn" ? "পিস" : "piece"))}</td>
          <td class="right">${escapeHtml(fmtMoney(item.price, lang))}</td>
          <td class="right">${escapeHtml(fmtMoney(item.total, lang))}</td>
        </tr>`,
    )
    .join("");

  const totalsLeft = `
    <div class="stack">
      <div class="kv"><span>${lang === "bn" ? "পূর্বের বাকি:" : "Previous due:"}</span><strong>${escapeHtml(fmtMoney(prev, lang))}</strong></div>
      <div class="kv"><span>${lang === "bn" ? "বর্তমান বাকি:" : "Current due:"}</span><strong>${escapeHtml(fmtMoney(cur, lang))}</strong></div>
      <div class="kv total-line"><span>${lang === "bn" ? "টোটাল বাকি:" : "Total due:"}</span><strong>${escapeHtml(fmtMoney(tot, lang))}</strong></div>
    </div>`;

  const totalsRight = `
    <div class="stack">
      <div class="kv"><span>${lang === "bn" ? "সাব টোটাল" : "Subtotal"}</span><strong>${escapeHtml(fmtMoney(data.subtotal, lang))}</strong></div>
      <div class="kv"><span>${lang === "bn" ? "(-) ছাড়" : "(-) Discount"}</span><strong>${escapeHtml(fmtMoney(data.discount, lang))}</strong></div>
      <div class="kv"><span>${lang === "bn" ? "ডেলিভারি" : "Delivery"}</span><strong>${escapeHtml(fmtMoney(data.delivery, lang))}</strong></div>
      <div class="kv total-line"><span>${lang === "bn" ? "মোট" : "Total"}</span><strong>${escapeHtml(fmtMoney(data.grandTotal, lang))}</strong></div>
      <div class="kv"><span>${lang === "bn" ? "পরিশোধিত" : "Paid"}</span><strong>${escapeHtml(fmtMoney(data.paid, lang))}</strong></div>
      <div class="kv"><span>${lang === "bn" ? "বাকি আছে" : "Due remaining"}</span><strong>${escapeHtml(fmtMoney(dueRemain, lang))}</strong></div>
    </div>`;

  const a4Html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(data.invoiceNo)}</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #fff; color: #000; }
    body { font-family: 'Hind Siliguri','SolaimanLipi', ui-sans-serif, system-ui, sans-serif; }
    .page { width: 190mm; margin: 0 auto; padding: 0; }
    .invoice { font-size: 12px; line-height: 1.45; }
    .shop { display: flex; gap: 12px; align-items: flex-start; }
    .logo { width: 48px; height: 48px; border: 1px solid #d4d4d8; border-radius: 6px; overflow: hidden; display:flex; align-items:center; justify-content:center; }
    .logo img { width: 100%; height: 100%; object-fit: cover; }
    .shop-meta { flex: 1; }
    .shop-name { font-size: 16px; font-weight: 700; }
    .muted { color: #52525b; font-size: 11px; }
    .title { text-align: center; font-size: 20px; font-weight: 700; margin: 16px 0 10px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 18px; padding: 10px 0; border-top: 1px solid #18181b; border-bottom: 1px solid #18181b; }
    .meta-grid > div:nth-child(2n) { text-align: right; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; table-layout: fixed; }
    th, td { border: 1px solid #18181b; padding: 7px 8px; vertical-align: top; word-break: break-word; overflow-wrap: anywhere; }
    th { font-weight: 700; background: #f4f4f5; text-align: left; }
    .center { text-align: center; }
    .right { text-align: right; }
    .totals { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 16px; page-break-inside: avoid; break-inside: avoid; }
    .stack { display: grid; gap: 6px; }
    .kv { display: flex; justify-content: space-between; gap: 12px; }
    .total-line { border-top: 1px solid #18181b; padding-top: 6px; }
    .section { margin-top: 16px; page-break-inside: avoid; break-inside: avoid; }
    .label { font-weight: 700; margin-bottom: 4px; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin-top: 28px; page-break-inside: avoid; break-inside: avoid; }
    .sign-box { text-align: center; padding-top: 18px; border-top: 1px solid #18181b; }
    .printed { margin-top: 18px; font-size: 10px; color: #52525b; }
    @page { size: A4; margin: 10mm; }
    @media print {
      html, body { width: 210mm; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { width: 190mm !important; max-width: 190mm; margin: 0 auto; padding: 0; }
      .invoice { font-size: 11px; }
      table { font-size: 11px; }
      thead { display: table-header-group; }
      tfoot { display: table-footer-group; }
      tr, td, th { page-break-inside: avoid; break-inside: avoid; }
    }
  </style>
</head>
<body>
  <main class="page invoice">
    <section class="shop section">
      <div class="logo">
        ${data.shop.logo_url ? `<img src="${escapeHtml(data.shop.logo_url)}" alt="" />` : `<div style="font-size:20px">🏪</div>`}
      </div>
      <div class="shop-meta">
        <div class="shop-name">${escapeHtml(data.shop.name)}</div>
        ${data.shop.address ? `<div class="muted">${escapeHtml(data.shop.address)}</div>` : ""}
        ${data.shop.phone ? `<div class="muted">${escapeHtml(data.shop.phone)}</div>` : ""}
      </div>
    </section>

    <div class="title">${lang === "bn" ? "ইনভয়েস" : "Invoice"}</div>

    <section class="meta-grid section">
      <div><strong>${lang === "bn" ? (isSell ? "ক্রেতা: " : "সাপ্লায়ার: ") : (isSell ? "Customer: " : "Supplier: ")}</strong>${escapeHtml(data.party.name || "")}</div>
      <div><strong>${lang === "bn" ? (isSell ? "বিক্রেতা: " : "কিনেছেন: ") : "Issued by: "}</strong>${escapeHtml(data.shop.name)}</div>
      <div><strong>${lang === "bn" ? "মোবাইল: " : "Mobile: "}</strong>${escapeHtml(data.party.phone || "")}</div>
      <div><strong>${lang === "bn" ? "ইনভয়েস নম্বর: " : "Invoice no: "}</strong><span style="font-family: ui-monospace, monospace">${escapeHtml(data.invoiceNo)}</span></div>
      <div><strong>${lang === "bn" ? "ঠিকানা: " : "Address: "}</strong>${escapeHtml(data.party.address || "")}</div>
      <div><strong>${lang === "bn" ? "তারিখ: " : "Date: "}</strong>${escapeHtml(dtStr)}</div>
    </section>

    <section class="section" data-print-section>
      <table>
        <thead>
          <tr>
            <th style="width:8%" class="center">#</th>
            <th style="width:36%">${lang === "bn" ? "পণ্যের নাম" : "Item"}</th>
            <th style="width:12%" class="center">${lang === "bn" ? "পরিমান" : "Qty"}</th>
            <th style="width:12%" class="center">${lang === "bn" ? "ইউনিট" : "Unit"}</th>
            <th style="width:16%" class="right">${lang === "bn" ? "ইউনিট মূল্য" : "Unit price"}</th>
            <th style="width:16%" class="right">${lang === "bn" ? "মোট" : "Total"}</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          <tr>
            <td colspan="2" class="center"><strong>${lang === "bn" ? "মোট" : "Total"}</strong></td>
            <td class="center"><strong>${escapeHtml(lang === "bn" ? bnNum(totalQty) : String(totalQty))}</strong></td>
            <td></td>
            <td></td>
            <td class="right"><strong>${escapeHtml(fmtMoney(data.subtotal, lang))}</strong></td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="totals section">
      ${totalsLeft}
      ${totalsRight}
    </section>

    <section class="section">
      <div class="label">${lang === "bn" ? "এমাউন্ট (কথায়):" : "Amount (in words):"}</div>
      <div>${escapeHtml(lang === "bn" ? `${toBnWords(Math.round(data.grandTotal))} টাকা` : `${toEnWords(Math.round(data.grandTotal))} taka`)}</div>
    </section>

    <section class="signatures">
      <div class="sign-box">${lang === "bn" ? "ক্রেতার স্বাক্ষর" : "Buyer signature"}</div>
      <div class="sign-box">${lang === "bn" ? "বিক্রেতার স্বাক্ষর" : "Seller signature"}</div>
    </section>

    <div class="printed">${lang === "bn" ? "প্রিন্ট করার সময়: " : "Printed at: "}${escapeHtml(dtStr)}</div>
  </main>
  ${options.autoPrint ? `<script>
    window.addEventListener('load', async () => {
      try { if (document.fonts && document.fonts.ready) { await document.fonts.ready; } } catch (e) {}
      setTimeout(() => { window.print(); }, 250);
    });
  </script>` : ""}
</body>
</html>`;

  const posHtml = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(data.invoiceNo)}</title>
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #fff; color: #000; }
    body { font-family: ui-monospace, 'Hind Siliguri', monospace; }
    .receipt { width: 74mm; margin: 0 auto; padding: 0; font-size: 11px; line-height: 1.35; }
    .center { text-align: center; }
    .rule { border-top: 1px dashed #000; margin: 4px 0; }
    .strong { font-weight: 700; }
    .row { display:flex; justify-content:space-between; gap:8px; font-size:10px; }
    .item { margin-bottom: 4px; }
    @page { size: 80mm auto; margin: 3mm 3mm 6mm 3mm; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <main class="receipt">
    <div class="center strong">${escapeHtml(data.shop.name)}</div>
    ${data.shop.address ? `<div class="center" style="font-size:10px">${escapeHtml(data.shop.address)}</div>` : ""}
    ${data.shop.phone ? `<div class="center" style="font-size:10px">${escapeHtml(data.shop.phone)}</div>` : ""}
    <div class="center strong" style="margin:4px 0;border-top:1px dashed #000;border-bottom:1px dashed #000;padding:2px 0">${lang === "bn" ? "ইনভয়েস" : "INVOICE"}</div>
    <div class="row"><span>${lang === "bn" ? "নং:" : "No:"} ${escapeHtml(data.invoiceNo)}</span><span>${escapeHtml(dtStr)}</span></div>
    ${data.party.name ? `<div style="font-size:10px">${escapeHtml(lang === "bn" ? (isSell ? "ক্রেতা:" : "সাপ্লায়ার:") : (isSell ? "Customer:" : "Supplier:"))} ${escapeHtml(data.party.name)}${data.party.phone ? ` • ${escapeHtml(data.party.phone)}` : ""}</div>` : ""}
    <div class="rule"></div>
    ${data.items
      .map(
        (item, index) => `<div class="item"><div class="strong">${lang === "bn" ? bnNum(index + 1) + ". " : `${index + 1}. `}${escapeHtml(item.name)}</div><div class="row"><span>${escapeHtml((lang === "bn" ? bnNum(item.qty) : String(item.qty)) + ` ${item.unit || (lang === "bn" ? "পিস" : "piece")}` + ` × ${fmtMoney(item.price, lang)}`)}</span><span>${escapeHtml(fmtMoney(item.total, lang))}</span></div></div>`,
      )
      .join("")}
    <div class="rule"></div>
    ${posRow(lang === "bn" ? "সাব টোটাল" : "Subtotal", fmtMoney(data.subtotal, lang))}
    ${data.discount > 0 ? posRow(lang === "bn" ? "ছাড়" : "Discount", `- ${fmtMoney(data.discount, lang)}`) : ""}
    ${data.delivery > 0 ? posRow(lang === "bn" ? "ডেলিভারি" : "Delivery", fmtMoney(data.delivery, lang)) : ""}
    <div style="border-top:1px solid #000;margin:3px 0"></div>
    ${posRow(lang === "bn" ? "মোট" : "TOTAL", fmtMoney(data.grandTotal, lang), true)}
    ${posRow(lang === "bn" ? "পরিশোধিত" : "Paid", fmtMoney(data.paid, lang))}
    ${dueRemain > 0 ? posRow(lang === "bn" ? "বাকি" : "Due", fmtMoney(dueRemain, lang), true) : ""}
    <div class="rule"></div>
    <div class="center" style="font-size:10px;margin-top:4px">${lang === "bn" ? "ধন্যবাদ!" : "Thank you!"}</div>
    <div class="center" style="font-size:9px;letter-spacing:1px;margin-top:10px;border-top:2px dashed #000;padding-top:4px">✂ - - - - - - ${lang === "bn" ? "এখানে কাটুন" : "CUT HERE"} - - - - - - ✂</div>
    <div style="height:12px"></div>
  </main>
  ${options.autoPrint ? `<script>
    window.addEventListener('load', () => {
      setTimeout(() => {
        window.print();
      }, 180);
    });
  </script>` : ""}
</body>
</html>`;

  return mode === "pos" ? posHtml : a4Html;
}

export function printInvoice(data: InvoiceData, lang: Lang, mode: "a4" | "pos" = "a4") {
  const html = buildInvoiceHtml(data, lang, mode, { autoPrint: true });
  const printWindow = window.open("", "_blank", mode === "pos" ? "width=420,height=760" : "width=980,height=900");
  if (!printWindow) return;
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

const bnUnits = ["", "এক", "দুই", "তিন", "চার", "পাঁচ", "ছয়", "সাত", "আট", "নয়",
  "দশ", "এগারো", "বারো", "তেরো", "চৌদ্দ", "পনেরো", "ষোলো", "সতেরো", "আঠারো", "উনিশ",
  "বিশ", "একুশ", "বাইশ", "তেইশ", "চব্বিশ", "পঁচিশ", "ছাব্বিশ", "সাতাশ", "আঠাশ", "ঊনত্রিশ",
  "ত্রিশ", "একত্রিশ", "বত্রিশ", "তেত্রিশ", "চৌত্রিশ", "পঁইত্রিশ", "ছত্রিশ", "সাঁইত্রিশ", "আটত্রিশ", "ঊনচল্লিশ",
  "চল্লিশ", "একচল্লিশ", "বিয়াল্লিশ", "তেতাল্লিশ", "চুয়াল্লিশ", "পঁইতাল্লিশ", "ছিচল্লিশ", "সাতচল্লিশ", "আটচল্লিশ", "ঊনপঞ্চাশ",
  "পঞ্চাশ", "একান্ন", "বায়ান্ন", "তিপ্পান্ন", "চুয়ান্ন", "পঞ্চান্ন", "ছাপ্পান্ন", "সাতান্ন", "আটান্ন", "ঊনষাট",
  "ষাট", "একষট্টি", "বাষট্টি", "তেষট্টি", "চৌষট্টি", "পঁইষট্টি", "ছিষট্টি", "সাতষট্টি", "আটষট্টি", "ঊনসত্তর",
  "সত্তর", "একাত্তর", "বাহাত্তর", "তিয়াত্তর", "চুয়াত্তর", "পঁচাত্তর", "ছিয়াত্তর", "সাতাত্তর", "আটাত্তর", "ঊনআশি",
  "আশি", "একাশি", "বিরাশি", "তিরাশি", "চুরাশি", "পঁচাশি", "ছিয়াশি", "সাতাশি", "আটাশি", "উননব্বই",
  "নব্বই", "একানব্বই", "বিরানব্বই", "তিরানব্বই", "চুরানব্বই", "পঁচানব্বই", "ছিয়ানব্বই", "সাতানব্বই", "আটানব্বই", "নিরানব্বই"];

function below100Bn(n: number): string {
  return bnUnits[n] || "";
}

export function toBnWords(n: number): string {
  if (n === 0) return "শূন্য";
  const parts: string[] = [];
  const crore = Math.floor(n / 10000000); n %= 10000000;
  const lakh = Math.floor(n / 100000); n %= 100000;
  const thousand = Math.floor(n / 1000); n %= 1000;
  const hundred = Math.floor(n / 100); n %= 100;
  if (crore) parts.push(toBnWords(crore) + " কোটি");
  if (lakh) parts.push(below100Bn(lakh) + " লক্ষ");
  if (thousand) parts.push(below100Bn(thousand) + " হাজার");
  if (hundred) parts.push(below100Bn(hundred) + " শত");
  if (n) parts.push(below100Bn(n));
  return parts.join(" ").trim();
}

const enSmall = ["zero","one","two","three","four","five","six","seven","eight","nine","ten","eleven","twelve","thirteen","fourteen","fifteen","sixteen","seventeen","eighteen","nineteen"];
const enTens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function below1000En(n: number): string {
  const parts: string[] = [];
  if (n >= 100) {
    parts.push(`${enSmall[Math.floor(n / 100)]} hundred`);
    n %= 100;
  }
  if (n >= 20) {
    parts.push(enTens[Math.floor(n / 10)] + (n % 10 ? `-${enSmall[n % 10]}` : ""));
  } else if (n > 0) {
    parts.push(enSmall[n]);
  }
  return parts.join(" ");
}

export function toEnWords(n: number): string {
  if (n === 0) return "zero";
  const parts: string[] = [];
  const crore = Math.floor(n / 10000000); n %= 10000000;
  const lakh = Math.floor(n / 100000); n %= 100000;
  const thousand = Math.floor(n / 1000); n %= 1000;
  if (crore) parts.push(`${toEnWords(crore)} crore`);
  if (lakh) parts.push(`${below1000En(lakh)} lakh`);
  if (thousand) parts.push(`${below1000En(thousand)} thousand`);
  if (n) parts.push(below1000En(n));
  return parts.join(" ").trim();
}