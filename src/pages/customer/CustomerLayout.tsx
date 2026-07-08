import { useEffect } from "react";
import { Outlet, useNavigate, Link, useLocation } from "@/lib/router";
import { useAuth } from "@/lib/auth";
import {
  Loader2,
  LogOut,
  Home,
  ListChecks,
  ShoppingBag,
  Store,
  User,
  Plus,
  Wallet,
  History,
  ShoppingCart,
  Heart,
  Wrench,
  BookOpen,
  BarChart3,
  PiggyBank,
  StickyNote,
  CreditCard,
  GraduationCap,
  UserCog,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdSlot } from "@/components/ads/AdSlot";
import { homePathFor } from "@/lib/home-redirect";
import { IncomingTransfersBanner } from "@/components/app/IncomingTransfersBanner";

// Full sidebar — every consumer page in one scrollable list.
const NAV: Array<{ to: string; label: string; Icon: typeof Home }> = [
  { to: "/customer/dashboard", label: "ড্যাশবোর্ড", Icon: Home },
  { to: "/customer/marketplace", label: "মার্কেটপ্লেস", Icon: Store },
  { to: "/customer/my-orders", label: "আমার অর্ডার", Icon: ShoppingCart },
  { to: "/customer/my-fordo", label: "ফর্দ", Icon: ListChecks },
  { to: "/customer/shopping", label: "শপিং", Icon: ShoppingBag },
  { to: "/customer/favorite-shops", label: "প্রিয় দোকান", Icon: Heart },
  { to: "/customer/my-services", label: "আমার সার্ভিস", Icon: Wrench },
  { to: "/customer/money", label: "টাকা", Icon: Wallet },
  { to: "/customer/cash-book", label: "ক্যাশ বুক", Icon: BookOpen },
  { to: "/customer/analytics", label: "বিশ্লেষণ", Icon: BarChart3 },
  { to: "/customer/budgets", label: "বাজেট", Icon: PiggyBank },
  { to: "/customer/notes", label: "নোট", Icon: StickyNote },
  { to: "/customer/history", label: "ইতিহাস", Icon: History },
  { to: "/customer/subscription", label: "সাবস্ক্রিপশন", Icon: CreditCard },
  { to: "/customer/training", label: "ট্রেনিং", Icon: GraduationCap },
  { to: "/customer/profile", label: "প্রোফাইল", Icon: UserCog },
  { to: "/customer/me", label: "আমি", Icon: User },
];

const MOBILE_LEFT = [
  { to: "/customer/dashboard", label: "হোম", Icon: Home },
  { to: "/customer/my-fordo", label: "ফর্দ", Icon: ListChecks },
];
const MOBILE_RIGHT = [
  { to: "/customer/money", label: "টাকা", Icon: Wallet },
  { to: "/customer/me", label: "আমি", Icon: User },
];

export default function CustomerLayout() {
  const { session, loading, accountReady, isOwner, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();

  // Context-aware FAB: on the Fordo screen create a new fordo; otherwise add a money entry.
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
    <div className="flex min-h-screen flex-col bg-muted/20">
      <main className="flex-1 pb-24 md:pb-8">
        <div className="container mx-auto grid gap-6 px-4 py-6 md:grid-cols-[220px_1fr]">
          {/* Desktop side nav — matches business/admin sidebar pill-icon style */}
          <aside className="hidden md:block">
            <div className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto space-y-0.5 rounded-2xl border bg-card p-2 shadow-sm">
              {NAV.map(({ to, label, Icon }) => (
                <Link
                  key={to}
                  to={to}
                  activeProps={{ className: "bg-primary/15 font-bold text-primary shadow-sm [&_svg]:text-primary [&_svg]:stroke-[2.5]" }}
                  inactiveProps={{ className: "text-foreground/80 hover:bg-accent/60 [&_svg]:text-muted-foreground" }}
                  className="group flex h-9 items-center gap-3 rounded-lg px-3 text-[13px] leading-tight transition-colors"
                >
                  <Icon className="h-5 w-5 flex-none" />
                  <span className="truncate">{label}</span>
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
            <div className="mb-4"><IncomingTransfersBanner /></div>
            <Outlet />
            <div className="mx-auto mt-6 max-w-md">
              <AdSlot slotKey="customer_inline" className="text-xs" />
            </div>
          </section>
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

          {/* Floating center FAB */}
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
  );
}
