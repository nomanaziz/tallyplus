
# Plan: এক পেজের Landing + নতুন Pricing + Lifetime Plan + Contact Section

## লক্ষ্য

আপনার সব আলাদা পেজ (Pricing, Contact) বাদ দিয়ে **এক পেজের landing** বানাব। সব সেকশন এক জায়গায় থাকবে, navbar থেকে hash-anchor (`#pricing`, `#contact`) দিয়ে scroll হবে। Tallyhisab-এর চেয়ে কম দাম + **৳৫,০০০ Lifetime** plan যোগ হবে।

## Pricing (Tallyhisab-এর চেয়ে কম)

Tallyhisab: Basic $29 (~৳৩,৫০০), Pro $59 (~৳৭,০০০), Enterprise $99 (~৳১২,০০০) প্রতি মাসে।

আমরা দেব (BDT, monthly equivalent অনেক সস্তা):

| Plan | দাম | Duration | বৈশিষ্ট্য |
|---|---|---|---|
| **মাসিক** | ৳২৯৯ | ৩০ দিন | সব ফিচার, ১ দোকান, আনলিমিটেড বিল |
| **ষান্মাসিক** | ৳১,৪৯৯ | ১৮০ দিন | মাসিকের সব + ১৭% সাশ্রয় |
| **বার্ষিক** ⭐ | ৳২,৪৯৯ | ৩৬৫ দিন | সব ফিচার + ৩০% সাশ্রয় + ফ্রি ট্রেনিং |
| **Lifetime** 🔥 | ৳৫,০০০ | আজীবন | এককালীন, কোনো রিনিউয়াল নেই, সব আপডেট ফ্রি |

সব plan-এ ৭ দিন ফ্রি ট্রায়াল।

## পেজ কাঠামো (এক পেজ — `/`)

```
┌─────────────────────────────────────────┐
│ SiteHeader (sticky)                     │
│   Logo | হোম · ফিচার · প্রাইসিং · যোগাযোগ │
│   [EN/বাং] [লগইন/ড্যাশবোর্ড]              │
├─────────────────────────────────────────┤
│ #hero       — HeroSection (existing)    │
│ #features   — FeatureRows (existing)    │
│             PainAndSolutions             │
│             CompareTable                 │
│             BusinessTypes                │
│             Testimonials                 │
│ #pricing    — PricingSection (NEW)      │
│             ৪টা card: মাসিক/৬মাস/বার্ষিক/Lifetime │
│             Lifetime card-এ "জনপ্রিয়" badge │
│ #contact    — ContactSection (NEW)      │
│             ফোন/WhatsApp/ইমেইল/ঠিকানা +   │
│             "Contact Us" বড় বাটন         │
│ FinalCta + StatsStrip                   │
│ SiteFooter                              │
└─────────────────────────────────────────┘
```

## ফাইল পরিবর্তন

### নতুন
- **`src/components/site/PricingSection.tsx`** — ৪টা plan card (hardcoded দাম, supabase থেকে fetch বাদ)। Lifetime card-এ amber gradient + "জনপ্রিয়" badge।
- **`src/components/site/ContactSection.tsx`** — ৩-column grid (Call/WhatsApp/Email) + "Contact Us" CTA → WhatsApp link। Address-ও দেখাবে।

### Edit
- **`src/routes/index.tsx`** — `<PricingSection id="pricing" />` ও `<ContactSection id="contact" />` যোগ।
- **`src/components/site/SiteHeader.tsx`** — `/pricing` Link এর বদলে `/#pricing`, contact link `/#contact`। Same-page hash হলে smooth scroll হবে।
- **`src/components/site/SiteFooter.tsx`** — Pricing link `/#pricing` করব।
- **`src/components/site/StatsAndCta.tsx`** — Final CTA-তে "Contact Us" বাটন যোগ।
- **`src/lib/i18n.tsx`** — নতুন strings: `lifetime`, `oneTimePayment`, `contactUs`, `callUs`, `emailUs`, `address`, `monthly`, `halfYearly`, `yearly`, `mostSavings` ইত্যাদি (BN+EN)।

### Delete
- **`src/routes/pricing.tsx`** — মুছে দেব। Header/footer এর সব pricing link `/#pricing` এ যাবে।

### Database
**কোনো migration দরকার নেই** — pricing এখন hardcoded (UI-only)। `subscription_plans` table থাকবে ভবিষ্যৎ admin panel-এর জন্য, কিন্তু landing-এ আর fetch হবে না।

## যোগাযোগ তথ্য (default)

- 📞 ফোন: **+880 1841-577944**
- 💬 WhatsApp: **wa.me/8801841577944**
- ✉️ ইমেইল: **support@tallyplus.app**
- 📍 ঠিকানা: ঢাকা, বাংলাদেশ

(আপনি চাইলে এগুলো বদলে দিতে পারবেন — শুধু বলবেন।)

## টেকনিক্যাল নোট

- Hash-anchor scroll smoothly — `src/styles.css`-এ `html { scroll-behavior: smooth; }` যোগ করব।
- Sticky header কে ৬৪px height ধরে section-গুলোতে `scroll-mt-20` Tailwind class দেব যাতে heading header-এর নিচে hide না হয়।
- `pricing.tsx` route delete করার পর routeTree auto-regenerate হবে।

Approve করলে implement শুরু করব।
