## Plan: Wire User-Provided Custom Icons + Request Remaining Set

### Step 1 — Add icons to project
Copy all 26 PNGs from the upload into `src/assets/icons/`:
`active-warranty.png, pending-order.png, customer.png, employee.png, alert.png, cash.png, cash-register.png, transaction.png, wishlist.png, notification.png, language.png, settings.png, search.png, add.png, add-user-male.png, add-image.png, edit-pencil.png, delete.png, eye.png, invisible.png, download.png, export-pdf.png, refresh.png, image-file.png, mind-map.png` (rename `icons8-mind-map-96.png`), and `owner-dashboard.png` (rename `Owner Dashboard.png`).

### Step 2 — Register in central icon map
Extend `src/lib/icons.ts` with imports for every new file so they're usable as `icons.activeWarranty`, `icons.pendingOrder`, `icons.customer`, `icons.employee`, `icons.alert`, `icons.cash`, `icons.cashRegister`, `icons.transaction`, `icons.wishlist`, `icons.notification`, `icons.language`, `icons.settings`, `icons.search`, `icons.add`, `icons.addUser`, `icons.addImage`, `icons.edit`, `icons.delete`, `icons.eye`, `icons.eyeOff`, `icons.download`, `icons.exportPdf`, `icons.refresh`, `icons.imageFile`, `icons.mindMap`, `icons.ownerDashboard`.

### Step 3 — Replace Lucide icons on Owner Dashboard (`src/pages/app/Dashboard.tsx`)
Swap the desktop KPI tile icons + panel header icons to use `<img src={icons.X} className="h-5 w-5" />`:
- Low stock → `alert`
- Online products → (keep Lucide Globe for now — missing custom)
- New orders → `pendingOrder`
- New fordo / Recent fordo → `wishlist`
- Warranty → `activeWarranty`
- Customers → `customer`
- Suppliers → (keep Lucide Truck — missing custom)
- Employees → `employee`
- Recent sales panel → `transaction`
- Low-stock panel → `alert`
- Refresh button → `refresh`
- Expiring warranty panel → (keep Lucide Clock — missing custom)

Products tile keeps existing `productList` icon.

### Step 4 — Replace Lucide icons in shared toolbar/header components
- `src/components/app/DataToolbar.tsx`: `Search` → `icons.search`; `RefreshCw` → `icons.refresh`.
- `src/components/app/PageHeader.tsx`: keep `ArrowLeft` (back-arrow not provided yet).
- `src/components/app/NotificationBell.tsx`: bell → `icons.notification`.
- `src/components/app/SettingsSheet.tsx` trigger: gear → `icons.settings`.
- Common row actions (eye/edit/delete/download) standardised to use these icons where they appear in list pages. Initial pass on highly visible ones only (`Products.tsx`, `Contacts.tsx`, `SalesLedger.tsx`); rest follow in the next batch.

### Step 5 — Missing icons (please send next)
The following from the original request are still missing — sending them lets us finish the swap everywhere:
1. `published-product` (Online products tile)
2. `supplier` (vs customer)
3. `trending` (recent sales arrow / growth)
4. `clock` (expiring soon, recent activity)
5. `calendar-expire` (warranty expiry date)
6. `cash-in` and `cash-out` (Cashbox deposit/withdraw — currently one generic `cash.png`)
7. `wallet` (balance)
8. `my-fordo`, `my-order`, `favorite-shop`, `money`, `note`, `will-get`, `will-give`, `customer-training`, `profile` (Customer Dashboard tiles)
9. `back-arrow` (page header back button)
10. `plus-add` confirmed = `add.png` ✅ (already have)

### Out of scope
No layout/grid changes — only icon swaps. Customer Dashboard icons stay on Lucide until that batch arrives.