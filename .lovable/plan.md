# Tally Plus Brand Color + Logo Wordmark

লোগোর রঙ থেকে নেওয়া brand palette এবং সেটাকে app-এর default primary color বানানো হবে।

## 1. Brand color tokens (logo থেকে নেওয়া)

লোগোর তিনটি রঙ:
- **Deep Indigo** (Tally / তালি): `#1E2A5E` → `oklch(0.27 0.10 270)`
- **Periwinkle Indigo** (Plus / প্লাস + ring): `#6F7BE0` → `oklch(0.62 0.16 275)` ← **PRIMARY**
- **Coral Accent** (+ mark / book ribbon): `#FF6B5B` → `oklch(0.72 0.18 25)`

## 2. `src/styles.css` পরিবর্তন

- `:root` এর primary tokens (`--primary`, `--ring`, `--sidebar-primary`, `--accent`, `--secondary`, `--muted`, `--border`, `--input`, `--sidebar*`) সব hue 145 (green) থেকে hue **275 (indigo)** এ পরিবর্তন।
- নতুন brand-only tokens যোগ করা হবে যাতে logo wordmark এ ব্যবহার করা যায়:
  ```
  --brand-deep:    oklch(0.27 0.10 270);  /* Tally / তালি */
  --brand-primary: oklch(0.62 0.16 275);  /* Plus / প্লাস */
  --brand-accent:  oklch(0.72 0.18 25);   /* + mark */
  ```
- `@theme inline` block-এ map: `--color-brand-deep`, `--color-brand-primary`, `--color-brand-accent` (Tailwind utilities `text-brand-deep` ইত্যাদি পাওয়ার জন্য)।
- নতুন একটি theme variant: `[data-theme="indigo"]` (default brand palette) যোগ। বাকি green/blue/red/yellow/soft-dark variants intact থাকবে যাতে user চাইলে switch করতে পারে।

## 3. `src/lib/theme.tsx`

- `AppColor` type-এ `"indigo"` যোগ।
- `DEFAULT` কে `"indigo"` করা।
- `COLOR_OPTIONS` এ Indigo (Brand) entry সবার উপরে যোগ করা হবে label সহ: bn `"ব্র্যান্ড"`, en `"Brand (Indigo)"`, swatch `oklch(0.62 0.16 275)`।
- পুরনো user যাদের localStorage এ `green` save আছে তাদের জন্য কোন migration নেই—তারা যা set করেছিল তা থাকবে; নতুন user-এর জন্য default Indigo।

## 4. Logo wordmark "Tally Plus / টালি প্লাস" এ color split

বর্তমানে `SiteHeader.tsx` ও আরও ১৫+ জায়গায় text এভাবে আছে:
```tsx
<span className="…font-extrabold…">{t("appName")}</span>
```
সব জায়গায় এক রকম style করার জন্য একটি reusable component তৈরি:

**নতুন file:** `src/components/brand/BrandWordmark.tsx`
```tsx
export function BrandWordmark({ className }: { className?: string }) {
  const { t, lang } = useI18n();           // appName = "Tally Plus" বা "টালি প্লাস"
  const full = t("appName");
  // English: "Tally Plus" → ["Tally", "Plus"]
  // Bangla:  "টালি প্লাস" → ["টালি", "প্লাস"]
  const [first, ...rest] = full.split(" ");
  const second = rest.join(" ");
  return (
    <span className={className}>
      <span className="text-brand-deep">{first}</span>
      {second && <> <span className="text-brand-primary">{second}</span></>}
      <sup className="text-brand-accent font-bold">+</sup>
    </span>
  );
}
```
(Hindi `"टैली प्लस"`-ও same split logic দিয়ে কাজ করবে।)

তারপর existing `<span>{t("appName")}</span>` গুলোকে `<BrandWordmark className="…" />` দিয়ে replace করা হবে। প্রধান touch-points:
- `src/components/site/SiteHeader.tsx`
- `src/components/site/HeroSection.tsx`
- `src/components/site/LoginCard.tsx`, `AuthEntry.tsx`
- `src/components/app/AppTopbar.tsx`, `AppSidebar.tsx`, `InstallAppPrompt.tsx`, `NewUserAccessDialog.tsx`, `AddShopDialog.tsx`
- `src/pages/app/Printer.tsx`, `Shops.tsx`, `Affiliate.tsx`
- বাকি জায়গায় যেখানে শুধু plain text হিসেবে নাম দরকার (e.g. `<title>`, alt, manifest), সেখানে `t("appName")` ই থাকবে — বদলানো হবে না।

## 5. Logo placement

বর্তমান long logo (`src/assets/logo.png`) যেখানে যেখানে আছে সেগুলো অপরিবর্তিত থাকবে (user বললেন "যেটা আছে এটাই থাকুক")। শুধু wordmark রঙ branding-এর সাথে মিলে যাবে।

## Technical summary

| File | Change |
|---|---|
| `src/styles.css` | hue 145 → 275 in `:root`, add brand-* tokens, add `[data-theme="indigo"]` |
| `src/lib/theme.tsx` | add `"indigo"` option, set as DEFAULT, add to `COLOR_OPTIONS` |
| `src/components/brand/BrandWordmark.tsx` | NEW — colored wordmark component |
| ~12 site/app files | replace `<span>{t("appName")}</span>` with `<BrandWordmark/>` |

কোন database migration বা edge function পরিবর্তন লাগবে না। কোন breaking change নেই — user চাইলে settings থেকে পুরনো green/blue/red/yellow/soft-dark theme-এ switch করতে পারবে।