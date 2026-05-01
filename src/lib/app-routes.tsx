import { Suspense, lazy } from "react";
import { Navigate, type RouteObject } from "react-router-dom";
import { RouteFallback } from "@/components/RouteFallback";
import NotFound from "@/pages/NotFound";

const L0 = lazy(() => import("@/pages/Index"));
const L1 = lazy(() => import("@/pages/Admin"));
const L2 = lazy(() => import("@/pages/admin/Ads"));
const L3 = lazy(() => import("@/pages/admin/Affiliates"));
const L4 = lazy(() => import("@/pages/admin/Banners"));
const L5 = lazy(() => import("@/pages/admin/Index"));
const L6 = lazy(() => import("@/pages/admin/Landing"));
const L7 = lazy(() => import("@/pages/admin/Locations"));
const L8 = lazy(() => import("@/pages/admin/Login"));
const L9 = lazy(() => import("@/pages/admin/Marketplace"));
const L10 = lazy(() => import("@/pages/admin/PaymentAttempts"));
const L11 = lazy(() => import("@/pages/admin/PaymentGateway"));
const L12 = lazy(() => import("@/pages/admin/Plans"));
const L13 = lazy(() => import("@/pages/admin/PromoPopups"));
const L14 = lazy(() => import("@/pages/admin/Settings"));
const L15 = lazy(() => import("@/pages/admin/ShopTypes"));
const L16 = lazy(() => import("@/pages/admin/SmsGateways"));
const L17 = lazy(() => import("@/pages/admin/SubscriptionRequests"));
const L18 = lazy(() => import("@/pages/admin/Subscriptions"));
const L19 = lazy(() => import("@/pages/admin/Training"));
const L20 = lazy(() => import("@/pages/admin/UsageLimits"));
const L21 = lazy(() => import("@/pages/admin/Users"));
const L22 = lazy(() => import("@/pages/Affiliate"));
const L23 = lazy(() => import("@/pages/affiliate/Register"));
const L24 = lazy(() => import("@/pages/app/AppLayout"));
const L25 = lazy(() => import("@/pages/app/Access"));
const L26 = lazy(() => import("@/pages/app/Affiliate"));
const L27 = lazy(() => import("@/pages/app/Assets"));
const L28 = lazy(() => import("@/pages/app/BuySms"));
const L29 = lazy(() => import("@/pages/app/Cashbox"));
const L30 = lazy(() => import("@/pages/app/CombinedReport"));
const L31 = lazy(() => import("@/pages/app/Contacts"));
const L32 = lazy(() => import("@/pages/app/CustomerWishlist"));
const L33 = lazy(() => import("@/pages/app/Dashboard"));
const L34 = lazy(() => import("@/pages/app/DueHistory"));
const L35 = lazy(() => import("@/pages/app/DueLedger"));
const L36 = lazy(() => import("@/pages/app/ExpenseLedger"));
const L37 = lazy(() => import("@/pages/app/Expiring"));
const L38 = lazy(() => import("@/pages/app/FordoHistory"));
const L39 = lazy(() => import("@/pages/app/Marketing"));
const L40 = lazy(() => import("@/pages/app/OwnerLedger"));
const L41 = lazy(() => import("@/pages/app/OwnerReport"));
const L42 = lazy(() => import("@/pages/app/Printer"));
const L43 = lazy(() => import("@/pages/app/Products"));
const L44 = lazy(() => import("@/pages/app/PurchaseLedger"));
const L45 = lazy(() => import("@/pages/app/Purchase"));
const L46 = lazy(() => import("@/pages/app/QuickOrder"));
const L47 = lazy(() => import("@/pages/app/RecycleBin"));
const L48 = lazy(() => import("@/pages/app/Reports"));
const L49 = lazy(() => import("@/pages/app/SalesLedger"));
const L50 = lazy(() => import("@/pages/app/Sell"));
const L51 = lazy(() => import("@/pages/app/Shops"));
const L52 = lazy(() => import("@/pages/app/SmsHistory"));
const L53 = lazy(() => import("@/pages/app/Training"));
const L54 = lazy(() => import("@/pages/app/UsageLimits"));
const L55 = lazy(() => import("@/pages/app/Warranty"));
const L56 = lazy(() => import("@/pages/Auth"));
const L57 = lazy(() => import("@/pages/customer/CustomerLayout"));
const L58 = lazy(() => import("@/pages/customer/CreateFordo"));
const L59 = lazy(() => import("@/pages/customer/Dashboard"));
const L60 = lazy(() => import("@/pages/customer/Money"));
const L61 = lazy(() => import("@/pages/customer/MyFordo"));
const L62 = lazy(() => import("@/pages/customer/Notes"));
const L63 = lazy(() => import("@/pages/customer/Profile"));
const L64 = lazy(() => import("@/pages/f/Slug"));
const L65 = lazy(() => import("@/pages/f/slug/My"));
const L66 = lazy(() => import("@/pages/Pricing"));
const L67 = lazy(() => import("@/pages/Privacy"));
const L68 = lazy(() => import("@/pages/shop/Index"));
const L69 = lazy(() => import("@/pages/shop/p/Id"));
const L70 = lazy(() => import("@/pages/shop/s/Slug"));
const L71 = lazy(() => import("@/pages/Terms"));
const L72 = lazy(() => import("@/pages/vendor/Username"));
const L73 = lazy(() => import("@/pages/app/SalesReport"));
const L74 = lazy(() => import("@/pages/app/PurchaseReport"));
const L75 = lazy(() => import("@/pages/app/StockReport"));
const L76 = lazy(() => import("@/pages/app/ProductReport"));
const L77 = lazy(() => import("@/pages/app/TopCustomers"));
const L78 = lazy(() => import("@/pages/app/TopEmployees"));
const L79 = lazy(() => import("@/pages/app/ProfitLoss"));
const L80 = lazy(() => import("@/pages/app/ExpenseReport"));
const L81 = lazy(() => import("@/pages/app/SupplierReport"));
const L82 = lazy(() => import("@/pages/app/IncomeReport"));
const L83 = lazy(() => import("@/pages/About"));

export const appRoutes: RouteObject[] = [
{ index: true, element: <Suspense fallback={<RouteFallback/>}><L0/></Suspense> },
{ path: "admin", element: <Suspense fallback={<RouteFallback/>}><L1/></Suspense>, children: [
{ path: "ads", element: <Suspense fallback={<RouteFallback/>}><L2/></Suspense> },
{ path: "affiliates", element: <Suspense fallback={<RouteFallback/>}><L3/></Suspense> },
{ path: "banners", element: <Suspense fallback={<RouteFallback/>}><L4/></Suspense> },
{ index: true, element: <Suspense fallback={<RouteFallback/>}><L5/></Suspense> },
{ path: "landing", element: <Suspense fallback={<RouteFallback/>}><L6/></Suspense> },
{ path: "locations", element: <Suspense fallback={<RouteFallback/>}><L7/></Suspense> },
{ path: "login", element: <Suspense fallback={<RouteFallback/>}><L8/></Suspense> },
{ path: "marketplace", element: <Suspense fallback={<RouteFallback/>}><L9/></Suspense> },
{ path: "payment-attempts", element: <Suspense fallback={<RouteFallback/>}><L10/></Suspense> },
{ path: "payment-gateway", element: <Suspense fallback={<RouteFallback/>}><L11/></Suspense> },
{ path: "plans", element: <Suspense fallback={<RouteFallback/>}><L12/></Suspense> },
{ path: "promo-popups", element: <Suspense fallback={<RouteFallback/>}><L13/></Suspense> },
{ path: "settings", element: <Suspense fallback={<RouteFallback/>}><L14/></Suspense> },
{ path: "shop-types", element: <Suspense fallback={<RouteFallback/>}><L15/></Suspense> },
{ path: "sms-gateways", element: <Suspense fallback={<RouteFallback/>}><L16/></Suspense> },
{ path: "subscription-requests", element: <Suspense fallback={<RouteFallback/>}><L17/></Suspense> },
{ path: "subscriptions", element: <Suspense fallback={<RouteFallback/>}><L18/></Suspense> },
{ path: "training", element: <Suspense fallback={<RouteFallback/>}><L19/></Suspense> },
{ path: "usage-limits", element: <Suspense fallback={<RouteFallback/>}><L20/></Suspense> },
{ path: "users", element: <Suspense fallback={<RouteFallback/>}><L21/></Suspense> }
] },
{ path: "affiliate", element: <Suspense fallback={<RouteFallback/>}><L22/></Suspense>, children: [
{ path: "register", element: <Suspense fallback={<RouteFallback/>}><L23/></Suspense> }
] },
{ path: "app", element: <Suspense fallback={<RouteFallback/>}><L24/></Suspense>, children: [
{ path: "access", element: <Suspense fallback={<RouteFallback/>}><L25/></Suspense> },
{ path: "affiliate", element: <Suspense fallback={<RouteFallback/>}><L26/></Suspense> },
{ path: "assets", element: <Suspense fallback={<RouteFallback/>}><L27/></Suspense> },
{ path: "buy-sms", element: <Suspense fallback={<RouteFallback/>}><L28/></Suspense> },
{ path: "cashbox", element: <Suspense fallback={<RouteFallback/>}><L29/></Suspense> },
{ path: "combined-report", element: <Suspense fallback={<RouteFallback/>}><L30/></Suspense> },
{ path: "contacts", element: <Suspense fallback={<RouteFallback/>}><L31/></Suspense> },
{ path: "customer-wishlist", element: <Suspense fallback={<RouteFallback/>}><L32/></Suspense> },
{ path: "dashboard", element: <Suspense fallback={<RouteFallback/>}><L33/></Suspense> },
{ path: "due-history", element: <Suspense fallback={<RouteFallback/>}><L34/></Suspense> },
{ path: "due-ledger", element: <Suspense fallback={<RouteFallback/>}><L35/></Suspense> },
{ path: "expense-ledger", element: <Suspense fallback={<RouteFallback/>}><L36/></Suspense> },
{ path: "expiring", element: <Suspense fallback={<RouteFallback/>}><L37/></Suspense> },
{ path: "fordo-history", element: <Suspense fallback={<RouteFallback/>}><L38/></Suspense> },
{ path: "marketing", element: <Suspense fallback={<RouteFallback/>}><L39/></Suspense> },
{ path: "owner-ledger", element: <Suspense fallback={<RouteFallback/>}><L40/></Suspense> },
{ path: "owner-report", element: <Suspense fallback={<RouteFallback/>}><L41/></Suspense> },
{ path: "printer", element: <Suspense fallback={<RouteFallback/>}><L42/></Suspense> },
{ path: "products", element: <Suspense fallback={<RouteFallback/>}><L43/></Suspense> },
{ path: "purchase-ledger", element: <Suspense fallback={<RouteFallback/>}><L44/></Suspense> },
{ path: "purchase", element: <Suspense fallback={<RouteFallback/>}><L45/></Suspense> },
{ path: "quick-order", element: <Suspense fallback={<RouteFallback/>}><L46/></Suspense> },
{ path: "recycle-bin", element: <Suspense fallback={<RouteFallback/>}><L47/></Suspense> },
{ path: "reports", element: <Suspense fallback={<RouteFallback/>}><L48/></Suspense> },
{ path: "sales-report", element: <Suspense fallback={<RouteFallback/>}><L73/></Suspense> },
{ path: "purchase-report", element: <Suspense fallback={<RouteFallback/>}><L74/></Suspense> },
{ path: "stock-report", element: <Suspense fallback={<RouteFallback/>}><L75/></Suspense> },
{ path: "product-report", element: <Suspense fallback={<RouteFallback/>}><L76/></Suspense> },
{ path: "top-customers", element: <Suspense fallback={<RouteFallback/>}><L77/></Suspense> },
{ path: "top-employees", element: <Suspense fallback={<RouteFallback/>}><L78/></Suspense> },
{ path: "profit-loss", element: <Suspense fallback={<RouteFallback/>}><L79/></Suspense> },
{ path: "expense-report", element: <Suspense fallback={<RouteFallback/>}><L80/></Suspense> },
{ path: "supplier-report", element: <Suspense fallback={<RouteFallback/>}><L81/></Suspense> },
{ path: "income-report", element: <Suspense fallback={<RouteFallback/>}><L82/></Suspense> },
{ path: "sales-ledger", element: <Suspense fallback={<RouteFallback/>}><L49/></Suspense> },
{ path: "sell", element: <Suspense fallback={<RouteFallback/>}><L50/></Suspense> },
{ path: "shops", element: <Suspense fallback={<RouteFallback/>}><L51/></Suspense> },
{ path: "sms-history", element: <Suspense fallback={<RouteFallback/>}><L52/></Suspense> },
{ path: "stock-edit", element: <Navigate to="/app/products" replace /> },
{ path: "stock", element: <Navigate to="/app/products" replace /> },
{ path: "training", element: <Suspense fallback={<RouteFallback/>}><L53/></Suspense> },
{ path: "usage-limits", element: <Suspense fallback={<RouteFallback/>}><L54/></Suspense> },
{ path: "warranty", element: <Suspense fallback={<RouteFallback/>}><L55/></Suspense> }
] },
{ path: "auth", element: <Suspense fallback={<RouteFallback/>}><L56/></Suspense> },
{ path: "customer", element: <Suspense fallback={<RouteFallback/>}><L57/></Suspense>, children: [
{ path: "create-fordo", element: <Suspense fallback={<RouteFallback/>}><L58/></Suspense> },
{ path: "dashboard", element: <Suspense fallback={<RouteFallback/>}><L59/></Suspense> },
{ path: "money", element: <Suspense fallback={<RouteFallback/>}><L60/></Suspense> },
{ path: "my-fordo", element: <Suspense fallback={<RouteFallback/>}><L61/></Suspense> },
{ path: "notes", element: <Suspense fallback={<RouteFallback/>}><L62/></Suspense> },
{ path: "profile", element: <Suspense fallback={<RouteFallback/>}><L63/></Suspense> }
] },
{ path: "f/:slug", element: <Suspense fallback={<RouteFallback/>}><L64/></Suspense>, children: [
{ path: "my", element: <Suspense fallback={<RouteFallback/>}><L65/></Suspense> }
] },
{ path: "pricing", element: <Suspense fallback={<RouteFallback/>}><L66/></Suspense> },
{ path: "privacy", element: <Suspense fallback={<RouteFallback/>}><L67/></Suspense> },
{ path: "about", element: <Suspense fallback={<RouteFallback/>}><L83/></Suspense> },
{ path: "shop", element: <Suspense fallback={<RouteFallback/>}><L68/></Suspense>, children: [
{ path: "p/:id", element: <Suspense fallback={<RouteFallback/>}><L69/></Suspense> },
{ path: "s/:slug", element: <Suspense fallback={<RouteFallback/>}><L70/></Suspense> }
] },
{ path: "terms", element: <Suspense fallback={<RouteFallback/>}><L71/></Suspense> },
{ path: "vendor/:username", element: <Suspense fallback={<RouteFallback/>}><L72/></Suspense> },
{ path: "*", element: <NotFound /> }
];
