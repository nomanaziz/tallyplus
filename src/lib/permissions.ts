/* Granular feature-permission map for shop members (UI-level only). */

export type RoleKey = "EMPLOYEE" | "MANAGER" | "OWNER";

export type FeatureGroup = {
  key: string;
  title_bn: string;
  title_en: string;
  icon: string;
  items: { key: string; label_bn: string; label_en: string }[];
};

export const FEATURE_GROUPS: FeatureGroup[] = [
  {
    key: "dashboard",
    title_bn: "হোম / ড্যাশবোর্ড",
    title_en: "Home / Dashboard",
    icon: "🏠",
    items: [
      { key: "view", label_bn: "ড্যাশবোর্ড দেখা", label_en: "View dashboard" },
      { key: "summary", label_bn: "সারাংশ কার্ড", label_en: "Summary cards" },
      { key: "quick_actions", label_bn: "দ্রুত অ্যাকশন", label_en: "Quick actions" },
    ],
  },
  {
    key: "purchase",
    title_bn: "ক্রয়",
    title_en: "Purchase",
    icon: "🛒",
    items: [
      { key: "buy", label_bn: "ক্রয়", label_en: "Purchase" },
      { key: "cart_edit", label_bn: "কার্ট এডিট", label_en: "Cart edit" },
      { key: "discount", label_bn: "ডিসকাউন্ট", label_en: "Discount" },
      { key: "delivery", label_bn: "ডেলিভারী চার্জ", label_en: "Delivery" },
      { key: "ledger", label_bn: "ক্রয়ের খাতা", label_en: "Ledger" },
      { key: "edit", label_bn: "এডিট করুন", label_en: "Edit" },
      { key: "delete", label_bn: "মুছে ফেলুন", label_en: "Delete" },
    ],
  },
  {
    key: "sell",
    title_bn: "বিক্রি",
    title_en: "Sell",
    icon: "💰",
    items: [
      { key: "sell", label_bn: "বিক্রি", label_en: "Sell" },
      { key: "quick_sell", label_bn: "দ্রুত বিক্রি", label_en: "Quick sell" },
      { key: "cart_edit", label_bn: "কার্ট এডিট", label_en: "Cart edit" },
      { key: "discount", label_bn: "ডিসকাউন্ট", label_en: "Discount" },
      { key: "delivery", label_bn: "ডেলিভারী চার্জ", label_en: "Delivery" },
      { key: "ledger", label_bn: "বিক্রির খাতা", label_en: "Ledger" },
      { key: "edit", label_bn: "এডিট করুন", label_en: "Edit" },
      { key: "delete", label_bn: "মুছে ফেলুন", label_en: "Delete" },
    ],
  },
  {
    key: "due",
    title_bn: "বাকি",
    title_en: "Due",
    icon: "📒",
    items: [
      { key: "due", label_bn: "বাকি", label_en: "Due" },
      { key: "history", label_bn: "বাকির ইতিহাস", label_en: "History" },
      { key: "details", label_bn: "বাকির বিস্তারিত", label_en: "Details" },
      { key: "add", label_bn: "যোগ করুন", label_en: "Add" },
      { key: "edit", label_bn: "এডিট করুন", label_en: "Edit" },
      { key: "delete", label_bn: "মুছে ফেলুন", label_en: "Delete" },
    ],
  },
  {
    key: "expense",
    title_bn: "খরচ",
    title_en: "Expense",
    icon: "💸",
    items: [
      { key: "expense", label_bn: "খরচ", label_en: "Expense" },
      { key: "list", label_bn: "খরচের তালিকা", label_en: "List" },
      { key: "edit", label_bn: "এডিট করুন", label_en: "Edit" },
      { key: "delete", label_bn: "মুছে ফেলুন", label_en: "Delete" },
      { key: "add", label_bn: "যোগ করুন", label_en: "Add" },
      { key: "cat_edit", label_bn: "ক্যাটাগরি এডিট", label_en: "Category edit" },
      { key: "cat_delete", label_bn: "ক্যাটাগরি ডিলিট", label_en: "Category delete" },
      { key: "cat_add", label_bn: "ক্যাটাগরি যোগ", label_en: "Category add" },
    ],
  },
  {
    key: "contacts",
    title_bn: "যোগাযোগ",
    title_en: "Contacts",
    icon: "👥",
    items: [
      { key: "view", label_bn: "যোগাযোগ", label_en: "Contacts" },
      { key: "customers", label_bn: "কাস্টমার", label_en: "Customers" },
      { key: "suppliers", label_bn: "সাপ্লায়ার", label_en: "Suppliers" },
      { key: "add_customer", label_bn: "কাস্টমার যোগ করা", label_en: "Add customer" },
      { key: "add_supplier", label_bn: "সাপ্লায়ার যোগ করা", label_en: "Add supplier" },
      { key: "edit_customer", label_bn: "কাস্টমার এডিট", label_en: "Edit customer" },
      { key: "delete_customer", label_bn: "কাস্টমার ডিলিট", label_en: "Delete customer" },
      { key: "edit_supplier", label_bn: "সাপ্লায়ার এডিট", label_en: "Edit supplier" },
      { key: "delete_supplier", label_bn: "সাপ্লায়ার ডিলিট", label_en: "Delete supplier" },
      { key: "employee", label_bn: "কর্মচারী", label_en: "Employee" },
      { key: "add_employee", label_bn: "কর্মচারী যোগ", label_en: "Add employee" },
      { key: "edit_employee", label_bn: "কর্মচারী এডিট", label_en: "Edit employee" },
    ],
  },
  {
    key: "products",
    title_bn: "প্রোডাক্ট লিস্ট",
    title_en: "Products",
    icon: "📦",
    items: [
      { key: "view", label_bn: "প্রোডাক্ট লিস্ট", label_en: "Products" },
      { key: "add", label_bn: "যোগ করুন", label_en: "Add" },
      { key: "details", label_bn: "বিস্তারিত", label_en: "Details" },
      { key: "edit", label_bn: "এডিট করুন", label_en: "Edit" },
      { key: "delete", label_bn: "মুছে ফেলুন", label_en: "Delete" },
      { key: "import", label_bn: "ইমপোর্ট / স্যাম্পল লোড", label_en: "Import / Sample load" },
      { key: "categories", label_bn: "ক্যাটাগরি ম্যানেজ", label_en: "Manage categories" },
      { key: "barcode", label_bn: "বারকোড প্রিন্ট", label_en: "Barcode print" },
    ],
  },
  {
    key: "services",
    title_bn: "সার্ভিস",
    title_en: "Services",
    icon: "🛠️",
    items: [
      { key: "view", label_bn: "সার্ভিস তালিকা", label_en: "Services" },
      { key: "add", label_bn: "যোগ করুন", label_en: "Add" },
      { key: "edit", label_bn: "এডিট করুন", label_en: "Edit" },
      { key: "delete", label_bn: "মুছে ফেলুন", label_en: "Delete" },
      { key: "bookings", label_bn: "বুকিং ম্যানেজ", label_en: "Manage bookings" },
      { key: "publish", label_bn: "অনলাইন পাবলিশ", label_en: "Publish online" },
    ],
  },
  {
    key: "stock",
    title_bn: "স্টকের হিসাব",
    title_en: "Stock",
    icon: "🏷️",
    items: [
      { key: "view", label_bn: "স্টকের হিসাব", label_en: "Stock" },
      { key: "history", label_bn: "ইতিহাস", label_en: "History" },
      { key: "update", label_bn: "আপডেট", label_en: "Update" },
      { key: "edit", label_bn: "স্টক এডিট", label_en: "Stock edit" },
      { key: "bulk_update", label_bn: "একসাথে স্টক আপডেট", label_en: "Bulk stock update" },
      { key: "serial", label_bn: "সিরিয়াল / IMEI ম্যানেজ", label_en: "Manage Serials / IMEI" },
      { key: "expiring", label_bn: "মেয়াদোত্তীর্ণ পণ্য", label_en: "Expiring products" },
      { key: "warranty", label_bn: "ওয়ারেন্টি ট্র্যাকিং", label_en: "Warranty tracking" },
    ],
  },
  {
    key: "cashbox",
    title_bn: "নগদ বাক্স",
    title_en: "Cashbox",
    icon: "💵",
    items: [
      { key: "view", label_bn: "নগদ বাক্স দেখা", label_en: "View cashbox" },
      { key: "cash_in", label_bn: "নগদ যোগ", label_en: "Cash in" },
      { key: "cash_out", label_bn: "নগদ উত্তোলন", label_en: "Cash out" },
      { key: "denominations", label_bn: "নোট-পয়সা গণনা", label_en: "Denominations" },
      { key: "history", label_bn: "নগদ ইতিহাস", label_en: "Cash history" },
    ],
  },
  {
    key: "assets",
    title_bn: "সম্পদ ও দায়",
    title_en: "Assets & Liabilities",
    icon: "🏦",
    items: [
      { key: "view", label_bn: "সম্পদ দেখা", label_en: "View assets" },
      { key: "add", label_bn: "যোগ করুন", label_en: "Add" },
      { key: "edit", label_bn: "এডিট করুন", label_en: "Edit" },
      { key: "delete", label_bn: "মুছে ফেলুন", label_en: "Delete" },
    ],
  },
  {
    key: "owner_ledger",
    title_bn: "মালিকের খাতা",
    title_en: "Owner ledger",
    icon: "👔",
    items: [
      { key: "view", label_bn: "মালিকের খাতা দেখা", label_en: "View owner ledger" },
      { key: "add", label_bn: "এন্ট্রি যোগ", label_en: "Add entry" },
      { key: "edit", label_bn: "এডিট", label_en: "Edit" },
      { key: "delete", label_bn: "ডিলিট", label_en: "Delete" },
    ],
  },
  {
    key: "wishlist",
    title_bn: "গ্রাহক ফর্দ",
    title_en: "Customer wishlist",
    icon: "📝",
    items: [
      { key: "view", label_bn: "ফর্দ তালিকা", label_en: "View wishlist" },
      { key: "convert", label_bn: "ফর্দ → বিক্রি কনভার্ট", label_en: "Convert to sale" },
      { key: "edit", label_bn: "এডিট", label_en: "Edit" },
      { key: "delete", label_bn: "ডিলিট", label_en: "Delete" },
      { key: "history", label_bn: "ফর্দ ইতিহাস", label_en: "Wishlist history" },
    ],
  },
  {
    key: "quick_order",
    title_bn: "দ্রুত অর্ডার",
    title_en: "Quick order",
    icon: "⚡",
    items: [
      { key: "view", label_bn: "দ্রুত অর্ডার দেখা", label_en: "View quick order" },
      { key: "create", label_bn: "অর্ডার তৈরি", label_en: "Create order" },
      { key: "edit", label_bn: "এডিট", label_en: "Edit" },
      { key: "delete", label_bn: "ডিলিট", label_en: "Delete" },
    ],
  },
  {
    key: "marketing",
    title_bn: "মার্কেটিং",
    title_en: "Marketing",
    icon: "📣",
    items: [
      { key: "view", label_bn: "মার্কেটিং দেখা", label_en: "View marketing" },
      { key: "send_sms", label_bn: "এসএমএস পাঠানো", label_en: "Send SMS" },
      { key: "campaigns", label_bn: "ক্যাম্পেইন ম্যানেজ", label_en: "Manage campaigns" },
    ],
  },
  {
    key: "sms",
    title_bn: "এস এম এস",
    title_en: "SMS",
    icon: "💬",
    items: [
      { key: "view", label_bn: "এস এম এস", label_en: "SMS" },
      { key: "history", label_bn: "এসএমএস ইতিহাস", label_en: "SMS history" },
      { key: "buy", label_bn: "এসএমএস কিনুন", label_en: "Buy SMS" },
    ],
  },
  {
    key: "report",
    title_bn: "ব্যবসার রিপোর্ট",
    title_en: "Reports",
    icon: "📈",
    items: [
      { key: "view", label_bn: "ব্যবসার রিপোর্ট", label_en: "Business report" },
      { key: "sales_report", label_bn: "বিক্রির রিপোর্ট", label_en: "Sales report" },
      { key: "purchase_report", label_bn: "ক্রয়ের রিপোর্ট", label_en: "Purchase report" },
      { key: "stock_report", label_bn: "স্টক রিপোর্ট", label_en: "Stock report" },
      { key: "product_report", label_bn: "প্রোডাক্ট রিপোর্ট", label_en: "Product report" },
      { key: "expense_report", label_bn: "খরচ রিপোর্ট", label_en: "Expense report" },
      { key: "income_report", label_bn: "আয় রিপোর্ট", label_en: "Income report" },
      { key: "profit_loss", label_bn: "লাভ-ক্ষতি", label_en: "Profit & Loss" },
      { key: "supplier_report", label_bn: "সাপ্লায়ার রিপোর্ট", label_en: "Supplier report" },
      { key: "top_customers", label_bn: "শীর্ষ কাস্টমার", label_en: "Top customers" },
      { key: "top_employees", label_bn: "শীর্ষ কর্মচারী", label_en: "Top employees" },
      { key: "owner_report", label_bn: "মালিক রিপোর্ট", label_en: "Owner report" },
      { key: "combined_report", label_bn: "একত্রিত রিপোর্ট", label_en: "Combined report" },
      { key: "export", label_bn: "এক্সপোর্ট / ডাউনলোড", label_en: "Export / Download" },
    ],
  },
  {
    key: "returns",
    title_bn: "প্রোডাক্ট রিটার্ন",
    title_en: "Returns",
    icon: "↩️",
    items: [
      { key: "view", label_bn: "রিটার্ন তালিকা", label_en: "View returns" },
      { key: "add", label_bn: "নতুন রিটার্ন", label_en: "Add return" },
      { key: "refund", label_bn: "টাকা ফেরত", label_en: "Refund" },
      { key: "edit", label_bn: "এডিট করুন", label_en: "Edit" },
      { key: "delete", label_bn: "মুছে ফেলুন", label_en: "Delete" },
    ],
  },
  {
    key: "recycle_bin",
    title_bn: "রিসাইকেল বিন",
    title_en: "Recycle bin",
    icon: "🗑️",
    items: [
      { key: "view", label_bn: "বিন দেখা", label_en: "View bin" },
      { key: "restore", label_bn: "পুনরুদ্ধার", label_en: "Restore" },
      { key: "purge", label_bn: "স্থায়ী ডিলিট", label_en: "Permanent delete" },
    ],
  },
  {
    key: "topup",
    title_bn: "টপ আপ",
    title_en: "Top up",
    icon: "🔋",
    items: [
      { key: "view", label_bn: "টপ আপ", label_en: "Top up" },
    ],
  },
  {
    key: "online_shop",
    title_bn: "অনলাইন শপ",
    title_en: "Online shop",
    icon: "🛍️",
    items: [
      { key: "view", label_bn: "অনলাইন শপ", label_en: "Online shop" },
      { key: "messages", label_bn: "ম্যাসেজ", label_en: "Messages" },
      { key: "store_settings", label_bn: "স্টোর সেটিংস", label_en: "Store settings" },
      { key: "products", label_bn: "অনলাইন প্রোডাক্ট", label_en: "Products" },
      { key: "orders", label_bn: "অর্ডার লিস্ট", label_en: "Orders" },
      { key: "order_details", label_bn: "অর্ডারের বিস্তারিত", label_en: "Order details" },
      { key: "theme", label_bn: "থিম সেটিংস", label_en: "Theme" },
      { key: "delivery", label_bn: "ডেলিভারি মাধ্যম", label_en: "Delivery" },
      { key: "featured", label_bn: "ফিচার্ড প্রোডাক্ট", label_en: "Featured products" },
      { key: "banners", label_bn: "ব্যানার ম্যানেজ", label_en: "Manage banners" },
    ],
  },
  {
    key: "shop",
    title_bn: "শপ সেটিংস",
    title_en: "Shop settings",
    icon: "🏪",
    items: [
      { key: "view", label_bn: "শপ সেটিংস", label_en: "Shop settings" },
      { key: "edit", label_bn: "শপ এডিট", label_en: "Edit shop" },
      { key: "logo", label_bn: "লোগো / প্রোফাইল", label_en: "Logo / Profile" },
      { key: "switch", label_bn: "শপ সুইচ", label_en: "Switch shop" },
      { key: "create", label_bn: "নতুন শপ যোগ", label_en: "Add new shop" },
      { key: "delete", label_bn: "শপ ডিলিট", label_en: "Delete shop" },
    ],
  },
  {
    key: "printer",
    title_bn: "প্রিন্টার",
    title_en: "Printer",
    icon: "🖨️",
    items: [
      { key: "view", label_bn: "প্রিন্টার সেটিংস", label_en: "Printer settings" },
      { key: "configure", label_bn: "কনফিগার", label_en: "Configure" },
    ],
  },
  {
    key: "training",
    title_bn: "অ্যাপ ট্রেনিং",
    title_en: "Training",
    icon: "🎓",
    items: [
      { key: "view", label_bn: "ট্রেনিং দেখা", label_en: "View training" },
    ],
  },
  {
    key: "affiliate",
    title_bn: "অ্যাফিলিয়েট",
    title_en: "Affiliate",
    icon: "🤝",
    items: [
      { key: "view", label_bn: "অ্যাফিলিয়েট দেখা", label_en: "View affiliate" },
      { key: "withdraw", label_bn: "টাকা উত্তোলন", label_en: "Withdraw" },
      { key: "share", label_bn: "রেফারেল শেয়ার", label_en: "Share referral" },
    ],
  },
  {
    key: "subscription",
    title_bn: "সাবস্ক্রিপশন",
    title_en: "Subscription",
    icon: "💳",
    items: [
      { key: "view", label_bn: "প্ল্যান দেখা", label_en: "View plans" },
      { key: "purchase", label_bn: "কিনুন / আপগ্রেড", label_en: "Purchase / upgrade" },
      { key: "usage", label_bn: "ব্যবহারের সীমা", label_en: "Usage limits" },
    ],
  },
  {
    key: "access",
    title_bn: "অ্যাক্সেস ম্যানেজমেন্ট",
    title_en: "Access management",
    icon: "🔐",
    items: [
      { key: "view", label_bn: "মেম্বার তালিকা", label_en: "View members" },
      { key: "invite", label_bn: "নতুন মেম্বার যোগ", label_en: "Invite member" },
      { key: "edit_perms", label_bn: "পারমিশন এডিট", label_en: "Edit permissions" },
      { key: "remove", label_bn: "মেম্বার রিমুভ", label_en: "Remove member" },
      { key: "custom_roles", label_bn: "কাস্টম রোল", label_en: "Custom roles" },
    ],
  },
];

export type PermissionMap = Record<string, string[]>;

export const ROLE_PRESETS: Record<RoleKey, PermissionMap> = {
  EMPLOYEE: {
    dashboard: ["view", "summary"],
    sell: ["sell", "quick_sell", "cart_edit"],
    contacts: ["view", "customers", "add_customer"],
    products: ["view"],
  },
  MANAGER: {
    dashboard: ["view", "summary", "quick_actions"],
    purchase: ["buy", "cart_edit", "discount", "delivery"],
    sell: ["sell", "quick_sell", "cart_edit", "discount", "delivery"],
    expense: ["expense", "list", "add"],
    contacts: ["view", "customers", "suppliers", "add_customer", "add_supplier"],
    products: ["view", "add", "edit", "details"],
    stock: ["view", "history", "update", "edit"],
    cashbox: ["view", "cash_in", "cash_out", "history"],
    wishlist: ["view", "convert"],
    quick_order: ["view", "create"],
    report: ["view", "sales_report", "purchase_report", "stock_report"],
    returns: ["view", "add", "refund"],
    sms: ["view", "history"],
  },
  OWNER: Object.fromEntries(FEATURE_GROUPS.map((g) => [g.key, g.items.map((i) => i.key)])),
};

export function presetForDbRole(role: string): PermissionMap {
  if (role === "owner" || role === "admin") return ROLE_PRESETS.OWNER;
  if (role === "manager") return ROLE_PRESETS.MANAGER;
  return ROLE_PRESETS.EMPLOYEE;
}

export function hasPerm(perms: PermissionMap | null | undefined, group: string, item: string): boolean {
  if (!perms) return false;
  return Array.isArray(perms[group]) && perms[group].includes(item);
}

export function togglePerm(perms: PermissionMap, group: string, item: string): PermissionMap {
  const next = { ...perms };
  const arr = next[group] ? [...next[group]] : [];
  const i = arr.indexOf(item);
  if (i >= 0) arr.splice(i, 1); else arr.push(item);
  if (arr.length === 0) delete next[group];
  else next[group] = arr;
  return next;
}

export function toggleGroup(perms: PermissionMap, group: string, on: boolean): PermissionMap {
  const next = { ...perms };
  const fg = FEATURE_GROUPS.find((g) => g.key === group);
  if (!fg) return perms;
  if (on) next[group] = fg.items.map((i) => i.key);
  else delete next[group];
  return next;
}

export function isGroupFullyOn(perms: PermissionMap | null | undefined, group: string): boolean {
  if (!perms || !perms[group]) return false;
  const fg = FEATURE_GROUPS.find((g) => g.key === group);
  if (!fg) return false;
  return fg.items.every((i) => perms[group].includes(i.key));
}

export function normalizeBdPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("8801") && digits.length === 13) return digits;
  if (digits.startsWith("01") && digits.length === 11) return "88" + digits;
  if (digits.startsWith("1") && digits.length === 10) return "880" + digits;
  return digits;
}
