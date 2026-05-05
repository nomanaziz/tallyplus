// Permission keys used in admin_profiles.permissions JSONB and the sidebar.
export const ADMIN_PERMISSION_KEYS = [
  "users",
  "platform_admins",
  "subscription_requests",
  "subscriptions",
  "plans",
  "marketplace",
  "marketplace_categories",
  "brands",
  "variant_presets",
  "image_library",
  "shop_types",
  "landing",
  "banners",
  "training",
  "promo_popups",
  "payment_gateway",
  "sms_gateways",
  "payment_attempts",
  "usage_limits",
  "affiliates",
  "locations",
  "ads",
  "settings",
  "transfers",
] as const;

export type AdminPermKey = (typeof ADMIN_PERMISSION_KEYS)[number];

export const ADMIN_PERMISSION_LABELS: Record<AdminPermKey, string> = {
  users: "Users",
  platform_admins: "Admin Team",
  subscription_requests: "Subscription Requests",
  subscriptions: "Subscriptions",
  plans: "Plans",
  marketplace: "Marketplace",
  marketplace_categories: "Marketplace Categories",
  brands: "Brands / Companies",
  variant_presets: "Variant Presets",
  image_library: "Image Library",
  shop_types: "Shop Types",
  landing: "Landing Page",
  banners: "Dashboard Banners",
  training: "Training Videos",
  promo_popups: "Promo Popups",
  payment_gateway: "Payment Gateway",
  sms_gateways: "SMS Gateways",
  payment_attempts: "Payment Attempts",
  usage_limits: "Usage Limits",
  affiliates: "Affiliate Program",
  locations: "Locations",
  ads: "Ads / Monetization",
  settings: "Settings",
  transfers: "Ownership Transfers",
};

export function hasPerm(
  perms: Record<string, boolean> | null,
  isSuper: boolean,
  key: AdminPermKey,
): boolean {
  if (isSuper) return true;
  return !!perms?.[key];
}
