## সমস্যা ও সমাধান

### ১. গ্রাহক ফর্দ page-এ কোনো ফর্দ দেখা যায় না, কিন্তু ফর্দ ইতিহাসে চারটাই বসে আছে — কেন?

**আসল কারণ (debug করে পেলাম):**
- `customer_wishlists` table-এ `deleted_at` কলাম **নেই**।
- কিন্তু "গ্রাহক ফর্দ" page-এর query-তে আছে `.is("deleted_at", null)` → এটা silently fail করছে → list খালি।
- "ফর্দ ইতিহাস" page-এ এই filter নেই, তাই সেখানে সব ফর্দ ঠিকঠাক দেখাচ্ছে।
- "মুছুন" বাটনও fail করছে কারণ সেটাও `deleted_at` set করতে চায়।

**ফিক্স:** `customer_wishlists` table-এ `deleted_at timestamptz` কলাম যোগ করব (recycle-bin route-ও এর উপর depend করে)।

---

### ২. দোকানদার দাম বসাতে পারে না / বেচায় convert করতে পারে না

**বর্তমান অবস্থা:** ফর্দ detail dialog-এ প্রতিটা item-এর পাশে দামের input box আছে (একক দাম), কিন্তু:
- "বেচায় convert" বাটন **নেই** → ফর্দ থেকে সরাসরি Sale তৈরি হয় না।
- দোকানদার দাম বসিয়ে শুধু "সম্পন্ন" mark করতে পারে, কিন্তু stock কমে না, due ledger-এ যায় না।

**ফিক্স — ফর্দ detail dialog-এ নতুন বাটন যোগ করব:**
- **"বেচায় রূপান্তর"** (Convert to Sale)
  - শুধুমাত্র "পেয়েছে" (fulfilled) item-গুলো নেবে।
  - প্রতিটা item-এর দাম থাকতে হবে — না থাকলে warn করবে।
  - নতুন একটা `sales` row তৈরি করবে (existing sales table-এ), customer-কে customers table-এ create/match করবে (phone দিয়ে), payment method ও paid amount জিজ্ঞেস করবে।
  - সফল হলে wishlist status = `converted` করবে এবং sale-এর reference রাখবে।

---

### ৩. গ্রাহক "২ কেজি চাল" লিখলে দোকানদার সেটা packet-এ convert করতে পারবে

ফর্দ detail-এ প্রতিটা item-এর পাশে এখন quantity edit করার option নেই (শুধু দাম)। দুটো mode যোগ করব:

- **Per-unit price mode** (default): qty × unit price = line total
- **Lump-sum price mode**: একটা toggle (📦) — qty উপেক্ষা করে শুধু একটা মোট দাম দেবে (যেমন "২ কেজি চাল = ১৪০ ৳")
- দোকানদার qty এবং unit ইচ্ছামতো edit করতে পারবে (২ কেজি → ২ packet)

UI: প্রতিটা row-তে name-এর নিচে ছোট qty input + unit dropdown (kg/pcs/packet/litre/dozen), আর দামের পাশে একটা ছোট 📦 toggle "lump"।

---

### ৪. Public ফর্দ submission page-এ internet warning + voice option প্রকাশ্য করা

`/f/{slug}` page-এ:
- উপরে একটা subtle banner: **"📶 ফর্দ পাঠাতে ইন্টারনেট সংযোগ লাগবে।"** (offline হলে red turn করবে — `navigator.onLine`)
- `VoiceInputButton` component already আছে (অর্থাৎ AI দিয়ে কথা বলে ফর্দ generate ইতিমধ্যে কাজ করছে)। সেটাকে আরো prominent করব — উপরে একটা boxed "🎤 কথা বলে ফর্দ বানান" CTA, যাতে user দেখে।
- যেহেতু আগে আপনি জিজ্ঞেস করেছিলেন: হ্যাঁ — এটা **real-time AI** (Lovable AI Gateway → Whisper STT → text)। এটা net-connection ছাড়া কাজ করবে না।

---

### ৫. Notification কেন আসছে না?

Database trigger (`tg_notify_new_wishlist`) আগের migration-এ deploy হয়েছে। কিন্তু `notifications` table এখন পুরো খালি — মানে trigger বসানোর পর কোনো **নতুন** ফর্দ আসেনি। পুরনো ফর্দ-গুলোর জন্য notification তৈরি হবে না (trigger শুধু INSERT-এ চলে)।

পরীক্ষা করতে: `/f/{slug}` link থেকে নতুন একটা ফর্দ পাঠালে bell-এ count আসবে। আমি additional verification করব যে trigger সঠিকভাবে attached আছে।

---

## Technical changes

| ফাইল | কাজ |
|---|---|
| **DB migration** | `customer_wishlists`-এ `deleted_at timestamptz` কলাম + index। Trigger `tg_notify_new_wishlist` re-attach verify। |
| `src/routes/app.customer-wishlist.tsx` | Detail dialog-এ qty/unit edit + lump-sum toggle + "বেচায় রূপান্তর" বাটন। |
| `src/components/app/ConvertWishlistToSaleDialog.tsx` (নতুন) | Sale conversion form (customer match, payment method, due/paid)। |
| `src/routes/f.$slug.tsx` | উপরে internet hint banner + voice CTA prominent। |

