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
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

type Item = { to: string; label: string; icon: React.ComponentType<{ className?: string }> };

const ITEMS: Item[] = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard },
  { to: "/admin/landing", label: "Landing Page", icon: FileEdit },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/admins", label: "Admin Team", icon: ShieldCheck },
  { to: "/admin/shop-types", label: "Shop Types", icon: Tag },
  { to: "/admin/subscription-requests", label: "Subscription Requests", icon: Receipt },
  { to: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
  { to: "/admin/plans", label: "Plans", icon: Tags },
  { to: "/admin/usage-limits", label: "Usage Limits", icon: Gauge },
  { to: "/admin/promo-popups", label: "Promo Popups", icon: Megaphone },
  { to: "/admin/payment-gateway", label: "Payment Gateway", icon: CreditCardIcon },
  { to: "/admin/sms-gateways", label: "SMS Gateways", icon: MessageSquareText },
  { to: "/admin/payment-attempts", label: "Payment Attempts", icon: AlertTriangle },
  { to: "/admin/marketplace", label: "Marketplace", icon: Store },
  { to: "/admin/marketplace-categories", label: "Marketplace Categories", icon: Tags },
  { to: "/admin/banners", label: "Dashboard Banners", icon: Image },
  { to: "/admin/training", label: "Training Videos", icon: GraduationCap },
  { to: "/admin/affiliates", label: "Affiliate Program", icon: Handshake },
  { to: "/admin/locations", label: "Locations (এলাকা)", icon: MapPin },
  { to: "/admin/ads", label: "Ads / Monetization", icon: DollarSign },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const loc = useLocation();
  return (
    <aside className="flex h-full w-60 flex-col border-r bg-sidebar">
      <div className="flex h-14 flex-none items-center gap-2 border-b px-4">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <span className="text-base font-extrabold tracking-tight">Admin Portal</span>
      </div>
      <ScrollArea className="flex-1">
        <nav className="flex flex-col gap-0.5 px-2 py-2">
          {ITEMS.map((it) => {
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