// Shared print/download utility for business reports.
// Renders a receipt-like printable HTML page that matches the uploaded mockup.

export type PrintRow =
  | { kind: "row"; label: string; sub?: string; value: string; tone?: "success" | "danger" | "muted" | "default" }
  | { kind: "divider" }
  | { kind: "section"; label: string };

export type PrintReportOptions = {
  shopName: string;
  shopAddress?: string | null;
  shopPhone?: string | null;
  title: string;
  startDate: string; // yyyy-mm-dd
  endDate: string;
  rows: PrintRow[];
  footer?: string;
};

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function tone(t?: PrintRow extends { tone?: infer T } ? T : never) {
  switch (t) {
    case "success":
      return "color:#16a34a";
    case "danger":
      return "color:#dc2626";
    case "muted":
      return "color:#6b7280";
    default:
      return "color:#111";
  }
}

export function printReport(opts: PrintReportOptions) {
  const body = opts.rows
    .map((r) => {
      if (r.kind === "divider") return `<div style="border-top:1px solid #e5e7eb;margin:8px 0"></div>`;
      if (r.kind === "section")
        return `<div style="font-weight:700;margin:10px 0 6px 0;font-size:13px">${escapeHtml(r.label)}</div>`;
      const label = `<div><div style="font-size:13px;font-weight:600">${escapeHtml(r.label)}</div>${
        r.sub ? `<div style="font-size:11px;color:#6b7280">${escapeHtml(r.sub)}</div>` : ""
      }</div>`;
      const value = `<div style="font-weight:700;${tone(r.tone)}">${escapeHtml(r.value)}</div>`;
      return `<div style="display:flex;justify-content:space-between;align-items:flex-start;padding:8px 0;border-bottom:1px dashed #e5e7eb">${label}${value}</div>`;
    })
    .join("");

  const html = `<!doctype html>
<html><head><meta charset="utf-8" /><title>${escapeHtml(opts.title)}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:'Hind Siliguri','SolaimanLipi',ui-sans-serif,system-ui,sans-serif;margin:24px;color:#111}
  .head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px}
  .shop{font-weight:700}
  .meta{text-align:right;font-size:12px}
  .title{font-size:18px;font-weight:800;margin-bottom:4px}
  .footer{margin-top:24px;text-align:center;font-size:11px;color:#6b7280}
  @media print{ body{margin:8mm} }
</style>
</head><body>
  <div class="head">
    <div>
      <div class="shop">${escapeHtml(opts.shopName)}</div>
      ${opts.shopAddress ? `<div style="font-size:12px;color:#6b7280">${escapeHtml(opts.shopAddress)}</div>` : ""}
      ${opts.shopPhone ? `<div style="font-size:12px;color:#6b7280">${escapeHtml(opts.shopPhone)}</div>` : ""}
    </div>
    <div class="meta">
      <div class="title">${escapeHtml(opts.title)}</div>
      <div>শুরুর তারিখ: ${escapeHtml(opts.startDate)}</div>
      <div>শেষ তারিখ: ${escapeHtml(opts.endDate)}</div>
    </div>
  </div>
  ${body}
  <div class="footer">${escapeHtml(opts.footer ?? "Powered By : Hishabee Business Manager.")}</div>
  <script>window.addEventListener('load',()=>{setTimeout(()=>window.print(),200)});</script>
</body></html>`;

  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}