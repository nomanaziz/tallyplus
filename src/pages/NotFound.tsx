import { Link, useLocation } from "@/lib/router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Home, LayoutDashboard, Store, Tag, ArrowLeft, Search } from "lucide-react";

export default function NotFound() {
  const { user } = useAuth();
  const location = useLocation();
  const path = location.pathname || "/";

  const quickLinks = [
    { to: "/", icon: Home, label: "হোম" },
    { to: "/shop", icon: Store, label: "মার্কেটপ্লেস" },
    { to: user ? "/app/dashboard" : "/auth", icon: LayoutDashboard, label: "ড্যাশবোর্ড" },
    { to: "/pricing", icon: Tag, label: "প্রাইসিং" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-3xl text-center">
          {/* Giant 404 */}
          <h1
            className="select-none bg-clip-text text-transparent font-extrabold leading-none tracking-tighter"
            style={{
              backgroundImage:
                "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.55) 60%, hsl(var(--primary) / 0.25) 100%)",
              fontSize: "clamp(8rem, 22vw, 16rem)",
            }}
          >
            404
          </h1>

          <h2 className="mt-2 text-3xl md:text-4xl font-extrabold text-foreground">
            পেজটি হারিয়ে গেছে!
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm md:text-base text-muted-foreground">
            আপনি যে পেজটি খুঁজছেন সেটি সরিয়ে ফেলা হয়েছে, নাম বদলানো হয়েছে অথবা কখনোই ছিল না।
          </p>

          {/* Path pill */}
          <div className="mt-4 flex justify-center">
            <code className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-mono text-muted-foreground max-w-full truncate">
              {path}
            </code>
          </div>

          {/* Action buttons */}
          <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              variant="outline"
              size="lg"
              onClick={() => window.history.back()}
              className="w-full sm:w-auto"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              পেছনে যান
            </Button>
            <Button asChild size="lg" className="w-full sm:w-auto shadow-md">
              <Link to="/">
                <Home className="mr-2 h-4 w-4" />
                হোমে ফিরুন
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg" className="w-full sm:w-auto">
              <Link to="/shop">
                <Search className="mr-2 h-4 w-4" />
                খুঁজুন
              </Link>
            </Button>
          </div>

          {/* Quick links grid */}
          <div className="mt-12">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4">
              অথবা এখান থেকে শুরু করুন
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
              {quickLinks.map((q) => (
                <Link
                  key={q.label}
                  to={q.to}
                  className="group flex flex-col items-center justify-center gap-2 rounded-2xl border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-primary/40"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                    <q.icon className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-semibold">{q.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
