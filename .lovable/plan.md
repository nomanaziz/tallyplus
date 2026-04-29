## Goal
Simplify the **Admin → SMS Gateways** page to match the provided screenshot. Remove extra fields/clutter; show only what's needed.

## New Page Layout

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  SMS Service  ›  SMS Gateway Setup                                      │
├──────────────┬──────────────┬──────────────┬──────────────────────────┤
│ SMS Balance  │ Today's Send │ Month Send   │ Month Failed             │
│ (green)      │ (blue)       │ (orange)     │ (red)                    │
│ 1968.77      │ 46           │ 9143         │ 23                       │
└──────────────┴──────────────┴──────────────┴──────────────────────────┘
┌─────────────────────────────────────────────────────────────────────────┐
│  ▰ SMS Settings                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│  SMS Provider [dropdown]              SMS User Name [input]             │
│  SMS Sender   [input]                 SMS Password  [input password]    │
│                                            [ Update Company Information ]│
└─────────────────────────────────────────────────────────────────────────┘
```

### Stats cards (top, 4 colored cards)
- **SMS Balance** (green) — sum of `shop_sms_balance.balance` across all shops (platform-wide)
- **Today's Send** — count from `sms_history` where `status='sent'` and date = today
- **This Month Send** — count from `sms_history` where `status='sent'` and within current month
- **This Month Failed** — count from `sms_history` where `status='failed'` and within current month

Icons: Mail / Check / Hourglass / X. Match screenshot colors (emerald-500, sky-500, amber-500, rose-500).

### SMS Settings form (single primary gateway editor)
Only **4 fields** visible to admin:
1. **SMS Provider** (dropdown) — options:
   - `REVE SMS (Masking)` → provider=reve, masking=masking
   - `REVE SMS (Non-masking)` → provider=reve, masking=non-masking
   - `WhatsApp` (placeholder, "coming soon")
   - `Telegram` (placeholder, "coming soon")
2. **SMS Sender** (text) — maps to `config.sender_id` (callerID, e.g. `nomask_GalaxyNet` or `8809612xxxxx`)
3. **SMS User Name** (text) — maps to `config.api_key` **OR** `config.username` (whichever the user fills — both stored)
4. **SMS Password** (password) — maps to `config.secret_key` **OR** `config.password`

One **"Update Company Information"** button (right-aligned, dark navy like screenshot) → upserts the active primary gateway row for the selected provider+masking combo, sets `is_active=true`, `is_primary=true`.

Behind the scenes both `api_key`/`secret_key` AND `username`/`password` are written with the same values so the edge function works whichever auth REVE expects. `base_url` defaults to `http://smpp.revesms.com:7788` (hidden).

### Removed from current page
- Tabs (Gateways / Packages / Templates) — keep them but move to **separate sub-pages or a small secondary tab strip below the main settings card**, since the screenshot only shows Gateway Setup. (Default view = Gateway Setup; Packages & Templates accessible via small tab buttons under stats.)
- Per-gateway list view, "Add Gateway" button, primary toggles, multi-row editor — all replaced by the single inline form.
- Separate Base URL, API Key, Secret Key, Username, Password, Type/Masking dropdown — consolidated into the 4 fields above.
- "Display Name" field — auto-derived from provider selection.

## Edge function compatibility
`send-sms/index.ts` already reads `cfg.api_key`, `cfg.secret_key`, `cfg.sender_id`, `cfg.base_url`. Since we'll write the User Name → `api_key` and Password → `secret_key` (and mirror to `username`/`password`), no edge function changes needed.

## Files to modify
- `src/pages/admin/SmsGateways.tsx` — full redesign
  - Add stats query (4 metrics via Supabase)
  - Replace tab/list UI with single settings card + colored stats
  - Keep Packages & Templates as a small secondary tab below (collapsed/secondary)

## Files NOT changed
- DB schema — no migration needed
- `supabase/functions/send-sms/index.ts` — no change
- Marketing/BuySms/SmsHistory pages — no change
