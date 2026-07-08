import { Link, useLocation } from "@/lib/router";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileEdit,
  Users,
  CreditCard,
  Receipt,
  Tags,
  Store,
  Settings,
  ShieldCheck,
  Tag,
  GraduationCap,
  Handshake,
  Image,
  Images,
  Megaphone,
  CreditCard as CreditCardIcon,
  AlertTriangle,
  MapPin,
  DollarSign,
  MessageSquareText,
  KeyRound,
  ArrowLeftRight,
  Bot,
  Trash2,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/lib/auth";
import { hasPerm, type AdminPermKey } from "@/lib/admin-perms";

type Item = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  perm?: AdminPermKey | "always";
};

type Section = { label: string; items: Item[] };

const SECTIONS: Section[] = [
  {
    label: "Orders",
    items: [
      { to: "/admin/subscription-requests", label: "Subscription Orders", icon: Receipt, perm: "subscription_requests" },
      { to: "/admin/sms-gateways", label: "SMS Orders & Gateways", icon: MessageSquareText, perm: "sms_gateways" },
    ],
  },
  {
    label: "Overview",
    items: [
      { to: "/admin", label: "Dashboard", icon: LayoutDashboard, perm: "always" },
      { to: "/admin/my-credentials", label: "My Credentials", icon: KeyRound, perm: "always" },
      { to: "/admin/telegram-alerts", label: "Telegram Alerts", icon: Bot, perm: "always" },
    ],
  },
  {
    label: "Users & Access",
    items: [
      { to: "/admin/users", label: "Users", icon: Users, perm: "users" },
      { to: "/admin/admins", label: "Admin Team", icon: ShieldCheck, perm: "platform_admins" },
      { to: "/admin/transfers", label: "Ownership Transfers", icon: ArrowLeftRight, perm: "transfers" },
      { to: "/admin/shop-recycle-bin", label: "Shop Recycle Bin", icon: Trash2, perm: "shop_recycle_bin" },
    ],
  },
  {
    label: "Billing",
    items: [
      { to: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard, perm: "subscriptions" },
      { to: "/admin/plans", label: "Plans", icon: Tags, perm: "plans" },
      { to: "/admin/payment-gateway", label: "Payment Gateway", icon: CreditCardIcon, perm: "payment_gateway" },
      { to: "/admin/payment-attempts", label: "Payment Attempts", icon: AlertTriangle, perm: "payment_attempts" },
    ],
  },
  {
    label: "Marketplace",
    items: [
      { to: "/admin/marketplace", label: "Products", icon: Store, perm: "marketplace" },
      { to: "/admin/marketplace-categories", label: "Categories", icon: Tags, perm: "marketplace_categories" },
      { to: "/admin/brands", label: "Brands / Companies", icon: Tag, perm: "brands" },
      { to: "/admin/variant-presets", label: "Variant Presets", icon: Tag, perm: "variant_presets" },
      { to: "/admin/shop-types", label: "Shop Types", icon: Tag, perm: "shop_types" },
    ],
  },
  {
    label: "Content & Marketing",
    items: [
      { to: "/admin/landing", label: "Landing Page", icon: FileEdit, perm: "landing" },
      { to: "/admin/banners", label: "Dashboard Banners", icon: Image, perm: "banners" },
      { to: "/admin/promo-popups", label: "Promo Popups", icon: Megaphone, perm: "promo_popups" },
      { to: "/admin/image-library", label: "Image Library", icon: Images, perm: "image_library" },
      { to: "/admin/training", label: "Training Videos", icon: GraduationCap, perm: "training" },
      { to: "/admin/ads", label: "Ads / Monetization", icon: DollarSign, perm: "ads" },
      { to: "/admin/affiliates", label: "Affiliate Program", icon: Handshake, perm: "affiliates" },
    ],
  },
  {
    label: "System",
    items: [
      { to: "/admin/locations", label: "Locations (এলাকা)", icon: MapPin, perm: "locations" },
      { to: "/admin/settings", label: "Settings", icon: Settings, perm: "settings" },
    ],
  },
];

export function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const loc = useLocation();
  const { adminPermissions, isSuperAdmin } = useAuth();
  const visibleSections = SECTIONS.map((s) => ({
    ...s,
    items: s.items.filter((it) => {
      if (!it.perm || it.perm === "always") return true;
      return hasPerm(adminPermissions, isSuperAdmin, it.perm);
    }),
  })).filter((s) => s.items.length > 0);
  return (
    <aside className="flex h-full w-60 flex-col border-r bg-sidebar">
      <div className="flex h-14 flex-none items-center gap-2 border-b px-4">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <span className="text-base font-extrabold tracking-tight">Admin Portal</span>
      </div>
      <ScrollArea className="flex-1">
        <nav className="flex flex-col gap-2 px-2 py-2">
          {visibleSections.map((section) => (
            <div key={section.label} className="flex flex-col gap-0.5">
              <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                {section.label}
              </div>
              {section.items.map((it) => {
                const active =
                  it.to === "/admin"
                    ? loc.pathname === "/admin"
                    : loc.pathname === it.to || loc.pathname.startsWith(it.to + "/");
                const Icon = it.icon;
                return (
                  <Link
                    key={it.to}
                    to={it.to as never}
                    onClick={onNavigate}
                    className={cn(
                      "group flex h-9 items-center gap-3 rounded-lg px-3 text-[13px] leading-tight transition-colors",
                      active
                        ? "bg-primary/15 font-bold text-primary shadow-sm"
                        : "text-foreground/80 hover:bg-accent/60",
                    )}
                  >
                    <Icon className={cn("h-5 w-5 flex-none", active ? "stroke-[2.5] text-primary" : "text-muted-foreground")} />
                    <span className="truncate">{it.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </ScrollArea>
    </aside>
  );
}