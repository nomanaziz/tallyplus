import { useEffect } from "react";
import { useNavigate } from "@/lib/router";
import { useAuth } from "@/lib/auth";
import { AuthEntry } from "@/components/site/AuthEntry";
import { homePathFor } from "@/lib/home-redirect";
import { Loader2 } from "lucide-react";

/**
 * Home page = login/signup card directly.
 * - Logged-out → LoginCard
 * - Logged-in  → auto-redirect to role-aware dashboard
 */
function Index() {
  const { session, loading, isOwner, isAdmin, ensureProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (session?.user) void ensureProfile();
  }, [session?.user, ensureProfile]);

  useEffect(() => {
    if (loading) return;
    if (!session?.user) return;
    const target = homePathFor({ loggedIn: true, isOwner, isAdmin });
    navigate({ to: target, replace: true });
  }, [loading, session?.user, isOwner, isAdmin, navigate]);

  if (loading || session?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <AuthEntry />;
}

export default Index;
