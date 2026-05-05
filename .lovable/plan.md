## কী পেয়েছি (diagnosis)

- Transfer request `e21b1f14...` দোকান `df89f0d8...`-এর জন্য `2026-05-04 18:48:32`-এ তৈরি হয়েছে। Status: `pending_recipient`, recipient = `7a0cd549...` (phone 01625629779, role owner)।
- Recipient-এর জন্য কোনো `notifications` row তৈরি হয়নি — তাই তার Bell-এ কিছু আসেনি।
- কারণ: recipient-কে notify করা trigger (`tg_notify_transfer_parties`) **আজকেই deploy হয়েছে এই request insert হওয়ার পর**। তাই পুরোনো row-এর জন্য fire করেনি। নতুন request থেকে এটা ঠিকঠাক fire করবে।
- Banner (`IncomingTransfersBanner`) `/app/dashboard`-এ ও `/customer/*`-এ mount আছে — recipient owner হওয়ায় `/app/dashboard`-এ গেলে banner দেখতে পেত, কিন্তু notification না আসায় সে জানতেই পারেনি।
- "১ মাস free trial" admin **approve-এর পর** auto-grant হয় (`grant_post_transfer_trial`), request পাঠানোর সময় না — এটা ইচ্ছাকৃত এবং already wired আছে।

## কী করব (fix)

### ১. Backfill notification (data fix — এই specific request-এর জন্য)
`notifications` table-এ recipient `7a0cd549...`-এর জন্য একটা row insert করব যাতে তার Bell-এ আসে এবং `/app/dashboard`-এ click করলে banner দেখে accept/reject করতে পারে।

```sql
INSERT INTO notifications (user_id, title, body, link, type)
VALUES (
  '7a0cd549-ea8f-41d5-a71c-d7aae9c845fc',
  'নতুন দোকান হস্তান্তর অনুরোধ',
  '<shop name> আপনাকে হস্তান্তর করতে চাওয়া হয়েছে। গ্রহণ/বাতিল করুন।',
  '/app/dashboard',
  'shop_transfer'
);
```

### ২. কোনো code/trigger change লাগবে না
Trigger `tg_notify_transfer_parties` ইতিমধ্যে সঠিক — পরবর্তী যেকোনো নতুন transfer request-এ recipient automatically notification পাবে।

## Files

- কোনো file change নয়। শুধু একটা `INSERT` (insert tool দিয়ে).

## Verify (after apply)

- Recipient `7a0cd549...` `/app` খুললে Bell-এ "নতুন দোকান হস্তান্তর অনুরোধ" দেখবে → `/app/dashboard` link → IncomingTransfersBanner-এ Accept/Reject button দেখবে।
- Accept করলে → status `pending_admin` → admin approve-এর পর trial auto-grant হবে।
