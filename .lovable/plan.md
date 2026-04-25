## পরিবর্তনসমূহ

### ১. Sidebar reorganization (`src/components/app/AppSidebar.tsx`)

দোকানদারের sidebar থেকে অপ্রয়োজনীয় উপরের button সরানো হবে। শুধু **Home (হোম)** উপরে থাকবে, বাকি সব menu আগের মতোই section-wise।

**সরানো হবে (top থেকে):**
- "Buy Subscription" (সাবস্ক্রিপশন কিনুন) pinned button
- "Install App" (অ্যাপ ইনস্টল করুন) emerald button
- "Online Marketplace" link (যেটা `/shop` নতুন tab এ খুলত)

**যোগ হবে নিচের "অন্যান্য / Others" section এ:**
```
─── অন্যান্য / Others ───
  • অ্যাপ ট্রেনিং (আগেই আছে)
  • গ্রোথ পার্টনার (আগেই আছে)
  • সাবস্ক্রিপশন কিনুন        ← নতুন (নিচে নামানো)
  • অ্যাপ ইনস্টল করুন           ← নতুন (নিচে নামানো, button হিসেবে রেন্ডার)
```

দোকানদারের sidebar এ আর "Online Marketplace" থাকবে না — কারণ মার্কেটপ্লেস ভিজিটরদের জন্য, দোকানদারের জন্য নয়।

ফলে sidebar এর শুরুতে শুধু **মূল → হোম** দেখা যাবে, ঠিক Hishabee-style এর মতো।

### ২. Landing page header এ Marketplace link (`src/components/site/SiteHeader.tsx`)

মূল ওয়েবসাইটের top nav-এ একটা নতুন link যোগ হবে যেটা ভিজিটররা ব্যবহার করবে:

```tsx
<Link to="/shop">মার্কেটপ্লেস / Marketplace</Link>
```

Position: nav menu-তে Home এর পরে, Features এর আগে। Mobile-এও visible থাকবে (existing nav যেমন behave করে)।

এতে landing page থেকে যেকোনো visitor সরাসরি `/shop` (existing public marketplace) এ যেতে পারবে, অর্ডার বা ফর্দ পাঠাতে পারবে — login/signup ও সেখানেই handle হবে (existing flow)।

### ৩. App-এর ভেতরে marketplace route এ কোনো পরিবর্তন নেই

`/app/online-shop` route আগের মতই থাকবে (এটা মূলত দোকানদারের নিজের shop manage এর জন্য)। কিন্তু sidebar থেকে "অনলাইন মার্কেটপ্লেস" নামের cross-link সরানো হবে — দোকানদার যদি public marketplace দেখতে চান, landing page থেকেই দেখবেন।

### Files Modified
- `src/components/app/AppSidebar.tsx` — top pinned section সরিয়ে items গুলো "Others" section এ যোগ, Marketplace link বাদ
- `src/components/site/SiteHeader.tsx` — Marketplace nav link যোগ (bn/en দুই ভাষায়)
