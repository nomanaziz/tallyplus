## Integrate 9 new custom icons

User uploaded these icons (comboChart already exists, skip):
- back_button.png → page header back arrow
- profile.png → customer profile
- customer-training.png → training tile
- will-get.png → "পাব" (money owed to user)
- will-give.png → "দেব" (money user owes)
- money.png → income/expense tile
- order.png → my orders tile
- favorite.png → favorite shops tile
- note.png → notes tile

### Steps

1. **Copy assets** to `src/assets/icons/`:
   - back-arrow.png, profile.png, customer-training.png, will-get.png, will-give.png, money.png, order.png, favorite.png, note.png

2. **Register in `src/lib/icons.ts`** — add 9 new exports: `backArrow, profile, customerTraining, willGet, willGive, money, order, favorite, note`.

3. **Update `src/pages/customer/Dashboard.tsx`**:
   - Convert `Shortcut` component to support image icons (like `KpiTile` in Owner Dashboard).
   - Map tiles: My Fordo → wishlist, My Orders → `order`, Favorite Shops → `favorite`, Money → `money`, Notes → `note`, পাব → `willGet`, দেব → `willGive`, Training → `customerTraining`, Profile → `profile`.

4. **Update `src/components/app/PageHeader.tsx`**:
   - Replace Lucide `ArrowLeft` with `<img src={icons.backArrow} />` for the back button.

### Remaining icons still needed (after this batch)
- `published-product` (Owner dashboard online products tile)
- `clock` (recent activity headers)
- `calendar-expire` (warranty expiry)
- `wallet` (generic balance — currently using moneyProtection as fallback)
- `logout` (sign-out menu item)
- `my-fordo` (dedicated; currently using `wishlist`)

Files to modify: `src/lib/icons.ts`, `src/pages/customer/Dashboard.tsx`, `src/components/app/PageHeader.tsx` + 9 new PNG assets.