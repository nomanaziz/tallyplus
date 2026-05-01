## Overview

চারটি কাজ একসাথে করব:

1. **2-Device Login Limit** — শপ owner/employee সর্বোচ্চ 2 ডিভাইসে একসাথে লগইন
2. **Marketplace Subcategory** — admin থেকে subcategory add/manage (marketplace catalog)
3. **Online Product → Marketplace Bug Fix** — product online করলে marketplace-এ দেখা যাচ্ছে না, ঠিক করা
4. **Multi-Shop Delivery Charge** — একই দোকান হলে এক charge, ভিন্ন দোকান হলে আলাদা charge

---

## 1) Two-Device Login Limit

### Database (new table)
```sql
CREATE TABLE public.user_active_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  device_id text NOT NULL,        -- localStorage UUID per device
  user_agent text,
  last_seen_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, device_id)
);
-- RLS: user can only see/delete their own sessions
```

### Logic
- প্রতি browser-এ `localStorage.tp_device_id` (UUID) generate করব
- Login সফল হলে `register-device` server function কল করে row insert/upsert
- যদি user-এর active sessions > 2 হয়, সবচেয়ে পুরোনোটা delete করব এবং সেই device-এ heartbeat fail হলে force sign-out
- Auth context-এ একটি heartbeat (প্রতি 60s) চলবে, যা session validate করে; না পেলে `supabase.auth.signOut()`
- Settings page-এ "Active devices" list + "Log out other devices" button

### Files
- New migration: `user_active_sessions` table + RLS
- New: `supabase/functions/register-device/index.ts`, `supabase/functions/heartbeat-device/index.ts`
- Edited: `src/lib/auth.tsx` (device id, heartbeat, registration on sign-in)
- New: `src/components/app/ActiveDevicesDialog.tsx` (Settings থেকে দেখা যাবে)

---

## 2) Admin-Managed Marketplace Subcategories

বর্তমানে `marketplace_products.category` শুধু free text। Admin থেকে structured category + subcategory লাগবে।

### Database
```sql
CREATE TABLE public.marketplace_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES public.marketplace_categories(id) ON DELETE CASCADE,
  name_bn text NOT NULL,
  name_en text NOT NULL,
  slug text UNIQUE NOT NULL,
  sort_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.marketplace_products
  ADD COLUMN category_id uuid REFERENCES public.marketplace_categories(id),
  ADD COLUMN subcategory_id uuid REFERENCES public.marketplace_categories(id);
-- RLS: public SELECT, admin-only INSERT/UPDATE/DELETE (uses has_role)
```

### UI
- New admin page: `src/pages/admin/MarketplaceCategories.tsx` — tree view, add/edit/delete category এবং তার under subcategory
- Edited: `src/pages/admin/Marketplace.tsx` — product create/edit-এ Category + Subcategory dropdown
- Edited: `src/pages/shop/Index.tsx` (marketplace) — left filter-এ Category → Subcategory dropdown
- Edited: `supabase/functions/marketplace-public/index.ts` — `category_id`/`subcategory_id` filter support
- Sidebar: `src/components/admin/AdminSidebar.tsx` + `src/lib/app-routes.tsx` register

---

## 3) Fix: Online Product Not Showing in Marketplace

### Cause
`marketplace-public` listing query শুধু সেই shop-এর listing দেখায় যেখানে `shops.marketplace_enabled = true`। কিন্তু প্রথমবার product online করলে shop flag টা auto enable হয় না, তাই listing থাকা সত্ত্বেও দেখায় না।

### Fix
- `src/pages/app/online-shop/Products.tsx` `togglePublish`-এ first publish হলে `shops.marketplace_enabled = true` set করব (যদি owner-permission থাকে)
- Same fix `src/pages/app/Products.tsx` save flow-এ যেখানে `is_marketplace_published` toggle হয় — listing upsert করতে হবে (এখন সেখানে শুধু products row update হয়, listing create হয় না)
- নতুন helper: `src/lib/marketplace-publish.ts` — `publishProductToMarketplace(product)` function যা একসাথে: (1) shop.marketplace_enabled = true, (2) marketplace_listings upsert করে
- Products page এবং Online Shop > Products — দুই জায়গাতেই এই helper কল করব, যাতে দুই route থেকে publish করলে একই behavior হয়

---

## 4) Multi-Shop Delivery Charge in Checkout

বর্তমানে cart একাধিক shop-এর product রাখতে পারে (`consumer-cart.ts` এ shop_id আছে), কিন্তু checkout flow নেই / single delivery charge ধরা হয়।

### UI Changes
- New: `src/pages/shop/Checkout.tsx` (route `/shop/checkout`)
- Cart icon header-এ আনব (`src/components/site/SiteHeader.tsx`-এ cart count badge + drawer)
- Checkout page logic:
  - Cart items shop-wise group করব
  - প্রতিটা shop-এর জন্য সেই shop-এর delivery zone select করার dropdown (zones come from `shop_delivery_zones`)
  - প্রতি shop-এর subtotal + সেই zone-এর `charge` (free_shipping_min মেনে) আলাদা দেখাব
  - Grand total = Σ (shop subtotal + shop delivery)
  - Place order এ প্রতি shop-এর জন্য আলাদা `marketplace_orders` row তৈরি হবে (shop_id different বলে already separate)

### Database
```sql
ALTER TABLE public.marketplace_orders
  ADD COLUMN delivery_zone_id uuid REFERENCES public.shop_delivery_zones(id),
  ADD COLUMN delivery_charge numeric DEFAULT 0,
  ADD COLUMN subtotal numeric DEFAULT 0;
```

### Files
- New: `src/pages/shop/Checkout.tsx`, route in `src/lib/app-routes.tsx`
- Edited: `src/components/site/SiteHeader.tsx` (cart icon)
- New: `src/components/marketplace/CartDrawer.tsx`
- Edited: `src/lib/consumer-cart.ts` (helper: `groupByShop()`)
- New edge function: `supabase/functions/place-marketplace-order/index.ts` — atomic per-shop order creation with delivery breakdown

---

## Order of Implementation

1. Marketplace publish bug fix (smallest, immediate value)
2. Marketplace subcategories (admin + filter)
3. Multi-shop checkout with per-shop delivery
4. 2-device login limit (largest, touches auth)

প্রতিটা step-এ migration + UI আলাদা করে test করব।

---

## Approval

Approve করলে এই 4-টি feature implement করব। কোনো অংশ skip বা পরে করতে চাইলে জানালে adjust করব।
