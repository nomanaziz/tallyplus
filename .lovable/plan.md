
# POS Redesign + Unified Sidebar (সব account-এ একই design)

আপনার দেওয়া reference image-এর মত POS এবং একই sidebar style সব জায়গায় (Business / Customer / Personal) — structure এক, শুধু menu item কম-বেশ।

## ১. POS Page Full Redesign (`src/components/app/POSPage.tsx`)

Reference image অনুযায়ী layout:

```text
┌─────────────────────────────────────────────────────────────────────┐
│ [আজকের বিক্রি ৳0] [আইটেম 0] [লেনদেন 0]    User ▾   [হোল্ড অর্ডার (0)]│
├─────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────┬───────────────────────────┐ │
│ │ 🔍 পণ্যের নাম / SKU / বারকোড  ⌄ক্যাটা │ 🛒 কার্ট (3)    প্রিয়ার ▾ │ │
│ │ F1:চেকআউট F2:হোল্ড F3:ড্রয়ার ...    │ ┌──────────────────────┐  │ │
│ │ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐  │ │🖼 Drinko 250ml    🗑 │  │ │
│ │ │ 🖼 │ │ 🖼 │ │ 🖼 │ │ 🖼 │ │ 🖼 │  │ │ SKU: adfasf          │  │ │
│ │ │name│ │name│ │name│ │sel │ │name│  │ │ পিস ⌄                │  │ │
│ │ │৳30 │ │৳1500│ │৳65│ │৳50│ │৳70│  │ │ Unit ৳30  Disc 0 %  │  │ │
│ │ │স্টক │ │স্টক │ │স্টক │ │স্টক│ │স্টক│  │ │ +1 +2 +5  − 1 + Piece│  │ │
│ │ └────┘ └────┘ └────┘ └────┘ └────┘  │ └──────────────────────┘  │ │
│ │  (5 cols xl, 4 lg, 3 md, 2 sm)      │  ... (scroll)             │ │
│ │                                     │ সর্বমোট:        ৳1595     │ │
│ │                                     │ ছাড় (0%):       ৳0        │ │
│ │                                     │ মোট:            ৳1595     │ │
│ │                                     │[হোল্ড F2] [চেকআউট F1]      │ │
│ └─────────────────────────────────────┴───────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

মূল পরিবর্তন:
- Top stat strip — ৩টা soft pill (আজকের বিক্রি / আইটেম বিক্রি / লেনদেন), ডানে user + হোল্ড count chip
- `xl:grid-cols-12` — products 8 cols, cart 4 cols
- Search + barcode + category একই সারিতে rounded inputs
- F-shortcut hint badges এক সারিতে
- Product card: বড় aspect-square image area, নাম center, price বড় primary color, "স্টক: 851 পিস" pill, selected card-এ primary ring + soft bg
- Cart item: 40×40 thumbnail, SKU, unit select, Unit Price + Discount %, quick +1/+2/+5 + qty stepper, delete icon
- Cart footer bold large totals + full-width amber Checkout button

**Logic একদম অপরিবর্তিত** — cart, checkout, hold/resume, barcode, hotkeys, serial pick, invoice dialog সব আগের মতই।

## ২. Unified Sidebar Design — সব account-এ একই look

Reference image-এর sidebar style (purple gradient header brand, pill-style menu items with icon + label, active item full primary background + white text, soft hover, collapse to icon-only) — এটাকে একটা shared component বানিয়ে তিন জায়গায় ব্যবহার করব।

### নতুন shared component: `src/components/shared/UnifiedSidebar.tsx`

Props দিয়ে যে কোনো section list নেবে:
```ts
type NavItem = { to: string; label: string; Icon: LucideIcon; badge?: string };
type NavSection = { label?: string; items: NavItem[] };
type Props = {
  brandName: string;
  brandSubtitle?: string;
  brandIcon: ReactNode;
  sections: NavSection[];
  footer?: ReactNode;  // user chip + logout
};
```

Style (reference image-এর মত):
- Width: `w-64` expanded, `w-16` collapsed (icon-only)
- Brand header: gradient (primary→primary-glow) rounded badge with brand icon + "POS System / Point of Sale" style two-line text
- Section label: small uppercase muted
- Menu item: full-width rounded-lg, `h-10`, icon 5×5 left, label, hover bg-accent
- Active: `bg-primary text-primary-foreground` ring/shadow
- Footer: avatar + name + email + logout button (bottom sticky)
- Collapsible toggle button bottom or in header

### তিন জায়গায় apply

| Layout | বর্তমান | পরিবর্তন |
|---|---|---|
| `src/components/app/AppSidebar.tsx` (Business) | কাস্টম pill design | `UnifiedSidebar` ব্যবহার, একই sections pass করব |
| `src/pages/customer/CustomerLayout.tsx` (Customer) | inline `<aside>` 6-item list | `UnifiedSidebar` দিয়ে replace, mobile bottom nav অপরিবর্তিত |
| `src/components/admin/AdminSidebar.tsx` (Admin/Personal) | কাস্টম | একই `UnifiedSidebar` দিয়ে replace |

তিনটাই same look — শুধু `sections` prop ভিন্ন (menu items কম-বেশ)।

### Sidebar item order (Business) — আগের request অনুযায়ী
Transactions: LPG → **বিক্রয়** → দ্রুত বিক্রি → ক্রয় → ক্যাশবক্স
Books: **বিক্রয় বই** → ক্রয় বই → বাকি → খরচ → মালিকের বই → সম্পদ

## ৩. ফাইল পরিবর্তন সারাংশ

| File | কাজ |
|---|---|
| `src/components/app/POSPage.tsx` | Full reference-image layout redesign |
| `src/components/shared/UnifiedSidebar.tsx` | **নতুন** — shared sidebar component |
| `src/components/app/AppSidebar.tsx` | UnifiedSidebar use করব |
| `src/components/admin/AdminSidebar.tsx` | UnifiedSidebar use করব |
| `src/pages/customer/CustomerLayout.tsx` | desktop aside-এ UnifiedSidebar use করব |

## যা পরিবর্তন হবে না

- কোনো business logic, route, permission, module gating
- Mobile bottom nav (Customer), AppTopbar
- DB migration লাগবে না
- পুরোটাই presentation layer

---

Approve করলে এক flow-এ POS redesign + unified sidebar তিন জায়গায় apply করব।
