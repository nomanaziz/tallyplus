import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateReferralCode } from "@/lib/referral";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";

export const Route = createFileRoute("/affiliate/register")({
  head: () => ({
    meta: [
      { title: "Register — Growth Partner" },
      { name: "description", content: "হিসাবী গ্রোথ পার্টনার হিসেবে রেজিস্ট্রেশন করুন।" },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [existing, setExisting] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data } = await supabase.from("affiliates").select("id").eq("user_id", user.id).maybeSingle();
      setExisting(!!data);
    })();
  }, [user?.id]);

  const submit = async () => {
    if (!user) {
      toast.error("আগে লগইন করুন");
      nav({ to: "/auth" });
      return;
    }
    if (!name.trim() || !phone.trim()) {
      toast.error("নাম ও ফোন নাম্বার দিন");
      return;
    }
    setBusy(true);
    let code = generateReferralCode();
    // ensure unique (best-effort)
    for (let i = 0; i < 5; i++) {
      const { data } = await supabase.from("affiliates").select("id").eq("referral_code", code).maybeSingle();
      if (!data) break;
      code = generateReferralCode();
    }
    const { error } = await supabase.from("affiliates").insert({
      user_id: user.id,
      full_name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || null,
      referral_code: code,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("রেজিস্ট্রেশন সম্পন্ন!");
    nav({ to: "/app/affiliate" });
  };

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-8">
      <div className="mx-auto max-w-md">
        <Link to="/affiliate" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> ফিরে যান
        </Link>
        <div className="mt-4 rounded-2xl border bg-card p-6 shadow-sm">
          <h1 className="text-xl font-extrabold">গ্রোথ পার্টনার রেজিস্ট্রেশন</h1>
          <p className="mt-1 text-sm text-muted-foreground">ফর্মটি পূরণ করে যুক্ত হয়ে যান।</p>

          {loading ? (
            <div className="mt-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : !user ? (
            <div className="mt-6 rounded-lg border bg-muted/40 p-4 text-sm">
              রেজিস্ট্রেশনের আগে আপনাকে লগইন করতে হবে।
              <div className="mt-3"><Link to="/auth"><Button className="w-full">লগইন করুন</Button></Link></div>
            </div>
          ) : existing ? (
            <div className="mt-6 rounded-lg border bg-emerald-50 p-4 text-sm text-emerald-900">
              আপনি ইতোমধ্যে রেজিস্ট্রেশন করেছেন।
              <div className="mt-3"><Link to="/app/affiliate"><Button className="w-full">ড্যাশবোর্ডে যান</Button></Link></div>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              <div>
                <Label>পূর্ণ নাম *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="আপনার নাম" maxLength={100} />
              </div>
              <div>
                <Label>ফোন নাম্বার *</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" maxLength={20} />
              </div>
              <div>
                <Label>ইমেইল</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="optional" maxLength={150} />
              </div>
              <Button onClick={submit} disabled={busy} className="mt-2 h-11 w-full font-bold">
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                রেজিস্ট্রেশন সম্পন্ন করুন
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}