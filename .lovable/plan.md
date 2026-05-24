
# POS page (বিক্রয়/ক্রয়) — Reference image অনুযায়ী full redesign

File: `src/components/app/POSPage.tsx` (single file change, supporting i18n string add)

আগের মতই — **menu/route/business logic অপরিবর্তিত**, শুধু POS page-এর visual layout reference image-এর মত করা হবে। একটাই নতুন feature: **per-line discount %** (user explicitly চেয়েছে)।

## ১. Top bar (header strip)

বর্তমান: title + grid/list toggle, তারপর আলাদা ৩-card stat strip।

নতুন (reference-এর মত এক row-এ):
- বাম দিকে: গোল primary badge `POS` icon + "POS System / Point of Sale" lockup
- মাঝে: তিনটে compact rounded stat pill side-by-side
  - **আজকের বিক্রয়** — ৳ আজকের sales total (sell mode) / ক্রয় total (purchase mode)
  - **আইটেম বিক্রি** — আজকের sold items count
  - **লেনদেন** — আজকের transactions count
- ডান দিকে: user name (`Mahfuz Sakib` style) + primary pill button "হোল্ড অর্ডার (০)"

আজকের stat-গুলো cheap query (existing `sales`/`purchases` table) — অথবা placeholder `০` দেখাব আর `TODO` রাখব backend-wired later (user স্পষ্ট করলে)। **Default: today's actual values থেকে aggregate**।

## ২. F-key shortcut row

Search bar-এর নিচে একটা thin row (reference-এ "F1: চেকআউট  F2: হোল্ড  F3: ড্রয়ার  F4: আর্থ  F5: প্রিন্ট"):
- ছোট muted text chip-style, কেবল visual hint। F1/F2 already handled by checkout/hold buttons; F3-F5 placeholder hint দেখাব।

## ৩. Search row redesign

বর্তমান: search + barcode + plus + refresh।

নতুন: 
- বড় search input (icon left, "পণ্যের নাম, SKU বা বারকোড লিখুন (এন্টার চাপুন)..." placeholder) 
- ডান পাশে badge-button "বারকোড / SKU" (scanner trigger)
- তারপর "সব ক্যাটাগরি ▾" dropdown (categories filter — existing `category` field থেকে)
- Plus / refresh button দুটো ছোট icon button পাশে

## ৪. Product card (reference-এর মত)

বর্তমান card মোটামুটি similar, কিন্তু adjust:
- **Image area ছোট** (aspect-square কিন্তু compact, max ~96-110px)
- নিচে **বড় product name** (text-sm font-semibold, 1 line truncate)
- নাম-এর নিচে ছোট muted variant/category label (e.g. "ড্রিংকস")
- তারপর **price বড় ও primary color** এ — `৳30` style (text-xl extrabold text-primary)
- সর্বশেষ ছোট muted "স্টক: 851 পিস"
- Selected/in-cart হলে `ring-2 ring-primary bg-primary/5`
- Image-এর right-top-এ ছোট `+` plus-badge রাখব (existing pattern, keep)

## ৫. Cart panel (sidebar, reference-এর মত) — সবচেয়ে বড় visual change

বর্তমান cart একটা compact table। Reference-এ প্রতিটি cart item আলাদা **rich card** হিসেবে দেখানো হয়েছে:

প্রতি cart line card:
```
[img] Product Name                      [🗑 delete]
      SKU: PER001
      ┌──────────────────────────┐
      │ পিস (Piece) ▾            │   ← unit dropdown
      └──────────────────────────┘
      Unit Price            ডিসকাউন্ট
      [  ৳30   ] টাকা       [  0  ] %
      [+1] [+2] [+5]   [− 1 +]  Piece    মোট
                                          ৳30
```

Components per line:
1. Header row: 32×32 thumbnail + name (font-medium) + delete icon
2. SKU line (muted, small)
3. Unit selector — `<select>` showing `unit` (default product.unit, options: পিস/Piece, প্যাকেট/Packet, বোতল/Bottle, ক্যান/Can, কেজি/Kg, লিটার/Liter — common Bangla retail units). শুধু display label পরিবর্তন; pricing-এ effect নেই unless explicitly mapped। **MVP**: unit একটা informational dropdown — actual price একই থাকবে (user later বললে pack-size pricing wire করব)।
4. Two-column row: Unit Price input (number, taka label) + Discount input (number, % label)
5. Quick-add chips: `+1` `+2` `+5` (qty increment buttons)
6. Qty stepper `− N +` with unit label "Piece"
7. মোট badge (right-aligned): line total after per-line discount = `qty × price × (1 - discount%/100)`

### Per-line discount logic
- `CartItem`-এ `line_discount_pct?: number` field add (default 0)
- Line total = `qty * price * (1 - line_discount_pct/100)`
- Subtotal = sum of line totals
- Cart-level overall discount existing থাকবে (নিচে separately)

## ৬. Cart bottom totals + actions (reference-এর মত)

cart-এর নিচে:
- "সকল আইটেমে ডিসকাউন্ট একসাথে দিতে চান: [প্রয়োগ করুন]" — single button যা একটা ডিসকাউন্ট % সব line-এ apply করবে (small dialog with % input)
- "নিদিষ্ট পরিমাণ ছাড় [ — ] [% / টাকা toggle] [Enter চাপুন]" — overall discount input (existing discount field, with % vs taka toggle)
- Note line: "আপনার নগদ পরিশোধ এর Enter চাপুন" (muted helper text)
- সাবটোটাল: ৳N
- ছাড় (0%): ৳N
- **মোট:** ৳N (large primary)
- দুটো বড় action buttons পাশাপাশি:
  - amber outline: "হোল্ড (F2)"
  - primary blue: "চেকআউট (F1)"
- F1/F2 keyboard shortcut wire করব (existing cashOpen → F1, simple hold = save to localStorage placeholder for F2)

## ৭. যা পরিবর্তন হবে না

- Routes, menu, sidebar, permissions
- Backend tables/columns
- Sales/purchase save logic, invoice generation, serial picking, services tab
- Bulk pricing logic (already exists for "5 packet কিনলে discount" — keep as-is, will trigger automatically when bulk_min_qty met)
- Mobile tab structure

## ৮. Technical notes

- New CartItem field: `line_discount_pct?: number`
- Subtotal computation update to respect per-line discount
- `unit` dropdown options list: hardcoded array `[পিস, প্যাকেট, বোতল, ক্যান, কেজি, লিটার, ডজন, পিচ]` with en labels
- Categories dropdown: derive from `products[].category` distinct values
- F1/F2 hotkeys: `useEffect` keydown listener
- All digits English (already done globally via `bnNum`)
- Color tokens: `text-primary`, `bg-primary/5`, semantic — no hardcoded hex

## File summary

| File | কাজ |
|---|---|
| `src/components/app/POSPage.tsx` | পুরো layout reference-image-এর মত redesign + per-line discount + unit selector + F-shortcut row + category filter + rich cart cards |
| `src/lib/i18n.tsx` | কয়েকটা নতুন translation key (unit names, F-shortcut labels, "আজকের বিক্রয়" ইত্যাদি) |
