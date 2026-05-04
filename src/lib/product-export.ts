import * as XLSX from "xlsx";

export type ProductExportRow = {
  name: string;
  sku: string | null;
  barcode: string | null;
  unit: string | null;
  cost_price: number;
  sale_price: number;
  stock: number;
  low_stock_alert: number | null;
};

export function exportProductsToXlsx(rows: ProductExportRow[], filename = "products.xlsx") {
  const data = rows.map((p) => ({
    "নাম / Name": p.name,
    "পরিমাণ / Quantity": Number(p.stock) || 0,
    "ক্রয়মূল্য / Cost Price": Number(p.cost_price) || 0,
    "বিক্রয়মূল্য / Sale Price": Number(p.sale_price) || 0,
    "ইউনিট / Unit": p.unit ?? "",
    "বারকোড / Barcode": p.barcode ?? "",
    "SKU": p.sku ?? "",
    "Low Stock Alert": p.low_stock_alert ?? "",
    "Stock Value": (Number(p.stock) || 0) * (Number(p.cost_price) || 0),
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Products");
  XLSX.writeFile(wb, filename);
}

export function downloadProductImportTemplate() {
  const sample = [
    {
      "নাম / Name": "চাল (নমুনা)",
      "পরিমাণ / Quantity": 10,
      "ক্রয়মূল্য / Cost Price": 60,
      "বিক্রয়মূল্য / Sale Price": 70,
      "ইউনিট / Unit": "kg",
      "বারকোড / Barcode": "",
    },
    {
      "নাম / Name": "Sample Product",
      "পরিমাণ / Quantity": 5,
      "ক্রয়মূল্য / Cost Price": 100,
      "বিক্রয়মূল্য / Sale Price": 150,
      "ইউনিট / Unit": "pcs",
      "বারকোড / Barcode": "",
    },
  ];
  const ws = XLSX.utils.json_to_sheet(sample);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template");
  XLSX.writeFile(wb, "product-import-template.xlsx");
}

export type ParsedRow = {
  name: string;
  qty: number;
  cost: number;
  price: number;
  unit: string;
  barcode: string;
  errors: string[];
};

function pick(row: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    for (const rk of Object.keys(row)) {
      if (rk.toLowerCase().trim() === k.toLowerCase().trim() || rk.toLowerCase().includes(k.toLowerCase())) {
        const v = row[rk];
        if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
      }
    }
  }
  return "";
}

export function parseImportFile(file: File): Promise<ParsedRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      try {
        const data = reader.result as ArrayBuffer;
        const wb = XLSX.read(data, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        const out: ParsedRow[] = rawRows.map((r) => {
          const name = pick(r, ["নাম", "name", "product"]);
          const qtyStr = pick(r, ["পরিমাণ", "quantity", "qty", "stock"]);
          const costStr = pick(r, ["ক্রয়", "cost", "buying", "purchase price"]);
          const priceStr = pick(r, ["বিক্রয়", "sale", "selling", "sell price"]);
          const unit = pick(r, ["ইউনিট", "unit"]) || "pcs";
          const barcode = pick(r, ["বারকোড", "barcode"]);
          const errors: string[] = [];
          if (!name) errors.push("name required");
          const qty = Number(qtyStr.replace(/[^0-9.\-]/g, "")) || 0;
          const cost = Number(costStr.replace(/[^0-9.\-]/g, "")) || 0;
          const price = Number(priceStr.replace(/[^0-9.\-]/g, "")) || 0;
          if (cost < 0) errors.push("cost negative");
          if (price < 0) errors.push("price negative");
          return { name, qty, cost, price, unit, barcode, errors };
        }).filter((r) => r.name || r.qty || r.cost || r.price);
        resolve(out);
      } catch (e) {
        reject(e as Error);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}