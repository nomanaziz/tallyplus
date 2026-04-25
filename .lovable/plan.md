## Product form-কে full-feature বানানো + Bulk Rate auto-apply

User-এর screenshot অনুযায়ী basic form-কে complete করা হবে — সব advanced options toggle-গত (default OFF), শুধু minimum required field always visible।

### 1. Database migration

`products` table-এ নতুন column যোগ করব:

```sql
alter table public.products
  add column if not exists description text,
  add column if not exists is_marketplace_published boolean not null default false,
  add column if not exists bulk_enabled boolean not null default false,
  add column if not exists bulk_price numeric,
  add column if not exists bulk_min_qty numeric,
  add column if not exists vat_enabled boolean not null default false,
  add column if not exists vat_pct numeric,
  add column if not exists warranty_enabled boolean not null default false,
  add column if not exists warranty_value integer,
  add column if not exists warranty_unit text check (warranty_unit in ('day','week','month','year')) default 'month',
  add column if not exists discount_enabled boolean not null default false,
  add column if not exists discount_value numeric,
  add column if not exists discount_type text check (discount_type in ('percent','flat')) default 'percent';
```

### 2. Product Add/Edit form redesign — `/app/products`

Existing Dialog → **Sheet (right side, scrollable)**:

**Always-visible (minimum required):**
- ছবি upload (existing image_url field, single image for now — multi later)
- পণ্যের নাম *
- বর্তমান মজুদ
- ক্রয় মূল্য, বিক্রয় মূল্য
- ইউনিট (pcs/kg/ltr/dz dropdown + custom)
- ক্যাটাগরি (existing dropdown)

**Toggle sections (default OFF, clean collapsed look):**

1. **অনলাইনে বিক্রি করতে চান?** → toggle on করলে `is_marketplace_published = true` (এই product `marketplace_listings`-এ auto-publish হবে — sync logic পরে; এখন শুধু flag save)
2. **বাল্ক/পাইকারি বিক্রি?** → Bulk Price + Minimum Order Quantity
3. **লো-স্টক অ্যালার্ট** → Stock alert threshold input
4. **VAT applicable?** → VAT % input
5. **ওয়ারেন্টি?** → value + unit (Day/Week/Month/Year dropdown)
6. **ডিসকাউন্ট?** → value + type (% / ৳)
7. **বারকোড?** → barcode input + scan icon

Layout: প্রতিটা toggle section card-এ — toggle off হলে only header, on হলে nested fields। Footer-এ Cancel + Add/Update button।

### 3. Sell page (POSPage) — Bulk Rate auto-apply

`productsLiteQuery`-এ extra fields select করব: `bulk_enabled, bulk_price, bulk_min_qty`।

`CartItem` type-এ যোগ:
```ts
bulk_enabled?: boolean; bulk_price?: number; bulk_min_qty?: number; is_bulk?: boolean;
```

Logic:
- যখন `qty >= bulk_min_qty` এবং `bulk_enabled` → automatically `price = bulk_price`, `is_bulk = true`
- যখন qty নিচে নামবে → revert to `sale_price`, `is_bulk = false`
- Price input-এর Label-এর পাশে **"[Bulk Rate]"** badge দেখাবে যখন `is_bulk` true

User manually price edit করলে সেটা override হিসেবে keep করব (auto-update বন্ধ)। Simple approach: যদি qty crosses threshold এবং user নিজে price edit করেনি, auto-apply।

### 4. Files

**Migration**: products schema extension।

**Modify:**
- `src/routes/app.products.tsx` — form completely rewritten with toggle sections
- `src/lib/queries.ts` — `productsLiteQuery` select-এ bulk fields যোগ
- `src/components/app/POSPage.tsx` — CartItem type + bulk auto-apply logic + "[Bulk Rate]" badge UI

### Notes
- "অনলাইনে বিক্রি" toggle শুধু flag save করবে; actual `marketplace_listings` sync এই scope-এ নেই (পরের ফিচার)।
- VAT/Discount এই form-এ শুধু metadata হিসেবে save হবে — sale calculation-এ পরে integrate হবে।
- Warranty value+unit shop-এর `warranty` page-এ already structure আছে (`warranty_end_date` calculate হবে sale time-এ — পরে)।
- Image multi-upload আপাতত out of scope; existing single image keep করব।
