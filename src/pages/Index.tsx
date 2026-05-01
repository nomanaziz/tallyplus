import { useEffect } from "react";
import { useNavigate } from "@/lib/router";
import { useAuth } from "@/lib/auth";
import { LoginCard } from "@/components/site/LoginCard";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { homePathFor } from "@/lib/home-redirect";
import { Loader2 } from "lucide-react";

/**
 * Home page = login/signup card directly.
 * - Logged-out → LoginCard
 * - Logged-in  → auto-redirect to role-aware dashboard
 */
function Index() {
  const { session, loading, isOwner, ensureProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (session?.user) void ensureProfile();
  }, [session?.user, ensureProfile]);

  useEffect(() => {
    if (loading) return;
    if (!session?.user) return;
    const target = homePathFor({ loggedIn: true, isOwner });
    navigate({ to: target, replace: true });
  }, [loading, session?.user, isOwner, navigate]);

  if (loading || session?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <LoginCard />
      </main>
      <SiteFooter />
    </div>
  );
}

export default Index;
