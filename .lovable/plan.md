## সমস্যা সংক্ষেপ

1. **Subscribe page**-এ ক্লিক করলে দোকানদার "অর্ডার পেয়েছি" toast দেখে — এটা admin-style বার্তা, customer-এর জন্য নয়। Checkout/Payment flow চাই।
2. Manual payment instructions (bKash / Nagad / Rocket / Bank নম্বর) Subscribe page-এ নেই।
3. Free plan card Subscribe page-এ দেখায় না, এবং "আপনি এখন কোন প্যাকেজে আছেন" current-plan badge নেই।
4. Subscribe page design বারবার break হয় — আগের পরিচ্ছন্ন pricing-card design স্থিতিশীলভাবে আনতে হবে।
5. Settings → Usage Limits-এর সাথে Free plan card সরাসরি link করতে হবে (ইতিমধ্যে `/app/usage-limits` আছে — Subscribe থেকে link দিতে হবে)।
6. Logo (`src/assets/logo.png`) header/SiteHeader-এ আছে কিন্তু `index.html` favicon এবং PWA icons এখনো generic — সব জায়গায় logo সেট করতে হবে।

---

## পরিবর্তন

### A. Subscribe page (`src/pages/app/Subscribe.tsx`) — full redesign as a Checkout flow

স্থিতিশীল layout:

```text
┌─ SiteHeader ───────────────────────────────────┐
│ Breadcrumb: Settings › Subscription            │
│ "আপনার বর্তমান প্ল্যান: Free" (badge + meter) │
├────────────────────────────────────────────────┤
│  Plan cards grid (Free + Monthly + Yearly +    │
│   Lifetime), current plan = "Current" pill,    │
│   others = "Select" button                     │
├────────────────────────────────────────────────┤
│  Selected plan summary (sticky) + Pay button   │
├────────────────────────────────────────────────┤
│  Manual Payment Instructions (collapsible):    │
│   bKash / Nagad / Rocket / Bank নম্বর +        │
│   "টাকা পাঠানোর পর নিচে TxnID + screenshot"   │
│   → form submits to `subscription_requests`    │
├─ SiteFooter ───────────────────────────────────┤
```

আচরণ:
- Free plan card সবসময় দেখাবে — price ৳0, perks = current free limits, button = "Usage Limits দেখুন" → `/app/usage-limits`।
- Paid plan-এ click করলে: যদি `payment_gateway_settings.is_enabled = true` → automatic gateway redirect (existing edge function); নাহলে নিচের manual payment section-এ scroll, সেখান থেকে TxnID + (optional) proof_url submit করলে `subscription_requests` insert হবে এবং "অনুরোধ পাঠানো হয়েছে — admin verify করবে" toast দেখাবে। **"অর্ডার পেয়েছি" toast পুরোপুরি বাদ।**
- Current plan detect করতে `subscriptions` table থেকে active row পড়া হবে (UsageLimits page-এর মতই query)।

### B. Manual payment numbers — admin-controlled

`payment_gateway_settings.extra` (jsonb, ইতিমধ্যে আছে) ব্যবহার করব — কোনো schema migration লাগবে না।

structure:
```json
{
  "manual": {
    "bkash":  { "number": "01XXXXXXXXX", "type": "personal" },
    "nagad":  { "number": "01XXXXXXXXX", "type": "personal" },
    "rocket": { "number": "01XXXXXXXXX", "type": "personal" },
    "bank":   { "name": "City Bank", "account": "1234567890", "branch": "Dhanmondi" },
    "instructions_bn": "...",
    "instructions_en": "..."
  }
}
```

`src/pages/admin/PaymentGateway.tsx`-এ একটি নতুন **"Manual Payment Numbers"** section যোগ করা হবে যেখানে admin এই নম্বরগুলো edit করবে; Subscribe page সেগুলো read-only দেখাবে।

### C. Logo সব জায়গায়

- `index.html`-এ `<link rel="icon" href="/icon-192.png">` + apple-touch-icon → `src/assets/logo.png` থেকে export করা PNG ব্যবহার (বর্তমান `public/icon-192.png` placeholder)। সঠিক logo `src/assets/logo.png` থেকে public/-এ copy করে favicon, apple-touch-icon, og:image সব update হবে।
- `manifest.webmanifest`-এ icons reference verify।
- Admin sidebar / login page / 404 / Auth — যেখানে এখনো logo মিসিং সেখানে `<img src={logo}>` যোগ।

### D. Notification routing fix

Plan select করার সময় কোনো admin-tone toast দোকানদারকে দেখানো হবে না। `subscription_requests` insert হলে শুধু **"অনুরোধ পাঠানো হয়েছে — admin verify করবে"** দেখাবে। সাথে `notifications` table-এ admin-দের জন্য একটা row insert হবে (existing `notifications` table, type=`subscription_request`) — তাই admin পেজে এটা দেখাবে, দোকানদার নয়।

### E. Free plan + Usage limit linkage

- Subscribe page-এ Free plan card-এ feature limits compact list:
  > পণ্য ১০, বিক্রয় ১০, ক্রয় ১০, খরচ ১০, গ্রাহক ৫ … "বিস্তারিত দেখুন →" → `/app/usage-limits`
- `/app/usage-limits` page-এ ইতিমধ্যে "View all subscription packages" button আছে যা `/app/subscribe`-এ পাঠায় — দ্বিমুখী লিংক complete।

---

## প্রযুক্তিগত বিবরণ (technical)

- কোনো নতুন DB table লাগবে না; `payment_gateway_settings.extra` jsonb-তে manual payment data রাখা হবে।
- `subscription_requests` insert payload: `{ user_id, plan_id, payment_method: 'bkash'|'nagad'|..., txn_id, proof_url? }` — `amount` column নেই, তাই amount পাঠানো হবে না (আগের bug ছিল `amount` insert করার চেষ্টা → silent fail → misleading toast)।
- নতুন/edited files:
  - `src/pages/app/Subscribe.tsx` (full rewrite — header/footer ছাড়া কারণ AppLayout already wraps)
  - `src/pages/admin/PaymentGateway.tsx` (manual numbers section যোগ)
  - `index.html` (favicon + og:image)
  - `public/favicon.png`, `public/icon-192.png`, `public/icon-512.png` (regenerate from `src/assets/logo.png` via sharp/ImageMagick script)
  - `src/pages/Auth.tsx`, `src/pages/admin/Login.tsx`, `src/pages/NotFound.tsx` — logo verify/add।
- `notifications` insert RLS: existing policy `notif insert admin` allows `is_admin(auth.uid()) OR user_id = auth.uid()` — দোকানদার নিজের জন্য insert করতে পারবে কিন্তু admin-এর user_id-তে নয়। তাই admin notification পাঠানো হবে একটি SECURITY DEFINER RPC দিয়ে অথবা একটি ছোট edge function (`notify-admins-subscription-request`) দিয়ে যা service role-এ admin user-দের জন্য rows insert করবে। **এটিই একমাত্র backend addition।**

---

## Deliverable summary

1. দোকানদার Subscribe page-এ গেলে: Free card (current highlight) + paid plans + manual payment নম্বর + TxnID submit form দেখবে। "অর্ডার পেয়েছি" toast আর দেখাবে না।
2. Admin PaymentGateway settings থেকে bKash/Nagad/Rocket/Bank নম্বর আপডেট করতে পারবে।
3. Admin নতুন subscription request আসলে notification পাবে (existing admin SubscriptionRequests page-এ list)।
4. Logo সব ব্র্যান্ড touchpoint-এ (favicon, PWA icon, auth pages, 404)।
5. Free plan ↔ Usage Limits page পরস্পর লিংকড।
