## Goal

Products page-এ দুটো ছোট improvement:
1. "রিফ্রেশ" button উপরে header এ নিয়ে যাওয়া (DataToolbar থেকে সরিয়ে title এর পাশে)
2. Summary card ("মোট স্টক" / "মজুদ মূল্য") আরেকটু compact করা — বিশেষত mobile-এ

## Changes

### 1. `src/pages/app/Products.tsx` — Refresh button উপরে

- Title row ("প্রোডাক্ট ও স্টক") এর action group এ একটা ছোট Refresh button যোগ করা — icon-only mobile-এ, icon+text desktop-এ। Existing `load()` function call করবে।
- Position: action buttons এর শুরুতে (Stock history / Stock edit এর আগে), এবং mobile-এ "Add" button এর পাশে দেখা যাবে যেন miss না হয়।
- `DataToolbar` থেকে `onRefresh={load}` prop টা remove করা — যাতে duplicate না হয়।
- Import: `RefreshCw` icon `lucide-react` থেকে যোগ করা।

### 2. Summary card ছোট করা (lines 467–487)

বর্তমানে mobile-এ number `text-base` (16px) এবং desktop-এ `text-3xl` — একে কমানো:

- Outer card: `p-2 sm:p-5` → `p-1.5 sm:p-3`, `mt-2 sm:mt-4` → `mt-2 sm:mt-3`, `rounded-2xl` → `rounded-xl`
- Inner tiles: `px-2 py-1.5 sm:px-3 sm:py-4` → `px-2 py-1 sm:px-3 sm:py-2`
- Number: `text-base sm:text-3xl` → `text-sm sm:text-xl`
- Label: `text-[10px] sm:text-sm` → `text-[10px] sm:text-xs`
- Gap: `gap-1.5 sm:gap-4` → `gap-1.5 sm:gap-3`

ফলাফল: card-টা প্রায় অর্ধেক উচ্চতার হবে, কিন্তু পড়তে সমস্যা হবে না।

## Out of scope

- "মোট স্টক" / "মজুদ মূল্য" labels বা values এর logic — অপরিবর্তিত।
- DataToolbar component নিজে — শুধু prop পাস করা বন্ধ; অন্য page যারা use করে তাদের refresh আগের মতই থাকবে।
