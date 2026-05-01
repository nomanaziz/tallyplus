import { useEffect, useState } from "react";
import { Link, useNavigate } from "@/lib/router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, LogOut, ListChecks, ShoppingBag, Heart, Wallet, StickyNote, GraduationCap } from "lucide-react";
import { LocationPicker, type LocationValue } from "@/components/LocationPicker";

type Consumer = {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  division: string | null;
  district: string | null;
  upazila: string | null;
  area: string | null;
};

export default function CustomerProfilePage() {
  const { session, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [loc, setLoc] = useState<LocationValue>({ division: null, district: null, upazila: null, area: null });

  useEffect(() => {
    if (authLoading) return;
    if (!session?.user) {
      navigate({ to: "/", replace: true });
      return;
    }
    void supabase
      .from("consumer_profiles")
      .select("id,name,phone,address,division,district,upazila,area")
      .eq("id", session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        const c = data as Consumer | null;
        if (c) {
          setName(c.name ?? "");
          setPhone(c.phone ?? "");
          setAddress(c.address ?? "");
          setLoc({
            division: c.division ?? null,
            district: c.district ?? null,
            upazila: c.upazila ?? null,
            area: c.area ?? null,
          });
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
      .upsert({
        id: session.user.id,
        name: name.trim(),
        phone,
        address: address.trim() || null,
        division: loc.division,
        district: loc.district,
        upazila: loc.upazila,
        area: loc.area?.trim() || null,
      });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("সংরক্ষিত");
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-3">
        {[
          { to: "/customer/my-fordo", label: "ফর্দ", Icon: ListChecks, tone: "bg-violet-100 text-violet-700" },
          { to: "/customer/my-orders", label: "অর্ডার", Icon: ShoppingBag, tone: "bg-indigo-100 text-indigo-700" },
          { to: "/customer/favorite-shops", label: "প্রিয় দোকান", Icon: Heart, tone: "bg-rose-100 text-rose-700" },
          { to: "/customer/money", label: "আয়-ব্যয়", Icon: Wallet, tone: "bg-emerald-100 text-emerald-700" },
          { to: "/customer/notes", label: "নোট", Icon: StickyNote, tone: "bg-amber-100 text-amber-700" },
          { to: "/customer/training", label: "ট্রেনিং", Icon: GraduationCap, tone: "bg-sky-100 text-sky-700" },
        ].map(({ to, label, Icon, tone }) => (
          <Link
            key={to}
            to={to}
            className="flex flex-col items-center gap-1.5 rounded-2xl border bg-card p-3 text-center shadow-sm transition hover:border-primary/40"
          >
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tone}`}>
              <Icon className="h-6 w-6" />
            </div>
            <div className="text-[11px] font-semibold leading-tight">{label}</div>
          </Link>
        ))}
      </div>

      <div className="space-y-6 rounded-2xl border bg-card p-6 shadow-sm">
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
          <div className="space-y-2">
            <Label>আপনার এলাকা</Label>
            <p className="text-xs text-muted-foreground">বিভাগ → জেলা → উপজেলা নির্বাচন করুন</p>
            <LocationPicker value={loc} onChange={setLoc} />
          </div>
          <div>
            <Label>বিস্তারিত ঠিকানা</Label>
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
    </div>
  );
}
