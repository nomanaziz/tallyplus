## পরিবর্তনের সারাংশ

দুটো অংশে কাজ:

### ১) Login page সরলীকরণ (`src/pages/Auth.tsx`)

বর্তমান login form-এ "দোকানের নাম (ঐচ্ছিক)" field আছে যেটা আসলে login-এ ব্যবহারই হয় না (validate/submit-এ ignore করা হয়)। এটা সরাবো।

Login mode-এ থাকবে শুধু:
- মোবাইল নম্বর (placeholder)
- ৪ সংখ্যার PIN (placeholder)
- "লগইন" button
- "Create account" link
- "PIN ভুলে গেছেন? WhatsApp করুন" link

Signup page আগের মতই থাকবে (দোকান মালিক / গ্রাহক tab সহ — যেমনটা আগের turn-এ ঠিক করা হয়েছে)।

### ২) সব public/customer page-এ Header + Footer

বর্তমান অবস্থা:
- `SiteHeader` আছে: `/shop` (marketplace index), `/shop/s/:slug`, `/shop/p/:id`
- `SiteFooter` কোথাও use হচ্ছে না
- `/customer/profile` page-এ কোনো header/footer নেই → Tally Plus-এ ফিরে যাওয়ার কোনো way নেই

পরিবর্তন:

**a) `SiteFooter`-এ "Back to Tally Plus" নিশ্চিত করা** — footer-এ আগে থেকেই brand link থাকার কথা; না থাকলে যোগ করব একটা ছোট "← Tally Plus হোমে ফিরুন" link সব marketplace/customer page-এর নিচে।

**b) নিচের page-গুলোতে `<SiteHeader />` + `<SiteFooter />` যোগ করব** (যেগুলোতে missing):
- `src/pages/customer/Profile.tsx` — গ্রাহক profile page
- `src/pages/shop/s/Slug.tsx` — footer যোগ (header আছে)
- `src/pages/shop/p/Id.tsx` — footer যোগ (header আছে)
- `src/pages/shop/Index.tsx` — footer যোগ (header আছে)

Layout pattern সবগুলোর জন্য একই হবে:
```text
<div className="flex min-h-screen flex-col">
  <SiteHeader />
  <main className="flex-1">...page content...</main>
  <SiteFooter />
</div>
```

এতে গ্রাহক যেকোনো marketplace/shop/product/profile page থেকে header logo বা footer link দিয়ে সহজে Tally Plus হোমে ফিরতে পারবে।

### Out of scope (এই plan-এ নেই)
- App (`/app/*`) internal page-গুলোতে SiteHeader/Footer যোগ — ওগুলোর নিজস্ব AppTopbar আছে
- Auth page-এ header/footer — login card-এর নিচে আগে থেকেই "হোমে ফিরুন" link আছে