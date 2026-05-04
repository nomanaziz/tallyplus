## Problems

1. **"function gen_random_bytes(integer) does not exist"** — The trigger `tg_shops_ensure_wishlist_slug` calls `gen_random_bytes()` unqualified, but the function lives in the `extensions` schema and isn't on the trigger's `search_path`. So every new shop insert fails.
2. **AddShopDialog**: only Division + District dropdowns from a hardcoded list; no Upazila/Thana. Also has a free-text "এলাকা" field that's redundant with address.
3. **Phone field** shows both 🇧🇩 flag AND `+88` text — duplicate country indicators.

## Fix

### 1. Migration — fix the slug trigger functions

Recreate `tg_shops_ensure_wishlist_slug` and `tg_wishlist_ensure_share_token` with `SET search_path = public, extensions` (and qualify calls as `extensions.gen_random_bytes(...)`) so shop inserts work again.

### 2. `src/components/app/AddShopDialog.tsx`

- Remove hardcoded `BD_DIVISIONS` / `DISTRICTS` constants and the standalone `area` field.
- Replace the Division/District/Area block with the existing DB-backed `BdLocationPicker` (`showArea={false}`) — gives Division → District → Upazila/Thana from `bd_divisions`/`bd_districts`/`bd_upazilas`.
- State becomes `loc: { division, district, upazila, area: null }`; on submit insert into `seller_locations` with proper `upazila` value (currently it incorrectly stores the area text in the upazila column).
- Phone field: drop the `+88` text label, keep only `🇧🇩` flag (cleaner) — they sit side-by-side as one chip already.

No other UI changes.

### Result

- Add Shop dialog opens, Division → District → থানা cascade works from the DB.
- Phone shows just the BD flag chip + 11-digit input.
- Saving a new shop no longer throws `gen_random_bytes` error.
