## Combined Report — Subscription Gate Popup

যখন user `/app/combined-report` এ যাবে, যদি active subscription না থাকে তাহলে একটা প্রোমো popup দেখাবে (screenshot এর মতো)। Close করলে dashboard এ ফিরে যাবে, "Unlock Now" এ click করলে subscription page এ যাবে।

### Behavior

- Route load হলে `useAuth().hasActiveSubscription` check করবে।
- `false` হলে: একটা modal Dialog দেখাবে, পেছনের content blur/dim থাকবে।
- Modal এর X button বা outside click → `nav({ to: "/app/dashboard" })`
- "Unlock Now" button → `nav({ to: "/app/subscribe" })`
- `true` হলে: normal Combined Report render হবে।
- Auth এখনো load হচ্ছে এমন অবস্থায় কিছু flash না করার জন্য `loading` state respect করবে।

### Popup Content (bn/en)

- Badge icon (✓ গোল্ডেন)
- Title: "একবারে ৳১০,০০০ দিন!" / "Pay ৳10,000 once!"
- Subtitle: "একটি unified dashboard এ সব দোকানের রিপোর্ট দেখুন" / "Access all your shop reports in one unified dashboard"
- "What you get:" list (4 items, green check):
  1. **Combined Sales Report** — সব দোকানের মোট কেনা, বেচা, বাকি একসাথে দেখুন
  2. **Overall Balance at a Glance** — ব্যবসা লাভে না ক্ষতিতে এক নজরে বুঝুন
  3. **Faster Decision Making** — manual হিসাব বা দোকান switch করার দরকার নেই
  4. **One PDF for All Shops** — সব দোকানের একটাই রিপোর্ট download/share
- Primary button: "Unlock Now" / "এখনই আনলক করুন" → `/app/subscribe`

### Files to change

- **src/routes/app.combined-report.tsx** — `useAuth` import করে gate logic add; subscription না থাকলে শুধু `<SubscriptionGateDialog />` render করে main content হাইড।
- **src/components/app/SubscriptionGateDialog.tsx** (new) — shadcn `Dialog` ব্যবহার করে popup component, controlled `open` prop, `onClose` (dashboard নেভিগেট), `onUnlock` (subscribe নেভিগেট) callbacks।

### Notes

- shadcn `Dialog` এ `onOpenChange(false)` trigger হয় X click, ESC, outside click — সব same handler এ dashboard এ পাঠাবে।
- Design tokens (primary, success, muted) ব্যবহার করব — কোন hardcoded color না।
- Auth loading এর সময় minimal skeleton/blank — flicker এড়াতে।
