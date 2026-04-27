## লক্ষ্য

1. একটা নতুন, আরও স্পষ্ট বাংলা font try করা — পছন্দ না হলে সহজে ফেরত যাওয়া যাবে।
2. Header-এ "টালি প্লাস / Tally Plus" লেখাটার উপরের ও নিচের অংশ যে কেটে যাচ্ছে সেটা ঠিক করা।

---

## কেন কাটছে (সমস্যার মূল কারণ)

`src/components/site/SiteHeader.tsx`-এ logo-র পাশের টেক্সটে `leading-none` (line-height: 1) দেওয়া আছে। বাংলা hরফের মাত্রা (উপরে রেফ, নিচে আ-কার / ্য-ফলা) line-box-এর বাইরে চলে যায়, ফলে উপর-নিচ ছেঁটে যায়। একই pattern অন্য কয়েক জায়গায় (AppSidebar / AppLayout / Shops) আছে কিন্তু সেখানে logo-র পাশে টেক্সট নেই — মূল visible সমস্যা site header-এ।

---

## প্রস্তাবিত পরিবর্তন

### ১. নতুন বাংলা font: **Tiro Bangla** (try-out)

বর্তমানে কোনো Google Font preload নেই — system default ব্যবহার হচ্ছে। আমি Tiro Bangla যোগ করব (একটা পরিচ্ছন্ন, পড়তে সহজ, modern serif-leaning Bengali font, Google Fonts-এ free)। পাশাপাশি fallback হিসেবে Hind Siliguri ও system font থাকবে।

পরিবর্তন:
- `index.html`-এ Google Fonts preconnect + Tiro Bangla + Hind Siliguri stylesheet link যোগ।
- `src/styles.css`-এ `body { font-family: "Tiro Bangla", "Hind Siliguri", ui-sans-serif, system-ui, sans-serif; }` সেট।

পছন্দ না হলে এই দুটি জায়গা revert করলেই আগের অবস্থায় ফিরে যাবে — অন্য কোনো কোড changes লাগবে না।

বিকল্প হিসেবে চাইলে আমি **Noto Sans Bengali** বা **Baloo Da 2** ও দেখাতে পারি।

### ২. Logo wordmark clipping fix

`src/components/site/SiteHeader.tsx`:
- টেক্সটের `leading-none` সরিয়ে `leading-tight` করা (mobile + desktop দুই জায়গায়)।
- ছোট padding বাড়িয়ে header height-এ একটু breathing room (`py-1` add)।
- Logo আর টেক্সটকে সঠিকভাবে vertically center করতে `items-center` যথেষ্ট আছে; শুধু line-height ঠিক করলেই চলবে।

Mobile sheet header (line 73-77)-এও একই `leading-none` issue থাকলে তা ঠিক করা।

### ৩. (Optional) AppSidebar/AppLayout/Shops-এর `<img>` logo যেহেতু square frame-এ `object-contain` ছাড়া রেন্ডার হচ্ছে, সামান্য stretching হতে পারে — সব জায়গায় `object-contain` যোগ করব যাতে logo কখনো বিকৃত না হয়।

---

## পরিবর্তিত ফাইল

- `index.html` — Google Fonts link
- `src/styles.css` — body font-family
- `src/components/site/SiteHeader.tsx` — leading fix
- `src/components/app/AppSidebar.tsx`, `src/pages/app/AppLayout.tsx`, `src/pages/app/Shops.tsx` — `object-contain` যোগ

পছন্দ হলো? Approve করলে apply করে দিচ্ছি। font পছন্দ না হলে শুধু বলবেন — এক ক্লিকে আগের system font-এ ফিরিয়ে দেব, বা Noto Sans Bengali / Baloo Da 2 try করে দেখাব।