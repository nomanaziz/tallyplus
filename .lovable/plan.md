
# Sidebar style + POS card polish + English digits

আগের ৩-চারবার বলা according to:
- Menu item/order/section/brand/footer — কোনোটাই change হবে না
- শুধু visual styling ও digit handling change

## ১. Sidebar menu item styling

ফাইল: `src/components/app/AppSidebar.tsx`, `src/pages/customer/CustomerLayout.tsx`, `src/components/admin/AdminSidebar.tsx`

পরিবর্তন:
- প্রতিটা menu item-এর colored primary square (h-7 w-7) সরিয়ে দিব
- নতুন pattern: simple outline lucide icon (h-5 w-5, `text-muted-foreground`) + label
- Active item: `bg-primary/10 text-primary font-semibold rounded-md` (soft tint, reference-এর মত)
- Inactive: `text-foreground/80 hover:bg-accent/60`
- Row height `h-9`, gap-3, px-3
- তিন sidebar-এ same class pattern
- Brand header, section label, footer, collapse button — সব অপরিবর্তিত

## ২. Bangla font load

ফাইল: `index.html` বা `src/styles.css`

- Google Fonts থেকে "Hind Siliguri" import (reference-এর Bangla font)
- `body { font-family: 'Hind Siliguri', system-ui, ... }` set
- Existing English font fallback রাখব

## ৩. English digits সর্বত্র

ফাইল: `src/lib/i18n.ts`

- `bnNum()` function → সবসময় English digit return করবে (Bangla conversion সরাব)
- `fmtMoney()` automatically এতে English digit দেখাবে কারণ এটা `bnNum` ব্যবহার করে
- এক জায়গায় change — POS, Dashboard, cart, invoice, report সব জায়গায় টাকা/সংখ্যা English
- বাংলা text যেমন আছে তেমন থাকবে

## ৪. POS product card styling polish

ফাইল: `src/components/app/POSPage.tsx`

- Product card background: clean white/card, soft shadow
- Image area aspect-square (যেটা আছে)
- নাম center, font-medium
- Price বড় (text-lg), bold, `text-primary` (reference-এর মত colored ৳)
- "স্টক: 851 পিস" — ছোট text-muted-foreground, center
- Selected: `ring-2 ring-primary` + `bg-primary/5`
- Logic, handler, layout grid — অপরিবর্তিত

## ফাইল সারাংশ

| File | কাজ |
|---|---|
| `src/lib/i18n.ts` | `bnNum()` always English |
| `index.html` | Hind Siliguri font link |
| `src/styles.css` | font-family update |
| `src/components/app/AppSidebar.tsx` | item style (square সরিয়ে flat icon + active tint) |
| `src/pages/customer/CustomerLayout.tsx` | same item style |
| `src/components/admin/AdminSidebar.tsx` | same item style |
| `src/components/app/POSPage.tsx` | product card price/stock styling |

## যা পরিবর্তন হবে না

- Menu items, order, section, brand header, sidebar footer, collapse logic
- কোনো business logic, route, permission, handler, hotkey
- POS structure, cart logic, checkout flow
