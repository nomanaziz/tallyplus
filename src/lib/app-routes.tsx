import { Suspense, lazy } from "react";
import { Navigate, type RouteObject } from "react-router-dom";
import { RouteFallback } from "@/components/RouteFallback";
import NotFound from "@/pages/NotFound";
const L0 = lazy(() => import("@/pages/Index"));
const L1 = lazy(() => import("@/pages/admin/Ads"));
const L2 = lazy(() => import("@/pages/admin/Affiliates"));
const L3 = lazy(() => import("@/pages/admin/Banners"));
const L4 = lazy(() => import("@/pages/admin/Landing"));
const L5 = lazy(() => import("@/pages/admin/Locations"));
const L6 = lazy(() => import("@/pages/admin/Login"));
const L7 = lazy(() => import("@/pages/admin/Marketplace"));
const L8 = lazy(() => import("@/pages/admin/PaymentAttempts"));
const L9 = lazy(() => import("@/pages/admin/PaymentGateway"));
const L10 = lazy(() => import("@/pages/admin/Plans"));
const L11 = lazy(() => import("@/pages/admin/PromoPopups"));
const L12 = lazy(() => import("@/pages/admin/Settings"));
const L13 = lazy(() => import("@/pages/admin/ShopTypes"));
const L14 = lazy(() => import("@/pages/admin/SmsGateways"));
const L15 = lazy(() => import("@/pages/admin/SubscriptionRequests"));
const L16 = lazy(() => import("@/pages/admin/Subscriptions"));
const L17 = lazy(() => import("@/pages/admin/Training"));
const L18 = lazy(() => import("@/pages/admin/UsageLimits"));
const L19 = lazy(() => import("@/pages/admin/Users"));
const L20 = lazy(() => import("@/pages/admin/Index"));
const L21 = lazy(() => import("@/pages/affiliate/Register"));
const L22 = lazy(() => import("@/pages/Affiliate"));
const L23 = lazy(() => import("@/pages/app/Access"));
const L24 = lazy(() => import("@/pages/app/Affiliate"));
const L25 = lazy(() => import("@/pages/app/Assets"));
const L26 = lazy(() => import("@/pages/app/BuySms"));
const L27 = lazy(() => import("@/pages/app/Cashbox"));
const L28 = lazy(() => import("@/pages/app/CombinedReport"));
const L29 = lazy(() => import("@/pages/app/Contacts"));
const L30 = lazy(() => import("@/pages/app/CustomerWishlist"));
const L31 = lazy(() => import("@/pages/app/Dashboard"));
const L32 = lazy(() => import("@/pages/app/DueHistory"));
const L33 = lazy(() => import("@/pages/app/DueLedger"));
const L34 = lazy(() => import("@/pages/app/ExpenseLedger"));
const L35 = lazy(() => import("@/pages/app/Expiring"));
const L36 = lazy(() => import("@/pages/app/FordoHistory"));
const L37 = lazy(() => import("@/pages/app/Marketing"));
const L38 = lazy(() => import("@/pages/app/online-shop/Customize"));
const L39 = lazy(() => import("@/pages/app/online-shop/Delivery"));
const L40 = lazy(() => import("@/pages/app/online-shop/Featured"));
const L41 = lazy(() => import("@/pages/app/online-shop/FraudCheck"));
const L42 = lazy(() => import("@/pages/app/online-shop/Marketing"));
const L43 = lazy(() => import("@/pages/app/online-shop/Messages"));
const L44 = lazy(() => import("@/pages/app/online-shop/Orders"));
const L45 = lazy(() => import("@/pages/app/online-shop/Policy"));
const L46 = lazy(() => import("@/pages/app/online-shop/Products"));
const L47 = lazy(() => import("@/pages/app/online-shop/PromoCodes"));
const L48 = lazy(() => import("@/pages/app/online-shop/Settings"));
const L49 = lazy(() => import("@/pages/app/online-shop/Themes"));
const L50 = lazy(() => import("@/pages/app/online-shop/Index"));
const L51 = lazy(() => import("@/pages/app/OwnerLedger"));
const L52 = lazy(() => import("@/pages/app/OwnerReport"));
const L53 = lazy(() => import("@/pages/app/Printer"));
const L54 = lazy(() => import("@/pages/app/Products"));
const L55 = lazy(() => import("@/pages/app/Purchase"));
const L56 = lazy(() => import("@/pages/app/PurchaseLedger"));
const L57 = lazy(() => import("@/pages/app/QuickOrder"));
const L58 = lazy(() => import("@/pages/app/RecycleBin"));
const L59 = lazy(() => import("@/pages/app/Reports"));
const L60 = lazy(() => import("@/pages/app/returns/Id"));
const L61 = lazy(() => import("@/pages/app/returns/New"));
const L62 = lazy(() => import("@/pages/app/Returns"));
const L63 = lazy(() => import("@/pages/app/SalesLedger"));
const L64 = lazy(() => import("@/pages/app/Sell"));
const L65 = lazy(() => import("@/pages/app/Shops"));
const L66 = lazy(() => import("@/pages/app/SmsHistory"));
const L67 = lazy(() => import("@/pages/app/SubscribeCallback"));
const L68 = lazy(() => import("@/pages/app/Subscribe"));
const L69 = lazy(() => import("@/pages/app/Training"));
const L70 = lazy(() => import("@/pages/app/UsageLimits"));
const L71 = lazy(() => import("@/pages/app/Warranty"));
const L72 = lazy(() => import("@/pages/app/AppLayout"));
const L73 = lazy(() => import("@/pages/Auth"));
const L74 = lazy(() => import("@/pages/customer/CreateFordo"));
const L75 = lazy(() => import("@/pages/customer/Dashboard"));
const L76 = lazy(() => import("@/pages/customer/Money"));
const L77 = lazy(() => import("@/pages/customer/MyFordo"));
const L78 = lazy(() => import("@/pages/customer/Notes"));
const L79 = lazy(() => import("@/pages/customer/Profile"));
const L80 = lazy(() => import("@/pages/customer/CustomerLayout"));
const L81 = lazy(() => import("@/pages/Pricing"));
const L82 = lazy(() => import("@/pages/Privacy"));
const L83 = lazy(() => import("@/pages/shop/Index"));
const L84 = lazy(() => import("@/pages/Terms"));

export const appRoutes: RouteObject[] = [
{ index: true, element: <Suspense fallback={<RouteFallback/>}><L0/></Suspense> },
{ path: "admin", element: <Suspense fallback={<RouteFallback/>}><L20/></Suspense>, children: [
{ path: "ads", element: <Suspense fallback={<RouteFallback/>}><L1/></Suspense> },
{ path: "affiliates", element: <Suspense fallback={<RouteFallback/>}><L2/></Suspense> },
{ path: "banners", element: <Suspense fallback={<RouteFallback/>}><L3/></Suspense> },
{ path: "landing", element: <Suspense fallback={<RouteFallback/>}><L4/></Suspense> },
{ path: "locations", element: <Suspense fallback={<RouteFallback/>}><L5/></Suspense> },
{ path: "login", element: <Suspense fallback={<RouteFallback/>}><L6/></Suspense> },
{ path: "marketplace", element: <Suspense fallback={<RouteFallback/>}><L7/></Suspense> },
{ path: "payment-attempts", element: <Suspense fallback={<RouteFallback/>}><L8/></Suspense> },
{ path: "payment-gateway", element: <Suspense fallback={<RouteFallback/>}><L9/></Suspense> },
{ path: "plans", element: <Suspense fallback={<RouteFallback/>}><L10/></Suspense> },
{ path: "promo-popups", element: <Suspense fallback={<RouteFallback/>}><L11/></Suspense> },
{ path: "settings", element: <Suspense fallback={<RouteFallback/>}><L12/></Suspense> },
{ path: "shop-types", element: <Suspense fallback={<RouteFallback/>}><L13/></Suspense> },
{ path: "sms-gateways", element: <Suspense fallback={<RouteFallback/>}><L14/></Suspense> },
{ path: "subscription-requests", element: <Suspense fallback={<RouteFallback/>}><L15/></Suspense> },
{ path: "subscriptions", element: <Suspense fallback={<RouteFallback/>}><L16/></Suspense> },
{ path: "training", element: <Suspense fallback={<RouteFallback/>}><L17/></Suspense> },
{ path: "usage-limits", element: <Suspense fallback={<RouteFallback/>}><L18/></Suspense> },
{ path: "users", element: <Suspense fallback={<RouteFallback/>}><L19/></Suspense> }
] },
{ path: "affiliate", element: <Suspense fallback={<RouteFallback/>}><L22/></Suspense>, children: [
{ path: "register", element: <Suspense fallback={<RouteFallback/>}><L21/></Suspense> }
] },
{ path: "app", element: <Suspense fallback={<RouteFallback/>}><L72/></Suspense>, children: [
{ path: "access", element: <Suspense fallback={<RouteFallback/>}><L23/></Suspense> },
{ path: "affiliate", element: <Suspense fallback={<RouteFallback/>}><L24/></Suspense> },
{ path: "assets", element: <Suspense fallback={<RouteFallback/>}><L25/></Suspense> },
{ path: "buy-sms", element: <Suspense fallback={<RouteFallback/>}><L26/></Suspense> },
{ path: "cashbox", element: <Suspense fallback={<RouteFallback/>}><L27/></Suspense> },
{ path: "combined-report", element: <Suspense fallback={<RouteFallback/>}><L28/></Suspense> },
{ path: "contacts", element: <Suspense fallback={<RouteFallback/>}><L29/></Suspense> },
{ path: "customer-wishlist", element: <Suspense fallback={<RouteFallback/>}><L30/></Suspense> },
{ path: "dashboard", element: <Suspense fallback={<RouteFallback/>}><L31/></Suspense> },
{ path: "due-history", element: <Suspense fallback={<RouteFallback/>}><L32/></Suspense> },
{ path: "due-ledger", element: <Suspense fallback={<RouteFallback/>}><L33/></Suspense> },
{ path: "expense-ledger", element: <Suspense fallback={<RouteFallback/>}><L34/></Suspense> },
{ path: "expiring", element: <Suspense fallback={<RouteFallback/>}><L35/></Suspense> },
{ path: "fordo-history", element: <Suspense fallback={<RouteFallback/>}><L36/></Suspense> },
{ path: "marketing", element: <Suspense fallback={<RouteFallback/>}><L37/></Suspense> },
{ path: "online-shop", element: <Suspense fallback={<RouteFallback/>}><L50/></Suspense>, children: [
{ path: "customize", element: <Suspense fallback={<RouteFallback/>}><L38/></Suspense> },
{ path: "delivery", element: <Suspense fallback={<RouteFallback/>}><L39/></Suspense> },
{ path: "featured", element: <Suspense fallback={<RouteFallback/>}><L40/></Suspense> },
{ path: "fraud-check", element: <Suspense fallback={<RouteFallback/>}><L41/></Suspense> },
{ path: "marketing", element: <Suspense fallback={<RouteFallback/>}><L42/></Suspense> },
{ path: "messages", element: <Suspense fallback={<RouteFallback/>}><L43/></Suspense> },
{ path: "orders", element: <Suspense fallback={<RouteFallback/>}><L44/></Suspense> },
{ path: "policy", element: <Suspense fallback={<RouteFallback/>}><L45/></Suspense> },
{ path: "products", element: <Suspense fallback={<RouteFallback/>}><L46/></Suspense> },
{ path: "promo-codes", element: <Suspense fallback={<RouteFallback/>}><L47/></Suspense> },
{ path: "settings", element: <Suspense fallback={<RouteFallback/>}><L48/></Suspense> },
{ path: "themes", element: <Suspense fallback={<RouteFallback/>}><L49/></Suspense> }
] },
{ path: "owner-ledger", element: <Suspense fallback={<RouteFallback/>}><L51/></Suspense> },
{ path: "owner-report", element: <Suspense fallback={<RouteFallback/>}><L52/></Suspense> },
{ path: "printer", element: <Suspense fallback={<RouteFallback/>}><L53/></Suspense> },
{ path: "products", element: <Suspense fallback={<RouteFallback/>}><L54/></Suspense> },
{ path: "purchase", element: <Suspense fallback={<RouteFallback/>}><L55/></Suspense> },
{ path: "purchase-ledger", element: <Suspense fallback={<RouteFallback/>}><L56/></Suspense> },
{ path: "quick-order", element: <Suspense fallback={<RouteFallback/>}><L57/></Suspense> },
{ path: "recycle-bin", element: <Suspense fallback={<RouteFallback/>}><L58/></Suspense> },
{ path: "reports", element: <Suspense fallback={<RouteFallback/>}><L59/></Suspense> },
{ path: "returns", element: <Suspense fallback={<RouteFallback/>}><L62/></Suspense>, children: [
{ path: ":id", element: <Suspense fallback={<RouteFallback/>}><L60/></Suspense> },
{ path: "new", element: <Suspense fallback={<RouteFallback/>}><L61/></Suspense> }
] },
{ path: "sales-ledger", element: <Suspense fallback={<RouteFallback/>}><L63/></Suspense> },
{ path: "sell", element: <Suspense fallback={<RouteFallback/>}><L64/></Suspense> },
{ path: "shops", element: <Suspense fallback={<RouteFallback/>}><L65/></Suspense> },
{ path: "sms-history", element: <Suspense fallback={<RouteFallback/>}><L66/></Suspense> },
{ path: "stock", element: <Navigate to="/app/products" replace /> },
{ path: "stock-edit", element: <Navigate to="/app/products" replace /> },
{ path: "subscribe", element: <Suspense fallback={<RouteFallback/>}><L68/></Suspense>, children: [
{ path: "callback", element: <Suspense fallback={<RouteFallback/>}><L67/></Suspense> }
] },
{ path: "training", element: <Suspense fallback={<RouteFallback/>}><L69/></Suspense> },
{ path: "usage-limits", element: <Suspense fallback={<RouteFallback/>}><L70/></Suspense> },
{ path: "warranty", element: <Suspense fallback={<RouteFallback/>}><L71/></Suspense> }
] },
{ path: "auth", element: <Suspense fallback={<RouteFallback/>}><L73/></Suspense> },
{ path: "customer", element: <Suspense fallback={<RouteFallback/>}><L80/></Suspense>, children: [
{ path: "create-fordo", element: <Suspense fallback={<RouteFallback/>}><L74/></Suspense> },
{ path: "dashboard", element: <Suspense fallback={<RouteFallback/>}><L75/></Suspense> },
{ path: "money", element: <Suspense fallback={<RouteFallback/>}><L76/></Suspense> },
{ path: "my-fordo", element: <Suspense fallback={<RouteFallback/>}><L77/></Suspense> },
{ path: "notes", element: <Suspense fallback={<RouteFallback/>}><L78/></Suspense> },
{ path: "profile", element: <Suspense fallback={<RouteFallback/>}><L79/></Suspense> }
] },
{ path: "pricing", element: <Suspense fallback={<RouteFallback/>}><L81/></Suspense> },
{ path: "privacy", element: <Suspense fallback={<RouteFallback/>}><L82/></Suspense> },
{ path: "shop", element: <Suspense fallback={<RouteFallback/>}><L83/></Suspense> },
{ path: "terms", element: <Suspense fallback={<RouteFallback/>}><L84/></Suspense> },
{ path: "*", element: <NotFound /> }
];
