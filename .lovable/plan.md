## Goal

Right now the "এখনই বুক করুন" button on a service detail page opens `ServiceBookingDialog`, but the booking flow is not user-friendly for guests:
- A guest can technically submit, but there is no clear option to log in for a better experience or to save the booking to their account.
- Bookings made as a guest are not tied to their consumer account, so they don't show up in `/customer/my-services`.

We will rebuild the booking flow into a clear 2-step experience that works for both guests and logged-in consumers, and offers them an easy path to log in / register without losing what they typed.

## New booking flow

```text
[Service page] → "এখনই বুক করুন"
        │
        ▼
┌──────────────────────────────────────────┐
│ Step 1: Choose how to continue           │
│ ───────────────────────────────────────  │
│  ◉ আমি গ্রাহক — লগইন করুন                 │   (only when NOT logged in)
│  ◉ নতুন গ্রাহক — অ্যাকাউন্ট খুলুন           │   (only when NOT logged in)
│  ◉ অ্যাকাউন্ট ছাড়াই বুক করুন (Guest)      │
└──────────────────────────────────────────┘
        │  (logged-in users skip Step 1)
        ▼
┌──────────────────────────────────────────┐
│ Step 2: Booking details                  │
│  • নাম, ফোন (prefilled if logged in)      │
│  • ঠিকানা + Division/District/Upazila    │
│  • পছন্দের সময়, নোট                       │
│  • অগ্রিম পেমেন্ট (if required)           │
│                                          │
│  [বাতিল]   [বুকিং নিশ্চিত করুন]            │
│                                          │
│  Guests see a small footer:              │
│  "চাইলে অ্যাকাউন্ট খুলে রাখুন → পরে আপনার  │
│   বুকিং দেখতে পারবেন" + Login/Register   │
└──────────────────────────────────────────┘
```

For the **Login / Register** options, we send the user to the existing
`LoginCard` on `/` with deep-link query params it already supports:

```
/?role=customer&mode=login&phone=<typed>&redirect=/shop/service/<id>
/?role=customer&mode=signup&phone=<typed>&redirect=/shop/service/<id>
```

After successful auth, `LoginCard` already redirects back via `?redirect=`,
landing the user on the same service page where they re-open the dialog
(now in logged-in mode with prefilled profile data).

## Implementation

### 1. `src/components/shop/ServiceBookingDialog.tsx` (rewrite)

- Add a `step` state: `"choose" | "form"`.
- Read `useAuth()`. If `user` is logged in, skip step 1 and go directly to `"form"`.
- When dialog opens for a guest, show the 3-option chooser (Login / Register / Continue as guest).
  - "লগইন" and "রেজিস্ট্রেশন" buttons navigate to the URLs above (using `useNavigate` from `@/lib/router`). They include the current service detail path as `redirect`, and pass the typed phone if any.
  - "Guest" button advances to the form step.
- In `"form"` step:
  - Keep the existing fields and submission logic.
  - For guests, render a small inline footer card with two outline buttons: "লগইন করুন" and "অ্যাকাউন্ট খুলুন" — same deep-link navigation. They preserve the typed name / phone via query params (phone goes into `?phone=`; name not passed because LoginCard doesn't accept it, that's fine).
- Keep edge-function call unchanged; the function already attaches `consumer_user_id` automatically when an auth bearer is present.

### 2. `src/pages/shop/service/Id.tsx` (small tweak)

- No structural change. The dialog already opens via `setBookingOpen(true)`.
- Make sure the dialog receives the current service detail URL so it can build a correct `redirect` param. Compute it inline:
  `` const redirectTo = `/shop/service/${service.id}`; `` and pass as a new optional prop `redirectTo` to `ServiceBookingDialog`.

### 3. No DB or edge-function changes

- `marketplace-public` → `create-service-booking` already supports both guest and logged-in flows (it tries to read the bearer token and attaches `consumer_user_id` when present).
- `service_bookings` is already wired to notify shop members via the existing `tg_notify_new_service_booking` trigger.
- `/customer/my-services` (`list-my-service-bookings`) already matches by `consumer_user_id` OR by phone (via `my_phones`), so guest bookings made with the same phone will still appear after the user logs in.

## Files touched

- `src/components/shop/ServiceBookingDialog.tsx` — add 2-step flow, login/register CTAs, accept `redirectTo` prop.
- `src/pages/shop/service/Id.tsx` — pass `redirectTo` to the dialog.

That's it — minimal surface, reuses the existing `LoginCard` deep-link contract.
