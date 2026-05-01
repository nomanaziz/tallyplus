import { useEffect } from "react";
import { useNavigate } from "@/lib/router";
import { useAuth } from "@/lib/auth";
import { AuthEntry } from "@/components/site/AuthEntry";
import { homePathFor } from "@/lib/home-redirect";
import { Loader2 } from "lucide-react";

/**
 * Facebook-style entry:
 * - Logged-out → AuthEntry (login/signup first, with link to /about)
 * - Logged-in  → auto-redirect to role-aware dashboard
 */
function Index() {
  const { session, loading, isOwner, ensureProfile } = useAuth();
  const navigate = useNavigate();

  // Trigger profile load so isOwner becomes accurate.
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

  return <AuthEntry />;
}

export default Index;
