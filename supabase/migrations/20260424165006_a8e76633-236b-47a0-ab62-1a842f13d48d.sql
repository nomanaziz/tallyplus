-- Indexes (idempotent)
create index if not exists idx_products_shop on public.products(shop_id) where deleted_at is null;
create index if not exists idx_products_shop_created on public.products(shop_id, created_at desc) where deleted_at is null;
create index if not exists idx_sales_shop_created on public.sales(shop_id, created_at desc) where deleted_at is null;
create index if not exists idx_purchases_shop_created on public.purchases(shop_id, created_at desc) where deleted_at is null;
create index if not exists idx_expenses_shop_created on public.expenses(shop_id, created_at desc) where deleted_at is null;
create index if not exists idx_customers_shop on public.customers(shop_id) where deleted_at is null;
create index if not exists idx_suppliers_shop on public.suppliers(shop_id) where deleted_at is null;
create index if not exists idx_cash_movements_shop_dir on public.cash_movements(shop_id, direction);
create index if not exists idx_stock_movements_shop_created on public.stock_movements(shop_id, created_at desc);
create index if not exists idx_shop_members_user on public.shop_members(user_id);
create index if not exists idx_shop_members_shop on public.shop_members(shop_id);
create index if not exists idx_shops_owner on public.shops(owner_id) where deleted_at is null;
create index if not exists idx_subscriptions_user_status on public.subscriptions(user_id, status, expires_at desc);
create index if not exists idx_user_roles_user on public.user_roles(user_id);
create index if not exists idx_profiles_phone on public.profiles(phone);
create index if not exists idx_sale_items_sale on public.sale_items(sale_id);
create index if not exists idx_purchase_items_purchase on public.purchase_items(purchase_id);

-- Dashboard summary RPC: single round-trip aggregate
create or replace function public.dashboard_summary(_shop_id uuid, _since timestamptz)
returns table (
  sales numeric,
  purchases numeric,
  expenses numeric,
  receivable numeric,
  payable numeric,
  stock_value numeric,
  cash_in numeric,
  cash_out numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    coalesce((select sum(total) from public.sales where shop_id = _shop_id and created_at >= _since and deleted_at is null), 0) as sales,
    coalesce((select sum(total) from public.purchases where shop_id = _shop_id and created_at >= _since and deleted_at is null), 0) as purchases,
    coalesce((select sum(amount) from public.expenses where shop_id = _shop_id and created_at >= _since and deleted_at is null), 0) as expenses,
    coalesce((select sum(due_balance) from public.customers where shop_id = _shop_id and deleted_at is null), 0) as receivable,
    coalesce((select sum(due_balance) from public.suppliers where shop_id = _shop_id and deleted_at is null), 0) as payable,
    coalesce((select sum(stock * cost_price) from public.products where shop_id = _shop_id and deleted_at is null), 0) as stock_value,
    coalesce((select sum(amount) from public.cash_movements where shop_id = _shop_id and direction = 'in'), 0) as cash_in,
    coalesce((select sum(amount) from public.cash_movements where shop_id = _shop_id and direction = 'out'), 0) as cash_out
$$;