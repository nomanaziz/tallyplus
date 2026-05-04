INSERT INTO public.shop_types (code, name_bn, name_en, icon, default_categories, sort_order, is_active) VALUES
  ('service_provider', 'সার্ভিস প্রোভাইডার', 'Service Provider', 'wrench', ARRAY['হোম সার্ভিস','অ্যাপ্লায়েন্স রিপেয়ার','ক্লিনিং','প্লাম্বিং','ইলেকট্রিক্যাল'], 13, true),
  ('salon_beauty', 'সেলুন ও বিউটি পার্লার', 'Salon & Beauty', 'scissors', ARRAY['হেয়ার কাট','ফেসিয়াল','ব্রাইডাল মেকআপ','ম্যানিকিউর-পেডিকিউর','বডি ম্যাসাজ'], 14, true),
  ('repair_shop', 'রিপেয়ার শপ', 'Repair Shop', 'hammer', ARRAY['মোবাইল রিপেয়ার','ল্যাপটপ রিপেয়ার','এসি রিপেয়ার','ফ্রিজ রিপেয়ার','টিভি রিপেয়ার'], 15, true),
  ('others', 'অন্যান্য (Others)', 'Others', 'more-horizontal', ARRAY['সাধারণ'], 99, true)
ON CONFLICT (code) DO UPDATE SET
  name_bn = EXCLUDED.name_bn,
  name_en = EXCLUDED.name_en,
  icon = EXCLUDED.icon,
  default_categories = EXCLUDED.default_categories,
  sort_order = EXCLUDED.sort_order,
  is_active = true;