## কী করবো

আপনার পাঠানো ৫টা screenshot অনুযায়ী তিনটা জিনিস implement করব:

### ১. Quick Sell — sidebar থেকে সরিয়ে topbar-এ
- Sidebar (`AppSidebar.tsx`) থেকে "দ্রুত বেচা / Quick Sell" item বাদ
- Topbar (`AppTopbar.tsx`)-এ একটা prominent green button: **⚡ দ্রুত বেচা** (WhatsApp/Bell icon-এর বাঁ পাশে)
- Click করলে ডান দিক থেকে slide-in **Sheet** popup খুলবে — `QuickSellSheet` নামে নতুন component
- Popup-এর content (image-20 অনুযায়ী):
  - বিক্রির তারিখ (date picker, default আজ)
  - মূল্য পরিশোধ পদ্ধতি: শুধু "নগদ টাকা" (radio, selected)
  - টাকার পরিমাণ * (required)
  - লাভ (optional)
  - কাস্টমার নাম (with contact-search icon)
  - কাস্টমার মোবাইল নম্বর (+88 prefix)
  - মন্তব্য লিখুন (textarea)
  - নিচে: SMS toggle + "এসএমএস অবশিষ্ট: 30" badge
  - Bottom CTA: **টাকার মূল্য পেয়েছেন** (full-width black button)
- Save হলে `sales` table-এ একটা cash sale row insert হবে (no items, just amount + profit + customer)। `/app/quick-sell` route ও তার file বাদ দিয়ে দিব।

### ২. Purchase/Sell-এ deep-link দিয়ে বাকি পপআপ pre-open
- `POSPage`-এ একটা search-param support: `?payment=due` থাকলে mount হওয়ার সাথে সাথেই **Due dialog** auto-open হবে
- এটা Due Ledger flow থেকে redirect করার জন্য দরকার (নিচে #৩)

### ৩. Due Ledger পেজ — পুরো বানাবো (এখন placeholder)
**`app.due-ledger.tsx`** — image-21 অনুযায়ী layout:
- Header: "বাকির খাতা" + ডানে badges "মোট পাবো ৳0", "মোট দিবো ৳0", "বাকির ইতিহাস" button, "+ নতুন বাকি" CTA (black)
- Two-pane layout:
  - বাঁ panel: Tabs (কাস্টমার | সাপ্লায়ার | কর্মচারী) + search + PDF export
  - ডান panel: contact-wise transaction list with date range filter
- Empty state: "আপনার কোন লেনদেন নেই"

**"+ নতুন বাকি" click করলে — Step 1 modal** (image-22):
- Title: "Select the due type"
- বড় দুইটা card: **পণ্য বাকি** | **টাকা বাকি**
- নিচে radio: "দিচ্ছি (আপনি বাকি দিচ্ছেন)" | "নিচ্ছি (আপনি বাকি নিচ্ছেন)"
- **Continue** button:
  - **পণ্য বাকি + দিচ্ছি** → redirect `/app/sell?payment=due` (বেচা পেজ, বাকি pop-up auto-open)
  - **পণ্য বাকি + নিচ্ছি** → redirect `/app/purchase?payment=due` (কেনা পেজ, বাকি pop-up auto-open)
  - **টাকা বাকি** → Step 2 modal খুলবে

**Step 2 modal — "Add Money Given Entry"** (image-23):
- Top tabs: কাস্টমার | সাপ্লায়ার | কর্মচারী (party type select)
- তারিখ (date picker)
- নগদ টাকা: দিচ্ছি / নিচ্ছি (radio cards, Step 1 থেকে pre-selected)
- টাকার পরিমাণ *
- কাস্টমার/সাপ্লায়ার/কর্মচারীর নাম * (tab অনুযায়ী label change)
- ফোন নাম্বার * (+88)
- ঠিকানা (optional)
- মন্তব্য (textarea)
- নিচে SMS toggle
- Bottom CTA: **সেভ করুন**
- Save হলে `cash_movements` table-এ direction অনুযায়ী in/out row + contact upsert

### ফাইল changes

**নতুন:**
- `src/components/app/QuickSellSheet.tsx`
- `src/components/app/DueTypePickerDialog.tsx` (Step 1)
- `src/components/app/MoneyDueEntryDialog.tsx` (Step 2)

**Edit:**
- `src/components/app/AppSidebar.tsx` — Quick Sell item বাদ
- `src/components/app/AppTopbar.tsx` — Quick Sell trigger button যোগ
- `src/components/app/POSPage.tsx` — `?payment=due` search-param handle করে দিতে হবে
- `src/routes/app.due-ledger.tsx` — পুরো পেজ build
- `src/routes/app.tsx` — যদি দরকার হয় (probably not)

**Delete:**
- `src/routes/app.quick-sell.tsx` (route আর দরকার নেই, modal হয়ে গেছে)

Approve করলে শুরু করছি।