import { bnNum, fmtMoney, type Lang } from "@/lib/i18n";
import type { LedgerRow } from "@/lib/contact-ledger";

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function buildStatementHtml(opts: {
  lang: Lang;
  shop: { name: string; address?: string | null; phone?: string | null };
  contact: { name: string; phone?: string | null };
  from: string;
  to: string;
  rows: LedgerRow[];
  balance: number;
  party: "customer" | "supplier";
}): string {
  const { lang, shop, contact, from, to, rows, balance, party } = opts;
  const fmtDt = (iso: string) => {
    const d = new Date(iso);
    const s = d.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    return lang === "bn" ? bnNum(s) : s;
  };
  const totalGot = rows.reduce((a, r) => a + r.you_got, 0);
  const totalGave = rows.reduce((a, r) => a + r.you_gave, 0);
  const title = lang === "bn" ? "লেনদেনের হিসাব" : "Statement of Account";
  const balLabel =
    party === "customer"
      ? balance > 0
        ? lang === "bn" ? "মোট পাবো" : "Total Receivable"
        : balance < 0
          ? lang === "bn" ? "অগ্রিম জমা" : "Advance Balance"
          : lang === "bn" ? "পরিশোধিত" : "Settled"
      : balance > 0
        ? lang === "bn" ? "মোট দিবো" : "Total Payable"
        : balance < 0
          ? lang === "bn" ? "অগ্রিম দেওয়া" : "Advance Paid"
          : lang === "bn" ? "পরিশোধিত" : "Settled";

  const tr = rows
    .map(
      (r, i) => `<tr>
      <td class="center">${lang === "bn" ? bnNum(i + 1) : i + 1}</td>
      <td>${esc(fmtDt(r.date))}${r.note ? `<div class="muted">${esc(r.note)}</div>` : ""}</td>
      <td class="right got">${r.you_got > 0 ? esc(fmtMoney(r.you_got, lang)) : "—"}</td>
      <td class="right gave">${r.you_gave > 0 ? esc(fmtMoney(r.you_gave, lang)) : "—"}</td>
      <td class="right strong">${esc(fmtMoney(Math.abs(r.balance), lang))}</td>
    </tr>`,
    )
    .join("");

  return `<!doctype html><html><head><meta charset="utf-8"/><title>${esc(title)}</title>
<style>
  *{box-sizing:border-box}
  html,body{margin:0;padding:0;background:#fff;color:#000;font-family:'Hind Siliguri',ui-sans-serif,system-ui,sans-serif}
  .page{width:190mm;margin:0 auto;padding:6mm;font-size:12px;line-height:1.45}
  .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #000;padding-bottom:6px}
  .shop-name{font-size:18px;font-weight:700}
  .muted{color:#52525b;font-size:11px}
  .title{text-align:center;font-size:18px;font-weight:700;margin:12px 0 6px}
  .meta{display:grid;grid-template-columns:1fr 1fr;gap:4px 18px;border:1px solid #18181b;padding:8px;border-radius:4px;margin-bottom:10px}
  table{width:100%;border-collapse:collapse}
  th,td{border:1px solid #18181b;padding:6px 8px;vertical-align:top}
  th{background:#f4f4f5;text-align:left;font-size:11px}
  .center{text-align:center}
  .right{text-align:right}
  .strong{font-weight:700}
  .got{color:#047857}
  .gave{color:#b91c1c}
  tfoot td{background:#f4f4f5;font-weight:700}
  .balance-box{margin-top:14px;display:flex;justify-content:flex-end}
  .balance-card{border:2px solid #000;padding:10px 16px;border-radius:6px;text-align:right}
  .balance-card .lbl{font-size:11px;color:#52525b}
  .balance-card .val{font-size:20px;font-weight:700}
  .footer{margin-top:18px;font-size:10px;color:#52525b;text-align:center}
</style></head><body>
<div class="page">
  <div class="head">
    <div>
      <div class="shop-name">${esc(shop.name)}</div>
      ${shop.address ? `<div class="muted">${esc(shop.address)}</div>` : ""}
      ${shop.phone ? `<div class="muted">${esc(shop.phone)}</div>` : ""}
    </div>
    <div style="text-align:right">
      <div class="muted">${lang === "bn" ? "তৈরি:" : "Generated:"} ${esc(fmtDt(new Date().toISOString()))}</div>
    </div>
  </div>

  <div class="title">${esc(title)}</div>

  <div class="meta">
    <div><strong>${lang === "bn" ? "নাম: " : "Name: "}</strong>${esc(contact.name)}</div>
    <div><strong>${lang === "bn" ? "মোবাইল: " : "Mobile: "}</strong>${esc(contact.phone || "—")}</div>
    <div><strong>${lang === "bn" ? "তারিখ থেকে: " : "From: "}</strong>${esc(fmtDt(from))}</div>
    <div><strong>${lang === "bn" ? "তারিখ পর্যন্ত: " : "To: "}</strong>${esc(fmtDt(to))}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="center" style="width:6%">#</th>
        <th style="width:34%">${lang === "bn" ? "তারিখ / বিবরণ" : "Date / Details"}</th>
        <th class="right" style="width:20%">${lang === "bn" ? "পেলাম" : "You Got"}</th>
        <th class="right" style="width:20%">${lang === "bn" ? "দিলাম" : "You Gave"}</th>
        <th class="right" style="width:20%">${lang === "bn" ? "ব্যালেন্স" : "Balance"}</th>
      </tr>
    </thead>
    <tbody>
      ${tr || `<tr><td colspan="5" class="center muted">${lang === "bn" ? "কোন লেনদেন নেই" : "No transactions"}</td></tr>`}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="2" class="right">${lang === "bn" ? "মোট" : "Total"}</td>
        <td class="right got">${esc(fmtMoney(totalGot, lang))}</td>
        <td class="right gave">${esc(fmtMoney(totalGave, lang))}</td>
        <td class="right">${esc(fmtMoney(Math.abs(balance), lang))}</td>
      </tr>
    </tfoot>
  </table>

  <div class="balance-box">
    <div class="balance-card">
      <div class="lbl">${esc(balLabel)}</div>
      <div class="val">${esc(fmtMoney(Math.abs(balance), lang))}</div>
    </div>
  </div>

  <div class="footer">${lang === "bn" ? "ধন্যবাদ — " : "Thank you — "}${esc(shop.name)}</div>
</div>
</body></html>`;
}