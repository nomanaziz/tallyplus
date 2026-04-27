import { useEffect } from "react";
import { Outlet, useNavigate, NavLink } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Loader2, LayoutDashboard, ListChecks, Wallet, NotebookPen, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdSlot } from "@/components/ads/AdSlot";

const NAV = [
  { to: "/customer/dashboard", label: "ড্যাশবোর্ড", Icon: LayoutDashboard },
  { to: "/customer/my-fordo", label: "আমার ফর্দ", Icon: ListChecks },
  { to: "/customer/money", label: "আয়-ব্যয়", Icon: Wallet },
  { to: "/customer/notes", label: "নোট", Icon: NotebookPen },
  { to: "/customer/profile", label: "প্রোফাইল", Icon: User },
];

export default function CustomerLayout() {
  const { session, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!session?.user) navigate("/auth", { replace: true });
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
                <NavLink
                  key={to}
                  to={to}
                  end
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                      isActive ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent"
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </NavLink>
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
            <div className="mt-4">
              <AdSlot slotKey="customer_sidebar" />
            </div>
          </aside>

          <section className="min-w-0">
            <AdSlot slotKey="customer_top" />
            <Outlet />
          </section>
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur md:hidden">
        <div className="grid grid-cols-5">
          {NAV.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`
              }
            >
              <Icon className="h-4 w-4" />
              <span className="truncate">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="hidden md:block">
        <SiteFooter />
      </div>
    </div>
  );
}
