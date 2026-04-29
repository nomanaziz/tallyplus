// AUTO-GENERATED — keep in sync with src/routes.tsx (regenerate via /tmp/build_prefetch.py).
// Each entry returns the importer functions for the route chunk + its layout ancestors.

type Importer = () => Promise<unknown>;

export const ROUTE_IMPORTERS: Record<string, Importer[]> = {
  "/": [() => import("./pages/Index")],
  "/admin": [() => import("./pages/Admin"), () => import("./pages/admin/Index")],
  "/admin/ads": [() => import("./pages/Admin"), () => import("./pages/admin/Ads")],
  "/admin/affiliates": [() => import("./pages/Admin"), () => import("./pages/admin/Affiliates")],
  "/admin/banners": [() => import("./pages/Admin"), () => import("./pages/admin/Banners")],
  "/admin/landing": [() => import("./pages/Admin"), () => import("./pages/admin/Landing")],
  "/admin/locations": [() => import("./pages/Admin"), () => import("./pages/admin/Locations")],
  "/admin/login": [() => import("./pages/Admin"), () => import("./pages/admin/Login")],
  "/admin/marketplace": [() => import("./pages/Admin"), () => import("./pages/admin/Marketplace")],
  "/admin/payment-attempts": [() => import("./pages/Admin"), () => import("./pages/admin/PaymentAttempts")],
  "/admin/payment-gateway": [() => import("./pages/Admin"), () => import("./pages/admin/PaymentGateway")],
  "/admin/plans": [() => import("./pages/Admin"), () => import("./pages/admin/Plans")],
  "/admin/promo-popups": [() => import("./pages/Admin"), () => import("./pages/admin/PromoPopups")],
  "/admin/settings": [() => import("./pages/Admin"), () => import("./pages/admin/Settings")],
  "/admin/shop-types": [() => import("./pages/Admin"), () => import("./pages/admin/ShopTypes")],
  "/admin/subscription-requests": [() => import("./pages/Admin"), () => import("./pages/admin/SubscriptionRequests")],
  "/admin/subscriptions": [() => import("./pages/Admin"), () => import("./pages/admin/Subscriptions")],
  "/admin/training": [() => import("./pages/Admin"), () => import("./pages/admin/Training")],
  "/admin/usage-limits": [() => import("./pages/Admin"), () => import("./pages/admin/UsageLimits")],
  "/admin/users": [() => import("./pages/Admin"), () => import("./pages/admin/Users")],
  "/affiliate": [() => import("./pages/Affiliate")],
  "/affiliate/register": [() => import("./pages/Affiliate"), () => import("./pages/affiliate/Register")],
  "/app": [() => import("./pages/app/AppLayout")],
  "/app/access": [() => import("./pages/app/AppLayout"), () => import("./pages/app/Access")],
  "/app/affiliate": [() => import("./pages/app/AppLayout"), () => import("./pages/app/Affiliate")],
  "/app/assets": [() => import("./pages/app/AppLayout"), () => import("./pages/app/Assets")],
  "/app/cashbox": [() => import("./pages/app/AppLayout"), () => import("./pages/app/Cashbox")],
  "/app/combined-report": [() => import("./pages/app/AppLayout"), () => import("./pages/app/CombinedReport")],
  "/app/contacts": [() => import("./pages/app/AppLayout"), () => import("./pages/app/Contacts")],
  "/app/customer-wishlist": [() => import("./pages/app/AppLayout"), () => import("./pages/app/CustomerWishlist")],
  "/app/dashboard": [() => import("./pages/app/AppLayout"), () => import("./pages/app/Dashboard")],
  "/app/due-history": [() => import("./pages/app/AppLayout"), () => import("./pages/app/DueHistory")],
  "/app/due-ledger": [() => import("./pages/app/AppLayout"), () => import("./pages/app/DueLedger")],
  "/app/expense-ledger": [() => import("./pages/app/AppLayout"), () => import("./pages/app/ExpenseLedger")],
  "/app/expiring": [() => import("./pages/app/AppLayout"), () => import("./pages/app/Expiring")],
  "/app/fordo-history": [() => import("./pages/app/AppLayout"), () => import("./pages/app/FordoHistory")],
  "/app/marketing": [() => import("./pages/app/AppLayout"), () => import("./pages/app/Marketing")],
  "/app/online-shop": [() => import("./pages/app/AppLayout"), () => import("./pages/app/OnlineShop")],
  "/app/online-shop/customize": [() => import("./pages/app/AppLayout"), () => import("./pages/app/online-shop/Index"), () => import("./pages/app/online-shop/Customize")],
  "/app/online-shop/delivery": [() => import("./pages/app/AppLayout"), () => import("./pages/app/online-shop/Index"), () => import("./pages/app/online-shop/Delivery")],
  "/app/online-shop/featured": [() => import("./pages/app/AppLayout"), () => import("./pages/app/online-shop/Index"), () => import("./pages/app/online-shop/Featured")],
  "/app/online-shop/fraud-check": [() => import("./pages/app/AppLayout"), () => import("./pages/app/online-shop/Index"), () => import("./pages/app/online-shop/FraudCheck")],
  "/app/online-shop/marketing": [() => import("./pages/app/AppLayout"), () => import("./pages/app/online-shop/Index"), () => import("./pages/app/online-shop/Marketing")],
  "/app/online-shop/messages": [() => import("./pages/app/AppLayout"), () => import("./pages/app/online-shop/Index"), () => import("./pages/app/online-shop/Messages")],
  "/app/online-shop/orders": [() => import("./pages/app/AppLayout"), () => import("./pages/app/online-shop/Index"), () => import("./pages/app/online-shop/Orders")],
  "/app/online-shop/policy": [() => import("./pages/app/AppLayout"), () => import("./pages/app/online-shop/Index"), () => import("./pages/app/online-shop/Policy")],
  "/app/online-shop/products": [() => import("./pages/app/AppLayout"), () => import("./pages/app/online-shop/Index"), () => import("./pages/app/online-shop/Products")],
  "/app/online-shop/promo-codes": [() => import("./pages/app/AppLayout"), () => import("./pages/app/online-shop/Index"), () => import("./pages/app/online-shop/PromoCodes")],
  "/app/online-shop/settings": [() => import("./pages/app/AppLayout"), () => import("./pages/app/online-shop/Index"), () => import("./pages/app/online-shop/Settings")],
  "/app/online-shop/themes": [() => import("./pages/app/AppLayout"), () => import("./pages/app/online-shop/Index"), () => import("./pages/app/online-shop/Themes")],
  "/app/owner-ledger": [() => import("./pages/app/AppLayout"), () => import("./pages/app/OwnerLedger")],
  "/app/owner-report": [() => import("./pages/app/AppLayout"), () => import("./pages/app/OwnerReport")],
  "/app/printer": [() => import("./pages/app/AppLayout"), () => import("./pages/app/Printer")],
  "/app/products": [() => import("./pages/app/AppLayout"), () => import("./pages/app/Products")],
  "/app/purchase": [() => import("./pages/app/AppLayout"), () => import("./pages/app/Purchase")],
  "/app/purchase-ledger": [() => import("./pages/app/AppLayout"), () => import("./pages/app/PurchaseLedger")],
  "/app/quick-order": [() => import("./pages/app/AppLayout"), () => import("./pages/app/QuickOrder")],
  "/app/recycle-bin": [() => import("./pages/app/AppLayout"), () => import("./pages/app/RecycleBin")],
  "/app/reports": [() => import("./pages/app/AppLayout"), () => import("./pages/app/Reports")],
  "/app/returns": [() => import("./pages/app/AppLayout"), () => import("./pages/app/Returns")],
  "/app/returns/:id": [() => import("./pages/app/AppLayout"), () => import("./pages/app/Returns"), () => import("./pages/app/returns/Id")],
  "/app/returns/new": [() => import("./pages/app/AppLayout"), () => import("./pages/app/Returns"), () => import("./pages/app/returns/New")],
  "/app/sales-ledger": [() => import("./pages/app/AppLayout"), () => import("./pages/app/SalesLedger")],
  "/app/sell": [() => import("./pages/app/AppLayout"), () => import("./pages/app/Sell")],
  "/app/shops": [() => import("./pages/app/AppLayout"), () => import("./pages/app/Shops")],
  "/app/subscribe": [() => import("./pages/app/AppLayout"), () => import("./pages/app/Subscribe")],
  "/app/subscribe/callback": [() => import("./pages/app/AppLayout"), () => import("./pages/app/SubscribeCallback")],
  "/app/training": [() => import("./pages/app/AppLayout"), () => import("./pages/app/Training")],
  "/app/usage-limits": [() => import("./pages/app/AppLayout"), () => import("./pages/app/UsageLimits")],
  "/app/warranty": [() => import("./pages/app/AppLayout"), () => import("./pages/app/Warranty")],
  "/auth": [() => import("./pages/Auth")],
  "/customer": [() => import("./pages/customer/CustomerLayout")],
  "/customer/create-fordo": [() => import("./pages/customer/CustomerLayout"), () => import("./pages/customer/CreateFordo")],
  "/customer/dashboard": [() => import("./pages/customer/CustomerLayout"), () => import("./pages/customer/Dashboard")],
  "/customer/money": [() => import("./pages/customer/CustomerLayout"), () => import("./pages/customer/Money")],
  "/customer/my-fordo": [() => import("./pages/customer/CustomerLayout"), () => import("./pages/customer/MyFordo")],
  "/customer/notes": [() => import("./pages/customer/CustomerLayout"), () => import("./pages/customer/Notes")],
  "/customer/profile": [() => import("./pages/customer/Profile")],
  "/f/:slug": [() => import("./pages/f/Slug")],
  "/f/:slug/my": [() => import("./pages/f/Slug"), () => import("./pages/f/slug/My")],
  "/pricing": [() => import("./pages/Pricing")],
  "/privacy": [() => import("./pages/Privacy")],
  "/shop": [() => import("./pages/shop/Index")],
  "/shop/p/:id": [() => import("./pages/shop/Index"), () => import("./pages/shop/p/Id")],
  "/shop/s/:slug": [() => import("./pages/shop/Index"), () => import("./pages/shop/s/Slug")],
  "/terms": [() => import("./pages/Terms")],
  "/vendor/:username": [() => import("./pages/vendor/Username")],
};

// Strip query/hash and any trailing slash to canonicalize.
function canonical(path: string): string {
  let p = path.split("?")[0].split("#")[0];
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  return p || "/";
}

// Match a concrete URL against route patterns containing :param segments.
function matchPattern(pattern: string, url: string): boolean {
  const p = pattern.split("/").filter(Boolean);
  const u = url.split("/").filter(Boolean);
  if (p.length !== u.length) return false;
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(":")) continue;
    if (p[i] !== u[i]) return false;
  }
  return true;
}

// Track URLs we already kicked off so repeated hovers do not spam imports.
const started = new Set<string>();

export function prefetchRoute(rawPath: string): void {
  if (!rawPath || typeof rawPath !== "string") return;
  const url = canonical(rawPath);
  if (started.has(url)) return;
  // exact hit
  let importers = ROUTE_IMPORTERS[url];
  if (!importers) {
    // pattern match (e.g. /shop/p/:id)
    for (const pat of Object.keys(ROUTE_IMPORTERS)) {
      if (pat.includes(":") && matchPattern(pat, url)) { importers = ROUTE_IMPORTERS[pat]; break; }
    }
  }
  if (!importers) return;
  started.add(url);
  for (const fn of importers) { try { void fn(); } catch { /* ignore */ } }
}
