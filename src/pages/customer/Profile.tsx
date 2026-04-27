import { useEffect, useState } from "react";
import { Link, useNavigate } from "@/lib/router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, LogOut } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

type Consumer = { id: string; name: string; phone: string; address: string | null };

export default function CustomerProfilePage() {
  const { session, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!session?.user) {
      navigate({ to: "/auth", replace: true });
      return;
    }
    void supabase
      .from("consumer_profiles")
      .select("id,name,phone,address")
      .eq("id", session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        const c = data as Consumer | null;
        if (c) {
          setName(c.name ?? "");
          setPhone(c.phone ?? "");
          setAddress(c.address ?? "");
        }
        setLoading(false);
      });
  }, [session, authLoading, navigate]);

  const save = async () => {
    if (!session?.user) return;
    if (name.trim().length < 2) return toast.error("নাম দিন");
    setSaving(true);
    const { error } = await supabase
      .from("consumer_profiles")
      .upsert({ id: session.user.id, name: name.trim(), phone, address: address.trim() || null });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("সংরক্ষিত");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <SiteHeader />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/20">
      <SiteHeader />
      <main className="flex-1 px-4 py-8">
        <div className="mx-auto w-full max-w-md space-y-6 rounded-2xl border bg-card p-6 shadow-sm">
        <div>
          <h1 className="text-xl font-bold">আমার প্রোফাইল</h1>
          <p className="mt-1 text-sm text-muted-foreground">নাম ও ঠিকানা update করুন</p>
        </div>

        <div className="space-y-4">
          <div>
            <Label>নাম</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="পূর্ণ নাম" />
          </div>
          <div>
            <Label>মোবাইল নম্বর</Label>
            <Input value={phone} disabled className="bg-muted" />
            <p className="mt-1 text-xs text-muted-foreground">মোবাইল নম্বর পরিবর্তনযোগ্য নয়</p>
          </div>
          <div>
            <Label>ঠিকানা</Label>
            <Textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="বাড়ি, রোড, এলাকা, শহর"
              rows={3}
            />
          </div>
          <Button onClick={save} disabled={saving} className="w-full">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            সংরক্ষণ করুন
          </Button>
        </div>

        <div className="flex flex-col gap-2 border-t pt-4">
          <Link to="/" className="text-center text-sm text-muted-foreground hover:underline">
            হোমে ফিরুন
          </Link>
          <Button
            variant="ghost"
            onClick={async () => {
              await signOut();
              navigate({ to: "/", replace: true });
            }}
            className="text-destructive hover:text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            লগআউট
          </Button>
        </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
