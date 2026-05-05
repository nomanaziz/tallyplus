import { useEffect, useState } from "react";
import { useNavigate } from "@/lib/router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

export default function ProfilePage() {
  const { lang } = useI18n();
  const { user, profile, refreshProfile } = useAuth() as ReturnType<typeof useAuth> & { refreshProfile?: () => Promise<void> };
  const nav = useNavigate();
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFullName(profile?.full_name || "");
    void (async () => {
      const { data } = await supabase.from("profiles").select("full_name, country_code").eq("id", user.id).maybeSingle();
      if (data) {
        setFullName(((data as { full_name?: string }).full_name) || "");
      }
    })();
  }, [user, profile?.full_name]);

  const schema = z.object({
    fullName: z.string().trim().min(2, lang === "bn" ? "নাম কমপক্ষে ২ অক্ষর হতে হবে" : "Name min 2 chars").max(100, lang === "bn" ? "১০০ অক্ষরের কম" : "Max 100 chars"),
    address: z.string().trim().max(200, lang === "bn" ? "২০০ অক্ষরের কম" : "Max 200 chars").optional(),
  });

  const save = async () => {
    if (!user) return;
    const parsed = schema.safeParse({ fullName, address });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: parsed.data.fullName })
        .eq("id", user.id);
      if (error) throw error;
      toast.success(lang === "bn" ? "প্রোফাইল আপডেট হয়েছে" : "Profile updated");
      if (typeof refreshProfile === "function") await refreshProfile();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-full bg-muted/30">
      <header className="flex items-center gap-2 border-b bg-background px-4 py-3">
        <Button variant="ghost" size="icon" onClick={() => nav(-1 as never)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold">{lang === "bn" ? "আমার প্রোফাইল" : "My Profile"}</h1>
      </header>
      <div className="mx-auto max-w-xl space-y-4 p-4">
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <div>
            <Label>{lang === "bn" ? "ফোন নম্বর" : "Phone"}</Label>
            <Input value={profile?.phone || user?.phone || ""} disabled className="mt-1" />
            <p className="mt-1 text-xs text-muted-foreground">
              {lang === "bn" ? "ফোন নম্বর পরিবর্তন করা যাবে না।" : "Phone cannot be changed."}
            </p>
          </div>
          <div>
            <Label>{lang === "bn" ? "পূর্ণ নাম" : "Full name"}</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={100} className="mt-1" />
          </div>
          <div>
            <Label>{lang === "bn" ? "ঠিকানা (ঐচ্ছিক)" : "Address (optional)"}</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} maxLength={200} className="mt-1" />
          </div>
          <Button onClick={save} disabled={busy} className="w-full">
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {lang === "bn" ? "সংরক্ষণ করুন" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}