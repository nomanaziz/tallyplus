## লক্ষ্য

দুটো আলাদা সমস্যা একসাথে fix করব:

1. **Vercel এর "NOT_FOUND" page** (যেটা refresh এ আসে) → আপনার নিজের সুন্দর 404 page এ redirect হবে
2. **Custom 404 page redesign** → sample image এর মতো bold, attractive look

---

## সমস্যা ১: Vercel deep-link 404

### কারণ
আপনার app একটা SPA (Single Page App) — সব route browser এ JS দিয়ে handle হয়। কিন্তু যখন আপনি direct `tallyplus.xyz/app/dashboard` URL এ refresh দেন, Vercel server এ ওই path এ কোনো file নাই, তাই Vercel তার নিজের platform-level `404: NOT_FOUND` page দেখায় — আপনার React app এমনকি load ই হয় না।

Project এ এখন কোনো `vercel.json` নাই — সেজন্য fallback rule নাই।

### সমাধান
Project root এ একটা `vercel.json` file create করব যেটা সব unknown path কে `/index.html` এ rewrite করবে। তখন:
- React app load হবে
- Router path দেখবে
- match না পেলে আপনার নিজের সুন্দর `NotFound` page দেখাবে (Vercel এর কুৎসিত page না)

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

এর পর Vercel এ next deploy থেকে `/app/dashboard` refresh করলে আর Vercel এর 404 আসবে না — সরাসরি আপনার dashboard load হবে। আর কোনো ভুল URL (যেমন `/abcxyz`) দিলে আপনার নিজের custom 404 দেখাবে।

---

## সমস্যা ২: Custom 404 page আরও সুন্দর করা

বর্তমান `src/pages/NotFound.tsx` ভালোই আছে কিন্তু sample image এর মতো আরও bold করব:

### Sample থেকে যা নেব
- **বিশাল bold "404"** (gradient text, screen এর majority জুড়ে)
- **"পেজটি হারিয়ে গেছে!"** — বড় Bangla heading
- কোন path এ এসেছে সেটা ছোট pill এ দেখাবে (যেমন `/dashboard/faqs`)
- **৩টা action button** এক সারিতে: "← পেছনে যান" | "🏠 হোমে ফিরুন" | "🔍 খুঁজুন"
- নিচে **"অথবা এখান থেকে শুরু করুন"** — ৪টা card grid (Home, Marketplace, Dashboard, Pricing) icon সহ

### যা change হবে
File: `src/pages/NotFound.tsx`
- Layout আরও center-focused, বড় typography
- "পেছনে যান" button যোগ (browser history back)
- বর্তমান path display করা (debug + UX)
- Popular pages গুলো small pill থেকে বড় card grid এ convert
- Icon গুলো red/primary tone এ wrap (sample এর মতো)
- Mobile/desktop দুটোতেই sample এর মতো look

---

## Files যা পরিবর্তন হবে

1. **`vercel.json`** (নতুন create) — SPA fallback rewrite
2. **`src/pages/NotFound.tsx`** (redesign) — sample image এর style এ

---

## ফলাফল (deploy এর পর)

- `tallyplus.xyz/app/dashboard` refresh → সরাসরি dashboard load হবে (Vercel 404 আর আসবে না)
- `tallyplus.xyz/random-wrong-url` → আপনার নিজের সুন্দর Bangla 404 page দেখাবে (বড় 404, পেছনে/হোম button, popular pages grid)
- App এর ভিতরের কোনো broken link হলেও same সুন্দর page দেখাবে

Approve করলে আমি দুটোই implement করে দিব।