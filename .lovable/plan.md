# Switch Shop Owner Icon Pack to Lucide

`lucide-react` is already installed and used in the project. We'll convert the central `src/lib/icons.ts` registry from URL-based image imports to Lucide React components, so every consumer (`<img src={icons.X} />`) becomes `<Icon />` JSX. Free, open-source, no licensing issues, fully tree-shakable, scales/colors with currentColor.

## Approach

### 1. Rewrite `src/lib/icons.ts`
Replace all 67 image imports with a Lucide component map. Each key maps to a sensible Lucide equivalent:

```ts
import {
  Home, ShoppingCart, ShoppingBag, Zap, Wallet, Package, Boxes,
  Users, ListOrdered, ClipboardList, HandCoins, Receipt, AlertCircle,
  ShieldCheck, Trash2, KeyRound, Printer, BarChart3, Megaphone,
  Store, GraduationCap, BadgeDollarSign, Bookmark, Clock, User,
  UserCog, Banknote, ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight,
  Heart, Bell, Languages, Settings, Search, Plus, UserPlus, ImagePlus,
  Pencil, Eye, EyeOff, Download, FileText, RefreshCw, Image as ImageIcon,
  Network, LayoutDashboard, ShieldAlert, ArrowDownCircle, ArrowUpCircle,
  Truck, MapPin, FileSpreadsheet, TrendingUp, PieChart, ArrowLeft,
  StickyNote, Star, BookOpen,
  // ...etc
} from "lucide-react";

export const icons = {
  home: Home, sell: ShoppingCart, purchase: ShoppingBag,
  quickSell: Zap, cashbox: Wallet, productList: Package,
  stock: Boxes, contact: Users, salesList: ListOrdered,
  // ...all 67 keys mapped
} as const;

export type IconKey = keyof typeof icons;
```

### 2. Update all consumers (`<img src={icons.X} />` → `<Icon />`)
Pattern across ~40+ files:

Before:
```tsx
<img src={icons.settings} alt="" className="h-4 w-4" />
```

After:
```tsx
const Icon = icons.settings;
<Icon className="h-4 w-4" />
```

Or via a tiny helper component `<AppIcon name="settings" className="h-4 w-4" />` defined in `src/lib/icons.ts` for cleaner usage:
```tsx
export function AppIcon({ name, className }: { name: IconKey; className?: string }) {
  const I = icons[name];
  return <I className={className} />;
}
```
Then a codemod via `rg`/`sed`-style replacement updates `<img src={icons.X} ...` → `<AppIcon name="X" ...`.

### 3. Delete now-unused asset files
Remove all `src/assets/icons/*.png` and `*.svg` files (they're no longer referenced).

### 4. Brand icons exception
`brand-hishabee.svg` and `brand-bee.svg` are project logos, not generic icons. Keep these as image imports, separate from the Lucide registry (e.g., `src/lib/brand.ts`).

## Files affected
- **Rewritten:** `src/lib/icons.ts` (complete rewrite, ~70 line file)
- **New:** `src/lib/brand.ts` (keeps the 2 brand SVG imports)
- **Edited:** every file using `icons.X` in JSX (`AppTopbar.tsx`, `DataToolbar.tsx`, `Dashboard.tsx`, `Sell.tsx`, `Purchase.tsx`, `Contacts.tsx`, customer pages, etc. — ~40 files). Mechanical `<img src={icons.X}` → `<AppIcon name="X"` swap.
- **Deleted:** ~65 files in `src/assets/icons/` (all except the 2 brand SVGs).

## Benefits
- ~500KB+ asset weight removed from the bundle
- Icons inherit `currentColor` → automatic theme/dark-mode support
- Crisp at any size (true SVG, not bitmap PNGs)
- No licensing concerns, no manual icon-pack uploads needed
- Easy to swap any individual icon later (one line in `icons.ts`)

## Note
This will visually change every icon in the app from colorful illustrated style → clean monochrome line icons (Lucide style). If you want to keep the colorful illustrated look, say so and I'll instead suggest a free illustrated set (e.g., Iconoir, Tabler, or Streamline free tier) before implementing.
