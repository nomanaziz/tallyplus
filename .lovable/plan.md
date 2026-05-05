## লক্ষ্য
Admin → Image Library page এ user যেন **যেকোনো image (এমনকি product/variant এ ব্যবহৃত হলেও, এমনকি external URL হলেও) সম্পূর্ণভাবে delete** করতে পারেন, এবং একসাথে অনেকগুলো select করে **bulk delete** করতে পারেন।

বর্তমানে শুধু storage source এর unused image delete বোতাম দেখা যায়, external URL বা used image মুছে ফেলার উপায় নেই।

## কী যোগ হবে

### 1. প্রতিটি image-এ delete option (সব ক্ষেত্রে)
- **Storage image**: Supabase storage থেকে file remove + DB তে যেসব product/variant এই URL ব্যবহার করছে তাদের `image_url = NULL` করে দেওয়া।
- **External image**: শুধু DB তে যেসব row এই URL ব্যবহার করছে তাদের `image_url = NULL` করে clear করা (URL টা library থেকেও চলে যাবে)।
- Used image delete করার সময় confirm dialog এ স্পষ্ট warning — "X টি product/variant এর ছবি মুছে যাবে"।

### 2. Multi-select + Bulk delete
- প্রতিটি card এর কোনায় checkbox।
- "Select all (filtered)" বোতাম — current filter (যেমন "অব্যবহৃত" বা "External") অনুযায়ী সব select।
- Top toolbar এ **"Delete selected (N)"** বোতাম — confirm করার পর সবগুলো একসাথে মুছবে।
- Progress toast: "X/Y deleted…"।

### 3. "Delete ALL unused" quick action
- এক ক্লিকে সব unused storage image মুছে ফেলার shortcut (storage cleanup এর জন্য সবচেয়ে নিরাপদ option, তাই আলাদা button)।

## Technical details

ফাইল: `src/pages/admin/ImageLibrary.tsx` (একমাত্র পরিবর্তন)।

Delete logic:
```ts
async function deleteImages(items: ImageItem[]) {
  const urls = items.map(i => i.url);
  const storagePaths = items.filter(i => i.path).map(i => i.path!);

  // 1. DB তে references clear (product + variant)
  await supabase.from("marketplace_products")
    .update({ image_url: null }).in("image_url", urls);
  await supabase.from("marketplace_product_variants")
    .update({ image_url: null }).in("image_url", urls);

  // 2. Storage থেকে files remove (একবারে batch)
  if (storagePaths.length) {
    await supabase.storage.from(BUCKET).remove(storagePaths);
  }
}
```

UI changes:
- নতুন `Set<string>` state — `selected` (URL দিয়ে track)।
- Card এ top-left checkbox (existing "External" badge এর পাশে)।
- Toolbar এ conditional bar: যখন `selected.size > 0` — "N selected | Clear | Delete selected"।
- Existing single-image delete confirm dialog কে generic করে fix — items array নেবে।
- Delete button সব image এ দেখানো হবে (storage + external উভয়)।

Permissions / RLS:
- Admin portal এ already `image_library` permission check আছে — extra change লাগবে না।
- `marketplace_products` / `marketplace_product_variants` UPDATE policy admin দের জন্য already exist (Marketplace admin page থেকে edit হয়), তাই নতুন migration লাগবে না।
- Storage bucket `product-images` এর delete policy admin role এর জন্য already enabled (বর্তমান single delete কাজ করছে)।

## যা পরিবর্তন হবে না
- কোনো DB migration নেই।
- অন্য page অপরিবর্তিত।
- Marketplace product/variant data delete হবে না — শুধু তাদের `image_url` field null হবে, যাতে product/variant অক্ষত থাকে কিন্তু broken image দেখা না যায়।