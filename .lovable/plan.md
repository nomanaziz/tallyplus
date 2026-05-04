## Quick Service Add

বর্তমানে `Quick Add Product` একটা ছোট্ট dialog হিসেবে আছে (POS পেজে `+` button)। সেই pattern-এই একই রকম "দ্রুত সার্ভিস যোগ" বানাবো — minimum field, পরে full form-এ এডিট করা যাবে।

### Fields (minimum, কুইক)

- সার্ভিসের নাম (name) — required
- মূল্য (price) — number, default 0
- সময়কাল / Duration in minutes — optional (পরে এডিট করা যাবে)
- হোম সার্ভিস (home_service toggle) — optional, default off

বাকি সব (description, warranty, marketplace publish, category, areas) full Service form-এ পরে set করা যাবে। Insert-এ defaults:
`unit: "service"`, `is_marketplace_published: false`, `booking_enabled: true`, `service_areas: []`.

### Where the button appears

1. **Services page (`src/pages/app/Services.tsx`)** — header-এ existing "নতুন সার্ভিস" button-এর পাশে একটি ছোট `⚡ দ্রুত যোগ` button। Click → `QuickAddServiceDialog` open হবে।
2. **POS page (`src/components/app/POSPage.tsx`)** — services tab-এ search bar-এর পাশে একটা `+` icon button (বর্তমানে শুধু products tab-এ আছে)। Click করলে service quickly add হবে এবং তা সাথে সাথে service list-এ refresh হয়ে আসবে (react-query invalidate)।

### New component

`src/components/app/QuickAddServiceDialog.tsx`
- Props: `open`, `onClose`, `onAdded?: (service) => void`
- Insert into `services` table with current `shop_id`
- Toast on success, react-query invalidate `["services"]`
- Limit error handle (`parseLimitError`) — Services page-এর existing pattern অনুযায়ী

### Files to edit/create

- **NEW** `src/components/app/QuickAddServiceDialog.tsx` — dialog component
- **EDIT** `src/pages/app/Services.tsx` — header-এ Quick Add button যোগ
- **EDIT** `src/components/app/POSPage.tsx` — services tab-এ `+` icon + dialog wire

### No DB / migration

Existing `services` table-ই যথেষ্ট। কোনো schema change নেই।
