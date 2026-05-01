## Goal

Mobile-এ Products page আরও compact এবং tap-friendly করা — product নামের জন্য বেশি জায়গা, header ছোট, footer single-line।

## Changes

### 1. Mobile-এ row tap → product details খোলে, View button সরানো

`src/pages/app/Products.tsx` — table row (line ~614):

- `<TableRow>` এ `onClick` যোগ করা যা `setDetails(p)` call করবে। Edit/select/serial-edit modes এর সময় skip করবে যাতে checkbox/qty input এর সাথে conflict না হয়।
- Eye/View button টা mobile-এ hidden (`hidden sm:inline-flex`) — desktop-এ আগের মতই থাকবে।
- Stock edit mode এর qty cell এ `e.stopPropagation()` যোগ করা (Input/+/− buttons), এবং checkbox cell-এও — যাতে inadvertently details না খোলে।
- Row এ `cursor-pointer` ক্লাস (mobile-only via `sm:cursor-default` if desired, কিন্তু সরাসরি `cursor-pointer` দিলেই ঠিক আছে)।

### 2. Product নামের column বড় করা

- Product name `<TableCell>`-এ `min-w-0` যোগ এবং name span-এ `break-words`/`whitespace-normal text-sm sm:text-base` যাতে full নাম দেখা যায়।
- Mobile-এ "Cost" আগে থেকেই hidden, "Stock value" md:থেকে — ঠিক আছে। অতিরিক্ত জায়গা পেতে action column-এ একটাই button (3-dot menu) থাকবে mobile-এ — যেহেতু Eye সরানো হলো।
- Stock/Sale price column header-এ `whitespace-nowrap` + `w-px` দিয়ে minimal width নেবে যাতে name column বেশি grow করে।

### 3. Header compact + Sort/Filter "Action" এর under-এ

Mobile-এ header আরও কমপ্যাক্ট:

- "প্রোডাক্ট ও স্টক ব্যবস্থাপনা" subtitle সরানো (already `hidden sm:block`, ঠিকই আছে)।
- Title h1: `text-base sm:text-xl` → `text-sm sm:text-lg` mobile-এ।
- Header gap: `gap-3` → `gap-2`।
- Mobile-এ Sort/Filter (`DataToolbar` এর `middleExtra`) দুটো dropdown বড় জায়গা নিচ্ছে — mobile-এ এদের একটা compact "Sort & Filter" dropdown/popover-এ ঢোকানো:
    - নতুন একটা Popover button (Mobile only, `sm:hidden`) যা "ফিল্টার" icon দিয়ে show হবে; click করলে দুটো Select থাকবে inside।
    - Desktop-এ আগের মতোই inline দুটো Select থাকবে।
- "Refresh" button mobile-এ already top-এ আছে → সেটা ঠিক থাকবে।

### 4. Pagination footer single-line + sticky

`src/components/app/DataPagination.tsx` redesign:

- Single line layout: `flex flex-nowrap items-center justify-between gap-2 px-2 py-2 text-xs`।
- Mobile-এ left side text shorten: "১–২৫ / ৩০" + tiny "প্রতি পেজ ১০" select পাশে।
- Page number buttons mobile-এ কম দেখাবে: only current + first/last + prev/next chevrons (no middle numbers) when `pageCount > 5` on small screen.
- Implementation: mobile (`sm:hidden`) পাশে শুধু `‹ page/total ›` + first/last chevrons এবং per-page select; desktop-এ পুরো compact list।
- Sticky footer: pagination div-কে `sticky bottom-0 bg-card z-10 border-t` দেওয়া যাতে scroll হলেও পাওয়া যায় (parent card already has `rounded-xl border bg-card`; sticky inside scroll container works only if the page itself scrolls — which it does)।
- Information condense: "Showing 1–25 of 30 · Per page 10 · ‹ 1 2 3 ›" — সব এক horizontal row-এ। `flex-wrap` সরিয়ে `flex-nowrap` + `min-w-0` + `truncate` left text-এ।

### 5. Footer summary আরও compact

- Per-page select width `w-[72px]` → `w-[60px]`, height `h-8` → `h-7`।
- Page buttons `h-8 min-w-8` → `h-7 min-w-7 text-xs`।
- Mobile-এ "প্রতি পেজ" label hide (`hidden sm:inline`); শুধু dropdown দেখা যাবে।

## Out of scope

- Sort/Filter logic পরিবর্তন।
- Desktop layout (≥sm) — শুধু minor tweaks; existing behavior intact।
- ProductDetailsDialog এর content।

## Technical notes

- Row click handler এ guard:
  ```tsx
  onClick={(e) => {
    if (selectMode || editStockMode) return;
    if ((e.target as HTMLElement).closest('button,[role="menu"],[role="checkbox"],input')) return;
    setDetails(p);
  }}
  ```
- Mobile-only Sort/Filter Popover: use existing `@/components/ui/popover` (already in design system); fallback to keeping inline if Popover is bulky. Since mobile screens are tight, this is worth it.
- Pagination sticky: use `sticky bottom-0` on the wrapper `<div>` of `DataPagination`. To work, parent `<div className="rounded-xl border bg-card">` should not have `overflow-hidden`. Currently it does not — safe.
