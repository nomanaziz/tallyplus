## POS পেজে ৩টি ছোট fix

### ১) Product card-এ `+` button আর quantity badge ঠিক করা
ফাইল: `src/components/app/POSPage.tsx` (line 583–599)

বর্তমানে `+` button আর `×qty` badge শুধু ছোট image box-এর কোণায় বসানো — তাই কেটে যাচ্ছে এবং ছোট দেখাচ্ছে।

পরিবর্তন:
- `+` button-কে image box থেকে সরিয়ে **পুরো card-এর top-right corner**-এ নিয়ে যাওয়া হবে (card-এর `relative` wrapper-এ `absolute right-1.5 top-1.5`)। Size বাড়িয়ে `h-7 w-7` করা হবে যাতে স্পষ্ট দেখা যায়।
- `×qty` badge-ও card-এর top-left corner-এ বড় করে বসানো হবে (`absolute left-1.5 top-1.5`, `text-[11px] px-2 py-0.5`), যাতে cart-এ কতগুলো আছে স্পষ্ট পড়া যায়।
- Image box-এর `overflow-hidden` ঠিকই থাকবে; badge/button card-এর বাইরের layer-এ থাকবে তাই আর clip হবে না।
- Card-এ `pt-1` যোগ করে room রাখা হবে যাতে badge content-এর সাথে overlap না করে।

### ২) Right cart panel-এ Cash / Due / Hold button layout পরিবর্তন
ফাইল: `src/components/app/POSPage.tsx` (line 851–887)

বর্তমান: Hold আর Checkout পাশাপাশি (2 column), নিচে আলাদা ছোট "বাকি →" link।

নতুন layout (উপর থেকে নিচ):
1. **বড় Cash button** (পুরো width, `h-14`, primary color, bold) — label: `Cash (F1)` / `ক্যাশ (F1)` ("নগদ" শব্দটা সরানো হবে যাতে Nagad payment method-এর সাথে confusion না হয়)। Icon: `ShoppingBag` বা `Banknote`।
2. **বড় Due button** (পুরো width, `h-14`, outline style, secondary tone) — label: `Due` / `বাকি`। শুধু sell mode-এ দেখাবে। `setDueOpen(true)` call করবে।
3. **ছোট Hold button** নিচে (`h-9`, subtle ghost/outline amber tone, ছোট text) — label: `Hold (F2)` / `হোল্ড (F2)`।

এতে main two actions (Cash + Due) বড় ও prominent হবে, আর Hold secondary action হিসেবে নিচে থাকবে।

### ৩) "নগদ" শব্দ POS UI থেকে সরানো
ফাইল: `src/lib/i18n.tsx`

শুধু POS-related key গুলোতে Bangla string `"নগদ টাকা"` → `"ক্যাশ"` করা হবে:
- `p2c_cashArrow`: `"নগদ টাকা →"` → `"ক্যাশ →"`
- `p2c_cash`: `"নগদ টাকা"` → `"ক্যাশ"`

বাকি জায়গা (cashbox permission, customer money page, finance methods, report labels) **touch করা হবে না** — শুধু POS এর Cash button-এর label।

### যা পরিবর্তন হবে না
- Menu order, sidebar, routing, backend logic, payment flow, discount calculation — কিছুই না।
- শুধু POS page-এর product card visual, cart panel button layout, এবং Cash button-এর Bangla label।

### Files
- `src/components/app/POSPage.tsx` — card badge/+ button repositioning + cart action buttons restructure
- `src/lib/i18n.tsx` — দুটি Bangla string update
