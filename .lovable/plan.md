## Sidebar Menu — Section Separators যোগ

AppSidebar এর সব menu item বর্তমানে একটানা list হিসেবে দেখানো হচ্ছে। Hishabee-style এর মতো section-wise group করে প্রতিটি খাতের পরে subtle separator + ছোট section label দিয়ে সাজানো হবে — এতে ব্যবহারকারী সহজে বুঝতে পারবেন কোন menu কোন কাজে।

### Proposed Sections (logical groups)

```text
─── (top) ───
  • সাবস্ক্রিপশন কিনুন (highlighted)
  • অ্যাপ ইনস্টল করুন
  • অনলাইন মার্কেটপ্লেস

─── মূল / Main ───
  • হোম

─── লেনদেন / Transactions ───
  • কেনা
  • বেচা
  • দ্রুত ফর্দ
  • ক্যাশবক্স

─── হিসাবের খাতা / Ledgers ───
  • কেনার খাতা
  • বেচার খাতা
  • বাকির খাতা
  • খরচের খাতা

─── পণ্য ও স্টক / Inventory ───
  • প্রোডাক্ট লিস্ট
  • স্টকের হিসাব
  • মেয়াদোত্তীর্ণ পণ্য
  • ওয়ারেন্টি পণ্য

─── গ্রাহক ও যোগাযোগ / Customers ───
  • যোগাযোগ
  • গ্রাহক ফর্দ
  • মার্কেটিং

─── অনলাইন বিক্রি / Online ───
  • অনলাইন শপ

─── রিপোর্ট ও সেটিংস / Reports & Settings ───
  • ব্যবসার রিপোর্ট
  • প্রিন্টার
  • অ্যাপ অ্যাক্সেস
  • রিসাইকেল বিন

─── অন্যান্য / More ───
  • অ্যাপ ট্রেনিং
  • গ্রোথ পার্টনার
```

### Visual Design

- প্রতিটি section এর শুরুতে একটা ছোট uppercase muted label (যেমন "লেনদেন") দেওয়া হবে — `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`
- Label এর আগে একটা পাতলা `border-t border-border/50` line, যাতে clear visual separator বোঝা যায়
- প্রথম section এ top border থাকবে না (clean look)
- যদি একটা section এর সব item permission এর কারণে hidden থাকে, পুরো section (label + separator) auto-hide হবে — empty separator দেখাবে না

### Technical Changes

**File: `src/components/app/AppSidebar.tsx`**
- Item array কে section-based structure এ refactor করা হবে:
  ```ts
  type Section = { id: string; bn: string; en: string; items: Item[] };
  const SECTIONS: Section[] = [ ... ];
  ```
- Render loop টা section দিয়ে iterate করবে, প্রতিটি section এর visible items filter করে — যদি 0 visible item থাকে section skip
- Section header component:
  ```tsx
  <div className="mt-2 border-t border-border/50 px-2 pt-2 pb-1 first:mt-0 first:border-t-0 first:pt-1">
    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      {lang === "bn" ? section.bn : section.en}
    </span>
  </div>
  ```
- Top-level pinned items (Subscribe, Install, Marketplace) section এর বাইরে আগের মতই থাকবে, তারপর প্রথম separator

### Files Modified
- `src/components/app/AppSidebar.tsx` — items array কে sections এ restructure + separator/label rendering যোগ
