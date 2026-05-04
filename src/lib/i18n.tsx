import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { CURRENCY_SYMBOLS } from "./countries";

export type Lang = "bn" | "en" | "hi" | "ta" | "te" | "ur" | "ar";

const RTL_LANGS = new Set<Lang>(["ur", "ar"]);

type Dict = Record<string, string>;

const en: Dict = {
  appName: "Tally Plus",
  tagline: "Clear your accounts in one click — save time, grow your business",
  heroSub: "POS, stock, dues, expenses & reports on mobile — works offline too.",
  getStarted: "Get Started",
  login: "Login", pricing: "Pricing", features: "Features", about: "About", contact: "Contact",
  home: "Home", dashboard: "Dashboard", sales: "Sales", purchases: "Purchases",
  quickSale: "Quick Sale", cashbox: "Cashbox", products: "Products", stock: "Stock",
  customers: "Contacts", salesLedger: "Sales Ledger", purchaseLedger: "Purchase Ledger",
  dueLedger: "Due Ledger", expenseLedger: "Expense Ledger", expenses: "Expenses",
  reports: "Reports", printer: "Printer", marketing: "Marketing", onlineShop: "Online Shop",
  expiringProducts: "Expiring Products", appAccess: "App Access", training: "Training",
  settings: "Settings", subscribe: "Subscribe", logout: "Logout",
  phone: "Phone Number", enterPhone: "Enter your mobile number", sendOtp: "Send OTP",
  enterOtp: "Enter 6-digit OTP", verify: "Verify", setPin: "Set 4-digit PIN",
  enterPin: "Enter PIN", confirmPin: "Confirm PIN", save: "Save",
  todaysSales: "Today's Sales", todaysPurchase: "Today's Purchase", todaysExpense: "Today's Expense",
  totalStock: "Total Stock", totalReceivable: "Total Receivable", totalPayable: "Total Payable",
  today: "Today", week: "Week", month: "Month", year: "Year", allTime: "All Time", refresh: "Refresh",
  balance: "Balance", monthly: "Monthly", halfYearly: "Half-Yearly", yearly: "Yearly", days: "days",
  selectPlan: "Select a plan", paymentMethod: "Payment Method", txnId: "Transaction ID",
  submit: "Submit", pendingApproval: "Pending admin approval",
  subscriptionExpired: "Your subscription has expired", renew: "Renew",
  addProduct: "Add Product", addCustomer: "Add Customer",
  name: "Name", price: "Price", qty: "Qty", total: "Total", discount: "Discount",
  paid: "Paid", due: "Due", cart: "Cart", checkout: "Checkout",
  online: "Online", offline: "Offline", syncing: "Syncing",
  setupShop: "Set up your shop", shopName: "Shop name", address: "Address", create: "Create",
  welcome: "Welcome", devOtpHint: "Dev mode: any 6 digits or 123456 works",
  learnAboutTallyPlus: "Learn more about Tally Plus", backToLogin: "← Back to login / sign-up",
  personalUse: "Personal accounts", shopUse: "Shop accounts",
  personalUseHint: "Income–expense, lending, wishlist & monthly reports",
  shopUseHint: "POS, stock, dues, employees, SMS & full reports",
  personalSignupCta: "Start as Personal", shopSignupCta: "Start as Shop",
  welcomeTagline: "Tally Plus — Your personal finances and shop accounting, in one app",
};

const bn: Dict = {
  ...en,
  appName: "টালি প্লাস",
  tagline: "এক ক্লিকেই হিসাব পরিষ্কার, সময় বাঁচে, ব্যবসাও বাড়ে",
  heroSub: "মোবাইলে চালান POS, স্টক, বাকি, খরচ আর রিপোর্ট — অফলাইনেও কাজ করে।",
  getStarted: "শুরু করুন", login: "লগইন", pricing: "প্রাইসিং", features: "ফিচার",
  about: "আমাদের সম্পর্কে", contact: "যোগাযোগ", home: "হোম", dashboard: "ড্যাশবোর্ড",
  sales: "বিক্রয়", purchases: "ক্রয়", quickSale: "দ্রুত বিক্রয়", cashbox: "ক্যাশবক্স",
  products: "প্রোডাক্ট লিস্ট", stock: "স্টকের হিসাব", customers: "যোগাযোগ",
  salesLedger: "বিক্রয়ের খাতা", purchaseLedger: "ক্রয়ের খাতা", dueLedger: "বাকির খাতা",
  expenseLedger: "খরচের খাতা", expenses: "খরচ", reports: "ব্যবসার রিপোর্ট",
  printer: "প্রিন্টার", marketing: "মার্কেটিং", onlineShop: "অনলাইন শপ",
  expiringProducts: "মেয়াদোত্তীর্ণ পণ্য", appAccess: "অ্যাপ অ্যাক্সেস", training: "অ্যাপ ট্রেনিং",
  settings: "সেটিংস", subscribe: "সাবস্ক্রিপশন কিনুন", logout: "লগআউট",
  phone: "ফোন নাম্বার", save: "সেভ করুন",
  today: "আজকের", week: "সপ্তাহের", month: "মাসের", year: "বছরের", allTime: "অল টাইম",
  balance: "ব্যালেন্স", monthly: "মাসিক", halfYearly: "ষান্মাসিক", yearly: "বার্ষিক", days: "দিন",
  welcome: "স্বাগতম",
};

const hi: Dict = {
  ...en,
  appName: "टैली प्लस",
  tagline: "एक क्लिक में हिसाब साफ — समय बचाएँ, व्यापार बढ़ाएँ",
  heroSub: "मोबाइल पर POS, स्टॉक, बकाया, खर्च और रिपोर्ट — ऑफ़लाइन भी काम करता है।",
  getStarted: "शुरू करें", login: "लॉगिन", pricing: "मूल्य", features: "विशेषताएँ",
  about: "हमारे बारे में", contact: "संपर्क", home: "होम", dashboard: "डैशबोर्ड",
  sales: "बिक्री", purchases: "खरीद", quickSale: "त्वरित बिक्री", cashbox: "कैशबॉक्स",
  products: "उत्पाद", stock: "स्टॉक", customers: "संपर्क",
  reports: "रिपोर्ट", expenses: "खर्च", settings: "सेटिंग्स", logout: "लॉग आउट",
  save: "सहेजें", create: "बनाएँ", welcome: "स्वागत है", name: "नाम",
  price: "मूल्य", qty: "मात्रा", total: "कुल", discount: "छूट", paid: "भुगतान",
  due: "बकाया", cart: "कार्ट", checkout: "चेकआउट",
  today: "आज", week: "सप्ताह", month: "महीना", year: "वर्ष", allTime: "हर समय",
};

const ta: Dict = {
  ...en,
  appName: "டாலி பிளஸ்",
  tagline: "ஒரே கிளிக்கில் கணக்குகள் தெளிவு — நேரம் சேமியுங்கள், வணிகம் வளரும்",
  heroSub: "மொபைலில் POS, ஸ்டாக், பாக்கி, செலவு மற்றும் அறிக்கை — ஆஃப்லைனிலும் வேலை செய்கிறது.",
  getStarted: "தொடங்குக", login: "உள்நுழைவு", pricing: "விலை", features: "அம்சங்கள்",
  about: "எங்களைப் பற்றி", contact: "தொடர்பு", home: "முகப்பு", dashboard: "டாஷ்போர்டு",
  sales: "விற்பனை", purchases: "கொள்முதல்", products: "தயாரிப்புகள்", stock: "சரக்கு",
  customers: "தொடர்புகள்", reports: "அறிக்கைகள்", expenses: "செலவுகள்",
  settings: "அமைப்புகள்", logout: "வெளியேறு", save: "சேமி", welcome: "வரவேற்கிறோம்",
};

const te: Dict = {
  ...en,
  appName: "టాలీ ప్లస్",
  tagline: "ఒక్క క్లిక్‌లో లెక్కలు స్పష్టం — సమయం ఆదా, వ్యాపారం వృద్ధి",
  heroSub: "మొబైల్‌లో POS, స్టాక్, బకాయి, ఖర్చు, నివేదికలు — ఆఫ్‌లైన్‌లో కూడా పనిచేస్తుంది.",
  getStarted: "ప్రారంభించండి", login: "లాగిన్", pricing: "ధర", features: "ఫీచర్లు",
  about: "మా గురించి", contact: "సంప్రదించండి", home: "హోమ్", dashboard: "డ్యాష్‌బోర్డ్",
  sales: "అమ్మకాలు", purchases: "కొనుగోళ్లు", products: "ఉత్పత్తులు", stock: "నిల్వ",
  customers: "పరిచయాలు", reports: "నివేదికలు", expenses: "ఖర్చులు",
  settings: "సెట్టింగ్‌లు", logout: "లాగ్ అవుట్", save: "సేవ్", welcome: "స్వాగతం",
};

const ur: Dict = {
  ...en,
  appName: "ٹیلی پلس",
  tagline: "ایک کلک میں حساب صاف — وقت بچائیں، کاروبار بڑھائیں",
  heroSub: "موبائل پر POS، اسٹاک، بقایا، اخراجات اور رپورٹس — آف لائن بھی کام کرتا ہے۔",
  getStarted: "شروع کریں", login: "لاگ ان", pricing: "قیمت", features: "خصوصیات",
  about: "ہمارے بارے میں", contact: "رابطہ", home: "ہوم", dashboard: "ڈیش بورڈ",
  sales: "فروخت", purchases: "خریداری", products: "پروڈکٹس", stock: "اسٹاک",
  customers: "رابطے", reports: "رپورٹس", expenses: "اخراجات",
  settings: "ترتیبات", logout: "لاگ آؤٹ", save: "محفوظ کریں", welcome: "خوش آمدید",
  name: "نام", price: "قیمت", qty: "مقدار", total: "کل", discount: "رعایت",
  paid: "ادا شدہ", due: "بقایا", cart: "کارٹ", checkout: "چیک آؤٹ",
};

const ar: Dict = {
  ...en,
  appName: "تالي بلس",
  tagline: "حسابات واضحة بنقرة واحدة — وفّر الوقت ونمِّ أعمالك",
  heroSub: "نقاط البيع والمخزون والديون والمصروفات والتقارير على الجوال — تعمل دون اتصال.",
  getStarted: "ابدأ الآن", login: "تسجيل الدخول", pricing: "الأسعار", features: "الميزات",
  about: "من نحن", contact: "اتصل بنا", home: "الرئيسية", dashboard: "لوحة التحكم",
  sales: "المبيعات", purchases: "المشتريات", products: "المنتجات", stock: "المخزون",
  customers: "جهات الاتصال", reports: "التقارير", expenses: "المصروفات",
  settings: "الإعدادات", logout: "تسجيل الخروج", save: "حفظ", welcome: "مرحباً",
  name: "الاسم", price: "السعر", qty: "الكمية", total: "الإجمالي", discount: "الخصم",
  paid: "مدفوع", due: "المستحق", cart: "السلة", checkout: "إتمام الطلب",
};

const dict: Record<Lang, Dict> = { en, bn, hi, ta, te, ur, ar };

export const LANG_NAMES: { code: Lang; native: string }[] = [
  { code: "bn", native: "বাংলা" },
  { code: "en", native: "English" },
  { code: "hi", native: "हिन्दी" },
  { code: "ta", native: "தமிழ்" },
  { code: "te", native: "తెలుగు" },
  { code: "ur", native: "اردو" },
  { code: "ar", native: "العربية" },
];

type Key = keyof typeof en;

const I18nCtx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: Key) => string }>({
  lang: "bn",
  setLang: () => {},
  t: (k) => k,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("bn");
  useEffect(() => {
    const saved = (typeof window !== "undefined" && localStorage.getItem("tp_lang")) as Lang | null;
    if (saved && (["bn","en","hi","ta","te","ur","ar"] as Lang[]).includes(saved)) setLangState(saved);
  }, []);
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = lang;
    document.documentElement.dir = RTL_LANGS.has(lang) ? "rtl" : "ltr";
  }, [lang]);
  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("tp_lang", l);
  };
  const t = (k: Key) => dict[lang][k] ?? en[k] ?? k;
  return <I18nCtx.Provider value={{ lang, setLang, t }}>{children}</I18nCtx.Provider>;
}

export const useI18n = () => useContext(I18nCtx);

export function bnNum(v: number | string) {
  const map: Record<string, string> = { "0": "০", "1": "১", "2": "২", "3": "৩", "4": "৪", "5": "৫", "6": "৬", "7": "৭", "8": "৮", "9": "৯" };
  return String(v).replace(/[0-9]/g, (d) => map[d] ?? d);
}

function getCurrency(): string {
  if (typeof window === "undefined") return "BDT";
  return localStorage.getItem("tp_currency") || "BDT";
}

export function fmtMoney(v: number, lang: Lang, currency?: string) {
  const cur = currency || getCurrency();
  const sym = CURRENCY_SYMBOLS[cur] || cur;
  const s = (Math.round(v * 100) / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const out = lang === "bn" ? bnNum(s) : s;
  return `${sym} ${out}`;
}
