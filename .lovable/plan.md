# Service Sell Logic — Full Implementation Plan

দোকানদার এখন শুধু পণ্য না, **service**ও বিক্রি করতে পারবে। Service-এর নিজস্ব price, duration (কতক্ষণ লাগবে), warranty (free re-service period), category থাকবে। Marketplace-এ আলাদা **Services** section থাকবে যেখান থেকে customer service order করতে পারবে।

---

## 1. Database (new migration)

### `services` table (পণ্যের সমান্তরাল)
```
id, shop_id, category_id (nullable), name, description,
price (numeric), 
duration_minutes (int, nullable) — আনুমানিক সময়
duration_label (text, nullable) — যেমন "১ ঘণ্টা", "২-৩ দিন"
unit (text, default 'service') — per visit / per hour / per job
warranty_enabled (bool), warranty_value (int), warranty_unit ('days'|'months')
image_url, is_active, is_marketplace_published, is_featured,
home_service (bool) — বাসায় গিয়ে দেওয়া যায় কিনা
service_charge_extra (numeric, nullable) — visit charge
created_at, updated_at, deleted_at
```

### `service_categories` table
shop-scoped, parent_id সহ (যেমন: Salon → Haircut, Facial)। Default seed: কয়েকটা common service category।

### `marketplace_service_listings` table
`marketplace_listings`-এর মতো কিন্তু service-এর জন্য — id, shop_id, service_id, price, is_published, warranty override, created_at।

### `sale_items` extend
- নতুন column: `item_type text default 'product'` ('product' | 'service')
- নতুন column: `service_id uuid nullable`
- product_id আগে থেকেই nullable — service sale-এ product_id null, service_id set হবে।
- Stock decrement service-এর ক্ষেত্রে skip হবে।

### `marketplace_orders` extend
- column: `order_type text default 'product'` ('product' | 'service' | 'mixed')
- `scheduled_at` (timestamptz nullable) — service booking time
- `service_address` (text nullable)

### `marketplace_order_items` extend
- `item_type text default 'product'`
- `service_id uuid nullable`
- `service_listing_id uuid nullable`
- `scheduled_at` (per-item slot, nullable)

### `service_warranties` table (auto from sales)
service sell হলে warranty_enabled হলে auto row — service_id, sale_item_id, customer_id, starts_at, expires_at, status।

### RLS
সব নতুন tables — owner/member based RLS reusing `is_shop_member()`। Marketplace_service_listings public read।

---

## 2. App-side (Owner/Shop) UI

### New page: `/app/services` — `src/pages/app/Services.tsx`
- Products page-এর pattern follow করবে: list/grid, search, category filter, add/edit dialog, recycle/delete, marketplace publish toggle।
- Service create form fields: name, category, price, duration (minutes input + free-text label), unit (dropdown: per service / per hour / per visit), warranty toggle (value + unit), description, image, home service toggle, service charge extra, marketplace publish।

### New page: `/app/service-categories` (or merged tab in Categories)
Service category CRUD।

### POS (`POSPage.tsx`) — Service tab
- Top-এ tab/toggle: **পণ্য | সার্ভিস**
- Service tab-এ services grid (search, category filter)। Click করলে cart-এ service add — qty default 1, editable।
- Cart row service হলে: stock badge hide, duration badge show, warranty badge show।
- Sell complete হলে → sale_items.item_type='service', stock decrement skip, warranty থাকলে service_warranties insert।
- Print/Invoice-এ service line item আলাদা label।

### Sidebar / Dashboard
- Sidebar-এ নতুন entry: "সার্ভিস" (services icon) `/app/services`।
- Dashboard KPI: "Services Sold (today/month)", "Active service warranties"।
- Reports-এ নতুন: **Service Report** — best-selling services, revenue by service category।

### Online Shop section
- `/app/online-shop/services` — published service listings manage (similar to Products)।
- Service listing form: price override, warranty override, publish।

---

## 3. Customer-facing Marketplace

### Listing
- Marketplace homepage-এ নতুন tab/section: **পণ্য | সার্ভিস | সব**।
- Filter `?type=service|product|all`।
- `marketplace-public` edge function-এ নতুন actions:
  - `list-services` — paginated service listings
  - `service` — single service detail
  - `shop-services` — shop-এর services
  - `place-service-order` — service booking with scheduled_at, address

### Service detail page: `/shop/svc/:id`
- Image, name, price, duration, warranty info, shop info, "Book Now" CTA।
- Book Now → checkout flow with: customer info, preferred date/time picker, address (if home service), note।

### Shop public page
Shop page-এ আলাদা tab: "Products" / "Services"।

### Customer Dashboard
- "My Service Orders" tile — shows booked services with status & scheduled time।
- "My Service Warranties" — active warranties দেখা যাবে, expire হলে badge।

### Personal account (ব্যক্তিগত হিসাব রাখে)
Marketplace থেকে পণ্যের পাশাপাশি service order করতে পারবে (already covered above)।

---

## 4. Shop Type Awareness

`shops.shop_type_code` use করে hint:
- service-only shop type (e.g. salon, repair, tutor) → Sidebar default সার্ভিস tab খোলা থাকবে, Products optional।
- কেউ চাইলে দুটোই use করতে পারবে — কোন hard restriction নাই।
- Onboarding-এ shop type service হলে default service categories seed হবে (Haircut, Repair, Consultation ইত্যাদি)।

---

## 5. Warranty Flow

- Service sell time-এ warranty_enabled হলে: `service_warranties` row created with expires_at = sale_date + value*unit।
- `/app/warranty` page-এ existing product warranty-র পাশে service warranties tab।
- Customer service warranty period-এ ফেরত আসলে free re-service log (new sale with price=0, linked to original)।
- Expiring services notification (7 days before) — existing notification system reuse।

---

## 6. Reports & Analytics

- Service revenue daily/monthly chart (Owner Dashboard)।
- Top services, top service categories।
- Service vs Product revenue split।
- Service warranty obligations report।

---

## 7. Files to Create / Edit

**New:**
- Migration SQL (services, service_categories, marketplace_service_listings, service_warranties + alters)
- `src/pages/app/Services.tsx`
- `src/pages/app/ServiceReport.tsx`
- `src/pages/app/online-shop/Services.tsx`
- `src/pages/shop/svc/Id.tsx`
- `src/components/app/ServiceFormDialog.tsx`
- `src/components/app/ServicePicker.tsx` (POS)
- `src/lib/services-queries.ts`

**Edit:**
- `src/components/app/POSPage.tsx` — product/service tab toggle, cart logic
- `src/components/app/AppSidebar.tsx` — Services entry
- `src/pages/app/Dashboard.tsx` — service KPIs
- `src/pages/app/Warranty.tsx` — service warranty tab
- `src/pages/app/Reports.tsx` — service report link
- `src/pages/shop/Index.tsx` — services section/tab
- `src/pages/shop/s/Slug.tsx` — services tab in shop page
- `src/pages/customer/Dashboard.tsx` — service order tile
- `src/pages/customer/MyOrders.tsx` — service orders shown
- `supabase/functions/marketplace-public/index.ts` — new service actions
- `src/lib/app-routes.tsx` — register new routes
- `src/lib/icons.ts` — service icon mapping (uses existing customer-training/training icons or add new)

---

## 8. Phased Rollout (single PR though, as requested "একবারে")

All phases shipped together:
1. Migrations + RLS
2. Owner Services CRUD + categories
3. POS service support + warranty creation
4. Marketplace listings + edge function actions
5. Customer browse + book service
6. Reports + warranty page integration
7. Sidebar/Dashboard wiring

---

**Approve করলে আমি পুরো logic একবারে build করে দিব।** Service-specific কোন icon (যেমন service.png, booking.png, schedule.png) যদি দিতে চাও আগে দাও — না হলে existing `customer-training` / `training` / `wishlist` icons fallback হিসেবে use করব।