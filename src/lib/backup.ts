import { z } from "zod";

export const BACKUP_VERSION = 1;

const numLike = z.union([z.number(), z.string().transform((s) => Number(s))]).pipe(z.number().finite());
const optStr = z.string().nullish();

const productSchema = z.object({
  name: z.string().trim().min(1).max(200),
  sku: optStr,
  barcode: optStr,
  unit: optStr,
  cost_price: numLike.default(0),
  sale_price: numLike.default(0),
  wholesale_price: numLike.optional().nullable(),
  stock: numLike.default(0),
  low_stock_alert: numLike.optional().nullable(),
  description: optStr,
  image_url: optStr,
  category_name: optStr,
}).passthrough();

const customerSchema = z.object({
  name: z.string().trim().min(1).max(200),
  phone: optStr,
  address: optStr,
  email: optStr,
}).passthrough();

const supplierSchema = z.object({
  name: z.string().trim().min(1).max(200),
  phone: optStr,
  address: optStr,
  email: optStr,
}).passthrough();

const categorySchema = z.object({
  name: z.string().trim().min(1).max(120),
  parent_name: optStr,
}).passthrough();

const serviceSchema = z.object({
  name: z.string().trim().min(1).max(200),
  price: numLike.default(0),
  description: optStr,
  duration_minutes: numLike.optional().nullable(),
}).passthrough();

export const backupSchema = z.object({
  version: z.number().int().positive(),
  exported_at: z.string(),
  shop: z.object({
    name: z.string(),
    address: z.string().nullish(),
    phone: z.string().nullish(),
    currency: z.string().nullish(),
  }).partial(),
  tables: z.object({
    categories: z.array(categorySchema).default([]),
    products: z.array(productSchema).default([]),
    customers: z.array(customerSchema).default([]),
    suppliers: z.array(supplierSchema).default([]),
    services: z.array(serviceSchema).default([]),
  }),
});

export type Backup = z.infer<typeof backupSchema>;

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export type ValidationReport = {
  ok: boolean;
  errors: string[];
  counts: Record<string, number>;
  parsed?: Backup;
};

export function validateBackup(raw: unknown): ValidationReport {
  const errors: string[] = [];
  const result = backupSchema.safeParse(raw);
  if (!result.success) {
    for (const issue of result.error.issues) {
      errors.push(`${issue.path.join(".") || "(root)"}: ${issue.message}`);
    }
    return { ok: false, errors, counts: {} };
  }
  const t = result.data.tables;
  return {
    ok: true,
    errors,
    counts: {
      categories: t.categories.length,
      products: t.products.length,
      customers: t.customers.length,
      suppliers: t.suppliers.length,
      services: t.services.length,
    },
    parsed: result.data,
  };
}