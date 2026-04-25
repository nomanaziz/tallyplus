## Five fixes

### 1. Cashbox — direct Jomā / Khoroch buttons

**Now:** "New entry" opens a dialog with tabs.
**Change:** Top of `/app/cashbox` will show two big buttons side-by-side — green **জমা (Cash In)** and red **খরচ (Cash Out)**. Each opens a focused dialog (no tab switch) pre-set to that direction asking only Amount + Note. Remove the combined "New entry" button.

File: `src/routes/app.cashbox.tsx`

---

### 2. Expense page — preset category cards first, amount after

**Now:** "New expense" opens a free-text "Category" input.
**Change:** Top of `/app/expense-ledger` shows **4 preset category cards** with icons:
- 🏠 দোকান ভাড়া (Rent)
- 🚚 পরিবহন (Transport)
- ⚡ ইউটিলিটি (Utility — bills)
- 👤 বেতন (Salary)
- ➕ অন্যান্য (Other — for custom)

Click a card → dialog opens with that category locked → user enters Amount → Paid via → optional Note → Save. Existing expense list/total stays below.

Categories will be hard-coded (no DB needed for v1) so they show immediately for everyone.

File: `src/routes/app.expense-ledger.tsx`

---

### 3. Customers RLS error — "new row violates row-level security policy"

**Cause:** The insert payload is correct and RLS allows shop owners + members. The error happens because in some sessions `current.id` in localStorage points to a shop the logged-in user no longer owns/is-member of (stale cache after shop creation flow).

**Fix:**
- In `app.contacts.tsx` `ContactDialog.save()`, before insert verify the active shop with a fresh `shops` lookup; if user isn't a member, force `shop.refresh()` and show a clear error.
- Add the same guard to expense, supplier, product saves.
- On login + shop change, re-validate cached `tp_shop_current` against the fresh server list and clear if missing.

Files: `src/lib/shop.tsx`, `src/routes/app.contacts.tsx`.

---

### 4. App Training — admin-managed YouTube videos by category

**New table** `training_videos`:
```
id uuid pk
title_bn text, title_en text
youtube_id text         -- e.g. "dQw4w9WgXcQ"
category text           -- "sell" | "purchase" | "stock" | "expense" | "general" | ...
sort_order int default 0
is_published bool default true
created_at, updated_at
```
RLS: public read where `is_published`; admin write only.

**Admin page** `/admin/training` (added to AdminSidebar):
- List + Add/Edit/Delete videos.
- Fields: title (bn/en), YouTube URL (auto-extract id), category dropdown, sort, published toggle.
- Thumbnail preview from `https://img.youtube.com/vi/{id}/hqdefault.jpg`.

**User page** `/app/training` (replace placeholder):
- Fetches published videos, groups by category.
- Each card: thumbnail + title + Play → opens dialog with embedded `<iframe youtube>`.
- Search + category filter chips at top.
- Empty state if admin hasn't added any yet.

Files: new migration, new `src/routes/admin.training.tsx`, rewrite `src/routes/app.training.tsx`, update `src/components/admin/AdminSidebar.tsx`.

---

### 5. Access Management — actually enforce permissions

**Problem:** `shop_members.permissions` JSON is set in UI but **nothing in the app checks it**. A cashier sees full sidebar and can add products / update stock.

**Approach (UI-level gating, RLS stays as-is):**

a. **New hook** `usePermissions()` in `src/lib/permissions.tsx`:
   - For current user + current shop, fetches `shop_members` row (or owner status).
   - Resolves effective permissions: owner → all; member → row's `permissions` JSON, else custom_role permissions, else preset for `role`.
   - Returns `{ isOwner, can(group, item), canGroup(group) }`.

b. **Sidebar gating** (`AppSidebar.tsx`): each nav item gets a required-permission tag. Hide items the user can't access. Cashier preset will only show: Sell, Quick Sell, Purchase, Cashbox, related ledgers — no Products, Stock, Access, Reports, Marketing, Online Shop, Settings.

c. **Route-level guard**: a small `<RequirePerm group item>` wrapper rendered inside protected route components (Products, Stock, Access, Reports, etc.) that shows "এই পেজে এক্সেস নেই" if missing — defense-in-depth so URL-typing also fails.

d. **In-page action gating**: hide Add / Edit / Delete buttons on Products, Stock, Contacts, Expense, Sell, Purchase based on `can(...)`. Owner always sees everything.

e. **Cashier preset update** in `ROLE_PRESETS` (`src/lib/permissions.ts`):
```
EMPLOYEE (cashier): {
  sell: [sell, quick_sell, cart_edit],
  purchase: [],   // remove buy/cart_edit/discount/delivery from default
  contacts: [view, customers, add_customer]
}
```
Owners can still customize via Access page.

f. **Note on RLS:** The DB still allows any shop member to write — that's a separate hardening pass. This step blocks the UI which is what's user-visible. We can follow up with column-level RLS using a helper SQL function `member_has_perm(user, shop, group, item)` if you want hard enforcement.

Files: `src/lib/permissions.ts` (+ new `.tsx` hook), `src/components/app/AppSidebar.tsx`, all `src/routes/app.*.tsx` action buttons, new `src/components/app/RequirePerm.tsx`.

---

## Order of execution
1. DB migration (training_videos table).
2. Cashbox + Expense UI redesign.
3. Customers RLS guard / shop refresh.
4. Admin Training + User Training pages.
5. Permissions hook + sidebar + route guards + button gating.

Approve and I'll implement in this order.