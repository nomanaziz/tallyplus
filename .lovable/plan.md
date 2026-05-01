## সমস্যা

স্ক্রিনশট দেখে বোঝা যাচ্ছে — `Products` পেজে "স্টক এডিট" mode-এ মোবাইল ভিউতে `+ / − / Input` controls ঠিকমতো ধরছে না, ডান পাশে কেটে যাচ্ছে (overflow)।

কারণ:
- "Updated stock" column header-এ `w-[260px]` fixed width দেওয়া
- প্রতিটি row-এ controls wrapper-এ `w-[240px]` fixed width
- `−` ও `+` বাটন `w-10` (40px), Input flex নয়
- মোবাইলে "বিক্রয় মূল্য" column-ও দেখানো হচ্ছে stock edit mode-এ, যা অপ্রয়োজনীয় জ