import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { RouteSkeleton } from "@/components/app/RouteSkeleton";
import NotFound from "@/pages/NotFound";

function S({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<RouteSkeleton />}>{children}</Suspense>;
}

const P0 = lazy(() => import("./pages/admin/Affiliates"));
const P1 = lazy(() => import("./pages/admin/Banners"));
const P2 = lazy(() => import("./pages/admin/Index"));
const P3 = lazy(() => import("./pages/admin/Landing"));
const P4 = lazy(() => import("./pages/admin/Login"));
const P5 = lazy(() => import("./pages/admin/Marketplace"));
const P6 = lazy(() => import("./pages/admin/Plans"));
const P7 = lazy(() => import("./pages/admin/Settings"));
const P8 = lazy(() => import("./pages/admin/ShopTypes"));
const P9 = lazy(() => import("./pages/admin/SubscriptionRequests"));
const P10 = lazy(() => import("./pages/admin/Subscriptions"));
const P11 = lazy(() => import("./pages/admin/Training"));
const P12 = lazy(() => import("./pages/Admin"));
const P13 = lazy(() => import("./pages/admin/Users"));
const P14 = lazy(() => import("./pages/affiliate/Register"));
const P15 = lazy(() => import("./pages/Affiliate"));
const P16 = lazy(() => import("./pages/app/Access"));
const P17 = lazy(() => import("./pages/app/Affiliate"));
const P18 = lazy(() => import("./pages/app/Assets"));
const P19 = lazy(() => import("./pages/app/Cashbox"));
const P20 = lazy(() => import("./pages/app/CombinedReport"));
const P21 = lazy(() => import("./pages/app/Contacts"));
const P22 = lazy(() => import("./pages/app/CustomerWishlist"));
const P23 = lazy(() => import("./pages/app/Dashboard"));
const P24 = lazy(() => import("./pages/app/DueLedger"));
const P25 = lazy(() => import("./pages/app/ExpenseLedger"));
const P26 = lazy(() => import("./pages/app/Expiring"));
const P27 = lazy(() => import("./pages/app/FordoHistory"));
const P28 = lazy(() => import("./pages/app/Marketing"));
const P29 = lazy(() => import("./pages/app/online-shop/Customize"));
const P30 = lazy(() => import("./pages/app/online-shop/Delivery"));
const P31 = lazy(() => import("./pages/app/online-shop/Featured"));
const P32 = lazy(() => import("./pages/app/online-shop/FraudCheck"));
const P33 = lazy(() => import("./pages/app/online-shop/Index"));
const P34 = lazy(() => import("./pages/app/online-shop/Marketing"));
const P35 = lazy(() => import("./pages/app/online-shop/Messages"));
const P36 = lazy(() => import("./pages/app/online-shop/Orders"));
const P37 = lazy(() => import("./pages/app/online-shop/Policy"));
const P38 = lazy(() => import("./pages/app/online-shop/Products"));
const P39 = lazy(() => import("./pages/app/online-shop/PromoCodes"));
const P40 = lazy(() => import("./pages/app/online-shop/Settings"));
const P41 = lazy(() => import("./pages/app/online-shop/Themes"));
const P42 = lazy(() => import("./pages/app/OnlineShop"));
const P43 = lazy(() => import("./pages/app/OwnerLedger"));
const P44 = lazy(() => import("./pages/app/OwnerReport"));
const P45 = lazy(() => import("./pages/app/Printer"));
const P46 = lazy(() => import("./pages/app/Products"));
const P47 = lazy(() => import("./pages/app/PurchaseLedger"));
const P48 = lazy(() => import("./pages/app/Purchase"));
const P49 = lazy(() => import("./pages/app/QuickOrder"));
const P50 = lazy(() => import("./pages/app/RecycleBin"));
const P51 = lazy(() => import("./pages/app/Reports"));
const P52 = lazy(() => import("./pages/app/returns/Id"));
const P53 = lazy(() => import("./pages/app/returns/New"));
const P54 = lazy(() => import("./pages/app/Returns"));
const P55 = lazy(() => import("./pages/app/SalesLedger"));
const P56 = lazy(() => import("./pages/app/Sell"));
const P57 = lazy(() => import("./pages/app/Shops"));
const P58 = lazy(() => import("./pages/app/StockEdit"));
const P59 = lazy(() => import("./pages/app/Stock"));
const P60 = lazy(() => import("./pages/app/Subscribe"));
const P61 = lazy(() => import("./pages/app/Training"));
const P62 = lazy(() => import("./pages/app/AppLayout"));
const P63 = lazy(() => import("./pages/app/Warranty"));
const P64 = lazy(() => import("./pages/Auth"));
const P65 = lazy(() => import("./pages/f/slug/My"));
const P66 = lazy(() => import("./pages/f/Slug"));
const P67 = lazy(() => import("./pages/Index"));
const P68 = lazy(() => import("./pages/Pricing"));
const P69 = lazy(() => import("./pages/shop/Index"));
const P70 = lazy(() => import("./pages/shop/p/Id"));
const P71 = lazy(() => import("./pages/shop/s/Slug"));
const P72 = lazy(() => import("./pages/vendor/Username"));
const P73 = lazy(() => import("./pages/customer/Profile"));
const P74 = lazy(() => import("./pages/app/UsageLimits"));
const P75 = lazy(() => import("./pages/admin/UsageLimits"));
const P76 = lazy(() => import("./pages/admin/PromoPopups"));
const P77 = lazy(() => import("./pages/admin/PaymentGateway"));
const P78 = lazy(() => import("./pages/app/SubscribeCallback"));
const P79 = lazy(() => import("./pages/customer/CustomerLayout"));
const P80 = lazy(() => import("./pages/customer/Dashboard"));
const P81 = lazy(() => import("./pages/customer/Notes"));
const P82 = lazy(() => import("./pages/customer/Money"));
const P83 = lazy(() => import("./pages/customer/MyFordo"));

export function AppRoutes() {
  return (
    <Routes>
      <Route index element={<S><P67 /></S>} />
      <Route path="/admin" element={<S><P12 /></S>}>
      <Route index element={<S><P2 /></S>} />
      <Route path="affiliates" element={<S><P0 /></S>} />
      <Route path="banners" element={<S><P1 /></S>} />
      <Route path="landing" element={<S><P3 /></S>} />
      <Route path="login" element={<S><P4 /></S>} />
      <Route path="marketplace" element={<S><P5 /></S>} />
      <Route path="plans" element={<S><P6 /></S>} />
      <Route path="usage-limits" element={<S><P75 /></S>} />
      <Route path="promo-popups" element={<S><P76 /></S>} />
      <Route path="payment-gateway" element={<S><P77 /></S>} />
      <Route path="settings" element={<S><P7 /></S>} />
      <Route path="shop-types" element={<S><P8 /></S>} />
      <Route path="subscription-requests" element={<S><P9 /></S>} />
      <Route path="subscriptions" element={<S><P10 /></S>} />
      <Route path="training" element={<S><P11 /></S>} />
      <Route path="users" element={<S><P13 /></S>} />
      </Route>
      <Route path="/affiliate" element={<S><P15 /></S>}>
      <Route path="register" element={<S><P14 /></S>} />
      </Route>
      <Route path="/app" element={<S><P62 /></S>}>
      <Route path="access" element={<S><P16 /></S>} />
      <Route path="affiliate" element={<S><P17 /></S>} />
      <Route path="assets" element={<S><P18 /></S>} />
      <Route path="cashbox" element={<S><P19 /></S>} />
      <Route path="combined-report" element={<S><P20 /></S>} />
      <Route path="contacts" element={<S><P21 /></S>} />
      <Route path="customer-wishlist" element={<S><P22 /></S>} />
      <Route path="dashboard" element={<S><P23 /></S>} />
      <Route path="due-ledger" element={<S><P24 /></S>} />
      <Route path="expense-ledger" element={<S><P25 /></S>} />
      <Route path="expiring" element={<S><P26 /></S>} />
      <Route path="fordo-history" element={<S><P27 /></S>} />
      <Route path="marketing" element={<S><P28 /></S>} />
      <Route path="online-shop" element={<S><P33 /></S>}>
      <Route path="customize" element={<S><P29 /></S>} />
      <Route path="delivery" element={<S><P30 /></S>} />
      <Route path="featured" element={<S><P31 /></S>} />
      <Route path="fraud-check" element={<S><P32 /></S>} />
      <Route path="marketing" element={<S><P34 /></S>} />
      <Route path="messages" element={<S><P35 /></S>} />
      <Route path="orders" element={<S><P36 /></S>} />
      <Route path="policy" element={<S><P37 /></S>} />
      <Route path="products" element={<S><P38 /></S>} />
      <Route path="promo-codes" element={<S><P39 /></S>} />
      <Route path="settings" element={<S><P40 /></S>} />
      <Route path="themes" element={<S><P41 /></S>} />
      </Route>
      <Route path="online-shop" element={<S><P42 /></S>}>
      
      </Route>
      <Route path="owner-ledger" element={<S><P43 /></S>} />
      <Route path="owner-report" element={<S><P44 /></S>} />
      <Route path="printer" element={<S><P45 /></S>} />
      <Route path="products" element={<S><P46 /></S>} />
      <Route path="purchase-ledger" element={<S><P47 /></S>} />
      <Route path="purchase" element={<S><P48 /></S>} />
      <Route path="quick-order" element={<S><P49 /></S>} />
      <Route path="recycle-bin" element={<S><P50 /></S>} />
      <Route path="reports" element={<S><P51 /></S>} />
      <Route path="returns" element={<S><P54 /></S>}>
      <Route path=":id" element={<S><P52 /></S>} />
      <Route path="new" element={<S><P53 /></S>} />
      </Route>
      <Route path="sales-ledger" element={<S><P55 /></S>} />
      <Route path="sell" element={<S><P56 /></S>} />
      <Route path="shops" element={<S><P57 /></S>} />
      <Route path="stock-edit" element={<S><P58 /></S>} />
      <Route path="stock" element={<S><P59 /></S>} />
      <Route path="subscribe" element={<S><P60 /></S>} />
      <Route path="subscribe/callback" element={<S><P78 /></S>} />
      <Route path="usage-limits" element={<S><P74 /></S>} />
      <Route path="training" element={<S><P61 /></S>} />
      <Route path="warranty" element={<S><P63 /></S>} />
      </Route>
      <Route path="/auth" element={<S><P64 /></S>} />
      <Route path="/f/:slug" element={<S><P66 /></S>}>
      <Route path="my" element={<S><P65 /></S>} />
      </Route>
      <Route path="/pricing" element={<S><P68 /></S>} />
      <Route path="/shop" element={<S><P69 /></S>}>
      <Route path="p/:id" element={<S><P70 /></S>} />
      <Route path="s/:slug" element={<S><P71 /></S>} />
      </Route>
      <Route path="/vendor/:username" element={<S><P72 /></S>} />
      <Route path="/customer/profile" element={<S><P73 /></S>} />
      <Route path="/customer" element={<S><P79 /></S>}>
      <Route path="dashboard" element={<S><P80 /></S>} />
      <Route path="notes" element={<S><P81 /></S>} />
      <Route path="money" element={<S><P82 /></S>} />
      <Route path="my-fordo" element={<S><P83 /></S>} />
      </Route>
      <Route path="*" element={<S><NotFound /></S>} />
    </Routes>
  );
}
