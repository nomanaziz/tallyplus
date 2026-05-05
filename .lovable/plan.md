## লক্ষ্য
`/app/sell` ও `/app/purchase`-এর Grid ভিউতে প্রতি page-এ অনেক বেশি product দেখা — mobile-এ যাতে এক row-এ ৩টা card ধরে এবং card গুলো অনেক ছোট হয়।

## ফাইল
শুধু `src/components/app/POSPage.tsx` (লাইন ৩৭৩–৪১৯, grid block)।

## পরিবর্তন

### 1. Grid columns — mobile-এ ৩, ধাপে ধাপে বেশি
```
grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7
gap-1.5
```
(আগে ছিল `grid-cols-2 ... xl:grid-cols-5 gap-2`)

### 2. Image ছোট ও price overlay
- `aspect-square` রাখব কিন্তু card নিজেই ছোট হবে কলাম বাড়ানোয়।
- Image-এর নিচে একটা semi-transparent gradient strip বসিয়ে তার উপরে **price** দেখাব — text block থেকে price সরিয়ে দেব, ফলে নিচের text block অনেক ছোট হবে।
- Floating "+" button ছোট: `h-7 w-7` (ছিল `h-8 w-8`), icon `h-3.5 w-3.5`। Cart badge ও ছোট: `text-[9px] px-1`।

```
<div className="relative aspect-square ...">
  <img ... />
  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between
                  bg-gradient-to-t from-black/70 via-black/35 to-transparent
                  px-1 pb-0.5 pt-3">
    <span className="text-[11px] font-extrabold leading-none text-white drop-shadow">
      {fmtMoney(price, lang)}
    </span>
    {p.unit && <span className="text-[9px] text-white/85">/{p.unit}</span>}
  </div>
  {/* + button + cart badge — smaller */}
</div>
```

### 3. নিচের text block — শুধু নাম + stock, padding কম
```
<div className="px-1.5 py-1">
  <div className="line-clamp-2 min-h-[1.9em] text-[10.5px] font-medium leading-tight">
    {p.name}
  </div>
  <div className="mt-0.5 text-[9px] text-muted-foreground">
    স্টক: <span className={p.stock<=0 ? "font-semibold text-destructive" : ""}>
      {lang==="bn"?bnNum(p.stock):p.stock}
    </span>
  </div>
</div>
```
- Card border radius: `rounded-lg` (ছিল `rounded-xl`) — আরও tight।
- Stock যদি জায়গা বাঁচাতে চান, পরে `0` হলে শুধু একটা ছোট red dot করা যেতে পারে — এই round-এ করব না, শুধু font ছোট করব।

### ফলাফল
390px viewport-এ এক স্ক্রিনে ৪টার বদলে ~৯–১২টা product দেখা যাবে; price image-এর উপরে থাকায় text block দু'লাইনে শেষ হবে।

কোনো logic, search, infinite-scroll, cart বা list-view পরিবর্তন হবে না।