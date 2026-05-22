import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { CURRENCY_SYMBOLS } from "./countries";

export type Lang = "bn" | "en" | "hi" | "ta" | "te" | "ur" | "ar";

const RTL_LANGS = new Set<Lang>(["ur", "ar"]);

type Dict = Record<string, string>;

// Per-key translations for the app shell + dashboard (Phase 1).
// Each entry MUST provide all 7 languages. Falls back to English if missing.
type Tr = Record<Lang, string>;
const T: Record<string, Tr> = {
  // ── Sidebar sections ──
  sec_main:            { bn: "মূল",            en: "Main",            hi: "मुख्य",          ta: "முதன்மை",       te: "ముఖ్యం",         ur: "اہم",            ar: "الرئيسية" },
  sec_transactions:    { bn: "লেনদেন",          en: "Transactions",    hi: "लेन-देन",        ta: "பரிவர்த்தனைகள்", te: "లావాదేవీలు",      ur: "لین دین",        ar: "المعاملات" },
  sec_books:           { bn: "হিসাবের বই",      en: "Books",           hi: "बही-खाते",       ta: "புத்தகங்கள்",    te: "ఖాతా పుస్తకాలు",   ur: "کھاتے",          ar: "الدفاتر" },
  sec_inventory:       { bn: "পণ্য ও স্টক",     en: "Inventory",       hi: "उत्पाद और स्टॉक", ta: "சரக்கு",        te: "నిల్వ",          ur: "اسٹاک",          ar: "المخزون" },
  sec_customers:       { bn: "গ্রাহক ও যোগাযোগ", en: "Customers",       hi: "ग्राहक",         ta: "வாடிக்கையாளர்கள்", te: "కస్టమర్లు",    ur: "گاہک",           ar: "العملاء" },
  sec_reportsSettings: { bn: "রিপোর্ট ও সেটিংস", en: "Reports & Settings", hi: "रिपोर्ट और सेटिंग्स", ta: "அறிக்கைகள் & அமைப்புகள்", te: "నివేదికలు & సెట్టింగ్‌లు", ur: "رپورٹس اور ترتیبات", ar: "التقارير والإعدادات" },
  sec_others:          { bn: "অন্যান্য",        en: "Others",          hi: "अन्य",           ta: "மற்றவை",        te: "ఇతరములు",        ur: "دیگر",           ar: "أخرى" },

  // ── Sidebar / nav items ──
  nav_dashboard:        { bn: "ড্যাশবোর্ড",       en: "Dashboard",        hi: "डैशबोर्ड",        ta: "டாஷ்போர்டு",      te: "డ్యాష్‌బోర్డ్",       ur: "ڈیش بورڈ",        ar: "لوحة التحكم" },
  nav_lpg:              { bn: "LPG / বোতল",      en: "LPG / Bottle",     hi: "LPG / बोतल",      ta: "LPG / பாட்டில்", te: "LPG / బాటిల్",   ur: "LPG / بوتل",      ar: "غاز / قارورة" },
  nav_purchase:         { bn: "ক্রয়",            en: "Purchase",         hi: "खरीद",            ta: "கொள்முதல்",       te: "కొనుగోలు",         ur: "خریداری",         ar: "الشراء" },
  nav_sell:             { bn: "বিক্রয়",          en: "Sell",             hi: "बिक्री",          ta: "விற்பனை",         te: "అమ్మకం",          ur: "فروخت",           ar: "البيع" },
  nav_quickSell:        { bn: "দ্রুত বিক্রি",     en: "Quick Sell",       hi: "त्वरित बिक्री",   ta: "விரைவு விற்பனை",   te: "త్వరిత అమ్మకం",    ur: "تیز فروخت",       ar: "بيع سريع" },
  nav_cashbox:          { bn: "ক্যাশবক্স",        en: "Cashbox",          hi: "कैशबॉक्स",        ta: "பணப்பெட்டி",       te: "క్యాష్‌బాక్స్",      ur: "کیش باکس",        ar: "صندوق النقد" },
  nav_purchaseBook:     { bn: "ক্রয়ের বই",       en: "Purchase Book",    hi: "खरीद बही",        ta: "கொள்முதல் புத்தகம்", te: "కొనుగోలు పుస్తకం", ur: "خریداری کھاتہ",   ar: "دفتر المشتريات" },
  nav_salesBook:        { bn: "বিক্রয়ের বই",      en: "Sales Book",       hi: "बिक्री बही",      ta: "விற்பனை புத்தகம்", te: "అమ్మకాల పుస్తకం",  ur: "فروخت کھاتہ",     ar: "دفتر المبيعات" },
  nav_dueBook:          { bn: "বাকির বই",         en: "Due Book",         hi: "बकाया बही",       ta: "பாக்கி புத்தகம்",  te: "బకాయి పుస్తకం",    ur: "بقایا کھاتہ",     ar: "دفتر الديون" },
  nav_expenseBook:      { bn: "খরচের বই",         en: "Expense Book",     hi: "खर्च बही",        ta: "செலவு புத்தகம்",   te: "ఖర్చు పుస్తకం",     ur: "اخراجات کھاتہ",   ar: "دفتر المصروفات" },
  nav_ownerBook:        { bn: "মালিকের বই",       en: "Owner Book",       hi: "मालिक बही",       ta: "உரிமையாளர் புத்தகம்", te: "యజమాని పుస్తకం",  ur: "مالک کھاتہ",       ar: "دفتر المالك" },
  nav_shopAssets:       { bn: "দোকানের সম্পদ",     en: "Shop Assets",      hi: "दुकान संपत्ति",   ta: "கடை சொத்துக்கள்",   te: "షాప్ ఆస్తులు",     ur: "دکان اثاثے",      ar: "أصول المتجر" },
  nav_productsStock:    { bn: "প্রোডাক্ট ও স্টক",  en: "Products & Stock", hi: "उत्पाद और स्टॉक", ta: "தயாரிப்புகள் & சரக்கு", te: "ఉత్పత్తులు & స్టాక్", ur: "پروڈکٹس و اسٹاک", ar: "المنتجات والمخزون" },
  nav_services:         { bn: "সার্ভিস",          en: "Services",         hi: "सेवाएँ",          ta: "சேவைகள்",         te: "సేవలు",            ur: "خدمات",           ar: "الخدمات" },
  nav_productReturn:    { bn: "প্রোডাক্ট রিটার্ন", en: "Product Return",   hi: "उत्पाद वापसी",   ta: "தயாரிப்பு திரும்பல்", te: "ఉత్పత్తి తిరిగి", ur: "پروڈکٹ واپسی",    ar: "إرجاع المنتج" },
  nav_expiringProducts: { bn: "মেয়াদোত্তীর্ণ পণ্য", en: "Expiring Products", hi: "समाप्ति वाले उत्पाद", ta: "காலாவதியாகும்",   te: "గడువు ముగుస్తున్నవి", ur: "میعاد ختم پروڈکٹس", ar: "منتجات منتهية الصلاحية" },
  nav_warranty:         { bn: "ওয়ারেন্টি পণ্য",    en: "Warranty",         hi: "वारंटी",          ta: "உத்தரவாதம்",      te: "వారంటీ",          ur: "وارنٹی",          ar: "الضمان" },
  nav_customerStaff:    { bn: "কাস্টমার ও স্টাফ",   en: "Customer & Staff", hi: "ग्राहक और स्टाफ", ta: "வாடிக்கையாளர் & பணியாளர்கள்", te: "కస్టమర్ & సిబ్బంది", ur: "گاہک و عملہ",    ar: "العملاء والموظفون" },
  nav_customerFordo:    { bn: "গ্রাহক ফর্দ",       en: "Customer Fordo",   hi: "ग्राहक फरदो",     ta: "வாடிக்கையாளர் ஃபர்தோ", te: "కస్టమర్ ఫర్దో",  ur: "گاہک فردو",       ar: "قائمة العميل" },
  nav_fordoHistory:     { bn: "ফর্দ ইতিহাস",       en: "Fordo History",    hi: "फरदो इतिहास",     ta: "ஃபர்தோ வரலாறு",   te: "ఫర్దో చరిత్ర",     ur: "فردو تاریخ",       ar: "سجل القوائم" },
  nav_marketing:        { bn: "মার্কেটিং",          en: "Marketing",        hi: "मार्केटिंग",       ta: "சந்தைப்படுத்தல்",  te: "మార్కెటింగ్",      ur: "مارکیٹنگ",        ar: "التسويق" },
  nav_onlineShop:       { bn: "অনলাইন শপ",          en: "Online Shop",      hi: "ऑनलाइन शॉप",      ta: "ஆன்லைன் கடை",     te: "ఆన్‌లైన్ షాప్",     ur: "آن لائن شاپ",     ar: "المتجر الإلكتروني" },
  nav_businessReport:   { bn: "ব্যবসার রিপোর্ট",     en: "Business Report",  hi: "व्यापार रिपोर्ट", ta: "வணிக அறிக்கை",     te: "వ్యాపార నివేదిక",  ur: "کاروباری رپورٹ",  ar: "تقرير الأعمال" },
  nav_ownerReport:      { bn: "মালিকের রিপোর্ট",     en: "Owner Report",     hi: "मालिक रिपोर्ट",   ta: "உரிமையாளர் அறிக்கை", te: "యజమాని నివేదిక",  ur: "مالک رپورٹ",      ar: "تقرير المالك" },
  nav_usageLimits:      { bn: "ব্যবহারের সীমা",     en: "Usage Limits",     hi: "उपयोग सीमाएँ",    ta: "பயன்பாட்டு வரம்புகள்", te: "వినియోగ పరిమితులు", ur: "استعمال کی حدود", ar: "حدود الاستخدام" },
  nav_printer:          { bn: "প্রিন্টার",          en: "Printer",          hi: "प्रिंटर",         ta: "அச்சுப்பொறி",     te: "ప్రింటర్",         ur: "پرنٹر",           ar: "الطابعة" },
  nav_appAccess:        { bn: "অ্যাপ অ্যাক্সেস",     en: "App Access",       hi: "ऐप एक्सेस",       ta: "ஆப் அணுகல்",      te: "యాప్ యాక్సెస్",    ur: "ایپ رسائی",       ar: "وصول التطبيق" },
  nav_recycleBin:       { bn: "রিসাইকেল বিন",       en: "Recycle Bin",      hi: "रीसायकल बिन",     ta: "மீள்சுழற்சி தொட்டி", te: "రీసైకిల్ బిన్",   ur: "ری سائیکل بن",    ar: "سلة المحذوفات" },
  nav_appTraining:      { bn: "অ্যাপ ট্রেনিং",      en: "App Training",     hi: "ऐप प्रशिक्षण",    ta: "ஆப் பயிற்சி",     te: "యాప్ శిక్షణ",     ur: "ایپ ٹریننگ",      ar: "تدريب التطبيق" },
  nav_growthPartner:    { bn: "গ্রোথ পার্টনার",     en: "Growth Partner",   hi: "ग्रोथ पार्टनर",   ta: "வளர்ச்சி பங்காளி", te: "గ్రోత్ పార్ట్‌నర్", ur: "گروتھ پارٹنر",   ar: "شريك النمو" },
  nav_buySubscription:  { bn: "সাবস্ক্রিপশন কিনুন",  en: "Buy Subscription", hi: "सब्सक्रिप्शन खरीदें", ta: "சந்தா வாங்கு",  te: "సబ్‌స్క్రిప్షన్ కొనండి", ur: "سبسکرپشن خریدیں", ar: "اشترِ الاشتراك" },

  // ── Sidebar misc / actions ──
  collapseMenu:     { bn: "মেনু সংকুচিত করুন",  en: "Collapse menu",      hi: "मेनू छोटा करें",   ta: "மெனுவை சுருக்கு",  te: "మెను ముడిచండి",     ur: "مینو سکیڑیں",      ar: "طي القائمة" },
  expandMenu:       { bn: "মেনু খুলুন",          en: "Expand menu",        hi: "मेनू खोलें",       ta: "மெனுவை விரிவாக்கு", te: "మెను విస్తరించండి", ur: "مینو کھولیں",      ar: "توسيع القائمة" },
  installApp:       { bn: "অ্যাপ ইনস্টল করুন",   en: "Install App",        hi: "ऐप इंस्टॉल करें",  ta: "ஆப்ஸை நிறுவவும்",   te: "యాప్ ఇన్‌స్టాల్ చేయండి", ur: "ایپ انسٹال کریں",  ar: "ثبّت التطبيق" },
  installingApp:    { bn: "অ্যাপ ইনস্টল হচ্ছে…",  en: "Installing app…",    hi: "ऐप इंस्टॉल हो रहा है…", ta: "நிறுவப்படுகிறது…", te: "ఇన్‌స్టాల్ అవుతోంది…", ur: "انسٹال ہو رہا ہے…", ar: "جاري التثبيت…" },
  useSafariShare:   { bn: "Safari Share → 'Add to Home Screen' সিলেক্ট করুন", en: "Tap Safari Share → 'Add to Home Screen'", hi: "Safari Share → 'Add to Home Screen' चुनें", ta: "Safari Share → 'Add to Home Screen'", te: "Safari Share → 'Add to Home Screen'", ur: "Safari Share → 'Add to Home Screen'", ar: "Safari Share → 'Add to Home Screen'" },
  useBrowserInstall:{ bn: "ব্রাউজার মেনু থেকে 'Install app' সিলেক্ট করুন", en: "Use browser menu → 'Install app'", hi: "ब्राउज़र मेनू → 'Install app' चुनें", ta: "Browser menu → 'Install app'", te: "Browser menu → 'Install app'", ur: "براؤزر مینو → 'Install app'", ar: "قائمة المتصفح → 'Install app'" },
  restartTour:      { bn: "টুর আবার দেখুন",      en: "Restart tour",        hi: "टूर पुनः देखें",   ta: "சுற்றுப்பயணம் மீண்டும்", te: "టూర్ మళ్ళీ చూడండి", ur: "ٹور دوبارہ دیکھیں", ar: "إعادة الجولة" },

  // ── Topbar ──
  settings:        { bn: "সেটিংস",           en: "Settings",        hi: "सेटिंग्स",       ta: "அமைப்புகள்",      te: "సెట్టింగ్‌లు",      ur: "ترتیبات",         ar: "الإعدادات" },
  switchShop:      { bn: "দোকান পরিবর্তন",    en: "Switch Shop",     hi: "दुकान बदलें",    ta: "கடையை மாற்று",    te: "షాప్ మార్చండి",     ur: "دکان تبدیل کریں", ar: "تبديل المتجر" },
  combinedReport:  { bn: "কম্বাইন্ড রিপোর্ট",  en: "Combined Report", hi: "संयुक्त रिपोर्ट", ta: "ஒருங்கிணைந்த அறிக்கை", te: "మిళిత నివేదిక",   ur: "مشترکہ رپورٹ",    ar: "تقرير مجمّع" },
  logout:          { bn: "লগআউট",            en: "Log out",         hi: "लॉग आउट",        ta: "வெளியேறு",        te: "లాగ్ అవుట్",        ur: "لاگ آؤٹ",          ar: "تسجيل الخروج" },

  // ── Mobile bottom nav ──
  navHome:    { bn: "হোম",     en: "Home",    hi: "होम",     ta: "முகப்பு",   te: "హోమ్",      ur: "ہوم",     ar: "الرئيسية" },
  navSell:    { bn: "বিক্রয়",   en: "Sell",    hi: "बिक्री",  ta: "விற்பனை",   te: "అమ్మకం",    ur: "فروخت",   ar: "بيع" },
  navReturn:  { bn: "রিটার্ন",  en: "Return",  hi: "वापसी",   ta: "திரும்பல்", te: "తిరిగి",    ur: "واپسی",   ar: "إرجاع" },
  navReport:  { bn: "রিপোর্ট",  en: "Report",  hi: "रिपोर्ट",  ta: "அறிக்கை",   te: "నివేదిక",   ur: "رپورٹ",   ar: "تقرير" },
  navProfile: { bn: "প্রোফাইল", en: "Profile", hi: "प्रोफ़ाइल", ta: "சுயவிவரம்", te: "ప్రొఫైల్",  ur: "پروفائل", ar: "الملف الشخصي" },

  // ── Mobile back bar ──
  back: { bn: "পিছনে", en: "Back", hi: "वापस", ta: "பின்", te: "వెనుకకు", ur: "پیچھے", ar: "رجوع" },

  // ── Trial banner ──
  trialEnded:      { bn: "ফ্রি ট্রায়াল শেষ — আপনি এখন Free প্ল্যানে আছেন (১০টি পণ্যের সীমা)।", en: "Free trial ended — you are now on the Free plan (10-item limits).", hi: "फ्री ट्रायल समाप्त — आप अब Free प्लान पर हैं (10 आइटम सीमा)।", ta: "இலவச சோதனை முடிந்தது — நீங்கள் இப்போது Free திட்டத்தில் (10 பொருட்கள் வரம்பு).", te: "ఉచిత ట్రయల్ ముగిసింది — మీరు ఇప్పుడు Free ప్లాన్‌లో ఉన్నారు (10 ఐటెమ్‌ల పరిమితి).", ur: "فری ٹرائل ختم — اب آپ Free پلان پر ہیں (10 آئٹمز کی حد)۔", ar: "انتهت التجربة المجانية — أنت الآن على خطة Free (حد 10 عناصر)." },
  subscribeNow:    { bn: "এখনই কিনুন", en: "Subscribe now", hi: "अभी सब्सक्राइब करें", ta: "இப்போதே சந்தா", te: "ఇప్పుడే సబ్‌స్క్రయిబ్", ur: "ابھی سبسکرائب کریں", ar: "اشترك الآن" },
  trialDaysLeft:   { bn: "আপনার ফ্রি ট্রায়াল আর মাত্র {n} দিন বাকি — এখনই Full Version কিনুন।", en: "Your free trial ends in {n} day(s) — buy the full version now.", hi: "आपका फ्री ट्रायल {n} दिन में समाप्त होगा — पूरा संस्करण अभी खरीदें।", ta: "உங்கள் இலவச சோதனை {n} நாட்களில் முடிகிறது — இப்போதே வாங்கவும்.", te: "మీ ఉచిత ట్రయల్ {n} రోజుల్లో ముగుస్తుంది — ఇప్పుడే కొనండి.", ur: "آپ کا فری ٹرائل {n} دن میں ختم — ابھی پورا ورژن خریدیں۔", ar: "تنتهي تجربتك المجانية خلال {n} يوم — اشترِ النسخة الكاملة الآن." },
  trialActive:     { bn: "ফ্রি ট্রায়াল চলছে — আর {n} দিন বাকি। সব ফিচার ফ্রি!", en: "Free trial active — {n} day(s) left. All features unlocked!", hi: "फ्री ट्रायल चालू — {n} दिन शेष। सभी फ़ीचर्स अनलॉक!", ta: "இலவச சோதனை செயலில் — {n} நாட்கள் மீதம். அனைத்து அம்சங்களும்!", te: "ఉచిత ట్రయల్ ఆన్‌లో — {n} రోజులు మిగిలాయి. అన్ని ఫీచర్లు!", ur: "فری ٹرائل جاری — {n} دن باقی۔ تمام فیچرز کھلے!", ar: "تجربتك المجانية فعّالة — متبقٍ {n} يوم. جميع الميزات مفتوحة!" },
  viewPlans:       { bn: "Plan দেখুন", en: "View plans", hi: "प्लान देखें", ta: "திட்டங்களைக் காண்க", te: "ప్లాన్‌లు చూడండి", ur: "پلانز دیکھیں", ar: "عرض الخطط" },

  // ── AppLayout splash ──
  loading:       { bn: "লোড হচ্ছে...", en: "Loading...", hi: "लोड हो रहा है...", ta: "ஏற்றப்படுகிறது...", te: "లోడవుతోంది...", ur: "لوڈ ہو رہا ہے...", ar: "جاري التحميل..." },
  redirecting:   { bn: "লগইন পেজে যাচ্ছি...", en: "Redirecting to login...", hi: "लॉगिन पर भेजा जा रहा है...", ta: "உள்நுழைவுக்கு…", te: "లాగిన్‌కి దారి…", ur: "لاگ ان کی طرف…", ar: "إعادة التوجيه لتسجيل الدخول..." },
  loadingShop:   { bn: "আপনার দোকান লোড হচ্ছে...", en: "Loading your shop...", hi: "आपकी दुकान लोड हो रही है...", ta: "உங்கள் கடை ஏற்றப்படுகிறது...", te: "మీ షాప్ లోడవుతోంది...", ur: "آپ کی دکان لوڈ ہو رہی ہے...", ar: "جاري تحميل متجرك..." },

  // ── Dashboard ──
  balance:           { bn: "ব্যালেন্স", en: "Balance", hi: "बैलेंस", ta: "இருப்பு", te: "బ్యాలెన్స్", ur: "بیلنس", ar: "الرصيد" },
  tab_day:           { bn: "দিন", en: "Day", hi: "दिन", ta: "நாள்", te: "రోజు", ur: "دن", ar: "يوم" },
  tab_week:          { bn: "সপ্তাহ", en: "Week", hi: "सप्ताह", ta: "வாரம்", te: "వారం", ur: "ہفتہ", ar: "أسبوع" },
  tab_month:         { bn: "মাস", en: "Month", hi: "महीना", ta: "மாதம்", te: "నెల", ur: "مہینہ", ar: "شهر" },
  tab_year:          { bn: "বছর", en: "Year", hi: "वर्ष", ta: "ஆண்டு", te: "సంవత్సరం", ur: "سال", ar: "سنة" },
  tab_all:           { bn: "সব", en: "All", hi: "सभी", ta: "அனைத்தும்", te: "అన్నీ", ur: "تمام", ar: "الكل" },
  dash_sales:        { bn: "আজকের বিক্রি", en: "Sales", hi: "बिक्री", ta: "விற்பனை", te: "అమ్మకాలు", ur: "فروخت", ar: "المبيعات" },
  dash_purchase:     { bn: "আজকের ক্রয়", en: "Purchase", hi: "खरीद", ta: "கொள்முதல்", te: "కొనుగోలు", ur: "خریداری", ar: "المشتريات" },
  dash_expense:      { bn: "আজকের খরচ", en: "Expense", hi: "खर्च", ta: "செலவு", te: "ఖర్చు", ur: "اخراجات", ar: "المصروفات" },
  dash_stockCount:   { bn: "স্টক সংখ্যা", en: "Stock", hi: "स्टॉक", ta: "சரக்கு", te: "నిల్వ", ur: "اسٹاک", ar: "المخزون" },
  dash_receivable:   { bn: "বাকি দিয়েছি", en: "Receivable", hi: "लेना है", ta: "வரவேண்டியது", te: "రాబడి", ur: "وصول طلب", ar: "مستحقات" },
  dash_payable:      { bn: "বাকি নিয়েছি", en: "Payable", hi: "देना है", ta: "செலுத்த வேண்டியது", te: "చెల్లించాల్సినవి", ur: "ادا کرنا", ar: "مستحقات الدفع" },
  dash_newOrders:    { bn: "নতুন অর্ডার", en: "New orders", hi: "नए ऑर्डर", ta: "புதிய ஆர்டர்கள்", te: "కొత్త ఆర్డర్లు", ur: "نئے آرڈرز", ar: "طلبات جديدة" },
  dash_newFordo:     { bn: "নতুন ফর্দ", en: "New fordo", hi: "नया फरदो", ta: "புதிய ஃபர்தோ", te: "కొత్త ఫర్దో", ur: "نیا فردو", ar: "قائمة جديدة" },
  dash_lowStock:     { bn: "কম স্টক", en: "Low stock", hi: "कम स्टॉक", ta: "குறைந்த சரக்கு", te: "తక్కువ నిల్వ", ur: "کم اسٹاک", ar: "مخزون منخفض" },
  dash_products:     { bn: "মোট পণ্য", en: "Products", hi: "उत्पाद", ta: "தயாரிப்புகள்", te: "ఉత్పత్తులు", ur: "پروڈکٹس", ar: "المنتجات" },
  dash_onlineProducts:{bn: "অনলাইন পণ্য", en: "Online products", hi: "ऑनलाइन उत्पाद", ta: "ஆன்லைன் தயாரிப்புகள்", te: "ఆన్‌లైన్ ఉత్పత్తులు", ur: "آن لائن پروڈکٹس", ar: "منتجات إلكترونية" },
  dash_warranty:     { bn: "ওয়ারেন্টি", en: "Warranty", hi: "वारंटी", ta: "உத்தரவாதம்", te: "వారంటీ", ur: "وارنٹی", ar: "الضمان" },
  dash_customers:    { bn: "গ্রাহক", en: "Customers", hi: "ग्राहक", ta: "வாடிக்கையாளர்கள்", te: "కస్టమర్లు", ur: "گاہک", ar: "العملاء" },
  dash_suppliers:    { bn: "সরবরাহকারী", en: "Suppliers", hi: "आपूर्तिकर्ता", ta: "சப்ளையர்கள்", te: "సరఫరాదారులు", ur: "سپلائرز", ar: "الموردون" },
  dash_employees:    { bn: "কর্মচারী", en: "Employees", hi: "कर्मचारी", ta: "ஊழியர்கள்", te: "ఉద్యోగులు", ur: "ملازمین", ar: "الموظفون" },
  viewDetails:       { bn: "বিস্তারিত দেখুন →", en: "View details →", hi: "विवरण देखें →", ta: "விவரம் →", te: "వివరాలు →", ur: "تفصیل دیکھیں →", ar: "عرض التفاصيل →" },
  viewAll:           { bn: "সব দেখুন →", en: "View all →", hi: "सब देखें →", ta: "அனைத்தும் →", te: "అన్నీ చూడండి →", ur: "سب دیکھیں →", ar: "عرض الكل →" },
  recentSales:       { bn: "সাম্প্রতিক বিক্রি", en: "Recent sales", hi: "हाल की बिक्री", ta: "சமீபத்திய விற்பனை", te: "ఇటీవలి అమ్మకాలు", ur: "حالیہ فروخت", ar: "أحدث المبيعات" },
  newOnlineOrders:   { bn: "নতুন অনলাইন অর্ডার", en: "New online orders", hi: "नए ऑनलाइन ऑर्डर", ta: "புதிய ஆன்லைன் ஆர்டர்கள்", te: "కొత్త ఆన్‌లైన్ ఆర్డర్లు", ur: "نئے آن لائن آرڈرز", ar: "طلبات إلكترونية جديدة" },
  recentFordo:       { bn: "সাম্প্রতিক ফর্দ", en: "Recent fordo", hi: "हाल का फरदो", ta: "சமீபத்திய ஃபர்தோ", te: "ఇటీవలి ఫర్దో", ur: "حالیہ فردو", ar: "أحدث القوائم" },
  lowStockProducts:  { bn: "কম স্টক পণ্য", en: "Low-stock products", hi: "कम स्टॉक उत्पाद", ta: "குறைந்த சரக்கு பொருட்கள்", te: "తక్కువ నిల్వ ఉత్పత్తులు", ur: "کم اسٹاک پروڈکٹس", ar: "منتجات قليلة المخزون" },
  warrantyExpiring:  { bn: "মেয়াদোত্তীর্ণ হবে শীঘ্রই", en: "Warranty expiring soon", hi: "वारंटी जल्द समाप्त", ta: "உத்தரவாதம் விரைவில் முடிகிறது", te: "వారంటీ త్వరలో ముగుస్తుంది", ur: "وارنٹی جلد ختم", ar: "ينتهي الضمان قريبًا" },
  walkInCustomer:    { bn: "নগদ গ্রাহক", en: "Walk-in", hi: "वॉक-इन", ta: "வந்த வாடிக்கையாளர்", te: "వాక్-ఇన్", ur: "واک-اِن", ar: "زبون عابر" },
  noData:            { bn: "কোনো তথ্য নেই", en: "No data yet", hi: "अभी कोई डेटा नहीं", ta: "தரவு இல்லை", te: "డేటా లేదు", ur: "ابھی کوئی ڈیٹا نہیں", ar: "لا توجد بيانات بعد" },
  justNow:           { bn: "এখনই", en: "just now", hi: "अभी", ta: "இப்போது", te: "ఇప్పుడే", ur: "ابھی", ar: "الآن" },

  // ── Settings sheet ──
  user:                  { bn: "ব্যবহারকারী", en: "User", hi: "उपयोगकर्ता", ta: "பயனர்", te: "వినియోగదారు", ur: "صارف", ar: "المستخدم" },
  viewProfile:           { bn: "প্রোফাইল দেখুন", en: "View profile", hi: "प्रोफ़ाइल देखें", ta: "சுயவிவரம்", te: "ప్రొఫైల్", ur: "پروفائل دیکھیں", ar: "عرض الملف" },
  shopWord:              { bn: "দোকান", en: "Shop", hi: "दुकान", ta: "கடை", te: "షాప్", ur: "دکان", ar: "متجر" },
  st_report:             { bn: "রিপোর্ট", en: "Report", hi: "रिपोर्ट", ta: "அறிக்கை", te: "నివేదిక", ur: "رپورٹ", ar: "تقرير" },
  st_subscribe:          { bn: "সাবস্ক্রাইব", en: "Subscribe", hi: "सब्सक्राइब", ta: "சந்தா", te: "సబ్‌స్క్రయిబ్", ur: "سبسکرائب", ar: "اشترك" },
  st_training:           { bn: "ট্রেনিং", en: "Training", hi: "प्रशिक्षण", ta: "பயிற்சி", te: "శిక్షణ", ur: "ٹریننگ", ar: "تدريب" },
  st_usage:              { bn: "ব্যবহার", en: "Usage", hi: "उपयोग", ta: "பயன்பாடு", te: "వినియోగం", ur: "استعمال", ar: "الاستخدام" },
  preferences:           { bn: "পছন্দসমূহ", en: "Preferences", hi: "वरीयताएँ", ta: "விருப்பங்கள்", te: "ప్రాధాన్యతలు", ur: "ترجیحات", ar: "التفضيلات" },
  language:              { bn: "ভাষা", en: "Language", hi: "भाषा", ta: "மொழி", te: "భాష", ur: "زبان", ar: "اللغة" },
  country:               { bn: "দেশ", en: "Country", hi: "देश", ta: "நாடு", te: "దేశం", ur: "ملک", ar: "البلد" },
  currency:              { bn: "কারেন্সি", en: "Currency", hi: "मुद्रा", ta: "நாணயம்", te: "కరెన్సీ", ur: "کرنسی", ar: "العملة" },
  decimals:              { bn: "দশমিক", en: "Decimals", hi: "दशमलव", ta: "தசம", te: "దశాంశాలు", ur: "اعشاریہ", ar: "الكسور العشرية" },
  appColor:              { bn: "অ্যাপের রং", en: "App Color", hi: "ऐप रंग", ta: "ஆப் நிறம்", te: "యాప్ రంగు", ur: "ایپ کا رنگ", ar: "لون التطبيق" },
  shopAndData:           { bn: "দোকান ও ডেটা", en: "Shop & Data", hi: "दुकान और डेटा", ta: "கடை & தரவு", te: "షాప్ & డేటా", ur: "دکان و ڈیٹا", ar: "المتجر والبيانات" },
  shopSettingsBackup:    { bn: "দোকানের সেটিংস ও ব্যাকআপ", en: "Shop Settings & Backup", hi: "दुकान सेटिंग्स और बैकअप", ta: "கடை அமைப்பு & பேக்அப்", te: "షాప్ సెట్టింగ్‌లు & బ్యాకప్", ur: "دکان ترتیبات و بیک اپ", ar: "إعدادات المتجر والنسخ الاحتياطي" },
  myProfile:             { bn: "আমার প্রোফাইল", en: "My Profile", hi: "मेरी प्रोफ़ाइल", ta: "என் சுயவிவரம்", te: "నా ప్రొఫైల్", ur: "میری پروفائل", ar: "ملفي الشخصي" },
  device:                { bn: "ডিভাইস", en: "Device", hi: "डिवाइस", ta: "சாதனம்", te: "పరికరం", ur: "ڈیوائس", ar: "الجهاز" },
  appInstalled:          { bn: "অ্যাপ ইনস্টল করা আছে", en: "App Installed", hi: "ऐप इंस्टॉल है", ta: "ஆப் நிறுவப்பட்டது", te: "యాప్ ఇన్‌స్టాల్ చేయబడింది", ur: "ایپ انسٹال شدہ", ar: "التطبيق مثبت" },
  installMobileApp:      { bn: "মোবাইলে অ্যাপ ইনস্টল করুন", en: "Install Mobile App", hi: "मोबाइल ऐप इंस्टॉल करें", ta: "மொபைல் ஆப்ஸை நிறுவவும்", te: "మొబైల్ యాప్ ఇన్‌స్టాల్", ur: "موبائل ایپ انسٹال کریں", ar: "ثبّت تطبيق الجوال" },
  appAlreadyInstalled:   { bn: "অ্যাপ ইতিমধ্যে ইনস্টল করা আছে", en: "App is already installed", hi: "ऐप पहले से इंस्टॉल है", ta: "ஆப் ஏற்கனவே நிறுவப்பட்டது", te: "యాప్ ఇప్పటికే ఉంది", ur: "ایپ پہلے سے انسٹال", ar: "التطبيق مثبت بالفعل" },
  loggedInDevices:       { bn: "লগইন ডিভাইস ও লগআউট", en: "Logged-in devices", hi: "लॉग-इन डिवाइस", ta: "உள்நுழைந்த சாதனங்கள்", te: "లాగిన్ పరికరాలు", ur: "لاگ ان ڈیوائسز", ar: "الأجهزة المسجلة" },
  helpLinks:             { bn: "সহায়তা ও লিঙ্ক", en: "Help & Links", hi: "सहायता और लिंक", ta: "உதவி & இணைப்புகள்", te: "సహాయం & లింక్‌లు", ur: "مدد و لنکس", ar: "المساعدة والروابط" },
  showMore:              { bn: "আরও দেখুন", en: "Show more", hi: "और देखें", ta: "மேலும் காட்டு", te: "మరిన్ని చూపండి", ur: "مزید دکھائیں", ar: "عرض المزيد" },
  brandTagline:          { bn: "Tally+ • আপনার ব্যবসার সঙ্গী", en: "Tally+ • Your business companion", hi: "Tally+ • आपका व्यापार साथी", ta: "Tally+ • உங்கள் வணிக துணை", te: "Tally+ • మీ వ్యాపార సహచరి", ur: "Tally+ • آپ کا کاروباری ساتھی", ar: "Tally+ • رفيق عملك" },

  // Time-ago short suffixes
  ago_min: { bn: "মি", en: "m", hi: "मि", ta: "நி", te: "ని", ur: "م", ar: "د" },
  ago_hr:  { bn: "ঘ", en: "h", hi: "घं", ta: "ம", te: "గ", ur: "گھ", ar: "س" },
  ago_day: { bn: "দি", en: "d", hi: "दि", ta: "நா", te: "రో", ur: "د", ar: "ي" },

  // ── Phase 2a: Cashbox + CashBookView ──
  p2a_cashbox: { bn: "ক্যাশবক্স", en: "Cashbox", hi: "कैशबॉक्स", ta: "பணப்பெட்டி", te: "క్యాష్‌బాక్స్", ur: "کیش باکس", ar: "صندوق النقد" },
  p2a_cashIn: { bn: "জমা", en: "Cash In", hi: "नकद आगमन", ta: "பணம் வரவு", te: "నగదు రాబడి", ur: "نقد آمد", ar: "نقد داخل" },
  p2a_cashOut: { bn: "খরচ", en: "Cash Out", hi: "नकद निकासी", ta: "பணம் செலவு", te: "నగదు ఖర్చు", ur: "نقد اخراج", ar: "نقد خارج" },
  p2a_totalIn: { bn: "মোট জমা", en: "Total in", hi: "कुल आगमन", ta: "மொத்த வரவு", te: "మొత్తం రాబడి", ur: "کل آمد", ar: "إجمالي الداخل" },
  p2a_totalOut: { bn: "মোট খরচ", en: "Total out", hi: "कुल निकासी", ta: "மொத்த செலவு", te: "మొత్తం ఖర్చు", ur: "کل اخراج", ar: "إجمالي الخارج" },
  p2a_balance: { bn: "ব্যালেন্স", en: "Balance", hi: "शेष", ta: "இருப்பு", te: "నిల్వ", ur: "بیلنس", ar: "الرصيد" },
  p2a_entries: { bn: "এন্ট্রি লিস্ট", en: "Entries", hi: "प्रविष्टि सूची", ta: "உள்ளீட்டு பட்டியல்", te: "నమోదుల జాబితా", ur: "اندراج فہرست", ar: "قائمة الإدخالات" },
  p2a_noteLedger: { bn: "নোটের হিসাব", en: "Note Ledger", hi: "नोट खाता", ta: "நோட் கணக்கு", te: "నోట్ ఖాతా", ur: "نوٹ کھاتہ", ar: "دفتر الأوراق" },
  p2a_searchNote: { bn: "নোট খুঁজুন", en: "Search note", hi: "नोट खोजें", ta: "நோட் தேடு", te: "నోట్ శోధించు", ur: "نوٹ تلاش", ar: "ابحث عن ورقة" },
  p2a_noEntries: { bn: "কোনো এন্ট্রি নেই", en: "No entries", hi: "कोई प्रविष्टि नहीं", ta: "உள்ளீடுகள் இல்லை", te: "నమోదులు లేవు", ur: "کوئی اندراج نہیں", ar: "لا توجد إدخالات" },
  p2a_date: { bn: "তারিখ", en: "Date", hi: "तिथि", ta: "தேதி", te: "తేదీ", ur: "تاریخ", ar: "التاريخ" },
  p2a_source: { bn: "উৎস", en: "Source", hi: "स्रोत", ta: "மூலம்", te: "మూలం", ur: "ذریعہ", ar: "المصدر" },
  p2a_notesBreakdown: { bn: "নোটের ভাঙতি", en: "Notes", hi: "नोट विभाजन", ta: "நோட் பிரிப்பு", te: "నోట్ విభజన", ur: "نوٹ تقسیم", ar: "تفصيل الأوراق" },
  p2a_type: { bn: "ধরন", en: "Type", hi: "प्रकार", ta: "வகை", te: "రకం", ur: "قسم", ar: "النوع" },
  p2a_amount: { bn: "পরিমাণ", en: "Amount", hi: "राशि", ta: "தொகை", te: "మొత్తం", ur: "رقم", ar: "المبلغ" },
  p2a_in: { bn: "জমা", en: "In", hi: "आगमन", ta: "வரவு", te: "రాబడి", ur: "آمد", ar: "داخل" },
  p2a_out: { bn: "খরচ", en: "Out", hi: "निकासी", ta: "செலவு", te: "ఖర్చు", ur: "اخراج", ar: "خارج" },
  p2a_manual: { bn: "ম্যানুয়াল", en: "Manual", hi: "मैन्युअल", ta: "கையேடு", te: "మాన్యువల్", ur: "دستی", ar: "يدوي" },
  p2a_localeShort: { bn: "bn", en: "en", hi: "hi", ta: "ta", te: "te", ur: "ur", ar: "ar" },
  p2a_note: { bn: "নোট", en: "Note", hi: "नोट", ta: "நோட்", te: "నోట్", ur: "نوٹ", ar: "ورقة" },
  p2a_inQty: { bn: "জমা সংখ্যা", en: "In qty", hi: "आगमन मात्रा", ta: "வரவு அளவு", te: "రాబడి సంఖ్య", ur: "آمد مقدار", ar: "كمية الداخل" },
  p2a_outQty: { bn: "খরচ সংখ্যা", en: "Out qty", hi: "निकासी मात्रा", ta: "செலவு அளவு", te: "ఖర్చు సంఖ్య", ur: "اخراج مقدار", ar: "كمية الخارج" },
  p2a_balanceQty: { bn: "বর্তমান সংখ্যা", en: "Balance qty", hi: "वर्तमान मात्रा", ta: "தற்போதைய அளவு", te: "ప్రస్తుత సంఖ్య", ur: "موجودہ مقدار", ar: "الكمية الحالية" },
  p2a_balanceMoney: { bn: "বর্তমান টাকা", en: "Balance ৳", hi: "वर्तमान राशि", ta: "தற்போதைய தொகை", te: "ప్రస్తుత మొత్తం", ur: "موجودہ رقم", ar: "المبلغ الحالي" },
  p2a_totalBalanceNotes: { bn: "মোট ব্যালেন্স (নোট হিসাবে)", en: "Total balance (by notes)", hi: "कुल शेष (नोट अनुसार)", ta: "மொத்த இருப்பு (நோட் வாரியாக)", te: "మొత్తం నిల్వ (నోట్ ప్రకారం)", ur: "کل بیلنس (نوٹ کے مطابق)", ar: "إجمالي الرصيد (حسب الأوراق)" },
  p2a_bySource: { bn: "উৎস অনুযায়ী", en: "By source", hi: "स्रोत के अनुसार", ta: "மூலம் வாரியாக", te: "మూలం ప్రకారం", ur: "ذریعہ کے مطابق", ar: "حسب المصدر" },
  p2a_noData: { bn: "কোনো ডেটা নেই", en: "No data", hi: "कोई डेटा नहीं", ta: "தரவு இல்லை", te: "డేటా లేదు", ur: "ڈیٹا نہیں", ar: "لا توجد بيانات" },
  p2a_enterAmount: { bn: "সঠিক পরিমাণ দিন", en: "Enter amount", hi: "सही राशि दर्ज करें", ta: "சரியான தொகையை உள்ளிடவும்", te: "సరైన మొత్తం నమోదు చేయండి", ur: "درست رقم درج کریں", ar: "أدخل المبلغ الصحيح" },
  p2a_saved: { bn: "সেভ হয়েছে", en: "Saved", hi: "सहेजा गया", ta: "சேமிக்கப்பட்டது", te: "సేవ్ చేయబడింది", ur: "محفوظ ہو گیا", ar: "تم الحفظ" },
  p2a_addCashIn: { bn: "জমা যোগ করুন", en: "Add Cash In", hi: "आगमन जोड़ें", ta: "வரவு சேர்", te: "రాబడి జోడించు", ur: "آمد شامل", ar: "إضافة داخل" },
  p2a_addCashOut: { bn: "খরচ যোগ করুন", en: "Add Cash Out", hi: "निकासी जोड़ें", ta: "செலவு சேர்", te: "ఖర్చు జోడించు", ur: "اخراج شامل", ar: "إضافة خارج" },
  p2a_manualAmount: { bn: "ম্যানুয়াল পরিমাণ", en: "Manual amount", hi: "मैन्युअल राशि", ta: "கையேடு தொகை", te: "మాన్యువల్ మొత్తం", ur: "دستی رقم", ar: "مبلغ يدوي" },
  p2a_skipNote: { bn: "নোট গণনা না করে সরাসরি টাকা লিখুন", en: "Skip note counting, type amount directly", hi: "नोट गिनती छोड़कर सीधे राशि लिखें", ta: "நோட் எண்ணிக்கையை தவிர்த்து தொகையை நேரடியாக உள்ளிடவும்", te: "నోట్ లెక్కింపును దాటవేసి నేరుగా మొత్తం టైప్ చేయండి", ur: "نوٹ گنتی چھوڑ کر براہ راست رقم لکھیں", ar: "تخطّ عد الأوراق واكتب المبلغ مباشرة" },
  p2a_cancel: { bn: "বাতিল", en: "Cancel", hi: "रद्द", ta: "ரத்து", te: "రద్దు", ur: "منسوخ", ar: "إلغاء" },
  p2a_save: { bn: "সেভ", en: "Save", hi: "सहेजें", ta: "சேமி", te: "సేవ్", ur: "محفوظ", ar: "حفظ" },
  p2a_thisMonth: { bn: "এই মাস", en: "This month", hi: "इस माह", ta: "இந்த மாதம்", te: "ఈ నెల", ur: "اس مہینے", ar: "هذا الشهر" },
  p2a_lastMonth: { bn: "গত মাস", en: "Last month", hi: "पिछले माह", ta: "கடந்த மாதம்", te: "గత నెల", ur: "پچھلے مہینے", ar: "الشهر الماضي" },
  p2a_debitIncome: { bn: "আয় (ডেবিট)", en: "Debit (Income)", hi: "आय (डेबिट)", ta: "வருமானம் (டெபிட்)", te: "ఆదాయం (డెబిట్)", ur: "آمدن (ڈیبٹ)", ar: "دخل (مدين)" },
  p2a_totalDebit: { bn: "মোট আয়", en: "Total Debit", hi: "कुल आय", ta: "மொத்த வருமானம்", te: "మొత్తం ఆదాయం", ur: "کل آمدن", ar: "إجمالي الدخل" },
  p2a_creditExpense: { bn: "ব্যয় (ক্রেডিট)", en: "Credit (Expense)", hi: "व्यय (क्रेडिट)", ta: "செலவு (கிரெடிட்)", te: "ఖర్చు (క్రెడిట్)", ur: "اخراجات (کریڈٹ)", ar: "مصروف (دائن)" },
  p2a_totalCredit: { bn: "মোট ব্যয়", en: "Total Credit", hi: "कुल व्यय", ta: "மொத்த செலவு", te: "మొత్తం ఖర్చు", ur: "کل اخراجات", ar: "إجمالي المصروف" },
  p2a_netCashOnHand: { bn: "নেট (Cash on Hand)", en: "Net (Cash on Hand)", hi: "शुद्ध (हाथ में नकद)", ta: "நிகர (கையில் பணம்)", te: "నికర (చేతిలో నగదు)", ur: "خالص (ہاتھ میں نقد)", ar: "الصافي (النقد في اليد)" },
  p2a_cashBookDash: { bn: "ক্যাশবুক — ", en: "Cash Book — ", hi: "कैश बही — ", ta: "பண புத்தகம் — ", te: "క్యాష్ పుస్తకం — ", ur: "کیش بک — ", ar: "دفتر النقد — " },
  p2a_totalIncome: { bn: "মোট আয়", en: "Total Income", hi: "कुल आय", ta: "மொத்த வருமானம்", te: "మొత్తం ఆదాయం", ur: "کل آمدن", ar: "إجمالي الدخل" },
  p2a_totalExpense: { bn: "মোট ব্যয়", en: "Total Expense", hi: "कुल व्यय", ta: "மொத்த செலவு", te: "మొత్తం ఖర్చు", ur: "کل اخراجات", ar: "إجمالي المصروف" },
  p2a_cashOnHand: { bn: "Cash on Hand", en: "Cash on Hand", hi: "हाथ में नकद", ta: "கையில் பணம்", te: "చేతిలో నగదు", ur: "ہاتھ میں نقد", ar: "النقد في اليد" },
  p2a_transactionsTotal: { bn: "মোট লেনদেন", en: "Transactions", hi: "कुल लेन-देन", ta: "மொத்த பரிவர்த்தனைகள்", te: "మొత్తం లావాదేవీలు", ur: "کل لین دین", ar: "إجمالي المعاملات" },
  p2a_debitIncome2: { bn: "ডেবিট (আয়)", en: "Debit (Income)", hi: "डेबिट (आय)", ta: "டெபிட் (வருமானம்)", te: "డెబిట్ (ఆదాయం)", ur: "ڈیبٹ (آمدن)", ar: "مدين (دخل)" },
  p2a_noIncomeMonth: { bn: "এই মাসে কোনো আয় নেই", en: "No income this month", hi: "इस माह कोई आय नहीं", ta: "இந்த மாதம் வருமானம் இல்லை", te: "ఈ నెల ఆదాయం లేదు", ur: "اس مہینے کوئی آمدن نہیں", ar: "لا يوجد دخل هذا الشهر" },
  p2a_creditExpense2: { bn: "ক্রেডিট (ব্যয়)", en: "Credit (Expense)", hi: "क्रेडिट (व्यय)", ta: "கிரெடிட் (செலவு)", te: "క్రెడిట్ (ఖర్చు)", ur: "کریڈٹ (اخراجات)", ar: "دائن (مصروف)" },
  p2a_noExpenseMonth: { bn: "এই মাসে কোনো ব্যয় নেই", en: "No expense this month", hi: "इस माह कोई व्यय नहीं", ta: "இந்த மாதம் செலவு இல்லை", te: "ఈ నెల ఖర్చు లేదు", ur: "اس مہینے کوئی اخراجات نہیں", ar: "لا توجد مصروفات هذا الشهر" },
  p2a_cashOnHandNet: { bn: "Cash on Hand (নেট)", en: "Cash on Hand (Net)", hi: "हाथ में नकद (शुद्ध)", ta: "கையில் பணம் (நிகர)", te: "చేతిలో నగదు (నికర)", ur: "ہاتھ میں نقد (خالص)", ar: "النقد في اليد (الصافي)" },
  p2a_print: { bn: "প্রিন্ট", en: "Print", hi: "प्रिंट", ta: "அச்சிடு", te: "ప్రింట్", ur: "پرنٹ", ar: "طباعة" },
  p2a_localeFull: { bn: "bn-BD", en: "en-US", hi: "hi-IN", ta: "ta-IN", te: "te-IN", ur: "ur-PK", ar: "ar-SA" },
  p2a_particular: { bn: "খাত", en: "Particular", hi: "विवरण", ta: "விவரம்", te: "వివరం", ur: "تفصیل", ar: "البيان" },
  p2a_amountMoney: { bn: "টাকা", en: "Amount", hi: "रुपये", ta: "பணம்", te: "డబ్బు", ur: "رقم", ar: "المبلغ" },
  p2a_total: { bn: "মোট", en: "Total", hi: "कुल", ta: "மொத்தம்", te: "మొత్తం", ur: "کل", ar: "المجموع" },
  p2a_src_sale:     { bn: "বিক্রি",      en: "Sale",     hi: "बिक्री",    ta: "விற்பனை",     te: "అమ్మకం",    ur: "فروخت",     ar: "بيع" },
  p2a_src_purchase: { bn: "ক্রয়",         en: "Purchase", hi: "खरीद",      ta: "கொள்முதல்",    te: "కొనుగోలు",   ur: "خریداری",   ar: "شراء" },
  p2a_src_expense:  { bn: "খরচ",          en: "Expense",  hi: "व्यय",      ta: "செலவு",       te: "ఖర్చు",      ur: "اخراجات",   ar: "مصروف" },
  p2a_src_payment:  { bn: "পেমেন্ট",       en: "Payment",  hi: "भुगतान",    ta: "கட்டணம்",     te: "చెల్లింపు",   ur: "ادائیگی",   ar: "دفعة" },
  p2a_src_income:   { bn: "অন্যান্য আয়",  en: "Income",   hi: "आय",        ta: "வருமானம்",   te: "ఆదాయం",     ur: "آمدن",      ar: "دخل" },
};

// Legacy keys still referenced by older pages (kept for backward compatibility).
const en: Dict = {
  appName: "Tally Plus",
  tagline: "Clear your accounts in one click — save time, grow your business",
  heroSub: "POS, stock, dues, expenses & reports on mobile — works offline too.",
  getStarted: "Get Started",
  login: "Login", pricing: "Pricing", features: "Features", about: "About", contact: "Contact",
  home: "Home", dashboard: "Dashboard", sales: "Sales", purchases: "Purchases",
  quickSale: "Quick Sale", cashbox: "Cashbox", products: "Products", stock: "Stock",
  customers: "Contacts", salesLedger: "Sales Book", purchaseLedger: "Purchase Book",
  dueLedger: "Due Book", expenseLedger: "Expense Book", expenses: "Expenses",
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
  salesLedger: "বিক্রয়ের বই", purchaseLedger: "ক্রয়ের বই", dueLedger: "বাকির বই",
  expenseLedger: "খরচের বই", expenses: "খরচ", reports: "ব্যবসার রিপোর্ট",
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

type LegacyKey = keyof typeof en;
export type TKey = keyof typeof T | LegacyKey;

const I18nCtx = createContext<{
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: TKey, vars?: Record<string, string | number>) => string;
}>({
  lang: "bn",
  setLang: () => {},
  t: (k) => String(k),
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
  const t = (k: TKey, vars?: Record<string, string | number>) => {
    const tr = T[k as keyof typeof T];
    let s: string;
    if (tr) s = tr[lang] ?? tr.en ?? String(k);
    else s = dict[lang][k as LegacyKey] ?? en[k as LegacyKey] ?? String(k);
    if (vars) {
      for (const [name, val] of Object.entries(vars)) {
        s = s.replace(new RegExp(`\\{${name}\\}`, "g"), String(val));
      }
    }
    return s;
  };
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
