## সমস্যা
`src/styles.css`-এ `.container` class globally override করা আছে — width 100%, max-width 100%। এটা app page-এর sidebar layout-এর জন্য করা হয়েছিল। কিন্তু ফলে marketing page (homepage / about page)-এর সব content edge-to-edge ছড়িয়ে যাচ্ছে বড় screen-এ।

## লক্ষ্য
Homepage (`/`) ও About page (`/about`)-এ শুধু content গুলো একটা নির্দিষ্ট max-width container-এর মধ্যে থাকবে। Design/background (section color, border, gradient) full-width থাকবে।

## সমাধান
নতুন `.site-container` utility class যোগ করে, যেটা traditional Tailwind container-এর মতো কাজ করবে (max-width ~1280px, centered, responsive padding)। তারপর marketing page-এর সব component-এ `container mx-auto px-4` বদলে `site-container` ব্যবহার করা হবে।

## পদক্ষেপ

1. `src/styles.css`-এ `.site-container` class যোগ করো:
   ```css
   .site-container {
     width: 100%;
     margin-left: auto;
     margin-right: auto;
     padding-left: 1rem;
     padding-right: 1rem;
     max-width: 80rem; /* 1280px */
   }
   @media (min-width: 640px)  { .site-container { padding-left: 1.5rem;  padding-right: 1.5rem;  } }
   @media (min-width: 768px)  { .site-container { padding-left: 2rem;    padding-right: 2rem;    } }
   @media (min-width: 1536px) { .site-container { padding-left: 2.5rem;  padding-right: 2.5rem;  } }
   ```

2. Homepage-এর component আপডেট করো:
   - `src/components/site/AuthEntry.tsx`: `container mx-auto px-4` → `site-container`

3. About page-এর সব section component আপডেট করো:
   - `src/components/site/HeroSection.tsx`
   - `src/components/site/FeatureRows.tsx`
   - `src/components/site/PainAndSolutions.tsx`
   - `src/components/site/CompareTable.tsx`
   - `src/components/site/BusinessTypes.tsx`
   - `src/components/site/Testimonials.tsx`
   - `src/components/site/PricingSection.tsx`
   - `src/components/site/ContactSection.tsx`
   - `src/components/site/StatsAndCta.tsx`

4. Shared site chrome আপডেট করো (homepage ও about উভয়েই ব্যবহার করে):
   - `src/components/site/SiteHeader.tsx`
   - `src/components/site/SiteFooter.tsx`

## কোন component আপডেট হবে না
App page-এর কোনো component বা layout (dashboard, POS, products ইত্যাদি) — সেগুলো `.container` full-width override-এর উপর নির্ভরশীল।
