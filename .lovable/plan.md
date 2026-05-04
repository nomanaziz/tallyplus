## Goal: International readiness

Three buckets of changes — (A) country tracking, (B) more languages with RTL, (C) international polish.

---

## A. Country tracking

**Schema (migration, requires approval):**
- `alter table public.profiles add column country_code text` — ISO-2 (BD, IN, PK, AE, SA, US…).
- `alter table public.consumer_profiles add column country_code text`.
- Optional index for admin grouping queries.
- Update `public.handle_new_user()` to copy `raw_user_meta_data->>'country_code'` into both tables.

**Static country data** (`src/lib/countries.ts`):
- ~60 countries with `code`, `name_en`, `flag` emoji, `dial_code`, `default_currency`.
- Helper to guess country from phone dial code or browser locale.

**Signup capture:**
- `src/components/site/LoginCard.tsx` — add a country selector (Combobox with flag + name) above the phone field. Pre-select via browser locale (`navigator.language` region) with BD as fallback.
- Pass `country_code` to:
  - `supabase.functions.invoke("signup-with-pin", { body: { …, country_code } })`
  - `customer-signup-with-pin` and any consumer signup paths
- Edge functions: accept `country_code`, store via `profiles.update({ country_code })` / `consumer_profiles.update({ country_code })`.

**Admin visibility:**
- `src/pages/admin/Users.tsx`:
  - Load `country_code` along with profiles.
  - New "Country" column with flag + code.
  - New filter dropdown "By country" (built from distinct values).
- New widget on `src/pages/admin/Index.tsx` — "Users by country" — top 10 list with counts (computed client-side from profiles query, no extra RPC).

**Profile editing:**
- In `SettingsSheet` add a "Country" row (read+edit) so existing users can set theirs.

---

## B. Languages (Hindi, Tamil, Telugu, Urdu, Arabic) + RTL

**Update `src/lib/i18n.tsx`:**
- Extend `Lang` union: `"bn" | "en" | "hi" | "ta" | "te" | "ur" | "ar"`.
- Add full dictionary entries for each new language (translate the same key set used by `bn`/`en`).
- Add `RTL_LANGS = new Set(["ur", "ar"])`.
- In `I18nProvider` `useEffect`, set `document.documentElement.dir = RTL_LANGS.has(lang) ? "rtl" : "ltr"` and `document.documentElement.lang = lang`.
- Number formatting: keep current `bnNum` for Bangla; add `arNum` for Arabic-Indic digits used in `ar`/`ur` (optional, off by default).

**Move language switcher into Settings only:**
- `src/components/app/AppTopbar.tsx` — remove the EN/বাং toggle button and the dropdown "English/বাংলা" item.
- `src/components/site/SiteFooter.tsx` — replace the toggle button with a small `<select>` listing all 7 languages (footer is a settings-ish surface, kept as a single discoverable switcher for logged-out users).
- `src/components/app/SettingsSheet.tsx` — expand the existing language `<select>` to all 7 options with native names: বাংলা / English / हिन्दी / தமிழ் / తెలుగు / اردو / العربية.

**Currency tweaks (small):**
- `fmtMoney` in `i18n.tsx` currently hard-codes ৳. Replace with currency lookup driven by stored `tp_currency` (already settable in SettingsSheet) — symbols: ৳ BDT, $ USD, ₹ INR, ₨ PKR, د.إ AED, ﷼ SAR, € EUR, £ GBP. Sign placement honors RTL.
- Add the new currencies to the SettingsSheet `<select>` and to `shops.currency` defaults map keyed on country.

---

## C. Where international polish matters most

These are the highest-impact international touch-points beyond strings:

1. **Phone normalization** — `signup-with-pin` and `login-with-pin` currently strip to digits; keep that, but accept full E.164 (the `+`country prefix already passes through). No code change needed today, but verify edge functions don't enforce a 11-digit BD shape — if they do, relax to 6–15 digits.
2. **Default currency on shop creation** — `setupShop` should default `shops.currency` to the country's default currency rather than `BDT`.
3. **Date formatting** — replace `toLocaleDateString("en-GB")` calls with `toLocaleDateString(lang)` where the user-facing locale should follow language.
4. **Header marketing copy** (`SiteHeader`, `HeroSection`, etc.) — use `t()` keys so newly added languages benefit. No per-key translation work in this round beyond the dictionary above; English is the international fallback.

---

## Implementation order (single batch after approval)

1. Migration: add `country_code` columns + update `handle_new_user`.
2. Add `src/lib/countries.ts`.
3. Extend i18n dictionary + RTL effect; update `fmtMoney`.
4. Update `LoginCard` to capture country; pass to edge functions.
5. Update `signup-with-pin` and `customer-signup-with-pin` edge functions.
6. Update `SettingsSheet` (language list, country row, currency list).
7. Remove language switcher from `AppTopbar`; convert footer toggle to multi-language select.
8. Update admin `Users.tsx` (column + filter) and `admin/Index.tsx` (country widget).

No new dependencies. No new secrets. All work fits within existing Supabase + Tally stack.
