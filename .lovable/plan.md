# ফর্দ-First Marketplace Plan

আপনার মূল লক্ষ্য পরিষ্কার: **ফর্দ (shopping list) হবে গ্রাহক-দোকান যোগাযোগের মূল মাধ্যম**, marketplace শুধু দোকান খুঁজে পাওয়ার একটা উপায়। নিচে আমি বর্তমানে যা আছে সেটা ব্যবহার করে ছোট কিছু সংযোজন প্রস্তাব করছি।

## যা ইতিমধ্যে বানানো আছে (পুনঃব্যবহার হবে)

- `/f/{shop-slug}` — পাবলিক ফর্দ পেজ (গ্রাহক ফর্দ পাঠায়)
- `/f/{shop-slug}/my` — গ্রাহকের নিজের সব ফর্দ (mobile + PIN দিয়ে login)
- `/app/customer-wishlist` — দোকানদার ফর্দ দেখে, দাম বসায়, status পাল্টায়
- PIN auth, color tag, reuse / template — সব আছে

## নতুন যা যোগ হবে

### ১. Marketplace-এ Vendor View কে default করা
- `/shop` খুললে এখন থেকে **"Vendor View" tab আগে** থাকবে (এখন Product আগে)
- প্রতিটি **VendorCard**-এ দুইটা প্রধান button:
  - **"ফর্দ পাঠান"** (primary, বড়) → সরাসরি `/f/{slug}` এ যায়
  - **"দোকান দেখুন"** (secondary) → `/vendor/{username}` এ যায়
- Product View tab থেকে যাবে — যারা পণ্য খুঁজতে চায় তাদের জন্য

### ২. Vendor home page (`/vendor/{username}`)-এ সবচেয়ে উপরে
- বড় sticky banner: **"ফর্দ তৈরি করে পাঠান — দোকানদার দাম জানিয়ে দিবেন"** + CTA button → `/f/{slug}`
- দোকানের নাম, address, phone, logo (এগুলো ইতিমধ্যে আছে — আরো prominent করা হবে)

### ৩. ফর্দ পেজ সরল করা (`/f/{slug}`)
এখন form-এ name / qty / unit / price আলাদা ৪টা খোপ — কঠিন লাগে। নতুন design:

- **একটাই বড় text box per লাইন**: গ্রাহক যা ইচ্ছা লেখে — *"১ কেজি পোলাওর চাল"*, *"২ কেজি খাসির মাংস"*, *"১ ডজন ডিম"*
- পাশে **+ Add line** এবং **🗑 delete**
- নিচে দোকানের catalog থেকে quick-pick suggestion (যা ইতিমধ্যে আছে — থাকবে)
- Price / unit / qty parsing দরকার নেই — পুরো লাইনটাই `name` হিসেবে save হবে। দোকানদার তার পাশে দাম বসাবেন।
- "বিস্তারিত mode" toggle থাকবে যারা qty/unit আলাদা দিতে চান তাদের জন্য (পুরোনো UI)

### ৪. 🎤 Voice Input (Bangla)
ফর্দ পেজে বড় mic button: **"কথা বলে ফর্দ বানান"**
- চাপলে browser-এর **Web Speech API** (`SpeechRecognition`) দিয়ে Bangla (`bn-BD`) audio capture
- যেসব browser-এ Web Speech নেই (iOS Safari ইত্যাদি): MediaRecorder দিয়ে audio record করে **Lovable AI Gateway-এর `google/gemini-2.5-flash`** এ পাঠানো হবে — Gemini multimodal Bangla audio transcribe করতে পারে
- Transcript পাওয়ার পর **AI দিয়ে item-এ ভাঙা হবে**:
  - একটা edge function `voice-to-fordo` বানানো হবে যা Gemini-কে বলবে: *"নিচের বাংলা বাক্যকে ফর্দ লাইনে ভাগ করে JSON array দাও"*
  - Input: *"এক কেজি চাল দুই কেজি ডাল আর এক হালি ডিম"*
  - Output: `["১ কেজি চাল", "২ কেজি ডাল", "১ হালি ডিম"]`
- লাইনগুলো form-এ auto-fill হবে, গ্রাহক চাইলে edit করতে পারবে

### ৫. দোকানদার দিকে ছোট সংযোজন
`/app/customer-wishlist`-এ ইতিমধ্যে প্রতি item-এ price বসানো যায়। নতুন:
- যদি item name দোকানের products-এর সাথে match করে (fuzzy), **"price auto suggest"** badge দেখাবে — click করলে product-এর sale_price বসে যাবে
- (এটা optional polish — মূল কাজ নয়)

## Routing উদাহরণ

```
/shop                       → vendors tab default
/vendor/karim-store         → "ফর্দ পাঠান" big button
/f/karim-store              → ফর্দ form (simple + voice)
/f/karim-store/my           → গ্রাহকের নিজের সব ফর্দ (phone + PIN)
```

## Technical Notes (অভ্যন্তরীণ)

- **Files to edit**: `src/routes/shop.index.tsx` (default tab), `src/components/marketplace/VendorCard.tsx` (CTA buttons), `src/routes/vendor.$username.tsx` (top CTA banner), `src/routes/f.$slug.tsx` (simplified single-line items + voice button), `src/routes/app.customer-wishlist.tsx` (price suggest)
- **New file**: `src/components/wishlist/VoiceInputButton.tsx` (Web Speech + MediaRecorder fallback)
- **New edge function**: `supabase/functions/voice-to-fordo/index.ts` — Lovable AI Gateway দিয়ে audio/transcript → JSON line array
- **DB change**: কিছু লাগবে না — বিদ্যমান `customer_wishlists` / `customer_wishlist_items` টেবিল যথেষ্ট
- **Secret**: `LOVABLE_API_KEY` ইতিমধ্যে set আছে

## যা এই plan-এ **নেই** (আপনি বললে যোগ করব)

- গ্রাহকের আলাদা accounting page (এখনো mobile + PIN দিয়ে `/f/{slug}/my` থেকে past ফর্দ দেখা যায় — সেটাই accounting এর কাজ করছে)। আলাদা analytics চাইলে পরে যোগ হবে।
- Voice দিয়ে দাম/total auto-calc — এখন শুধু item নাম generate হবে।

অনুমোদন দিলে এই কাজগুলো করে দিব।