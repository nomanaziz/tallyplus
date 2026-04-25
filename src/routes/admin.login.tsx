import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/admin/login")({
  head: () => ({ meta: [{ title: "Admin Login — Tally Plus" }] }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  // If already signed in as admin, skip straight to dashboard
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid) return;
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .eq("role", "admin")
        .maybeSingle();
      if (!cancelled && roles) nav({ to: "/admin" });
    })();
    return () => {
      cancelled = true;
    };
  }, [nav]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Email এবং password দিন");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      const uid = data.user?.id;
      if (!uid) throw new Error("Login failed");

      // Verify admin role
      const { data: roleRow, error: roleErr } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .eq("role", "admin")
        .maybeSingle();

      if (roleErr) throw roleErr;
      if (!roleRow) {
        await supabase.auth.signOut();
        toast.error("আপনার admin access নেই");
        return;
      }

      toast.success("Admin হিসেবে login হয়েছে");
      nav({ to: "/admin" });
    } catch (err: any) {
      toast.error(err?.message ?? "Login ব্যর্থ হয়েছে");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-sm space-y-5"
      >
        <div className="flex flex-col items-center text-center gap-2">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-xl font-semibold">Admin Login</h1>
          <p className="text-sm text-muted-foreground">
            শুধুমাত্র অনুমোদিত admin-দের জন্য
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="admin-email">Email</Label>
          <Input
            id="admin-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@example.com"
            disabled={busy}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="admin-password">Password</Label>
          <Input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled={busy}
          />
        </div>

        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Login"}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          <Link to="/auth" className="underline">
            Shop owner হিসেবে login করুন
          </Link>
        </p>

        <p className="text-center text-xs text-muted-foreground">
          প্রথমবার?{" "}
          <Link to="/admin/setup" className="underline">
            Super admin তৈরি করুন
          </Link>
        </p>
      </form>
    </div>
  );
}
