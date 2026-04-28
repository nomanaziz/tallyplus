## Goal

In the **Add / Edit Product** form (`src/pages/app/Products.tsx` → `ProductFormDialog`):

1. Replace the free-text **Unit** input with a predefined dropdown.
2. Add **Category** and **Sub-Category** dropdowns (with "Add new" option).

These were missing because the form currently only has a free-text `Unit` input and no category fields at all, even though `products.category_id` exists in the DB.

---

## 1. Unit — predefined dropdown

Use a fixed list (matches the reference image):

```
ft, sq.ft, sq.m, kg, gm, piece, km, meter, litre, ml, dozen, pack, box, bottle, bag, pcs
```

- Render with the existing `Select` component (already imported).
- Default value: `pcs`.
- When a catalog product is picked and brings its own `base_unit`, keep that value selected if it exists in the list; otherwise append it as a custom option for that session.

## 2. Category & Sub-Category

### Database

The current `categories` table only has `id, shop_id, name`. We need a parent → child hierarchy.

Migration:
- Add `parent_id uuid references categories(id) on delete cascade` to `categories`.
- Add `sub_category_id uuid references categories(id)` to `products`.
- Index on `categories(shop_id, parent_id)`.

A category with `parent_id IS NULL` = top-level; with `parent_id` set = sub-category.

### Seed default tree (per shop, lazily on first open)

When the form opens and the shop has zero categories, seed the standard tree once (Bangla + English names stored as one `name` field):

- **Electronics and Gadgets** → Battery, Inverter/EV battery, BMS/Battery Controller, Inverter/EV battery charger, Cable clips/connector/jointer, electrical/electronics service charge, Power Supply/Adapter, Gaming Consoles, Telephones, Headphones and Microphone, Internet/Router and Switches, CCTV Cameras
- **Home Appliances**
- **Stationary and Office Appliances**
- **Clothes**
- **Shoes**
- **Fashion Accessories**
- **Home & Kitchen**

(Top-level entries without children are created empty; user adds sub-categories later.)

### UI in `ProductFormDialog`

Two side-by-side `Select` controls right above **Product Details**:

```text
[ Category Name ▾ ]   [ Sub-Category Name ▾ ]
```

- **Category** lists top-level rows for the current `shop_id`.
- **Sub-Category** lists rows where `parent_id = selectedCategoryId`, disabled until a category is picked.
- Each dropdown's last item is **"+ Add New Category / + Add New Sub-Category"** which opens a small inline prompt (Dialog with one Input + Save button) and inserts a new row, then auto-selects it.
- On save, store `category_id` and `sub_category_id` on the product row.
- On edit, prefill both selects from the loaded product.

## Files to change

- **DB migration** (new file): add `categories.parent_id` + `products.sub_category_id` + index.
- `src/integrations/supabase/types.ts` — regenerated automatically after migration.
- `src/pages/app/Products.tsx`:
  - Replace Unit `<Input>` with a `<Select>` of predefined units (+ keep custom unit if catalog supplies one).
  - Add `Category` + `Sub-Category` selects with "Add new" inline dialog.
  - Wire `category_id` and `sub_category_id` into the save payload and the edit prefill.
  - Lazy-seed the default category tree on first open per shop.

## Out of scope

- Filtering the products list by category (can be a follow-up).
- Editing/deleting categories from a settings screen (can be a follow-up).
