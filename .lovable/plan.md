## Goal

When a shop owner adds a new service, let them pick from a pre-built catalog (inspired by sheba.xyz categories). Selecting a catalog item auto-fills the name, description, suggested unit, and default duration. Owners can also choose **service areas** (e.g. Dhaka, Chattogram, Sylhet, or "All over Bangladesh"), shown as "Available in: …" on the service card and on the public marketplace listing.

Note on source: sheba.xyz blocks scraping (returns only a chat-widget shell), so the catalog will be curated from Sheba's well-known public category set rather than scraped live. The catalog ships as a static TS file — easy to extend later.

---

## 1. Built-in Service Catalog (static)

New file `src/lib/service-catalog.ts` exports an array of ~60–80 services across these categories (bn + en names, description, default unit, default duration, suggested price hint, warranty hint):

- **Beauty & Wellness** — Salon (Men), Salon (Women), Bridal Makeup, Hair Cut, Hair Color, Facial, Manicure/Pedicure, Massage
- **Home Cleaning** — Full Home Cleaning, Kitchen Deep Clean, Bathroom Deep Clean, Sofa Cleaning, Mattress Cleaning, Carpet Cleaning, Water Tank Cleaning
- **Appliance Repair** — AC Service, AC Repair, AC Installation, Refrigerator Repair, Washing Machine Repair, Microwave Repair, TV Repair, Geyser Repair, Water Filter Service
- **Plumbing** — Tap/Faucet Fix, Pipe Leakage, Toilet Repair, Bathroom Fittings, Water Motor
- **Electrical** — Wiring, Switch/Socket, Fan Install/Repair, Light Install, IPS/UPS, Generator
- **Pest Control** — Cockroach, Bedbug, Termite, Rat, Mosquito
- **Car Services** — Car Wash, Car AC, Engine Tune-up, Battery, Tyre, Body Paint
- **Carpentry & Painting** — Furniture Repair, Door/Window, Interior Painting, Exterior Painting, Polishing
- **CCTV / IT / Networking** — CCTV Install, CCTV Maintenance, Computer Repair, Laptop Repair, Wi-Fi Setup, Printer Repair
- **Shifting / Movers** — Home Shifting, Office Shifting, Pick & Drop
- **Health at Home** — Doctor Visit, Nurse, Physiotherapy, Sample Collection
- **Tutoring & Lessons** — Home Tutor, Music, Quran
- **Events & Catering** — Catering, Photography, Videography, Decoration

Each entry shape:
```ts
{ slug, category, name_en, name_bn, description_en, description_bn,
  default_unit, default_duration_minutes?, default_duration_label?,
  warranty_default?, home_service_default? }
```

## 2. New "Pick from catalog" UX in `src/pages/app/Services.tsx`

In `ServiceFormSheet`, above the Name field, add a **"সার্ভিস ক্যাটালগ থেকে বেছে নিন / Pick from catalog"** combobox (using `Command` + `Popover` from existing shadcn). It groups items by category with a search box. Selecting an item:
- Fills `name`, `description`, `unit`, `duration_minutes`/`duration_label`, `home_service`, `warranty_*`
- Owner can still edit any field, set price, then save.

A small "Custom service" option lets owners skip the catalog entirely (current flow preserved).

## 3. Service Areas

### Schema (migration)
- Add column `service_areas text[]` to `public.services` (default `'{}'`). Treat empty array as "everywhere".
- Add same column to `public.marketplace_service_listings` so the marketplace card can filter without joining.
- Backfill: existing rows get `'{}'`.

### UI (form)
Add a multi-select field "Service Area / সার্ভিস এলাকা" with checkboxes for the major divisions: Dhaka, Chattogram, Khulna, Rajshahi, Sylhet, Barishal, Rangpur, Mymensingh, plus "All over Bangladesh" (clears the array). List defined as a constant `BD_DIVISIONS` in `src/lib/service-catalog.ts`.

### Display (service card)
On each card show: `Available in: Dhaka, Sylhet` (or `Available everywhere` if empty). Bilingual.

### Marketplace publish sync
When `togglePublish` / `onSave` upserts into `marketplace_service_listings`, also write `service_areas`.

## 4. Files Touched

- **new** `src/lib/service-catalog.ts` — catalog data + BD_DIVISIONS constant + helper types
- **new** `src/components/app/ServiceCatalogPicker.tsx` — Command-palette style picker (search + category groups)
- **edit** `src/pages/app/Services.tsx` — integrate picker, render areas chip, area multi-select in form
- **edit** `src/lib/services-queries.ts` — add `service_areas: string[]` to `Service` type and selects
- **new** `supabase/migrations/<ts>_service_areas.sql` — adds `service_areas text[] default '{}'` to `services` and `marketplace_service_listings`

## 5. Out of Scope (ask if you want them)

- Free-text city/upazila search beyond divisions
- Customer-side filtering by area on the marketplace page (can be follow-up)
- Auto-translation of catalog items beyond the two languages shipped
