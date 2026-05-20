---
name: LPG and water-bottle share one module
description: The lpg module covers both LPG gas dealers and water-bottle/filter businesses
type: feature
---
- Module code: `lpg`. Shop types `lpg_gas` and `water_bottle` both enable it.
- 99% of features identical: bottle_types, movements (refill, return_empty, sale_new, purchase_full, refill_factory), holdings, deposits, delivery men, marketplace.
- Difference: LPG buys from a company/distributor → `supplier_id` is effectively required for purchase_full/refill_factory. Water is locally filtered → supplier_id optional.
- Tier: LPG uses dealer/wholesale/retail. Water uses producer/wholesale/retail. Same column `shops.lpg_tier`.
- Any new LPG feature (UI, report, marketplace, dialog) must work for water without a separate code path.
