## লক্ষ্য

Shop owner-এর Subscribe পেইজ (`/app/subscribe`) থেকে দুটো জিনিস পরিষ্কার করা:

1. **আয়-ব্যয় হিস্ট্রি plans** (১/৫/১০ বছর) — এগুলো customer/consumer-দের জন্য, shop owner-এর কোনো দরকার নেই। তার regular subscription-এই history-র সব access থাকে।
2. **Free trial plan** — যে user আগে একবার trial নিয়ে ফেলেছে (current অথবা expired), তার Subscribe পেইজে আর "ফ্রি ট্রায়াল" card দেখাবে না — সম্পূর্ণ vanish।

---

## পরিবর্তন

### একমাত্র ফাইল: `src/pages/app/Subscribe.tsx`

**A. Plan list filter — `consumer_history_%` বাদ**

বর্তমানে query সব `is_active = true` plan আনে। এর সাথে frontend-এ filter যোগ:
```ts
.filter((p) => !p.code.startsWith("consumer_history_"))
```
ফলে shop owner কখনই ১/৫/১০ বছরের history plan দেখবে না।

**B. Trial plan auto-vanish**

User load-এর সময় একটা অতিরিক্ত query দিয়ে চেক — user-এর কোনো trial subscription record আছে কিনা (active বা expired দুটোই):

```ts
supabase.from("subscriptions")
  .select("id, subscription_plans!inner(code)")
  .eq("user_id", user.id)
  .eq("subscription_plans.code", "trial")
  .limit(1)
  .maybeSingle()
```

`hasUsedTrial` flag হিসেবে state-এ রাখা হবে। Plan rendering-এ:
```ts
plans
  .filter((p) => !p.code.startsWith("consumer_history_"))
  .filter((p) => p.code !== "trial" || !hasUsedTrial)
```

ফলাফল:
- নতুন user (কখনো trial নেয়নি) → trial card দেখাবে
- যার trial চলছে → trial card দেখাবে ("বর্তমান" badge সহ)
- যার trial শেষ হয়ে গেছে → trial card vanish, শুধু paid plans দেখবে

> Note: Trial মেয়াদ শেষে subscription auto-expire আগে থেকেই হয় (সব query `expires_at > now()` filter দিয়ে চলে)। এই পেইজে শুধু **option হিসেবে দেখানো** বন্ধ হবে।

---

## ফাইল পরিবর্তন সারসংক্ষেপ

- ✏️ `src/pages/app/Subscribe.tsx` — query এ trial-history check + render filter

DB schema-এ কোনো পরিবর্তন নেই; consumer history plans আগের মতই active থাকবে customer-দের `/customer/subscription` পেইজে।
