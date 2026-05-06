## Goal
Settings sheet (টপবার-এর সেটিংস আইকন → `SettingsSheet.tsx`) এর বর্তমান look অন্য একটা অ্যাপ থেকে অনুপ্রাণিত — এটাকে সম্পূর্ণ নতুন, original design-এ সাজানো হবে। একই ফিচার, কিছুই বাদ যাবে না — শুধু visual + structure rearrange।

## নতুন ডিজাইন (overview)

```text
┌────────────────────────────────────┐
│  Settings                       ✕  │
├────────────────────────────────────┤
│ ╭──────── Profile Hero ─────────╮  │
│ │ [AV]  Name              ›     │  │
│ │       phone · plan badge      │  │
│ │  ┌─────────────┬───────────┐  │  │
│ │  │ Switch Shop │  My Shop  │  │  │
│ │  └─────────────┴───────────┘  │  │
│ ╰───────────────────────────────╯  │
│                                    │
│ Quick Actions  (4 colored tiles)   │
│ [Reports] [Subscribe] [Train][Dev] │
│                                    │
│ ── Preferences ─────────────────   │
│  🌐 Language         [bn ▾]        │
│  🏳 Country          [BD ▾]        │
│  💱 Currency         [BDT ▾]       │
│  # Decimals          [2 ▾]         │
│  ☀ Theme color   (color dots row)  │
│                                    │
│ ── Shop & Data ────────────────    │
│  🏬 Shop settings & backup    ›    │
│  📊 Combined report           ›    │
│                                    │
│ ── Device ─────────────────────    │
│  📱 Install mobile app             │
│  🔐 Logged-in devices         ›    │
│                                    │
│ ── Help & Links ───────────────    │
│  (app_links rows — collapsible)    │
├────────────────────────────────────┤
│        [  Log out  ]               │
└────────────────────────────────────┘
```

## Key visual changes

1. **Profile Hero card** — gradient background (uses primary token), বড় avatar, নামের নিচে phone + একটা small plan badge। নিচে দুইটা inline pill button: "Switch Shop" + current shop name (tap → `/app/shop-settings`)। আগের আলাদা "Switch Shop" full-width বাটন এতে merge হবে।

2. **Quick Actions grid (2×2)** — চারটা rounded tile, প্রত্যেকটার নিজস্ব pastel tint (primary/amber/emerald/sky):
   - Combined Report → `/app/combined-report`
   - Subscription → `/app/subscribe`
   - App Training → `/app/training`
   - Usage & Limits → `/app/reports`

3. **Preferences group** — compact rows, left-side small rounded icon chip (bg-muted), right side native select / value। সব selector এক row-এ। থিম color dot row inline (আলাদা card না, একটা row হিসেবেই)।

4. **Shop & Data group** — Shop settings & backup, Combined report একসাথে।

5. **Device group** — Install app + Active devices.

6. **Help & Links group** — `app_links` rows, একটা "আরও দেখুন" collapsible (`<details>`) এর ভেতরে — clutter কমাতে।

7. **Section headers** — uppercase tiny label বাদ দিয়ে normal-case bold ছোট heading + subtle divider line।

8. **Row component নতুন করে** — left: 8×8 rounded-md icon chip (bg-muted/60), middle: label, right: value/chevron। Hover: bg-accent/50, subtle scale none। Border বাদ — শুধু group container-এ একটা card border, ভেতরে rows divide-y দিয়ে।

9. **Logout** — footer-এ outlined destructive style (ভরাট লাল না), icon + "Log out"।

## Scope of edits

- **Edit only**: `src/components/app/SettingsSheet.tsx` — পুরো JSX restructure, helper components (`Row`, `SectionLabel`) replace by new `SettingsRow`, `SettingsGroup`, `QuickTile`, `ProfileHero` (একই ফাইলের ভিতরেই)।
- কোনো নতুন route, কোনো DB change, কোনো ফিচার add/remove হবে না।
- সব existing handlers (PWA install, country update, signOut, devices dialog, app_links query) reuse হবে।
- i18n bn/en strings preserve।

## Out of scope

- Topbar icon নিজে change না।
- Shop Settings page (`/app/shop-settings`) এর internal layout এই plan-এ নেই (চাইলে পরে আলাদা করব)।