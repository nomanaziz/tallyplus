import { jsPDF } from "jspdf";

export type FordoSlipItem = {
  name: string;
  qty: number | null;
  unit: string | null;
  price?: number | null;
  done?: boolean;
};

export type FordoSlipData = {
  customerName: string;
  customerPhone?: string | null;
  shopName?: string | null;
  note?: string | null;
  createdAt?: string;
  items: FordoSlipItem[];
  withPrices?: boolean;
};

/**
 * Generates a simple printable slip for a fordo (shopping list).
 * Layout: name + qty + checkbox per row. Optional price column.
 * Note: jsPDF default fonts don't fully support Bangla; we still output text
 * but recommend users print/share — most modern PDF viewers render OK.
 */
export function generateFordoSlipPdf(data: FordoSlipData): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a5" });
  const pageW = doc.internal.pageSize.getWidth();
  let y = 12;

  doc.setFontSize(14);
  doc.text(data.shopName || "ফর্দ / Shopping List", pageW / 2, y, { align: "center" });
  y += 6;

  doc.setFontSize(10);
  doc.text(`Name: ${data.customerName}`, 10, y); y += 5;
  if (data.customerPhone) { doc.text(`Phone: ${data.customerPhone}`, 10, y); y += 5; }
  if (data.createdAt) {
    doc.text(`Date: ${new Date(data.createdAt).toLocaleString()}`, 10, y); y += 5;
  }
  if (data.note) {
    doc.text(`Note: ${data.note}`, 10, y, { maxWidth: pageW - 20 }); y += 6;
  }

  y += 2;
  doc.setLineWidth(0.2);
  doc.line(10, y, pageW - 10, y);
  y += 5;

  // Header
  doc.setFont(undefined as unknown as string, "bold");
  doc.text("#", 10, y);
  doc.text("Item", 18, y);
  doc.text("Qty", pageW - (data.withPrices ? 50 : 30), y);
  if (data.withPrices) {
    doc.text("Price", pageW - 30, y);
  }
  doc.text("[ ]", pageW - 14, y);
  doc.setFont(undefined as unknown as string, "normal");
  y += 4;
  doc.line(10, y, pageW - 10, y);
  y += 5;

  let total = 0;
  data.items.forEach((it, idx) => {
    if (y > 190) { doc.addPage(); y = 12; }
    const qtyText = it.qty != null ? `${it.qty}${it.unit ? ` ${it.unit}` : ""}` : "—";
    const priceText = it.price ? `${it.price}` : "—";
    const lineTotal = (Number(it.qty) || 0) && it.price ? Number(it.qty) * Number(it.price) : Number(it.price) || 0;
    if (data.withPrices) total += lineTotal;

    doc.text(String(idx + 1), 10, y);
    doc.text(String(it.name).slice(0, 32), 18, y);
    doc.text(qtyText, pageW - (data.withPrices ? 50 : 30), y);
    if (data.withPrices) doc.text(priceText, pageW - 30, y);
    // checkbox
    doc.rect(pageW - 16, y - 3.5, 4, 4);
    if (it.done) {
      doc.line(pageW - 15.5, y - 1.5, pageW - 14.5, y - 0.5);
      doc.line(pageW - 14.5, y - 0.5, pageW - 12.5, y - 3);
    }
    y += 6;
  });

  if (data.withPrices && total > 0) {
    y += 2;
    doc.line(10, y, pageW - 10, y); y += 5;
    doc.setFont(undefined as unknown as string, "bold");
    doc.text(`Total: ${total.toLocaleString()}`, pageW - 10, y, { align: "right" });
    doc.setFont(undefined as unknown as string, "normal");
  }

  return doc;
}

export function downloadFordoSlip(data: FordoSlipData, filename?: string) {
  const doc = generateFordoSlipPdf(data);
  const safe = (data.customerName || "fordo").replace(/[^a-zA-Z0-9-_]+/g, "-").slice(0, 30);
  doc.save(filename || `fordo-${safe}-${Date.now()}.pdf`);
}