## Sidebar redesign — match sample

Restructure `src/components/app/AppSidebar.tsx` so the sidebar matches the uploaded sample.

### 1. Dashboard — standalone, not a group
- Remove the `main` section wrapper. Render `/app/dashboard` as a single top-level row at the very top of the nav (same row style as today's items: rounded square primary-colored icon + label).
- It is always visible — no expand/collapse, no section header.

### 2. Other categories — accordion with a "main" icon header
For `transactions`, `ledgers`, `inventory`, `customers`, `reports`, `more`:

- Each section header becomes a clickable row styled like a primary nav item:
  - Large rounded-square **primary-colored icon badge** on the left (same size as today's item icons, `h-7 w-7`, `bg-primary text-primary-foreground`).
  - Section label in regular text (not uppercase mini-caps anymore).
  - Chevron on the right that rotates when open.
- Add a representative icon per section (lucide-react):
  - transactions → `ArrowLeftRight`
  - ledgers → `BookOpen`
  - inventory → `Package`
  - customers → `Users`
  - reports → `BarChart3`
  - more → `MoreHorizontal`

### 3. Sub-items — indented with a left guide line
When a section is open, its items render as a child list:

- Wrap the children in a container with `pl-3 ml-3 border-l border-border` to draw the vertical guide line shown in the sample.
- Each child item gets a **smaller icon** (`h-5 w-5` badge with `h-3.5 w-3.5` glyph) and slightly smaller text (`text-[12px]`), so the visual hierarchy reads "big parent, small children" like the sample.
- Active child keeps the current highlighted background.

### 4. Default open state
- `transactions` is open by default on first load.
- Only one section open at a time (current accordion behavior preserved).
- When the user navigates into a route, the section containing that route auto-opens (preserved).
- Manual toggles continue to work.

### 5. Collapsed (icon-only) sidebar
- Dashboard row: icon only (current behavior).
- Section headers in collapsed mode: render the section's main icon as a button; clicking it expands the sidebar and opens that section. Sub-items are not shown while collapsed.

### Files touched
- `src/components/app/AppSidebar.tsx` — only file changed. No other components, no business logic.

### Out of scope
- No changes to routes, permissions, or page contents.
- No theme/token changes.
