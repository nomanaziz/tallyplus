# সংক্ষিপ্ত ফর্দ Flow — Plan

Goal: Header-এর "ফর্দ" বোতামে ক্লিক করলে যে কেউ (login ছাড়াই) সরাসরি একটা ফর্দ বানাবে → নাম + mobile + 4-digit PIN দিয়ে "Create account & Send" → একসাথে account তৈরি + ফর্দ দোকানদারের কাছে চলে যাবে। Phone যদি আগে থেকেই থাকে → login page-এ পাঠানো হবে কিন্তু ফর্দটা draft হিসাবে save থাকবে; login-এর পরে একই ফর্দ পেজে items pre-filled অবস্থায় ফিরে এসে user "Send" ক্লিক করবে।

## 1. Header navigation change

`src/components/site/SiteHeader.tsx`:
- "ফর্দ" link এখন `/customer/my-fordo` এ যায় (login-required) — পরিবর্তন করে `/fordo` (নতুন public route) এ পাঠাতে হবে।
- Mobile sheet-এও একই পরিবর্তন।
- Logged-in user-দের জন্য একটা ছোট "আমার ফর্দ" sub-link বা history button অপরিবর্তিত থাকবে (page header-এ)।

## 2. New public page: `/fordo` (`src/pages/fordo/Index.tsx`)

একটাই compact page, তিন ভাগে:

**(a) Items section** (top)
- Simple row list: "নাম, পরিমাণ, একক" (existing simple-mode UX থেকে নেওয়া)
- Voice mic button (existing `VoiceFordoMic` reuse)
- "+ আরেকটি যোগ করুন"

**(b) Shop picker** (middle)
- Search box + nearby/popular shops list (CreateFordo-এর pattern reuse — search → `find-shops-by-name` edge function, nearby → marketplace-public)
- Selected shop chip দেখানো হবে

**(c) Account + Send** (bottom — single card)
- নাম, মোবাইল, 4-digit PIN
- Single button: **"Account তৈরি করে ফর্দ পাঠান"**

### Submit logic (frontend)

1. Validate items + shop + name + phone + pin
2. Save draft to `localStorage` key `fordo-draft` (items, shopId, name, phone, note) — survives navigation
3. Try `customer-signup-with-pin` edge function:
   - **Success** → setSession → call new `submit-authenticated-fordo` action (or reuse `submit-wishlist` with logged-in user) → success screen → clear draft
   - **`phone_exists` (409)** → toast "এই নম্বরে account আছে — login করুন" → navigate to `/login?redirect=/fordo` (draft stays in localStorage)
4. On `/fordo` mount: if `user` is now logged-in AND `fordo-draft` exists → restore items/shop/name/phone, hide PIN field, show single "Send" button. User clicks → submit using authenticated session → clear draft.

## 3. Backend: send authenticated ফর্দ

Reuse the existing `customer_wishlists` + `customer_wishlist_items` tables (same that `submit-wishlist` writes to).

Add a new action in `marketplace-public` edge function (or extend `submit-wishlist`) that accepts an authenticated consumer's bearer token and writes the wishlist with `wishlist_customer_id` linked to a `wishlist_customers` row (auto-create/lookup by `(shop_id, phone)`).

Simpler approach: keep using `submit-wishlist` (it already auto-creates `wishlist_customers` from phone, and works without auth). For the logged-in-then-send case we just call the same `submit-wishlist` with the user's name/phone and skip the issued-PIN screen.

No DB migration required.

## 4. Login page redirect support

Login flow should already honour a `?redirect=` query (verify in `src/pages/Index.tsx` / login card). If not, add a small redirect handler so `/login?redirect=/fordo` returns to `/fordo` after successful auth — that triggers the auto-restore logic above.

## 5. Files

**New:**
- `src/pages/fordo/Index.tsx` — the unified page
- `src/lib/fordo-draft.ts` — tiny localStorage helper (`saveDraft`, `loadDraft`, `clearDraft`)

**Modified:**
- `src/components/site/SiteHeader.tsx` — point "ফর্দ" link + mobile sheet to `/fordo`
- `src/lib/app-routes.tsx` — register `/fordo` as a public route
- `src/components/site/LoginCard.tsx` (or wherever main login lives) — honour `?redirect=` after successful PIN login
- (Optional) extend `submit-wishlist` edge function to accept an authenticated consumer (no breaking change)

## 6. Out of scope

- Existing `/f/:slug` per-shop public link page stays as-is (deep-link entry still works)
- Existing `/customer/my-fordo` history page stays for logged-in users
- No DB schema changes

## ASCII flow

```text
[Header → ফর্দ]
      │
      ▼
   /fordo  ──── items + shop + name+phone+PIN ──── [Create & Send]
      │                                                │
      │                                          ┌─────┴─────┐
      │                                          ▼           ▼
      │                                       success     phone_exists
      │                                       screen      (draft saved)
      │                                                       │
      │                                                       ▼
      │                                               /login?redirect=/fordo
      │                                                       │
      └───────────────── back to /fordo (draft restored, items pre-filled, only "Send")
```
