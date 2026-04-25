import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/admin/setup")({
  head: () => ({ meta: [{ title: "Admin Setup — Tally Plus" }] }),
  component: AdminSetupPage,
});

function AdminSetupPage() {
  const nav = useNavigate();
  const [checking, setChecking] = useState(true);
  const [alreadyExists, setAlreadyExists] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Anonymous-safe check: does any admin already exist?
      // We can't read user_roles publicly, so we just attempt and let the function decide.
      // Quick UX: try a count via RPC-free hack — fall back to allowing the form.
      if (!cancelled) setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || password.length < 8) {
      toast.error("সঠিক email এবং কমপক্ষে ৮ অক্ষরের password দিন");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("bootstrap-admin", {
        body: { email: email.trim(), password, full_name: fullName.trim() || "Super Admin" },
      });
      if (error) throw error;
      if ((data as any)?.error) {
        if (String((data as any).error).includes("ইতিমধ্যে")) {
          setAlreadyExists(true);
        }
        throw new Error((data as any).error);
      }
      toast.success("Super admin account তৈরি হয়েছে। এখন login করুন।");
      nav({ to: "/admin/login" });
    } catch (err: any) {
      toast.error(err?.message ?? "তৈরি করা ব্যর্থ হয়েছে");
    } finally {
      setBusy(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <form
        onSubmit={handleCreate}
        className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-sm space-y-5"
      >
        <div className="flex flex-col items-center text-center gap-2">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-xl font-semibold">Super Admin Setup</h1>
          <p className="text-sm text-muted-foreground">
            এক-বারের জন্য super admin account তৈরি করুন
          </p>
        </div>

        {alreadyExists ? (
          <div className="rounded-md bg-destructive/10 text-destructive p-3 text-sm">
            একটি admin account ইতিমধ্যে আছে। নতুন তৈরি করা যাবে না।
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="full-name">পূর্ণ নাম</Label>
          <Input
            id="full-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Super Admin"
            disabled={busy || alreadyExists}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="setup-email">Email</Label>
          <Input
            id="setup-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@example.com"
            disabled={busy || alreadyExists}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="setup-password">Password (কমপক্ষে ৮ অক্ষর)</Label>
          <Input
            id="setup-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled={busy || alreadyExists}
          />
        </div>

        <Button type="submit" className="w-full" disabled={busy || alreadyExists}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Admin তৈরি করুন"}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          <Link to="/admin/login" className="underline">
            Admin login page
          </Link>
        </p>
      </form>
    </div>
  );
}