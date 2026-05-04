## Goal

Mobile-এ Dashboard-এর শুরুতে যে summary card-টা আছে সেখানে এখন ৬টা ঘর (Sales / Purchase / Expense + Stock / Receivable / Payable)। এর নিচে আরও **৩টা ছোট ঘর** যোগ করা হবে যাতে আরও কিছু গুরুত্বপূর্ণ information এক জায়গায় দেখা যায়।

## নতুন ৩টা ঘর (একটা নতুন row, একই কার্ডে)

`dashboardOverviewQuery` থেকে data ইতিমধ্যে আসছে — নতুন কোনো query লাগবে না। ৩টা ঘর হবে:

1. **নতুন অর্ডার** (`overview.ordersPending`) → tap করলে `/app/online-shop/orders`
2. **নতুন ফর্দ** (`overview.fordoNew`) → tap করলে `/app/customer-wishlist`
3. **কম স্টক** (`overview.productsLowStock`) → tap করলে `/app/products`

প্রতিটা ঘর আগের stat ঘরগুলোর মতই compact (একটু ছোট padding), tappable Link হবে, এবং value কালার-কোডেড হবে (যেমন কম স্টক destructive, নতুন অর্ডার primary, নতুন ফর্দ violet/success)। ০ হলে muted দেখাবে।

## File change

- `src/pages/app/Dashboard.tsx` — summary card-এর ভেতরে `Receivable / Payable` row-এর নিচে আরেকটা `grid-cols-3 divide-x border-t` row যোগ করা হবে। ঘরগুলো `<Link>` হবে যাতে tap করে ঐ পেজে যাওয়া যায়। `useQuery(dashboardOverviewQuery(...))`-এর `overview` ইতিমধ্যে loaded — সেটাই ব্যবহার হবে।

Mobile + desktop দুই জায়গাতেই এই row দেখা যাবে (desktop-এর নিচের বড় KPI গ্রিড আগের মতই থাকবে, ডুপ্লিকেশন মানে desktop-এ কম্প্যাক্ট ঘরও থাকবে — চাইলে শুধু mobile-এ সীমাবদ্ধ করা যায় `md:hidden` দিয়ে; default রাখব mobile-only যাতে desktop overview clean থাকে)।

## Out of scope

- কোনো নতুন data source/query যোগ করা হবে না।
- Service বুকিং metric এই shop dashboard-এ এখনো নেই; পরে চাইলে আলাদা query দিয়ে যোগ করা যাবে।
