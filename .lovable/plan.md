# Manual Payment Methods — Fully Configurable

## Goal

Hardcoded ৪টা method (bkash/nagad/rocket/bank) সরিয়ে — admin যেকোনো সংখ্যক payment method add/edit/activate/deactivate করতে পারবে, প্রত্যেকটার নিজস্ব color, instruction, account info থাকবে। গ্রাহকের জন্য mobile-friendly card layout, এক tap copy।

---

## ১. Database — নতুন table

`payment_methods` table তৈরি করব (admin-managed, সবাই পড়তে পারবে):

| column | type | উদাহরণ |
|---|---|---|
| `id` | uuid PK | |
| `name` | text | "bKash Personal", "City Bank", "Nagad Merchant" |
| `type` | text | `mobile` / `bank` / `card` / `other` (icon select-এর জন্য) |
| `account_number` | text | "01712345678" / "1234-5678-9012" |
| `account_holder` | text | optional — "Md. Karim" |
| `extra_info` | text | optional — Bank: branch / Routing |
| `instructions_bn` | text | "Send Money option-এ পাঠান, cash-out নয়" |
| `instructions_en` | text | |
| `color` | text | hex code, default `#E2136B` (bKash pink) etc. |
| `icon_emoji` | text | optional — 📱 🏦 💳 |
| `is_active` | boolean | default true |
| `sort_order` | int | drag বা manual |
| `created_at`, `updated_at` | timestamp | |

**RLS:** admin write, public read (active গুলো সবাই দেখবে)।

পুরনো `payment_gateway_settings.extra.manual` data রেখে দেব backward compatibility-র জন্য — কিন্তু নতুন system primary হবে।

---

## ২. Admin UI (`/admin/payment-gateway`)

পুরনো hardcoded "Manual Payment Numbers" section সরিয়ে নতুন **"Manual Payment Methods"** section:

- 📋 List view — সব method card layout-এ
- ➕ "Add new method" button → dialog form
- প্রতিটা method-এ:
  - Name input
  - Type dropdown (Mobile / Bank / Card / Other)
  - Account number + holder name
  - Color picker (preset + custom hex)
  - Bangla + English instruction textarea
  - Active toggle
  - Edit / Delete / Reorder buttons
- Live preview — কাস্টমার যা দেখবে

---

## ৩. Customer UI (`/app/subscribe`)

`gatewayEnabled === false` হলে নতুন **"Manual Payment Methods"** section:

- Active methods গুলো **mobile-friendly card grid** (২ column mobile, ৩-৪ column desktop)
- প্রতিটা card-এ:
  - Color-coded header (admin-set color)
  - Method name + icon
  - Account number বড় font + **one-tap Copy button**
  - Account holder name (যদি থাকে)
  - "Show instructions" expand → BN/EN instruction
- কোনো method active না থাকলে fallback message
- Bottom-এ Transaction ID + note + submit (আগের মতো)

---

## ৪. Backward compatibility

- Migration-এর সময় পুরনো `payment_gateway_settings.extra.manual` থেকে existing bkash/nagad/rocket/bank info পড়ে নতুন `payment_methods` table-এ seed করব (যদি data থাকে)।
- পুরনো extra field রেখে দেব — অন্য কোথাও break না হয়।

---

## Questions for you

কাজ শুরু করার আগে দুটো ছোট confirm:

১. **Color** — admin কি একটা color picker দিয়ে যেকোনো hex (e.g. #E2136B) দিতে পারবে, নাকি ৬-৮টা preset (pink/orange/purple/green/blue/red) থেকে বেছে নেবে?
২. **Old data migration** — বর্তমানে যদি bkash/nagad number set করা থাকে (পুরনো system-এ), সেগুলো কি auto migrate করব নতুন table-এ?
