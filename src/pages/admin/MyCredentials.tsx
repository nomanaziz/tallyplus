import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, KeyRound, UserCog } from "lucide-react";
import { toast } from "sonner";

function MyCredentialsPage() {
  const { adminEmail, refresh, user } = useAuth();
  const [email, setEmail] = useState(adminEmail || user?.email || "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    const md = (user?.user_metadata as Record<string, unknown> | null) ?? null;
    const dn = (md?.["display_name"] ?? md?.["full_name"]) as string | undefined;
    setDisplayName(typeof dn === "string" ? dn : "");
  }, [user]);

  const saveName = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const v = displayName.trim();
    if (!v) return toast.error("নাম খালি হতে পারবে না");
    setSavingName(true);
    const { error } = await supabase.auth.updateUser({ data: { display_name: v } });
    setSavingName(false);
    if (error) return toast.error(error.message);
    toast.success("নাম আপডেট হয়েছে");
    await refresh();
  };

  const placeholderEmail = (e: string | null | undefined) =>
    !!e && /@tally\.local$/i.test(e);

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return toast.error("সঠিক email দিন");
    if (password.length < 6) return toast.error("Password কমপক্ষে ৬ অক্ষর");
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("set-admin-credentials", {
        body: { email: email.trim(), password },
      });
      if (error || !data?.ok) throw new Error(error?.message ?? data?.error ?? "Failed");
      toast.success("Email + password set হয়েছে — পরের বার এই দিয়ে login করবেন");
      setPassword("");
      await refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-4 p-3 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" /> Profile Name
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveName} className="space-y-3">
            <div>
              <Label>Display name</Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="আপনার নাম"
              />
            </div>
            <Button type="submit" disabled={savingName} className="w-full">
              {savingName ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              নাম সংরক্ষণ
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" /> Email & Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          {placeholderEmail(adminEmail || user?.email) && (
            <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              আপনার email এখনো set হয়নি। নিচে নতুন email + password দিয়ে save করুন। এর পর শুধু এই credentials দিয়ে /admin/login এ ঢুকতে পারবেন।
            </div>
          )}
          <form onSubmit={submit} className="space-y-3">
            <div>
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@example.com" />
            </div>
            <div>
              <Label>নতুন password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              Save credentials
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default MyCredentialsPage;