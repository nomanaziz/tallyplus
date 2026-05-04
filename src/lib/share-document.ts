import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { buildInvoiceHtml } from "@/lib/print-invoice";
import type { InvoiceData } from "@/components/app/InvoiceDialog";
import type { Lang } from "@/lib/i18n";

export function normalizePhone(phone?: string | null): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("88")) return digits;
  if (digits.startsWith("0")) return "88" + digits;
  return digits;
}

async function htmlToPdfBlob(html: string, mode: "a4" | "pos"): Promise<Blob> {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.left = "-10000px";
  iframe.style.top = "0";
  iframe.style.width = mode === "pos" ? "320px" : "820px";
  iframe.style.height = "1200px";
  iframe.style.border = "0";
  document.body.appendChild(iframe);
  try {
    const doc = iframe.contentDocument!;
    doc.open();
    doc.write(html);
    doc.close();
    // Wait for fonts/images
    await new Promise((r) => setTimeout(r, 350));
    const target = doc.body;
    const canvas = await html2canvas(target, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
    const imgData = canvas.toDataURL("image/jpeg", 0.92);

    const pdf = mode === "pos"
      ? new jsPDF({ unit: "mm", format: [80, Math.max(120, (canvas.height / canvas.width) * 80)] })
      : new jsPDF({ unit: "mm", format: "a4" });

    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = pageW;
    const imgH = (canvas.height / canvas.width) * imgW;

    if (imgH <= pageH) {
      pdf.addImage(imgData, "JPEG", 0, 0, imgW, imgH);
    } else {
      // Multi-page slicing
      let remaining = imgH;
      let position = 0;
      while (remaining > 0) {
        pdf.addImage(imgData, "JPEG", 0, position, imgW, imgH);
        remaining -= pageH;
        position -= pageH;
        if (remaining > 0) pdf.addPage();
      }
    }
    return pdf.output("blob");
  } finally {
    iframe.remove();
  }
}

export async function generateInvoicePdf(
  data: InvoiceData,
  lang: Lang,
  mode: "a4" | "pos" = "a4",
): Promise<Blob> {
  const html = buildInvoiceHtml(data, lang, mode, { autoPrint: false });
  return htmlToPdfBlob(html, mode);
}

export async function generatePdfFromHtml(html: string, mode: "a4" | "pos" = "a4"): Promise<Blob> {
  return htmlToPdfBlob(html, mode);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 200);
}

export function openWhatsApp(phone: string | null | undefined, text: string) {
  const p = normalizePhone(phone);
  const encoded = encodeURIComponent(text);
  const url = p ? `https://wa.me/${p}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
  window.open(url, "_blank", "noopener");
}

export function openTelegram(text: string, url?: string) {
  const u = `https://t.me/share/url?url=${encodeURIComponent(url || "")}&text=${encodeURIComponent(text)}`;
  window.open(u, "_blank", "noopener");
}

/**
 * Try Web Share API with file; if not supported, download PDF + open WhatsApp text.
 */
export async function shareViaWhatsApp(opts: {
  phone?: string | null;
  text: string;
  blob?: Blob;
  filename?: string;
}) {
  const { phone, text, blob, filename = "invoice.pdf" } = opts;
  if (blob && typeof navigator !== "undefined" && (navigator as any).canShare) {
    try {
      const file = new File([blob], filename, { type: "application/pdf" });
      if ((navigator as any).canShare({ files: [file] })) {
        await (navigator as any).share({ files: [file], text, title: filename });
        return;
      }
    } catch (e) {
      // fall through
    }
  }
  if (blob) downloadBlob(blob, filename);
  openWhatsApp(phone, text);
}

export async function shareViaTelegram(opts: { text: string; blob?: Blob; filename?: string }) {
  const { text, blob, filename = "invoice.pdf" } = opts;
  if (blob && typeof navigator !== "undefined" && (navigator as any).canShare) {
    try {
      const file = new File([blob], filename, { type: "application/pdf" });
      if ((navigator as any).canShare({ files: [file] })) {
        await (navigator as any).share({ files: [file], text, title: filename });
        return;
      }
    } catch (e) {
      // fall through
    }
  }
  if (blob) downloadBlob(blob, filename);
  openTelegram(text);
}