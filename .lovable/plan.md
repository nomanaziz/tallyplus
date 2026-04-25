# মার্কেটপ্লেস: টপ মেনু ফিরিয়ে আনা + সাইড ফিল্টার

## সমস্যা
`/shop`, `/shop/p/$id`, `/shop/s/$slug` — এই তিনটা পেজে কোডে নিজস্ব ছোট header বসানো আছে, যার কারণে সাইটের মূল টপবার (Home, Marketplace, Features, Pricing, Contact, ভাষা switch, Login/Dashboard) দেখা যায় না।

## সমাধান

### ১) টপ মেনু সব marketplace পেজে দেখাবে
- তিনটা route এর কাস্টম `<header>` বাদ দিয়ে শেয়ার্ড `SiteHeader` ব্যবহার করব।
- `SiteHeader`-এ "মার্কেটপ্লেস" লিংক আগে থেকেই আছে — তাই আলাদা কিছু লাগবে না।
- পণ্য/দোকান পেজে ছোট "← মার্কেটপ্লেসে ফিরুন" breadcrumb টপবারের নিচে রাখব।

### ২) সাইড ফিল্টার (`/shop`)
ডেস্কটপে বামপাশে sticky সাইডবার, মোবাইলে একটা "ফিল্টার" বাটন থেকে Sheet খুলবে। ফিল্টারগুলো:

- **মূল্যসীমা** — min / max price ইনপুট
- **দোকানের ধরন (shop type)** — `shop_types` থেকে লোড, checkbox
- **দোকান** — বর্তমান results-এ থাকা দোকানের তালিকা থেকে multi-select
- **শুধু স্টকে আছে** — toggle
- **সাজান (sort)** — নতুন আগে / দাম কম-বেশি / দাম বেশি-কম
- **রিসেট** বাটন

Filter state URL search params-এ রাখব (`min`, `max`, `type`, `inStock`, `sort`) যাতে শেয়ারযোগ্য হয়।

### Backend
`marketplace-public` edge function-এ `list` action-এ নতুন optional প্যারামিটার যোগ:
- `min_price`, `max_price`, `shop_type`, `in_stock`, `sort`
সেই অনুযায়ী Supabase query filter/sort করব। বর্তমান text search behavior অপরিবর্তিত।

## পরিবর্তন হবে এমন ফাইল
- `src/routes/shop.index.tsx` — SiteHeader, সাইডবার লে-আউট, ফিল্টার UI + URL state
- `src/routes/shop.p.$id.tsx` — SiteHeader ব্যবহার
- `src/routes/shop.s.$slug.tsx` — SiteHeader ব্যবহার
- `supabase/functions/marketplace-public/index.ts` — `list` action-এ ফিল্টার/sort সাপোর্ট

কোনো নতুন dependency বা DB migration লাগবে না।
