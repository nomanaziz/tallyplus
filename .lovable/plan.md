## Goal
Payment callback page এ যখন status `failed` বা `cancelled` হবে, user কে automatically `/app/subscribe` এ ফেরত পাঠানো হবে — manually button click করতে হবে না। একটা ছোট countdown toast/message দেখানো হবে যাতে user বুঝতে পারে কী হচ্ছে।

## Changes

**File: `src/pages/app/SubscribeCallback.tsx`**

1. একটা নতুন `useEffect` add করা হবে যেটা `state === "failed"` হলে trigger হবে:
   - 4 second countdown শুরু হবে
   - countdown শেষে `navigate("/app/subscribe", { replace: true })` call হবে
   - cleanup function এ `clearTimeout` থাকবে

2. Failed UI block (line ~135) এ একটা ছোট notice add করা হবে:
   - "৪ সেকেন্ডে Subscribe page-এ ফিরে যাচ্ছি..." / "Redirecting to Subscribe page in 4s..."
   - "আবার চেষ্টা করুন" button থাকবে (immediate redirect এর জন্য)
   - "ড্যাশবোর্ডে যান" button থাকবে (cancel auto-redirect এর জন্য)

3. Auto-redirect cancel করার জন্য একটা local state `autoRedirect` রাখা হবে — যদি user কোনো button এ click করে তাহলে timeout cancel হবে।

## Behavior summary

| Status | Action |
|--------|--------|
| success | 3s পরে auto-redirect → `/app/dashboard` (existing) |
| pending | কোনো auto-redirect নেই (existing) |
| failed | **NEW**: 4s পরে auto-redirect → `/app/subscribe` |
| cancelled (status=cancel) | **NEW**: একই — 4s পরে → `/app/subscribe` |

Pending state কে untouched রাখা হবে কারণ payment processing হচ্ছে — user কে অপেক্ষা করতে হবে।