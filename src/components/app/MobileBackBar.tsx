import { useNavigate, useLocation, useRouter } from "@/lib/router";
import { ArrowLeft } from "lucide-react";
import { useI18n, type TKey } from "@/lib/i18n";

// Mobile-only sticky back bar shown on every /app/* page EXCEPT the dashboard.
// Tapping the arrow goes back in history; if there is no history it returns to dashboard.
export function MobileBackBar() {
  const nav = useNavigate();
  const loc = useLocation();
  const router = useRouter();
  const { t } = useI18n();

  // Hide on the home/dashboard route — that's the "root" of the app.
  if (loc.pathname === "/app/dashboard" || loc.pathname === "/app" || loc.pathname === "/app/") {
    return null;
  }

  const goBack = () => {
    // Try browser/router history; fallback to dashboard.
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.history.back();
    } else {
      nav({ to: "/app/dashboard" });
    }
  };

  // Derive a friendly label from the path.
  const seg = loc.pathname.replace(/^\/app\/?/, "").split("/")[0] || "";
  const keyMap: Record<string, TKey> = {
    sell: "nav_sell",
    purchase: "nav_purchase",
    products: "nav_productsStock",
    stock: "nav_productsStock",
    contacts: "nav_customerStaff",
    reports: "nav_businessReport",
    "due-ledger": "nav_dueBook",
    "sales-ledger": "nav_salesBook",
    "purchase-ledger": "nav_purchaseBook",
    "expense-ledger": "nav_expenseBook",
    "online-shop": "nav_onlineShop",
    cashbox: "nav_cashbox",
    "quick-order": "nav_quickSell",
    marketing: "nav_marketing",
    printer: "nav_printer",
    access: "nav_appAccess",
    affiliate: "nav_growthPartner",
    training: "nav_appTraining",
    subscribe: "nav_buySubscription",
    shops: "switchShop",
    "combined-report": "combinedReport",
    "customer-wishlist": "nav_customerFordo",
    expiring: "nav_expiringProducts",
    warranty: "nav_warranty",
    "recycle-bin": "nav_recycleBin",
  };
  const label = keyMap[seg] ? t(keyMap[seg]) : "";

  return (
    <div className="sticky top-0 z-20 flex h-11 items-center gap-2 border-b bg-background/95 px-2 backdrop-blur md:hidden">
      <button
        onClick={goBack}
        className="flex h-9 w-9 items-center justify-center rounded-full text-foreground hover:bg-accent active:scale-95 transition"
        aria-label={t("back")}
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
      <span className="truncate text-sm font-semibold">{label}</span>
    </div>
  );
}
