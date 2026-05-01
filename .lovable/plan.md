## Goal

গ্রাহক (consumer) এলাকায় App Training যোগ করো এবং admin training ভিডিও তৈরির সময় বেছে নেওয়া যাবে — ভিডিওটা **দোকানদারের জন্য**, **গ্রাহকের জন্য**, নাকি **উভয়ের জন্য**। সেই অনুযায়ী ভিডিও সঠিক audience এর Training page-এ দেখাবে।

## Database change (migration)

`training_videos` টেবিলে একটা নতুন column যোগ করো:

```sql
ALTER TABLE public.training_videos
  ADD COLUMN audience text NOT NULL DEFAULT 'shopkeeper';
-- allowed values: 'shopkeeper' | 'consumer' | 'both'
```

পুরনো ভিডিওগুলো default-এ `shopkeeper` হিসেবে থাকবে (এখনকার আচরণ অপরিবর্তিত)।

RLS: পাবলিক select policy আগে থেকেই `is_published = true` filter করে — কোন পরিবর্তনের দরকার নেই। শুধু audience filter ক্লায়েন্ট থেকে যোগ হবে।

## Admin (`src/pages/admin/Training.tsx`)

- `Video` type-এ `audience: 'shopkeeper'|'consumer'|'both'` যোগ।
- Edit/Add dialog-এ একটা নতুন **Audience** Select:
  - দোকানদার (Shopkeeper)
  - গ্রাহক (Consumer)
  - উভয় (Both)
- Card preview-তে category badge-এর পাশে একটা ছোট audience badge দেখাও (যেমন "গ্রাহক" / "দোকানদার" / "উভয়")।
- Save payload-এ `audience` পাঠাও; default `shopkeeper`।

## Shopkeeper Training page (`src/pages/app/Training.tsx`)

Query-তে filter: `audience IN ('shopkeeper','both')`। বাকি UI অপরিবর্তিত।

## Consumer Training — নতুন page

নতুন ফাইল: `src/pages/customer/Training.tsx`
- Layout: `src/pages/app/Training.tsx`-এর মতই grid + search + category chips + YouTube modal player।
- Query: `is_published = true AND audience IN ('consumer','both')`।
- শিরোনাম: "অ্যাপ ট্রেনিং"।

### Routing & Nav
- `src/lib/app-routes.tsx`-এ নতুন lazy import + route যোগ করো customer section-এ:
  `{ path: "training", element: <CustomerTraining/> }` → পাথ হবে `/customer/training`।
- `src/pages/customer/CustomerLayout.tsx`-এর `NAV`-এ "ট্রেনিং" entry যোগ করো (আইকন: `GraduationCap`)। মোবাইল bottom nav 5-column থেকে 6-column হবে।

## Technical notes

- টাইপ regen-এর দরকার নেই — `audience` কে cast করে ব্যবহার করা যাবে যতক্ষণ Supabase types regenerate না হয়।
- কোন breaking change নেই; পুরনো ভিডিওগুলো default `shopkeeper` audience পাবে এবং আগের মতোই দোকানদার page-এ দেখাবে।