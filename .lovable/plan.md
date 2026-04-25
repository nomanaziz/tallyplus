## লক্ষ্য

মোবাইলে পুরো অ্যাপটাকে একটা native app-এর feel দেওয়া — bottom navigation, back button, এবং Reports পেইজের card-গুলোকে compact পাশাপাশি layout দেওয়া।

### ১. Reports পেইজ — Mobile compact layout

**`src/routes/app.reports.tsx`-এ পরিবর্তন:**

**Section 2 (অন্যান্য আয় / অন্যান্য খরচ):**
- আগে: `grid md:grid-cols-2` → মোবাইলে stacked, button আলাদা row, font বড়।
- পরে: **মোবাইলে সবসময় `grid-cols-2`**। প্রতিটা card-এ label ছোট, amount medium, এবং "নতুন আয়/খরচ" button ছোট icon-only `+` button-এ পরিণত হবে (corner-এ)। Card-এর পুরো height কমবে।

**Section 3 (মোট বাকি — সাপ্লায়ারকে দিবো / কাস্টমার থেকে পাবো):**
- আগে: `grid md:grid-cols-2` → মোবাইলে stacked, padding বড়।
- পরে: **মোবাইলে `grid-cols-2`** সবসময় পাশাপাশি, padding কমিয়ে compact। Amount font মোবাইলে ছোট, desktop-এ আগের মতো।

**General Sales Report (মোট বিক্রি / নগদ বেচা / কাস্টমার থেকে বাকি / নগদ কেনা / সাপ্লায়ারকে বাকি):**
- 5টা single-column row → মোবাইলে **2-column grid**-এ রূপান্তর: প্রতিটা item compact card (label উপরে, amount নিচে)। "সর্বমোট ব্যালেন্স" এবং "পণ