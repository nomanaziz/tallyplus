import { useEffect } from "react";
import { Outlet, useNavigate, Link } from "@/lib/router";
import { useAuth } from "@/lib/auth";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Loader2, LogOut, Home, ListChecks, ShoppingBag, Heart, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdSlot } from "@/components/ads/AdSlot";

const NAV = [
  { to: "/customer/dashboard", label: "ড্যাশবোর্ড", Icon: Home },
  { to: "/customer/my-fordo", label: "আমার ফর্দ", Icon: ListChecks },
  { to: "/customer/my-orders", label: "আমার অর্ডার", Icon: ShoppingBag },
  { to: "/customer/favorite-shops", label: "প্রিয় দোকান", Icon: Heart },
  { to: "/customer/profile", label: "ঠিকানা", Icon: MapPin },
];

export default function CustomerLayout() {
  const { session, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!session?.user) navigate("/", { replace: true });
  }, [session, loading, navigate]);

  if (loading || !session?.user) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <SiteHeader />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/20">
      <SiteHeader />
      <main className="flex-1 pb-20 md:pb-8">
        <div className="container mx-auto grid gap-6 px-4 py-6 md:grid-cols-[220px_1fr]">
          {/* Side nav (desktop) */}
          <aside className="hidden md:block">
            <div className="sticky top-24 space-y-1 rounded-2xl border bg-card p-2 shadow-sm">
              {NAV.map(({ to, label, Icon }) => (
                <Link
                  key={to}
                  to={to}
                  activeProps={{ className: "bg-primary text-primary-foreground" }}
                  inactiveProps={{ className: "text-foreground hover:bg-accent" }}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition"
                >
                  <Icon className="h-5 w-5 flex-none" />
                  {label}
                </Link>
              ))}
              <div className="pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-destructive hover:text-destructive"
                  onClick={async () => {
                    await signOut();
                    navigate("/", { replace: true });
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" /> লগআউট
                </Button>
              </div>
            </div>
          </aside>

          <section className="min-w-0">
            <Outlet />
            {/* Small ad at bottom of the consumer area. Only renders for
                logged-in consumers; never for paid subscribers. */}
            <div className="mx-auto mt-6 max-w-md">
              <AdSlot slotKey="customer_inline" className="text-xs" />
            </div>
          </section>
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur md:hidden">
        <div className="grid grid-cols-5">
          {NAV.map(({ to, label, Icon }) => (
            <Link
              key={to}
              to={to}
              activeProps={{ className: "text-primary" }}
              inactiveProps={{ className: "text-muted-foreground" }}
              className="flex flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-medium"
            >
              <Icon className="h-5 w-5" />
              <span className="truncate">{label}</span>
            </Link>
          ))}
        </div>
      </nav>

      <div className="hidden md:block">
        <SiteFooter />
      </div>
    </div>
  );
}
