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
  Gauge,
  Megaphone,
  CreditCard as CreditCardIcon,
  AlertTriangle,
  MapPin,
  DollarSign,
  MessageSquareText,
  KeyRound,
  ArrowLeftRight,
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

const ITEMS: Item[] = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, perm: "always" },
  { to: "/admin/my-credentials", label: "My Credentials", icon: KeyRound, perm: "always" },
  { to: "/admin/landing", label: "Landing Page", icon: FileEdit, perm: "landing" },
  { to: "/admin/users", label: "Users", icon: Users, perm: "users" },
  { to: "/admin/admins", label: "Admin Team", icon: ShieldCheck, perm: "platform_admins" },
  { to: "/admin/shop-types", label: "Shop Types", icon: Tag, perm: "shop_types" },
  { to: "/admin/subscription-requests", label: "Subscription Requests", icon: Receipt, perm: "subscription_requests" },
  { to: "/admin/transfers", label: "Ownership Transfers", icon: ArrowLeftRight, perm: "transfers" },
  { to: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard, perm: "subscriptions" },
  { to: "/admin/plans", label: "Plans", icon: Tags, perm: "plans" },
  { to: "/admin/usage-limits", label: "Usage Limits", icon: Gauge, perm: "usage_limits" },
  { to: "/admin/promo-popups", label: "Promo Popups", icon: Megaphone, perm: "promo_popups" },
  { to: "/admin/payment-gateway", label: "Payment Gateway", icon: CreditCardIcon, perm: "payment_gateway" },
  { to: "/admin/sms-gateways", label: "SMS Gateways", icon: MessageSquareText, perm: "sms_gateways" },
  { to: "/admin/payment-attempts", label: "Payment Attempts", icon: AlertTriangle, perm: "payment_attempts" },
  { to: "/admin/marketplace", label: "Marketplace", icon: Store, perm: "marketplace" },
  { to: "/admin/marketplace-categories", label: "Marketplace Categories", icon: Tags, perm: "marketplace_categories" },
  { to: "/admin/banners", label: "Dashboard Banners", icon: Image, perm: "banners" },
  { to: "/admin/training", label: "Training Videos", icon: GraduationCap, perm: "training" },
  { to: "/admin/affiliates", label: "Affiliate Program", icon: Handshake, perm: "affiliates" },
  { to: "/admin/locations", label: "Locations (এলাকা)", icon: MapPin, perm: "locations" },
  { to: "/admin/ads", label: "Ads / Monetization", icon: DollarSign, perm: "ads" },
  { to: "/admin/settings", label: "Settings", icon: Settings, perm: "settings" },
];

export function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const loc = useLocation();
  const { adminPermissions, isSuperAdmin } = useAuth();
  const visible = ITEMS.filter((it) => {
    if (!it.perm || it.perm === "always") return true;
    return hasPerm(adminPermissions, isSuperAdmin, it.perm);
  });
  return (
    <aside className="flex h-full w-60 flex-col border-r bg-sidebar">
      <div className="flex h-14 flex-none items-center gap-2 border-b px-4">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <span className="text-base font-extrabold tracking-tight">Admin Portal</span>
      </div>
      <ScrollArea className="flex-1">
        <nav className="flex flex-col gap-0.5 px-2 py-2">
          {visible.map((it) => {
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
                  "group flex items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors",
                  active
                    ? "bg-primary/25 font-semibold text-foreground"
                    : "hover:bg-sidebar-accent",
                )}
              >
                <Icon className="h-5 w-5 flex-none" />
                <span className="truncate">{it.label}</span>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>
    </aside>
  );
}