/* Granular feature-permission map for shop members (UI-level only). */

export type RoleKey = "EMPLOYEE" | "MANAGER" | "OWNER";

export type FeatureGroup = {
  key: string;
  title_bn: string;
  title_en: string;
  icon: string; // emoji or short label
  items: { key: string; label_bn: string; label_en: string }[];
};

export const FEATURE_GROUPS: FeatureGroup[] = [
  {
    key: "purchase",
    title_bn: "কেনা",
    title_en: "Purchase",
    icon: "🛒",
    items: [
      { key: "buy", label_bn: "কেনা", label_en: "Purchase" },
      { key: "cart_edit", label_bn: "কার্ট এডিট", label_en: "Cart edit" },
      { key: "discount", label_bn: "ডিসকাউন্ট", label_en: "Discount" },
      { key: "delivery", label_bn: "ডেলিভারী চার্জ", label_en: "Delivery" },
      { key: "ledger", label_bn: "কেনার খাতা", label_en: "Ledger" },
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
    ],
  },
  {
    key: "stock",
    title_bn: "স্টকের হিসাব",
    title_en: "Stock",
    icon: "🏷️",
    items: [
      { key: "history", label_bn: "ইতিহাস", label_en: "History" },
      { key: "update", label_bn: "আপডেট", label_en: "Update" },
      { key: "view", label_bn: "স্টকের হিসাব", label_en: "Stock" },
    ],
  },
  { key: "sms", title_bn: "এস এম এস", title_en: "SMS", icon: "💬", items: [{ key: "view", label_bn: "এস এম এস", label_en: "SMS" }] },
  { key: "report", title_bn: "ব্যবসার রিপোর্ট", title_en: "Report", icon: "📈", items: [{ key: "view", label_bn: "ব্যবসার রিপোর্ট", label_en: "Report" }] },
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
  { key: "topup", title_bn: "টপ আপ", title_en: "Top up", icon: "🔋", items: [{ key: "view", label_bn: "টপ আপ", label_en: "Top up" }] },
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
    ],
  },
  { key: "shop", title_bn: "শপ", title_en: "Shop", icon: "🏪", items: [{ key: "view", label_bn: "শপ সেটিংস", label_en: "Shop settings" }] },
];

export type PermissionMap = Record<string, string[]>;

/** Preset permissions per role. */
export const ROLE_PRESETS: Record<RoleKey, PermissionMap> = {
  EMPLOYEE: {
    sell: ["sell", "quick_sell", "cart_edit"],
    contacts: ["view", "customers", "add_customer"],
  },
  MANAGER: {
    purchase: ["buy", "cart_edit", "discount", "delivery"],
    sell: ["sell", "quick_sell", "cart_edit", "discount", "delivery"],
    expense: ["expense", "list", "add"],
    contacts: ["view", "customers", "suppliers", "add_customer", "add_supplier"],
    products: ["view"],
    stock: ["view", "history"],
    report: ["view"],
    returns: ["view", "add", "refund"],
  },
  OWNER: Object.fromEntries(FEATURE_GROUPS.map((g) => [g.key, g.items.map((i) => i.key)])),
};

/** Map app_role enum (DB) to default preset. */
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

/** Normalize phone to international 8801XXXXXXXXX (no +, no spaces). */
export function normalizeBdPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("8801") && digits.length === 13) return digits;
  if (digits.startsWith("01") && digits.length === 11) return "88" + digits;
  if (digits.startsWith("1") && digits.length === 10) return "880" + digits;
  return digits;
}