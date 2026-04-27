# Plan: ফর্দ পেজ + Auth Redesign + Voice Mic + গ্রাহক Mini Dashboard

দুটো আলাদা page-এ কাজ হবে: **Public Fordo page (`/f/:slug`)** এবং **Auth page (`/auth`)**, এছাড়া গ্রাহক dashboard।

---

## ১. ফর্দ পেজ (`/f/:slug`) Redesign

### Layout পরিবর্তন
- **SiteHeader + SiteFooter যোগ করা হবে** — main website এ ফিরে যেতে পারবে।
- "আপনার তথ্য" — title সরিয়ে ফেলা হবে। আলাদা label-ও না।
- "আপনার নাম", "মোবাইল নাম্বার", "PIN" — সব placeholder-এর ভেতরে যাবে (label tag বাদ)।
- ফর্ম order: **পণ্যের তালিকা সবার উপরে** → নোট → কার্ডের রং → সবার শেষে compact একটা গ্রাহক info row (নাম, মোবাইল, PIN — তিনটা input পাশাপাশি/grid এ ছোট হয়ে)।
- যেকোনো বড় heading বাদ — শুধু পণ্যের section-এ ছোট subtitle।

### ঠিকানা field
- Optional address field বাদ দেওয়া হবে (compact করতে)।

---

## ২. AI Voice Mic (ফর্দ পেজে)

### UI
- পণ্যের তালিকার পাশে / উপরে একটা **floating mic button** (small circle, primary color)।
- Click করলে → একটা compact voice modal/sheet খুলবে যেখানে:
  - Animated **waveform / volume bar** (real-time mic input level — ups/downs দেখাবে)
  - "শুনছি…" / "কিছু বলুন" status text
  - Live transcript preview
  - Cancel button

### Behavior
- Web Speech API (`webkitSpeechRecognition` / `SpeechRecognition`) — Bangla (`bn-BD`)। Free, browser-native, কোনো API key লাগবে না।
- Volume meter: `AudioContext` + `AnalyserNode` দিয়ে real-time mic level, animated bars দেখাবে।
- **Auto-close rules**:
  - কথা বলা শেষ হলে (silence ১.৫ second) → final transcript পাঠাবে এবং close।
  - **১০ second** কোনো কথা না বললে → automatic close।
- Transcript থেকে items parse করা হবে: comma/“ও”/নতুন line দিয়ে split → প্রতিটা item হিসেবে যোগ হবে।
- পরবর্তীতে আবার mic press করলে আবার শুরু হবে।

### Browser support fallback
- Speech API সাপোর্ট না থাকলে toast: "আপনার browser এ voice support নেই — Chrome ব্যবহার করুন"।

---

## ৩. Auth পেজ (`/auth`) Redesign

### Layout
- **SiteHeader + SiteFooter** আগেই যোগ করা হয়েছে — থাকবে।
- উপরে দুটো **Tab toggle**: `দোকানদার` (default) | `গ্রাহক`
- Tab অনুযায়ী form দেখাবে।
- নিচে create button: "নতুন account তৈরি করুন" → mode switch হবে signup এ। Signup-এও আবার একই দুটো tab (default: দোকানদার)।

### দোকানদার flow (existing)
- Phone + PIN দিয়ে login → `/app/dashboard` এ redirect।
- Signup: নাম + দোকানের নাম + phone + PIN।

### গ্রাহক flow
- Phone + PIN দিয়ে login → `/customer/dashboard` এ redirect (নতুন page)।
- Signup: নাম + phone + PIN (দোকানের নাম লাগবে না)।

---

## ৪. গ্রাহক Mini Dashboard (`/customer/dashboard` — নতুন)

### Pages/Routes
- `/customer/dashboard` — main dashboard (নতুন)
- `/customer/profile` — already exists
- `/customer/notes` — নোট
- `/customer/money` — income/expense

### Sidebar/Top nav (গ্রাহক layout)
- **আমার ফর্দ** — সব দোকান থেকে পাঠানো ফর্দ list (existing wishlist data ব্যবহার করে customer-side view)
- **নোট** — quick notes
- **আয়-ব্যয়** — mini income/expense module
- **প্রোফাইল** — existing profile page

### আয়-ব্যয় Module (mini)
নতুন table: `consumer_transactions`
- `id`, `user_id` (FK auth.users), `type` ('income' | 'expense'), `amount`, `category`, `note`, `tx_date`, `created_at`
- RLS: শুধু own rows select/insert/update/delete

UI: এক page এ
- উপরে summary card: এই মাসের income, expense, balance
- নিচে transaction list + "যোগ করুন" button (sheet/dialog)
- Simple category dropdown: খাবার, যাতায়াত, বাজার, বিল, অন্যান্য, বেতন, etc.

### নোট
- Simple list — title + content।
- নতুন table: `consumer_notes` (id, user_id, title, content, created_at, updated_at) + RLS।

### আমার ফর্দ
- Existing `wishlists` table থেকে এই গ্রাহকের phone-এর সব ফর্দ দেখাবে (cross-shop)।
- Reuse / WhatsApp share / details — existing `/f/:slug/my` এর মতো।

---

## ৫. Database Migration

নতুন tables:
1. `consumer_transactions` (user_id, type, amount, category, note, tx_date)
2. `consumer_notes` (user_id, title, content)
3. দুটোতেই RLS — auth.uid() = user_id check।

---

## ৬. Files

### Modified
- `src/pages/f/Slug.tsx` — header/footer, layout reorder, placeholder-only inputs, mic button
- `src/pages/Auth.tsx` — tab (দোকানদার/গ্রাহক), গ্রাহক flow, customer signup → consumer_profile
- `src/lib/auth.tsx` — login redirect logic check (consumer → /customer/dashboard)

### New
- `src/components/app/VoiceFordoMic.tsx` — mic button + modal + waveform + STT
- `src/lib/useSpeechRecognition.ts` — Web Speech API hook
- `src/lib/useMicLevel.ts` — AudioContext analyser hook
- `src/pages/customer/Dashboard.tsx`
- `src/pages/customer/Notes.tsx`
- `src/pages/customer/Money.tsx`
- `src/pages/customer/MyFordo.tsx`
- `src/pages/customer/CustomerLayout.tsx` (sidebar/topbar)
- Routes registered in `src/routes.tsx`
- Migration: `consumer_transactions`, `consumer_notes` + RLS

---

## যে বিষয়গুলো confirm দরকার
- Voice STT-এর জন্য **browser-native Web Speech API** ব্যবহার করব (free, কোনো API key/cost নেই, Bangla support আছে Chrome-এ)। ElevenLabs/Deepgram দরকার নেই unless আপনি বলেন।
- "ছোট AI voice" বলতে শুধু dictation (কথা → text), কোনো AI conversation/agent নয়। সঠিক?
