## লক্ষ্য
`/app/sell` ও `/app/purchase` এর POS পেজে তিনটা ছোট পরিবর্তন।

## ফাইল
শুধু `src/components/app/POSPage.tsx`।

## ১) Grid কলাম ratio ঠিক করা

বর্তমান:
```
grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7
```

নতুন (mobile 3, tablet 4, desktop 7):
```
grid-cols-3 md:grid-cols-4 lg:grid-cols-7
```
(`sm`/`xl` step বাদ — সরাসরি ৩ → ৪ → ৭।)

## ২) Tablet (md) ভিউতেও Mobile-এর মতো Tab toggle

বর্তমানে `md:` থেকেই product+cart side-by-side দেখায়, ফলে ট্যাবলেটে দুই কলাম চিপে যায়।

পরিবর্তন:
- Mobile tab bar `md:hidden` → `lg:hidden` (ট্যাবলেটেও Products/Cart toggle থাকবে)।
- Outer grid `md:grid-cols-2` → `lg:grid-cols-2` (lg থেকে side-by-side)।
- Product panel hide class: `mobileTab === "cart" ? "hidden md:block" : ""` → `"hidden lg:block"`।
- Cart panel hide class: `mobileTab === "products" ? "hidden md:block" : ""` → `"hidden lg:block"`।

ফলে tablet (md, 768–1023px) এ mobile-এর মতোই এক side এ পণ্য, tap করে cart।

## ৩) Cart row → Invoice-style table

বর্তমান card layout (নাম উপরে, ৩-column grid নিচে — প্রতি row বড়) সরিয়ে compact table:

| # | পণ্য | মূল্য | পরিমাণ | মোট | 🗑 |

Markup স্কেচ:
```
<table className="w-full text-xs">
  <thead className="text-[10px] uppercase text-muted-foreground">
    <tr className="border-b">
      <th className="w-6 py-1 text-left">#</th>
      <th className="py-1 text-left">পণ্য</th>
      <th className="w-16 py-1 text-right">মূল্য</th>
      <th className="w-14 py-1 text-center">পরিমাণ</th>
      <th className="w-16 py-1 text-right">মোট</th>
      <th className="w-7"></th>
    </tr>
  </thead>
  <tbody>
    {cart.map((it, idx) => (
      <tr className="border-b align-middle">
        <td className="py-1 text-muted-foreground">{idx+1}</td>
        <td className="py-1">
          <div className="line-clamp-2 break-words font-medium leading-tight">{it.name}</div>
          {it.is_bulk && <span className="text-[9px] text-primary">[বাল্ক]</span>}
        </td>
        <td className="py-1">
          <Input type="number" value={it.price}
            className="h-7 w-full px-1 text-right text-xs"
            onChange={...} />
        </td>
        <td className="py-1">
          <Input type="number" value={it.qty}
            className="h-7 w-full px-1 text-center text-xs"
            onChange={...} />
        </td>
        <td className="py-1 text-right font-semibold">{fmtMoney(it.qty*it.price, lang)}</td>
        <td className="py-1">
          <Button variant="ghost" size="icon" className="h-6 w-6"
            onClick={() => removeCart(idx)}>
            <X className="h-3 w-3" />
          </Button>
        </td>
      </tr>
    ))}
  </tbody>
</table>
```

- লম্বা নাম `line-clamp-2 break-words` দিয়ে দুই লাইনে wrap হবে।
- +/- button বাদ (compactness-এর জন্য) — সরাসরি qty input edit।
- Label, large input, icon button সব সরে যাওয়ায় row উচ্চতা ~৭০% কমবে।

কোনো logic / state / handler পরিবর্তন হবে না — শুধু render markup।

## পরিবর্তন হবে না
- Search, infinite scroll, services tab, totals, payment buttons, dialogs।
- Grid card design (আগের round এ যেটা ঠিক করা হয়েছে)।
