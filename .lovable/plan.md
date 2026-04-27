## তিনটা Request — সারসংক্ষেপ

| # | Request | বর্তমান অবস্থা | কাজ |
|---|---------|---------------|-----|
| 1 | Due reminder (SMS/WhatsApp) | শুধু marketing copy আছে, **actual feature নেই** | **যোগ করব** — WhatsApp deep-link ভিত্তিক, ১০০% ফ্রি, কোনো cost নেই |
| 2 | "অফলাইন কাজ করে" claim | শুধু `CompareTable` row + `PainAndSolutions`-এ আছে | Marketing copy থেকে **সরাব** (এখন offline support নেই, false claim রাখা ঠিক না) |
| 3 | Serialized / IMEI products | সম্পূর্ণ **নেই** | **যোগ করব** — product-এ `is_serialized` flag, IMEI/serial table, sale-এর সময় serial pick/add |

---

## 1. Due Reminder Feature (নতুন)

### কোথায়
`src/pages/app/DueLedger.tsx` (এই page-এই বাকির list দেখায়) এবং `src/pages/app/Contacts.tsx` customer card-এ।

### কীভাবে কাজ করবে
- প্রতি customer row-এ একটা **"রিমাইন্ডার পাঠান"** button যোগ হবে (visible only if `due_balance > 0` এবং customer-এর phone আছে)।
- Click করলে একটা ছোট dialog খুলবে যেখানে pre-filled message দেখাবে (Bangla + amount + shop name) — owner edit করতে পারবেন।
- দুইটা button:
  - **WhatsApp** → `https://wa.me/88<phone>?text=<encoded message>` খুলবে নতুন tab-এ। ফ্রি, কোনো API/cost নেই।
  - **SMS** → `sms:<phone>?body=<encoded message>` খুলবে device-এর native SMS app-এ। ফ্রি।
- Reminder পাঠানোর পর `customer_reminder_log` table-এ একটা entry insert হবে (কোন customer-কে কবে কোন channel-এ পাঠানো হলো — owner দেখতে পারবেন "শেষ রিমাইন্ডার: ৩ দিন আগে")।

### DB migration
```sql
CREATE TABLE public.customer_reminder_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  channel text NOT NULL CHECK (channel IN ('whatsapp','sms')),
  amount numeric NOT NULL DEFAULT 0,
  message text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.customer_reminder_log ENABLE ROW LEVEL SECURITY;
-- shop members read+write own rows (same pattern as other tables)
CREATE POLICY "rem_log read shop" ON public.customer_reminder_log FOR SELECT
  USING (is_shop_member(auth.uid(), shop_id) OR is_admin(auth.uid()));
CREATE POLICY "rem_log write shop" ON public.customer_reminder_log FOR ALL
  USING (is_shop_member(auth.uid(), shop_id))
  WITH CHECK (is_shop_member(auth.uid(), shop_id));
```

> **Note**: কোনো API integration, edge function, Twilio — কিছু লাগবে না। শুধু `wa.me` / `sms:` deep link। এটাই সবচেয়ে practical Bangladesh shopkeeper-দের জন্য — ০ cost, instantly works।

---

## 2. "অফলাইন কাজ করে" claim সরানো

আপনি ঠিকই বলেছেন — এখন offline support নেই, তাই এই claim ভুল। সরিয়ে ফেলব:

- `src/components/site/CompareTable.tsx` — "অফলাইন কাজ করে" / "Works Offline" row-টা মুছে দেব।
- `src/components/site/PainAndSolutions.tsx`-এ যদি কোনো offline-related point থাকে, সরাব। (Quick check করব — সম্ভবত শুধু "auto reminder" item আছে, offline নেই, তাই হয়তো কিছুই করা লাগবে না।)
- Admin panel toggle যোগ করার দরকার নেই — feature নেই বলে claim-ই সরাচ্ছি। ভবিষ্যতে PWA/IndexedDB দিয়ে যোগ করা যাবে।

---

## 3. Serialized / IMEI Products

### Product-এ flag
নতুন column: `products.is_serialized boolean DEFAULT false` — সব existing product non-serialized থাকবে (default false), তাই কোনো breaking change নেই।

Product create/edit dialog-এ একটা switch: **"সিরিয়ালাইজড পণ্য (IMEI/Serial)"**। শুধু shop-এর `shop_type_code` যদি `mobile` বা `electronics` হয় তখন switch দেখাবে — অন্য shop-এ hidden। (বাকি shop type-এর owner চাইলে settings থেকে on করতে পারেন; আপাতত শুধু mobile/electronics-এ দেখাব।)

### Serial table
```sql
CREATE TYPE public.serial_status AS ENUM ('in_stock','sold','returned','damaged');
CREATE TABLE public.product_serials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  serial_no text NOT NULL,           -- IMEI বা serial
  imei2 text,                         -- dual-SIM দ্বিতীয় IMEI (optional)
  status public.serial_status NOT NULL DEFAULT 'in_stock',
  cost_price numeric DEFAULT 0,
  warranty_until date,
  sale_id uuid,                       -- বিক্রি হলে এই sale-এ
  sale_item_id uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, serial_no)
);
ALTER TABLE public.product_serials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ps read shop" ON public.product_serials FOR SELECT
  USING (is_shop_member(auth.uid(), shop_id) OR is_admin(auth.uid()));
CREATE POLICY "ps write shop" ON public.product_serials FOR ALL
  USING (is_shop_member(auth.uid(), shop_id))
  WITH CHECK (is_shop_member(auth.uid(), shop_id));
CREATE INDEX ON public.product_serials (product_id);
CREATE INDEX ON public.product_serials (shop_id, status);
```

`sale_items`-এ `serial_id uuid` column যোগ করব — কোন sale-এ কোন serial গেছে track করার জন্য।

### UI flow

**Product page**
- Product-এ `is_serialized = true` থাকলে product detail/list-এ একটা **"সিরিয়াল ম্যানেজ করুন"** button দেখাবে।
- ক্লিক করলে dialog-এ:
  - বিদ্যমান serial-গুলো list (status badge সহ — In stock / Sold / Returned)
  - **"+ সিরিয়াল যোগ করুন"** — এক বা একাধিক IMEI/serial একসাথে paste করে save (newline-separated)। প্রতিটার জন্য optional cost_price ও warranty_until।
  - Inline edit/delete।

**Sale flow**
- POS / Sale-এ যখন serialized product cart-এ add করা হয়, qty fixed হবে (১ পিস = ১ serial)। 
- একটা ছোট popup খুলবে: **"কোন সিরিয়াল?"** — In-stock serials থেকে select করতে হবে। যদি owner আগে add না করে থাকেন, ওই popup-এই **নতুন serial type করে save** করতে পারবেন (instant)।
- Sale finalize হলে selected serial-এর `status` → `sold`, `sale_id` ও `sale_item_id` set হবে।
- Return হলে → `returned`।

**Sale invoice / receipt**
- Receipt-এ serialized item-এর পাশে IMEI/serial print হবে (warranty card-এর মতো)।

### Shop type mapping
`shop_type_code` field ইতিমধ্যে `shops` table-এ আছে। আমরা UI-তে check করব:
- `mobile` বা `electronics` → serialized switch enabled by default visible
- অন্য types → switch hidden (চাইলে advanced settings থেকে on করা যাবে — pure UI gate, DB-তে কোনো restriction নেই)

---

## কোনটা out of scope (এই turn-এ না)

- Twilio/Bulk SMS gateway integration (paid) — শুধু free deep-link reminder।
- Actual offline/PWA support — শুধু false claim সরাচ্ছি।
- Inventory cost calculation per-serial (যেমন FIFO/LIFO) — সব serial-এ flat cost_price থাকবে, advanced costing পরে।
- Serial-based warranty claim portal — শুধু serial save ও sale-এ link, আলাদা claim flow না।

---

## ক্রমান্বয়ে কাজ

1. Migration: `customer_reminder_log` + `product_serials` + `serial_status` enum + `products.is_serialized` + `sale_items.serial_id` (একসাথে এক migration)।
2. DueLedger ও Contacts-এ Reminder dialog component।
3. `CompareTable` থেকে offline row সরানো।
4. Product create/edit-এ `is_serialized` switch (mobile/electronics shop-এ visible)।
5. Serial management dialog (list + bulk add + edit)।
6. POS/Sale-এ serial-pick popup এবং sale insert flow update।
7. Receipt print-এ serial line যোগ।
