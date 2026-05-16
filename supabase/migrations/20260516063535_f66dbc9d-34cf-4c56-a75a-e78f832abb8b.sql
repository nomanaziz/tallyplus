
WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY user_id, name, kind ORDER BY created_at NULLS LAST, id) AS rn
  FROM public.consumer_categories
)
DELETE FROM public.consumer_categories WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY user_id, name ORDER BY created_at NULLS LAST, id) AS rn
  FROM public.consumer_accounts
)
DELETE FROM public.consumer_accounts WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_consumer_categories_user_name_kind
  ON public.consumer_categories(user_id, name, kind);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_consumer_accounts_user_name
  ON public.consumer_accounts(user_id, name);
