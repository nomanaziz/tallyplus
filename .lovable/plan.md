## সমস্যা

SMS Gateway page-এ যে চারটা stat card আছে — **SMS Balance / Today's Send / This Month Send / This Month Failed** — এগুলা এখন **REVE-এর live API থেকে আসছে না**। সব আসছে শুধু আমাদের নিজের database (`shop_sms_balance`, `sms_history`) থেকে। তাই ID/password ঠিক দিলেও সব শূন্য দেখাচ্ছে — কারণ এখানে gateway-এ **API call-ই হচ্ছে না**।

বর্তমান code (`SmsGateways.tsx` লাইন 128-149) শুধু Supabase table query করে; REVE-এর `balance`/`usage` endpoint কখনো hit করে না।

## সমাধান

REVE-এর live API থেকে balance + usage stats আনার জন্য একটা নতুন edge function বানানো হবে, এবং admin page সেটা call করে real data দেখাবে।

### ১. নতুন edge function: `sms-gateway-stats`

- Primary active gateway-এর `config` (api_key, secret_key, base_url) load করবে
- REVE-এর balance API call করবে:
  - `GET {base_url}/getBalance?apikey=...&secretkey=...`
- REVE-এর usage/report API call করবে (today, this month sent, this month failed):
  - `GET {base_url}/getReportByDate?apikey=...&secretkey=...&fromDate=...&toDate=...`
  - REVE-এর actual endpoint name documentation থেকে নিশ্চিত করা হবে। যদি usage endpoint না থাকে, fallback হিসেবে আমাদের `sms_history` table থেকে count আসবে (যাতে কখনোই blank না দেখায়)।
- Response shape:
  ```json
  { "balance": 1234, "today": 12, "month": 340, "failed": 5, "source": "reve" | "local" | "mixed" }
  ```
- Error হলে graceful fallback: `{ "balance": 0, "today": 0, ..., "error": "...", "fallback": true }` — frontend crash হবে না।

### ২. `SmsGateways.tsx` update

- Page load ও gateway save-এর পর `supabase.functions.invoke('sms-gateway-stats')` call হবে
- Stat card-এ live REVE data দেখাবে
- Loading state এ skeleton/spinner; API fail হলে stat card-এর নিচে ছোট warning text ("Live data unavailable, showing local stats")
- "Refresh" button যোগ করা হবে stat card row-এর পাশে যাতে user manually re-fetch করতে পারে

### ৩. Debug সাপোর্ট

Edge function-এ verbose console.log রাখা হবে (REVE response status, body snippet) যাতে log থেকে দেখা যায় API call হচ্ছে কি না, কী error দিচ্ছে।

## Files

- নতুন: `supabase/functions/sms-gateway-stats/index.ts`
- Edit: `src/pages/admin/SmsGateways.tsx` (stats fetch + Refresh button + fallback display)

## Approve করলে

Implement করে আপনাকে edge function logs link দেব, যেখান থেকে দেখা যাবে REVE call হচ্ছে কি না এবং কী return করছে।