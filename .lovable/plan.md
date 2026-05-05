## Image Library — Admin

Admin-এর জন্য একটা নতুন page যেখানে marketplace product-এ upload করা সব image gallery আকারে দেখা যাবে এবং reuse করা যাবে।

### নতুন page: `/admin/image-library`

**Data sources (২টা একসাথে merge করব):**
1. **Storage bucket scan** — `supabase.storage.from("product-images").list("marketplace", { limit: 1000, sortBy: { column: "created_at", order: "desc" } })` দিয়ে uploaded সব file আনব। প্রতিটার public URL generate করব।
2. **DB usage scan** — `marketplace_products.image_url` এবং `marketplace_product_variants.image_url` query করে দেখব কোন image কোন product/variant-এ ব্যবহার হচ্ছে।

দুইটা একসাথে join করে দেখাব: যেসব URL DB-তে আছে কিন্তু storage-এ নাই (manually paste করা external URL) সেগুলোও show করব "External" tag দিয়ে।

**UI:**
- Responsive grid (mobile 2-col, sm 3, md 4, lg 6)
- প্রতিটা card-এ:
  - Image preview (square, object-cover)
  - নিচে truncated URL (full URL hover/tap-এ tooltip)
  - Usage count badge ("৩টি product")
  - Copy URL button (clipboard) — toast confirmation
  - Open-in-new-tab icon
- Top bar:
  - Search box (URL/filename match)
  - Filter chips: "সব" / "ব্যবহৃত" / "অব্যবহৃত" / "External"
  - Total count
- Click → বড় preview dialog: full URL copyable + which products/variants ব্যবহার করছে তার list (clickable name, variant হলে label সহ)

**Wiring:**
- `src/pages/admin/ImageLibrary.tsx` (new) — page implementation
- `src/lib/admin-perms.ts` — `"image_library"` perm যোগ + label
- `src/components/admin/AdminSidebar.tsx` — sidebar entry (Images icon)
- `src/lib/app-routes.tsx` — lazy import + route `/admin/image-library`

### কোনো DB migration লাগবে না
শুধু read; storage bucket আগেই public।

### Future hook (এই PR-এ না)
পরে চাইলে variant editor / product image picker-এ "Choose from library" button দিয়ে এই gallery থেকে select করার flow add করা যাবে। এই PR শুধু view + copy URL দেবে।
