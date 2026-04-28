## সমস্যা

গ্রাহকের পাঠানো ফর্দ-এ প্রতিটি item-এর পাশে তিনটি action button আছে — **✓ পেয়েছে**, **✗ পায়নি**, **⏳ পরে দিবে**। এই buttons এ click করলে এখন কোনো visible পরিবর্তন হচ্ছে না।

## কারণ

`src/pages/app/CustomerWishlist.tsx` এর `setFulfillment` function দু'টা সমস্যা নিয়ে আছে:

1. **Silent failure** — `supabase.from(...).update(...).eq("id", it.id)` করার পর result/error check করা হয় না। RLS-এ row match না হলে কোনো error আসে না, শুধু 0 row update হয় — UI তে কোনো feedback ও আসে না।
2. **Stale UI** — update success হলেও শুধু `detailQ.refetch()` call হয়, কিন্তু কোনো optimistic update নেই; network slow হলে user মনে করে কিছুই হয়নি, আবার click করে — যা আগের state এ ফিরে যায় (toggle logic-এর কারণে)।
3. **Button-level error surface নেই** — toast ও দেখানো হয় না।

একই pattern `updateItemPrice / updateItemQty / updateItemUnit` এও আছে।

## সমাধান

`CustomerWishlist.tsx`-এর dialog component-এ:

1. **`setFulfillment` রিরাইট করা:**
   - update query-তে `.select()` চেইন করে actually-updated row পাওয়া হবে।
   - `error` থাকলে `toast.error(...)` দেখানো হবে।
   - 0 row update হলে `toast.error("আপডেট করা গেলো না — আবার লগইন করে চেষ্টা করুন")` (RLS / session expiry সংকেত)।
   - **Optimistic update**: react-query এর `qc.setQueryData(["customer-wishlist", wishlistId], ...)` দিয়ে সাথে সাথে UI আপডেট হবে; success হলে refetch, fail হলে rollback।

2. **Loading indicator** — যেই button click হয়েছে সেটায় ছোট্ট spinner দেখাবে যতক্ষণ request pending; double-click prevent করবে।

3. **`updateItemPrice / Qty / Unit` ও same pattern এ wrap করা** — silent failure দূর করার জন্য (এগুলোও same RLS path ব্যবহার করে)।

4. **Auth check**: dialog open হলে `supabase.auth.getSession()` verify করে session expired হলে user-কে warn করা হবে।

## কোনো DB পরিবর্তন নেই

`fulfillment_status` column, RLS policy, trigger — সব ঠিক আছে (verified)। সমস্যা শুধু client-side error handling এর।

## প্রভাবিত ফাইল

- `src/pages/app/CustomerWishlist.tsx` (single file)
