# Quick Sell (দ্রুত বিক্রি) — Design Polish

স্ক্রিনশট থেকে যা যা inconsistent দেখা গেছে: input box গুলোয় অসম padding, label আর value এর মাঝে hierarchy দুর্বল, External badge + unit input এর mismatched height, summary section overlapping, এবং card গুলোর মাঝে অসম spacing rhythm।

এই plan-এ পুরো page-এর design system tighten করা হবে — কোনো logic বা feature change হবে না, শুধু visual consistency।

## যা ঠিক হবে

### 1. Page Header
- Breadcrumb আর title-এর spacing rebalance
- "স্টকের বাইরের পণ্য" toggle pill কে আরো compact, primary color accent সহ
- Mobile-এ header overflow ফিক্স (toggle টা দরকার পড়লে নিচে নামবে)

### 2. Search Card
- Border radius, padding, shadow সব card-এ একই rhythm-এ আনা (`rounded-2xl`, `p-4`, single shadow token)
- Input height consistent (`h-11`) এবং focus ring design token দিয়ে
- Helper text muted, smaller, একই lh

### 3. Item Row Card (main fix — স্ক্রিনশটের লাল দাগের জায়গা)
- প্রতিটা item আলাদা subtle card (divider না, gap)
- Top row: serial number badge + product name (bold, larger) + delete icon — একই baseline-এ
- Meta row: "দোকানের পণ্য" / "External" tag + unit — একই height (h-6), একই font size, pill style
- **ক্রয় / বিক্রয় / পরিমাণ box redesign**:
  - Equal width grid, equal height (h-14)
  - Label উপরে centered, ছোট uppercase muted
  - Value নিচে large, bold, centered (right-align না — center দেখতে balanced)
  - Active focus হলে border primary color
  - Border, bg, radius একই token
- Line summary (লাভ + মোট): দুই side justified, single line, consistent font size

### 4. Totals Section
- Card-এর নিচে আলাদা panel, padding consistent
- তিন line — মোট ক্রয় (muted), মোট লাভ (success/destructive), মোট বিক্রয় (largest, primary)
- Right column right-aligned, label-value tabular alignment
- Top divider subtle

### 5. Customer Info (collapsible)
- Toggle button-কে proper outline button style
- Open হলে card একই rhythm-এ (rounded-2xl, p-4)
- Field labels consistent size, gap rhythm tighter

### 6. Sticky Action Bar
- Mobile-এ full width, two equal buttons, h-12
- Background blur + subtle top border
- Print outline, Convert primary — সাইজ matched

### 7. Empty State
- Cart icon centered, friendlier copy, একটু padding বাড়ানো

## Technical Details (developer-facing)

- File: `src/pages/app/QuickOrder.tsx` only (PrintDialog-এ touch নেই)
- শুধু JSX/className changes — state, handler, supabase call untouched
- `FieldBox` component refactor: vertical layout, centered, h-14, focus-within ring
- সব color semantic token (`bg-card`, `border`, `text-muted-foreground`, `text-success`, `text-destructive`, `text-primary`) — কোনো hardcoded color না
- Spacing scale: container `space-y-4`, cards `p-4`, internal grids `gap-2` / `gap-3`
- Font hierarchy: headings `text-xl font-extrabold`, item name `text-base font-semibold`, totals value `text-lg/xl font-extrabold`, labels `text-[10px] uppercase tracking-wide`

## যা বদলাবে না

- Search/add product behavior
- Convert to sale logic
- Print dialog
- Customer info save flow
- Permission gate
