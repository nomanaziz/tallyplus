## সমস্যা

`src/pages/app/Lpg.tsx`-এ ১৫টা ট্যাব আছে (স্টক, খালি সিলিন্ডার হাব, লেনদেন, … দৈনিক ক্লোজিং)। `TabsList`-এ `flex w-full flex-wrap` দেওয়া হলেও base UI (`src/components/ui/tabs.tsx`) এ fixed `h-9` height আছে। ফলে mobile-এ ট্যাবগুলো wrap হলেও container উচ্চতা বাড়ে না — সব row একে অপরের উপরে overlap করে। নিচের content (Empty state ও Add button)-ও তার নিচে চাপা পড়ে।

## সমাধান

`Lpg.tsx`-এর দুটি `TabsList`-এর className আপডেট করব যাতে height auto হয় এবং rows-এর মাঝে gap থাকে। সাথে mobile-এ horizontal scroll fallback রাখব যাতে অনেক ট্যাব হলেও পরিষ্কার দেখা যায়।

### পদক্ষেপ

1. **`src/pages/app/Lpg.tsx` line 200** — main TabsList:
   - বদলাবো: `flex w-full flex-wrap`
   - নতুন: `flex h-auto w-full flex-wrap justify-start gap-1`

2. **`src/pages/app/Lpg.tsx` line 732** — দ্বিতীয় TabsList (`grid-cols-5`):
   - mobile-এ ৫ column খুব ছোট হয়ে যায়। বদলাবো:
   - নতুন: `grid h-auto w-full grid-cols-3 gap-1 sm:grid-cols-5`

3. কোনো design token, color, বা business logic পরিবর্তন হবে না — শুধু layout class।

## যা পরিবর্তন হবে না

- `src/components/ui/tabs.tsx` (global UI) — অন্য page-এ side-effect এড়াতে অপরিবর্তিত থাকবে।
- অন্য কোনো LPG functionality, query, বা state।