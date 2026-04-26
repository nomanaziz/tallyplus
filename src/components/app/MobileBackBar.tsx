import { useNavigate, useLocation, useRouter } from "@/lib/router";
import { ArrowLeft } from "lucide-react";
import { useI18n } from "@/lib/i18n";

// Mobile-only sticky back bar shown on every /app/* page EXCEPT the dashboard.
// Tapping the arrow goes back in history; if there is no history it returns to dashboard.
export function MobileBackBar() {
  const nav = useNavigate();
  const loc = useLocation();
  const router = useRouter();
  const { lang } = useI18n();

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
  const labelMap: Record<string, { bn: string; en: string }> = {
    sell: { bn: "বেচা", en: "Sell" },
    purchase: { bn: "কেনা", en: "Purchase" },
    products: { bn: "পণ্য", en: "Products" },
    stock: { bn: "স্টক", en: "Stock" },
    contacts: { bn: "যোগাযোগ", en: "Contacts" },
    reports: { bn: "ব্যবসার রিপোর্ট", en: "Business Report" },
    "due-ledger": { bn: "বাকির খাতা", en: "Due Ledger" },
    "sales-ledger": { bn: "বেচার খাতা", en: "Sales Ledger" },
    "purchase-ledger": { bn: "কেনার খাতা", en: "Purchase Ledger" },
    "expense-ledger": { bn: "খরচের খাতা", en: "Expense Ledger" },
    "online-shop": { bn: "অনলাইন শপ", en: "Online Shop" },
    cashbox: { bn: "ক্যাশবক্স", en: "Cashbox" },
    "quick-order": { bn: "দ্রুত ফর্দ", en: "Quick Order" },
    marketing: { bn: "মার্কেটিং", en: "Marketing" },
    printer: { bn: "প্রিন্টার", en: "Printer" },
    access: { bn: "অ্যাপ অ্যাক্সেস", en: "App Access" },
    affiliate: { bn: "গ্রোথ পার্টনার", en: "Growth Partner" },
    training: { bn: "অ্যাপ ট্রেনিং", en: "App Training" },
    subscribe: { bn: "সাবস্ক্রিপশন", en: "Subscription" },
    shops: { bn: "দোকান", en: "Shops" },
    "combined-report": { bn: "কম্বাইন্ড রিপোর্ট", en: "Combined Report" },
    "customer-wishlist": { bn: "গ্রাহক ফর্দ", en: "Customer Wishlist" },
    expiring: { bn: "মেয়াদোত্তীর্ণ", en: "Expiring" },
    warranty: { bn: "ওয়ারেন্টি", en: "Warranty" },
    "recycle-bin": { bn: "রিসাইকেল বিন", en: "Recycle Bin" },
  };
  const label = labelMap[seg] ? (lang === "bn" ? labelMap[seg].bn : labelMap[seg].en) : "";

  return (
    <div className="sticky top-0 z-20 flex h-11 items-center gap-2 border-b bg-background/95 px-2 backdrop-blur md:hidden">
      <button
        onClick={goBack}
        className="flex h-9 w-9 items-center justify-center rounded-full text-foreground hover:bg-accent active:scale-95 transition"
        aria-label={lang === "bn" ? "পিছনে" : "Back"}
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
      <span className="truncate text-sm font-semibold">{label}</span>
    </div>
  );
}
