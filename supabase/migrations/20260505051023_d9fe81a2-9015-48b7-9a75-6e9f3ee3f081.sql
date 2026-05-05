INSERT INTO public.notifications (user_id, title, body, link, type)
SELECT
  r.to_user_id,
  'নতুন দোকান হস্তান্তর অনুরোধ',
  COALESCE(s.name, 'একটি দোকান') || ' আপনাকে হস্তান্তর করতে চাওয়া হয়েছে। গ্রহণ/বাতিল করুন।',
  '/app/dashboard',
  'shop_transfer'
FROM public.shop_transfer_requests r
JOIN public.shops s ON s.id = r.shop_id
WHERE r.status = 'pending_recipient'
  AND r.to_user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.notifications n
    WHERE n.user_id = r.to_user_id
      AND n.type = 'shop_transfer'
      AND n.created_at >= r.created_at
  );