## লক্ষ্য

"PIN ভুলে গেছেন? WhatsApp করুন" link টা এখন সবসময় দেখায়। এটা শুধুমাত্র তখনই আসবে যখন:
- ফোন নম্বর সঠিক ভাবে দেওয়া আছে (valid মোবাইল নম্বর), **এবং**
- ওই নম্বরে account আছে (login-with-pin / customer-login-with-pin → `wrong_pin` বা `no_pin_set` error দিয়েছে — মানে account exists কিন্তু PIN মেলেনি)।

যদি account না থাকে (`no_account`) বা ফোন না দেওয়া হয়, তখন WhatsApp link দেখাবে না — সরাসরি toast এ message আসবে।

## বর্তমান অবস্থা (`src/components/site/LoginCard.tsx`)

- Login mode এ phone + PIN field এর নিচে সবসময় একটি static WhatsApp link থাকে।
- Login submit করলে edge function (`login-with-pin` / `customer-login-with-pin`) ৩ ধরনের error দেয়: `wrong_pin`, `no_account`, `no_pin_set` — toast এ দেখানো হয়, কিন্তু WhatsApp link এর visibility এর সাথে যুক্ত নয়।

## পরিবর্তন (শুধু `LoginCard.tsx`)

### ১. নতুন state
`const [showForgotPin, setShowForgotPin] = useState(false);`
এটা track করবে user এর জন্য "PIN ভুলে গেছেন?" option দেখানো উচিত কি না।

### ২. Login submit এর behaviour update
`handleSubmit` এর login branch এ:
- `wrong_pin` বা `no_pin_set` → `setShowForgotPin(true)` + আগের মত toast।
- `no_account` → `setShowForgotPin(false)` + toast "এই নম্বরে account নেই — সাইনআপ করুন"।
- success → state reset।

Phone বা PIN field edit করলে `showForgotPin` reset হয়ে যাবে (নতুন চেষ্টা)। mode/role switch করলেও reset।

### ৩. WhatsApp link conditional render
শুধু তখনই দেখাবে যখন:
- `mode === "login"`, **এবং**
- `showForgotPin === true`, **এবং**
- `normalizePhone(phone)` valid (≥ 10 digit)।

Validation এ phone না থাকলে button disabled থাকবে / link হাইড থাকবে। `waUrl()` এ phone fallback string টা সরিয়ে শুধু আসল ফোন থাকবে (যেহেতু এখন phone নিশ্চিত)।

WhatsApp message format — এখন phone টা সবসময় থাকবে, যেমন:
```
আসসালামু আলাইকুম, আমার Tally Plus account এর PIN ভুলে গেছি।
Phone: +8801XXXXXXXXX
দয়া করে PIN reset/সাহায্য করুন।
```

### ৪. UX detail
- WhatsApp box এর উপরে ছোট হিন্ট: "PIN মনে নেই? নিচের button থেকে WhatsApp এ admin কে জানান।"
- Signup mode বা role tab switch করলে `showForgotPin` সবসময় false হবে।

## ফলাফল

- একদম প্রথমে login screen এ WhatsApp link দেখা যাবে না — পরিষ্কার UI।
- ফোন না দিয়ে কেউ WhatsApp করতে পারবে না।
- `no_account` হলে শুধু toast — sign up করতে বলবে, WhatsApp link আসবে না (কারণ account ই নাই)।
- শুধু "account আছে কিন্তু PIN ভুল / PIN সেট নাই" — এই দুই case এ WhatsApp করার option আসবে, এবং সেই WhatsApp message এ user এর ফোন নম্বর অটো বসানো থাকবে।

## ফাইল

```text
বদল: src/components/site/LoginCard.tsx
```
