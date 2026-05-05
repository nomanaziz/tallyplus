## ফর্দ শেয়ার ও লাইভ ট্র্যাকিং

বর্তমানে শেয়ার লিংক ও WhatsApp শেয়ার আছে (`/share/fordo/:token`)। তিনটা জিনিস যোগ করব:

### ১. ডাউনলোডযোগ্য স্লিপ (PDF/Image)
- শেয়ার পেজ ও MyFordo-এ "ডাউনলোড স্লিপ" বাটন
- সিম্পল লেআউট: শুধু নাম + পরিমাণ (kg/পিস) + টিক বক্স
- jsPDF দিয়ে A5/থার্মাল-সাইজ PDF তৈরি — দাম optional toggle
- ফাইল নাম: `fordo-{customer-name}-{date}.pdf`

### ২. লাইভ চেকলিস্ট (Husband/Wife use case)
- শেয়ার পেজে প্রতিটা item-এর পাশে চেকবক্স
- কেউ লিংকে গিয়ে টিক দিলে DB-তে `customer_wishlist_items.done = true` হবে
- Owner (যে ফর্দ বানাইছে) MyFordo পেজে realtime দেখবে কোনগুলো কেনা হইছে
- Progress bar: "৫/১০ কেনা হইছে"

### ৩. শেয়ার পার্মিশন কন্ট্রোল
- ফর্দ owner টগল করতে পারবে: "অন্যরা টিক দিতে পারবে কিনা" (`allow_check` flag)
- Default: ON

### Technical details

**DB migration:**
- `consumer_fordos` (বা `customer_wishlists`) টেবিলে `allow_public_check boolean default true` কলাম
- নতুন RPC `toggle_shared_fordo_item(_token, _item_id, _done)` — SECURITY DEFINER, `allow_public_check=true` ও token valid হলেই update; rate-limit per IP optional
- বা existing `get_shared_fordo` RPC-র সাথে paired update RPC

**Frontend:**
- `src/pages/f/Share.tsx`:
  - প্রতিটা row-এ Checkbox (allow_public_check হলে)
  - Optimistic update + RPC call
  - Supabase realtime subscription on `customer_wishlist_items` filtered by wishlist_id (owner side)
  - "ডাউনলোড স্লিপ" বাটন
- `src/lib/fordo-pdf.ts` (নতুন): jsPDF দিয়ে slip generate
- `src/pages/customer/MyFordo.tsx`:
  - Realtime subscribe — done count update
  - প্রতিটা ফর্দ কার্ডে "৩/৭ কেনা" badge
  - "অন্যরা টিক দিতে পারবে" toggle switch
  - PDF download বাটন

**Dependencies:** `bun add jspdf` (lightweight, edge-safe)

**Files:**
- create: `src/lib/fordo-pdf.ts`, `src/components/customer/FordoSlipDownload.tsx`
- edit: `src/pages/f/Share.tsx`, `src/pages/customer/MyFordo.tsx`, `src/lib/share-fordo.ts`
- migration: `allow_public_check` column + `toggle_shared_fordo_item` RPC + RLS-bypass trigger via SECURITY DEFINER

Approve করলে migration ও code একসাথে শুরু করব।