## Goal

হোম মেনুর (mobile dashboard quick-tiles: ক্রয়, বিক্রয়, দ্রুত বিক্রি, ক্যাশবক্স ইত্যাদি) এবং desktop sidebar navigation এর প্রতিটি icon-কে একটা ছোট square tile এর ভিতরে বসানো হবে। Tile-এর background = theme primary color, icon-এর color = white (primary-foreground)। Theme switch করলে square ও সব icon সেই অনুযায়ী রং বদলাবে।

## কেন এখন কাজ হচ্ছিল না

`src/styles.css`-এ একটা rule আছে যেটা `<a>` বা `<button>` এর ভিতরের Lucide icon-কে theme tint থেকে বাদ দেয় (color: inherit)। Sidebar ও mobile home menu — দুটোই `<Link>` (a tag), তাই icon গুলো foreground color পেয়ে যাচ্ছিল, primary না।

## Changes

### 1. `src/pages/app/Dashboard.tsx` — Mobile `Section` tile

প্রতিটা grid item এ icon-কে square wrapper এর ভিতরে রাখা হবে:

```tsx
<Link ... className="group flex flex-col items-center gap-1.5 rounded-lg p-2 text-center hover:bg-accent">
  <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
    <it.icon className="h-6 w-6 icon-inherit" />
  </span>
  <span className="text-[11px] font-semibold leading-tight">{lang === "bn" ? it.bn : it.en}</span>
</Link>
```

- `bg-primary` → theme color পাল্টালে square-ও পাল্টাবে।
- `text-primary-foreground` + `icon-inherit` → icon সাদা (dark theme এ সঠিক contrast)।
- `rounded-lg` square shape, soft border via `shadow-sm`।

### 2. `src/components/app/AppSidebar.tsx` — desktop nav

`renderItem`-এর icon ও similar square treatment পাবে যাতে navigation menu-এর icon-ও theme অনুযায়ী রং বদলায়:

```tsx
<Link ... >
  <span className={cn(
    "flex h-7 w-7 flex-none items-center justify-center rounded-md bg-primary text-primary-foreground",
    active && "ring-2 ring-primary/40"
  )}>
    <it.icon className="h-4 w-4 icon-inherit" />
  </span>
  <span className="truncate">{lang === "bn" ? it.bn : it.en}</span>
</Link>
```

Install-app button এর `Download` icon-ও একই square wrapper পাবে যাতে consistent দেখায়।

### 3. কোনো CSS পরিবর্তন দরকার নেই

`.icon-inherit` class টা ইতিমধ্যেই styles.css-এ আছে এবং icon-কে wrapper span এর `text-primary-foreground` color inherit করতে দেয়।

## Result

- Home page-এর সব quick-action tile (ক্রয়, বিক্রয়, দ্রুত বিক্রি, ক্যাশবক্স, ledger ইত্যাদি): প্রতিটার নিচে theme primary color square, ভিতরে সাদা icon।
- Sidebar navigation: প্রতিটা item-এর সাথে ছোট square primary tile + সাদা icon।
- Theme switch (green/blue/red/yellow/soft-dark) → সব square এবং icon contrast সহ instantly update।
