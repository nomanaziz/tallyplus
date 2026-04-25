import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, LogOut } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Admin — Tally Plus" }] }),
  component: AdminHome,
});

function AdminHome() {
  const nav = useNavigate();
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        if (!cancelled) nav({ to: "/admin/login" });
        return;
      }
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (cancelled) return;
      if (!roleRow) {
        await supabase.auth.signOut();
        toast.error("আপনার admin access নেই");
        nav({ to: "/admin/login" });
        return;
      }
      setEmail(user.email ?? null);
      setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [nav]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    nav({ to: "/admin/login" });
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-card">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {email}
            </span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-1" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-4">
        <div className="rounded-2xl border bg-card p-6">
          <h2 className="font-semibold mb-2">Welcome</h2>
          <p className="text-sm text-muted-foreground">
            Admin panel-এ আপনি স্বাগতম। User, subscription এবং plan management
            module শীঘ্রই যুক্ত হবে।
          </p>
        </div>
        <div className="text-sm">
          <Link to="/app/dashboard" className="text-primary underline">
            App dashboard-এ ফিরে যান
          </Link>
        </div>
      </main>
    </div>
  );
}
