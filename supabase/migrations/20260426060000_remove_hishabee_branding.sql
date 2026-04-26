UPDATE public.app_links
SET label_bn = REPLACE(label_bn, 'হিসাবী', 'Tally Plus')
WHERE label_bn LIKE '%হিসাবী%';
