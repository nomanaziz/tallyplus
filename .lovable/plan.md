## Goal

You're right that we need quick-import service templates. Most of this **already exists** — `src/lib/service-catalog.ts` ships a built-in catalog of 13 categories (Beauty & Wellness, Home Cleaning, Appliance Repair (incl. AC, Fridge, TV, Microwave), Plumbing, Electrical, Pest Control, Car Services (incl. Engine Tune-up), Carpentry & Painting, CCTV / IT (incl. Computer/Laptop), Shifting, Health, Tutoring, Events & Catering). The "নতুন সার্ভিস" sheet already shows a searchable `ServiceCatalogPicker` grouped by category that auto-fills name, description, unit, duration, warranty, home-service. Manual editing afterwards is already supported via the regular form fields.

So the only gaps are: **Mobile Repair** is missing, **Events** is thin, and there's no laundry/tailoring. We'll round these out and that's it — no DB or UI changes needed because the picker auto-derives categories from the catalog data.

## Catalog additions (`src/lib/service-catalog.ts`)

Append to `SERVICE_CATALOG`:

**Events & Catering (3 new items)**
- Sound System Rental (সাউন্ড সিস্টেম ভাড়া)
- Stage Lighting (স্টেজ লাইটিং)
- Anchor / MC (এঙ্কর / উপস্থাপক)

**Mobile Repair — new category (7 items)**
- Mobile Screen Replace (warranty 30 days)
- Mobile Battery Replace (warranty 60 days)
- Charging Port Repair
- Software Flash / Update
- Water Damage Recovery
- Camera Module Repair
- Speaker / Mic Repair

**Tailoring & Laundry — new category (3 items)**
- Tailoring
- Laundry & Iron (home pickup)
- Dry Cleaning (home pickup)

## Why no DB / UI work is needed

- `catalogCategoriesGrouped(lang)` automatically picks up new categories from the data — Mobile Repair / Tailoring will appear in the picker the moment we add the rows.
- The form's "অথবা নিচে নিজে লিখুন" hint and editable fields already provide the "extra add করার option" the user asked for — owners can pick a template and then change anything (price, duration, warranty, home-service, image, areas) before saving, or skip the picker entirely.

## Files touched

- `src/lib/service-catalog.ts` — append 13 new catalog entries (Events extras + Mobile Repair + Tailoring & Laundry).

That's the entire change.
