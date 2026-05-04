## Overview

তিনটা সম্পর্কিত feature:

1. **শপ ownership transfer** — admin-mediated, both-side verification, charge সহ
2. **Bulk product import** — Excel/CSV থেকে
3. **Bulk product export** — Excel এ

---

## ১. Shop Ownership Transfer (Admin-mediated)

### Flow

```text
Owner A → "Transfer Request" পাঠায়
  ↓ (নতুন owner-এর phone/email + amount auto-charge ব্যাখ্যা)
System → Owner A-র wallet/balance থেকে charge কাটে (বা SMS balance-এর মত pending payment)
  ↓
Pending → Owner B-র কাছে notification + accept/reject
  ↓ (B accepts)
Pending → Admin queue
  ↓ (admin approves)
shops.owner_id update + audit trail + uniqueness reassign
```

দুই side verification: **(a)** নতুন owner অবশ্যই platform-এ registered থাকতে হবে এবং accept করতে হবে, **(b)** Admin চূড়ান্ত approve করবে।

### Database (migration)

নতুন table `shop_transfer_requests`:
- `id`, `shop_id`, `from_user_id`, `to_user