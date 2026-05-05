
# ছবি থেকে ফর্দ (Image → Fordo)

গ্রাহক বা দোকানদার খাতায় লেখা বাজারের ফর্দের ছবি তুলবেন/upload করবেন। AI সেটি OCR + parse করে নাম/পরিমাণ/একক বের করবে এবং বিদ্যমান `ParsedItem[]` list-এ যোগ করে দেবে। ছবি কোথাও সংরক্ষণ হবে না — শুধু একবার AI gateway-তে পাঠানো হবে, response পাওয়ার পর memory থেকেও মুছে দেওয়া হবে।

## কোথায় যুক্ত হবে

দুটি জায়গায় — same component reuse:

1. **গ্রাহক side** — `src/pages/customer/CreateFordo.tsx` (Step 1, "টেক্সট থেকে" ও "Voice" বাটনের পাশে নতুন "ছবি থেকে" বাটন)।
2. **দোকান side** — `src/pages/app/CustomerWishlist.tsx`-এ যেখানে দোকানদার নিজে কাস্টমারের হয়ে ফর্দ যোগ করতে পারে (যদি existing manual-add flow থাকে; নাহলে একই dialog কে `QuickFordoDialog`/`BulkTextToFordoDialog`-এর সাথে পাশাপাশি বসাব)।

বিদ্যমান `BulkTextToFordoDialog`-এর `onAdd(items: ParsedItem[])` contract এর সাথে সামঞ্জস্য রেখে নতুন dialog একই shape return করবে — তাই কোনো parent state changes লাগবে না।

## নতুন ফাইল

### 1. `supabase/functions/parse-fordo-image/index.ts` (Edge function)

- POST: `{ image_base64: string, mime: string }` (max ~6MB)
- `LOVABLE_API_KEY` ব্যবহার করে Lovable AI Gateway-তে `google/gemini-2.5-flash` (vision-capable) call করবে।
- System prompt (Bangla): "এই ছবিটি একটি হাতে লেখা/printed বাজারের ফর্দ। প্রতিটি পণ্যের নাম, পরিমাণ (সংখ্যা), একক বের করো। JSON array দাও: `[{name, qty, unit}]`. একক হবে: কেজি/গ্রাম/লিটার/মিলি/পিস/প্যাকেট/বোতল/বস্তা/ডজন/হালি/আঁটি ইত্যাদি। বাংলা output দাও।"
- Tool/JSON schema দিয়ে structured output force করব (response_format=json_object বা tool call)।
- Response: `{ items: ParsedItem[] }` — সাথে সাথে `ছবি কোথাও store করব না` (no DB insert, no storage upload)।
- CORS headers, rate-limit-friendly error handling (`429`/`402` user-friendly বার্তা)।
- কোনো RLS/DB টেবিল লাগবে না।

### 2. `src/components/app/ImageToFordoDialog.tsx`

Props identical to `BulkTextToFordoDialog`:
```ts
{ open, onOpenChange, onAdd: (items: ParsedItem[]) => void }
```

UI flow:
- Upload area: একটি `<input type="file" accept="image/*" capture="environment">` — মোবাইলে camera সরাসরি খুলবে, desktop-এ file picker। সাথে একটা "ছবি বদলান" button।
- Selected image preview (thumbnail, max-h-48 object-contain) + file size।
- Client-side resize/compress (canvas → JPEG 1600px max, quality 0.8) যাতে payload ছোট থাকে এবং OCR ভালো হয়। তারপর base64।
- "বিশ্লেষণ করুন" button → loading spinner সহ edge function call।
- Result preview: একই table layout যেমন `BulkTextToFordoDialog`-এ আছে (#, নাম, পরিমাণ, একক) — copy-paste করে style consistency রাখব।
- প্রতিটি row-এর পাশে delete (✕) button যাতে ভুল item বাদ দেওয়া যায়।
- "তালিকায় যোগ করুন" → `onAdd(items)` call করে dialog বন্ধ। Image variable null করা হবে (memory cleanup)।
- Fallback: AI ব্যর্থ/বুঝতে না পারলে toast — "ছবি থেকে পড়া যায়নি — হাতে টাইপ করুন বা টেক্সট থেকে ব্যবহার করুন"।

কোনো image upload to storage হবে না — explicitly `// NOTE: image is intentionally NOT persisted` কমেন্ট।

## বিদ্যমান ফাইলে পরিবর্তন

### `src/pages/customer/CreateFordo.tsx`
- নতুন state: `const [showImage, setShowImage] = useState(false);`
- নতুন import: `ImageToFordoDialog`, `ImageIcon` (lucide `Image` or `Camera`)
- "টেক্সট থেকে" বাটনের পাশে "ছবি থেকে" বাটন (একই variant/size)।
- Render `<ImageToFordoDialog open={showImage} onOpenChange={setShowImage} onAdd={handleParsedAdd} />` — `handleParsedAdd` ইতিমধ্যে `BulkTextToFordoDialog` যেভাবে ব্যবহার করছে সেটাই reuse।

### `src/pages/app/CustomerWishlist.tsx` (দোকানদার side)
- Header-এর action area-তে একই "ছবি থেকে ফর্দ" বাটন। Click → same `ImageToFordoDialog`। `onAdd` callback একটি নতুন helper-এ items গুলো `customer_wishlist_items` table-এ insert করবে (যদি দোকানদার নিজে customer-এর হয়ে ফর্দ লিখছে)।
- যদি বর্তমানে দোকান-side manual create UI না থাকে তবে শুধু গ্রাহক side-এ scope সীমিত রাখব (এই plan-এ এটাই default)। ব্যবহারকারীর প্রয়োজন হলে পরে যোগ করা যাবে।

## Technical details

- AI provider: Lovable AI Gateway, model `google/gemini-2.5-flash` (vision, fast, cheap)। Edge function-এ `Authorization: Bearer ${LOVABLE_API_KEY}` header।
- Structured output: `tools: [{ type: "function", function: { name: "extract_fordo_items", parameters: {...} } }]` + `tool_choice: { type: "function", function: { name: "extract_fordo_items" } }`। Schema:
  ```json
  { "type":"object","properties":{"items":{"type":"array","items":{
    "type":"object","properties":{
      "name":{"type":"string"},
      "qty":{"type":"string"},
      "unit":{"type":"string"}
    },"required":["name"]}}},"required":["items"]}
  ```
- Response থেকে `tool_calls[0].function.arguments` parse করে items return।
- Edge function `verify_jwt = true` (default) — গ্রাহক login থাকা avoidable নয়; তাই `supabase.functions.invoke("parse-fordo-image", { body: {...} })` automatic auth header পাঠাবে।
- Image size limit client-side: 8MB raw → resize-এর পর ~400KB।
- Error states: 429 → "AI ব্যস্ত, একটু পরে চেষ্টা করুন"; 402 → "AI credit শেষ"; অন্য → generic।
- কোনো DB schema পরিবর্তন/RLS পরিবর্তন নেই।

## Out of scope (এখন নয়)

- Image-কে DB/storage-এ রাখা (ব্যবহারকারী স্পষ্টভাবে বলেছেন "image-এর সংরক্ষণ আপাতত রাখছি না")।
- Audio/video বা multi-image batch।
- দোকানদার side-এ ছবি থেকে নতুন কাস্টমার ফর্দ insert করার full flow — যদি বর্তমান page-এ manual entry না থাকে তো প্রথম iteration-এ শুধু গ্রাহক side।
