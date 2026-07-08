import { useEffect } from "react";
import { Outlet, useNavigate, Link, useLocation } from "@/lib/router";
import { useAuth } from "@/lib/auth";
import { Loader2, Home, ListChecks, User, Plus, Wallet } from "lucide-react";
import { AdSlot } from "@/components/ads/AdSlot";
import { homePathFor } from "@/lib/home-redirect";
import { IncomingTransfersBanner } from "@/components/app/IncomingTransfersBanner";
import { CustomerSidebar } from "@/components/customer/CustomerSidebar";
import { CustomerTopbar } from "@/components/customer/CustomerTopbar";

const MOBILE_LEFT = [
  { to: "/customer/dashboard", label: "হোম", Icon: Home },
  { to: "/customer/my-fordo", label: "ফর্দ", Icon: ListChecks },
];
const MOBILE_RIGHT = [
  { to: "/customer/money", label: "টাকা", Icon: Wallet },
  { to: "/customer/me", label: "আমি", Icon: User },
];

export default function CustomerLayout() {
  const { session, loading, accountReady, isOwner, isAdmin } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();

  const onFordo = loc.pathname.startsWith("/customer/my-fordo");
  const fabTarget = onFordo ? "/customer/create-fordo" : "/customer/money?add=1";
  const fabLabel = onFordo ? "নতুন ফর্দ" : "যোগ করুন";

  useEffect(() => {
    if (loading) return;
    if (!session?.user) navigate("/", { replace: true });
  }, [session, loading, navigate]);

  useEffect(() => {
    if (loading || !accountReady || !session?.user) return;
    if (isOwner || isAdmin) {
      navigate({
        to: homePathFor({ loggedIn: true, isOwner, isAdmin }),
        replace: true,
      });
    }
  }, [loading, accountReady, session?.user, isOwner, isAdmin, navigate]);

  if (loading || !accountReady || !session?.user || isOwner || isAdmin) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="hidden md:block">
        <CustomerSidebar />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <CustomerTopbar />
        <main className="flex-1 overflow-auto pb-24 md:pb-6">
          <div className="mx-auto max-w-6xl px-3 py-4 sm:px-6 sm:py-6">
            <div className="mb-4"><IncomingTransfersBanner /></div>
            <Outlet />
            <div className="mx-auto mt-6 max-w-md">
              <AdSlot slotKey="customer_inline" className="text-xs" />
            </div>
          </div>
        </main>

        {/* Mobile bottom nav: 2 + FAB + 2 */}
        <nav
          className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur md:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          <div className="relative grid grid-cols-5">
            {MOBILE_LEFT.map(({ to, label, Icon }) => (
              <Link
                key={to}
                to={to}
                activeProps={{ className: "text-primary" }}
                inactiveProps={{ className: "text-muted-foreground" }}
                className="flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium"
              >
                <Icon className="h-5 w-5" />
                <span className="truncate">{label}</span>
              </Link>
            ))}
            <div aria-hidden />
            {MOBILE_RIGHT.map(({ to, label, Icon }) => (
              <Link
                key={to}
                to={to}
                activeProps={{ className: "text-primary" }}
                inactiveProps={{ className: "text-muted-foreground" }}
                className="flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium"
              >
                <Icon className="h-5 w-5" />
                <span className="truncate">{label}</span>
              </Link>
            ))}

            <Link
              to={fabTarget}
              aria-label={fabLabel}
              className="absolute left-1/2 top-0 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background transition active:scale-95"
            >
              <Plus className="h-6 w-6" />
            </Link>
          </div>
        </nav>
      </div>
    </div>
  );
}