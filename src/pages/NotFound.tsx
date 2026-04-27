import { Link } from "@/lib/router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Compass, Home, LayoutDashboard, Store, Tag, Phone, ArrowLeft } from "lucide-react";

export default function NotFound() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl">
          <div className="relative overflow-hidden rounded-3xl border bg-card p-8 md:p-12 shadow-sm text-center">
            {/* Decorative gradient blob */}
            <div
              aria-hidden
              className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full opacity-20 blur-3xl"
              style={{ background: "radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)" }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full opacity-20 blur-3xl"
              style={{ background: "radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)" }}
            />

            <div className="relative">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Compass className="h-10 w-10" />
              </div>

              <h1 className="bg-gradient-to-br from-primary to-primary/40 bg-clip-text text-7xl md:text-8xl font-extrabold tracking-tight text-transparent">
                404
              </h1>

              <h2 className="mt-4 text-2xl md:text-3xl font-bold text-foreground">
                পেজটি খুঁজে পাওয়া যায়নি
              </h2>
              <p className="mt-2 text-sm md:text-base text-muted-foreground">
                দুঃখিত! আপনি যে পেজটি খুঁজছেন সেটি সরিয়ে নেওয়া হয়েছে, নাম পরিবর্তন হয়েছে অথবা আদৌ ছিল না।
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                The page you are looking for doesn’t exist.
              </p>

              <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <Link to="/">
                    <Home className="mr-2 h-4 w-4" />
                    হোমে ফিরুন
                  </Link>
                </Button>
                {user ? (
                  <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                    <Link to="/app/dashboard">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Dashboard-এ যান
                    </Link>
                  </Button>
                ) : (
                  <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                    <Link to="/auth">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      লগইন করুন
                    </Link>
                  </Button>
                )}
              </div>

              <div className="mt-8 border-t pt-6">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
                  জনপ্রিয় পেজ
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Link
                    to="/shop"
                    className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground transition"
                  >
                    <Store className="h-3.5 w-3.5" /> মার্কেটপ্লেস
                  </Link>
                  <a
                    href="/#pricing"
                    className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground transition"
                  >
                    <Tag className="h-3.5 w-3.5" /> Pricing
                  </a>
                  <a
                    href="/#contact"
                    className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground transition"
                  >
                    <Phone className="h-3.5 w-3.5" /> Contact
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
