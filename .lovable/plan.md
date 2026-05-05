## লক্ষ্য

ফর্দ তৈরি করার সময় ব্যবহারকারী যেন একসাথে অনেকগুলো পণ্য বাংলা টেক্সট হিসেবে paste করে দিতে পারেন (যেমন কেউ লিস্ট লিখে পাঠিয়েছে), এবং অ্যাপ সেগুলো নিজে নিজে আলাদা item হিসেবে সাজিয়ে দেবে — নাম, পরিমাণ, একক আলাদা করে।

উদাহরণ ইনপুট:
```
গৌরী হুইল পাউডার ৪ কেজি, নিম সাবান ২ টা।
ম্যাগি নুডুলস ৮ প্যাকেট, ড্রাই কেক ২ টা, লেক্সাস বিস্কুট ১ টা।
নিডো দুধ (৩+) ১ টা, ডিপ্লোমা ১ কেজি+১/২ কেজি, টুইংকেল ডায়পার XL, ভিমবার ২ টা।
টয়লেট টিস্যু ১ ডজন, টমেটো সস ১ কেজি, সয়াবিন তেল ৫ লিটার, ...
```

প্রতিটি কমা/দাঁড়ি/নতুন লাইনে আলাদা item, এবং `১ কেজি+১/২ কেজি` জাতীয় যোগফল `১.৫ কেজি` হিসেবে।

## পরিবর্তনের ধরণ

### ১. Parser কে আলাদা utility-তে নেওয়া
নতুন ফাইল: `src/lib/fordoTextParser.ts`
- বর্তমানে `VoiceFordoMic.tsx`-এ থাকা `parseItems / splitChunkIntoItems / parsePhrase / matchUnit / wordToNum / normalizeDigits / NUMBER_WORDS / UNIT_WORDS / TRAILING_ONE_PIECE` — সব এখানে move হবে।
- `VoiceFordoMic.tsx` ওই utility থেকে import করবে (behavior অপরিবর্তিত)।

### ২. Parser-এ নতুন support
- `১/২`, `১/৪`, `৩/৪` ভগ্নাংশ → `0.5`, `0.25`, `0.75` (Bangla + ASCII দুইটাই)
- `১ কেজি + ১/২ কেজি` মতো একই unit-এর যোগফল → এক item, qty যোগ হয়ে যাবে
- `টা / টি / খানা` → `পিস` unit হিসেবে গণ্য
- `XL / L / M / S / XXL` size token → name-এর শেষে রেখে দেবে (qty=১, unit=পিস ধরে নেবে যদি qty না থাকে)
- বন্ধনীর ভেতরের অংশ (`(৩+)`, `(নরম দেখে)`, `(৪ টা একসাথে যে থাকে ওটা)`) → name-এর সাথে রেখে দেবে, qty/unit হিসেবে পার্স করবে না
- separator-এ `।` (দাঁড়ি), newline, কমা, semicolon — সবই item-break

### ৩. নতুন UI: "টেক্সট থেকে তালিকা" বোতাম
`src/pages/customer/CreateFordo.tsx` — Step 1-এ মাইকের পাশে নতুন outline বোতাম `📋 টেক্সট থেকে তালিকা`।
ক্লিক করলে নতুন dialog খুলবে।

নতুন কম্পোনেন্ট: `src/components/app/BulkTextToFordoDialog.tsx`
- বড় Textarea — placeholder-এ একটা example লিস্ট
- নিচে live preview: parser যা বুঝেছে (নাম | পরিমাণ | একক টেবিল আকারে)
- "যোগ করুন" বোতাম — parser-এর output বর্তমান items-এ append করবে (existing voice-mic flow-এর মতই — খালি row থাকলে replace, নাহলে push)
- "বাতিল" বোতাম
- যদি কোনো line parse না হয়, ওটা warning হিসেবে দেখাবে কিন্তু name হিসেবে রাখবে

## প্রভাবিত ফাইল

- নতুন: `src/lib/fordoTextParser.ts`
- নতুন: `src/components/app/BulkTextToFordoDialog.tsx`
- পরিবর্তন: `src/components/app/VoiceFordoMic.tsx` (parser import-এ পাল্টানো)
- পরিবর্তন: `src/pages/customer/CreateFordo.tsx` (নতুন বোতাম + dialog wire-up)

কোনো database / migration / edge function পরিবর্তন নেই।
