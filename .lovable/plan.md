## What we're fixing

You raised two things on the Fordo / ফর্দ flow:

1. **Simple-mode voice output is wrong.** When you say "এক কেজি পেঁয়াজ, দুই কেজি মসুর ডাল, পাঁচ লিটার সয়াবিন তেল একটি", in **বিস্তারিত (detailed) mode** the qty + unit columns get filled correctly. But in **সহজ (simple) mode** — which has only one text box per row — only the bare name is shown ("পেঁয়াজ", "মসুর ডাল", "সয়াবিন তেল") and the quantity/unit info is lost. You want the simple-mode row to read the way a person writes a market list: "১ কেজি পেঁয়াজ", "২ কেজি মসুর ডাল", "৫ লিটার সয়াবিন তেল ১টি".

2. **Customer portal Fordo (`/customer/create-fordo`) has no voice.** Right now you have to type each item by hand. You want the same voice mic from the public ফর্দ link page added here, plus two extras: **save the list as a template** for future use, and **schedule** it to send automatically on a recurring date (e.g. every month on the 10th).

---

## Plan

### 1. Simple-mode voice display (public ফর্দ page — `src/pages/f/Slug.tsx`)

Currently in simple mode the row just renders `it.name`. We'll keep storing `qty` / `unit` in state (so detailed mode keeps working), but for the **display value** in the simple-mode `<Input>` we'll compose a friendly label like:

- `১ কেজি পেঁয়াজ`
- `২ কেজি মসুর ডাল`
- `৫ লিটার সয়াবিন তেল ১টি`

Rules:
- If `qty` + `unit` exist → render `{qty} {unit} {name}` (qty in Bengali digits).
- If only `qty` exists → `{qty} {name}`.
- If neither → just `{name}` (back-compat with manual typing).
- If the user edits the simple-mode field by hand, we treat the whole string as `name` and clear `qty`/`unit` (current behavior — no surprise overwrites).
- Toggling to বিস্তারিত mode still shows the parsed qty / unit columns correctly (no change there).

Also a small parser tweak in `VoiceFordoMic`: phrases like "একটি / একটা" trailing the item ("সয়াবিন তেল একটি") should be captured as `qty=1, unit=পিস` so the simple label reads "৫ লিটার সয়াবিন তেল ১টি" naturally — not lost.

### 2. Voice mic on customer portal Fordo (`src/pages/customer/CreateFordo.tsx`)

- Add the existing `<VoiceFordoMic />` next to the "পণ্যের তালিকা" header on Step 1.
- Wire `onItems` exactly like the public page: fill the first empty row, then append new rows for each spoken item. Each row already has separate `name` / `qty` / `unit` inputs in this page, so detailed values are visible directly.
- Keep manual input available — voice is additive, not a replacement.

### 3. Save as template + schedule (customer portal)

Add two new buttons on Step 1 of `CreateFordo.tsx` next to "পরবর্তী":

- **💾 টেমপ্লেট হিসেবে সংরক্ষণ** — saves current items + note as a reusable template.
- **⏰ সময়সূচী সেট করুন** — opens a small dialog: pick a shop, choose recurrence (every month on day N / every week on weekday / one-time future date), then save.

Plus a new section on the **My Fordo** page (`src/pages/customer/MyFordo.tsx`) with two tabs/sections:
- **আমার টেমপ্লেট** — list saved templates with "ব্যবহার করুন" (loads into CreateFordo) and "মুছুন".
- **সময়সূচী (Scheduled)** — list active schedules with next-run time, pause/resume, delete.

### 4. Database changes (migration)

Two new tables scoped to logged-in consumers (RLS via `auth.uid()`):

```text
consumer_fordo_templates
  id uuid pk
  consumer_user_id uuid (auth.users.id, indexed)
  name text                       -- e.g. "মাসিক বাজার"
  note text
  items jsonb                     -- [{name, qty, unit}]
  created_at, updated_at

consumer_fordo_schedules
  id uuid pk
  consumer_user_id uuid (indexed)
  shop_id uuid → shops.id
  template_id uuid → consumer_fordo_templates.id (nullable, can be inline)
  items jsonb                     -- snapshot if no template
  note text
  recurrence text                 -- 'monthly' | 'weekly' | 'once'
  day_of_month int (1-31, nullable)
  day_of_week int (0-6, nullable)
  run_at timestamptz (for 'once')
  next_run_at timestamptz (indexed) -- computed/maintained
  is_active boolean default true
  last_run_at timestamptz
  created_at, updated_at
```

RLS:
- Both tables: `consumer_user_id = auth.uid()` for select/insert/update/delete.

### 5. Scheduled dispatch (cron)

A pg_cron job runs every 5 minutes and calls a new edge function `customer-dispatch-fordo-schedules`. The function:
- Finds rows where `is_active = true AND next_run_at <= now()`.
- For each, inserts into `customer_wishlists` + `customer_wishlist_items` (same shape as `customer-create-wishlist` already produces — triggers `tg_notify_new_wishlist` so the shop is notified).
- Updates `last_run_at = now()`, recomputes `next_run_at` (next month's day_of_month, next weekday, or sets `is_active=false` for 'once').

### 6. Files touched

**Edited:**
- `src/components/app/VoiceFordoMic.tsx` — handle "একটি/একটা" trailing as qty=1 unit=পিস.
- `src/pages/f/Slug.tsx` — simple-mode display formatter.
- `src/pages/customer/CreateFordo.tsx` — add mic, "Save template" button, "Schedule" button + dialog, optional `?templateId=` preload.
- `src/pages/customer/MyFordo.tsx` — add Templates and Schedules sections.

**New:**
- `src/components/customer/ScheduleFordoDialog.tsx` — recurrence picker UI.
- `supabase/functions/customer-dispatch-fordo-schedules/index.ts` — cron worker.
- Migration: two new tables + RLS + indexes.
- pg_cron schedule (every 5 min) calling the new edge function.

---

## Notes for you

- Voice mic already requires Chrome + mic permission; same applies on the customer page.
- "Schedule" only fires if the schedule is active and the consumer is still logged in to receive notifications later — the actual dispatch is server-side, so it works even if the user's phone is off.
- Templates are private to each consumer.

Approve and I'll implement it in one pass.