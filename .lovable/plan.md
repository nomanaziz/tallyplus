## লক্ষ্য

`src/routes/app.online-shop.tsx` এর dashboard tile গুলোতে এখন lucide-react এর generic icon ব্যবহার হচ্ছে (Settings, ShoppingBag, Palette, ইত্যাদি)। আপনার আগে দেওয়া zip ফাইলের আইকন গুলো (যেগুলো এখন `src/assets/icons/` এ আছে) ব্যবহার করব।

## আপনার দেওয়া আইকন থেকে কী কী আছে

`src/assets/icons/`:
- online-shop.svg, marketing.svg, sell.svg, stock.svg, sales-list.svg, purchase.svg, purchase-list.svg, product-list.svg, business-report.svg, expense.svg, due.svg, contact.svg, home.svg, access.svg, quick-sell.svg, training.svg, printer.svg, cashbox.png, recycle-bin.png, warranty.png, expired.png, buy-subscription.png, brand-bee.svg, brand-hishabee.svg

## Mapping plan (online shop tile → আপনার icon)

| Tile | আগের lucide icon | নতুন আইকন (আপনার set থেকে) |
|------|-----------------|----------------------------|
| অনলাইন প্রোডাক্ট | ShoppingBag | `product-list.svg` |
| অর্ডার লিস্ট | ClipboardList | `sales-list.svg` |
| স্টোর সেটিংস | Settings | `access.svg` |
| মার্কেটিং ও SEO | Megaphone | `marketing.svg` |
| ফিচার্ড পণ্য | Star | `quick-sell.svg` |
| শপ পলিসি | ShieldCheck | `warranty.png` |
| ডেলিভারি | Truck | `purchase.svg` (delivery-truck style) |
| মেসেজ | MessageCircle | `contact.svg` |
| Stat: অনলাইন প্রোডাক্ট | Package | `product-list.svg` |
| Stat: মোট আয় | TrendingUp | `business-report.svg` |
| Quick action: ওয়েবসাইট | Globe | `online-shop.svg` |

## যেগুলোর জন্য আপনার set এ মানানসই আইকন নেই

এই tile গুলোর জন্য zip এ আলাদা icon আসেনি — এগুলো lucide এর existing icon এই থাকবে (color সহ মানানসই):
- থিম, কাস্টমাইজেশন (Palette)
- Username পরিবর্তন (AtSign)
- ফ্রড চেক (AlertTriangle)
- প্রোমো কোড (Tag)
- Quick actions: Copy Link, QR Code

আপনি যদি চান এগুলোর জন্যও custom icon ব্যবহার হোক, তাহলে আলাদা ভাবে সেই icon গুলো upload করতে হবে।

## Technical changes

1. একটা ছোট helper component বানাব `AppIcon` যেটা `<img src={...} className="h-7 w-7" />` রেন্ডার করবে — যাতে SVG/PNG দুটোই কাজ করে এবং tint/color tile এর শৈলী অনুযায়ী থাকে।
2. `src/routes/app.online-shop.tsx` এ tile array আপডেট — প্রতিটি tile এ হয় lucide icon, নয়তো asset path।
3. SVG গুলো `?url` import হিসেবে আনব Vite এর মাধ্যমে (যেমন `import productListIcon from "@/assets/icons/product-list.svg?url"`)।
4. Stat card এবং Quick action card এর মধ্যেও কয়েকটা জায়গায় custom icon swap করব (উপরের mapping অনুযায়ী)।

## Files to edit

- `src/routes/app.online-shop.tsx` — tile, stat, quick-action আইকন replace
- (নতুন কোনো file create হবে না — inline ভাবে handle করা হবে)

আপনি approve করলে এই mapping অনুযায়ী আইকন বসিয়ে দেব। অন্য কোনো tile এ আলাদা ম্যাপ চাইলে এখনই বলে দিন।
