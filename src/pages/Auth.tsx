import { useState, useEffect } from "react";
import { Link, useNavigate } from "@/lib/router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, MessageCircle } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

type Mode = "login" | "signup";
type Role = "owner" | "customer";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const ADMIN_WA = "8801XXXXXXXXX"; // fallback; real number loaded from affiliate_settings

function normalizePhone(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("880")) return "+" + d;
  if (d.startsWith("01") && d.length === 11) return "+880" + d.slice(1);
  if (d.length === 10) return "+880" + d;
  return "+" + d;
}

async function callFn(name: string, body: unknown) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: SUPABASE_ANON, authorization: `Bearer ${SUPABASE_ANON}` },
    body: JSON.stringify(body),
  });
  return await res.json();
}

export default function AuthPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [role, setRole] = useState<Role>("owner");
  const [name, setName] = useState("");
  const [shopName, setShopName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [adminPhone, setAdminPhone] = useState(ADMIN_WA);

  useEffect(() => {
    if (session?.user) navigate({ to: "/app/dashboard", replace: true });
  }, [session, navigate]);

  useEffect(() => {
    void supabase
      .from("affiliate_settings")
      .select("support_phone")
      .maybeSingle()
      .then(({ data }) => {
        const p = (data as { support_phone: string | null } | null)?.support_phone;
        if (p) setAdminPhone(p.replace(/\D/g, ""));
      });
  }, []);

  const validate = (): string | null => {
    const ph = normalizePhone(phone);
    if (!ph || ph.length < 10) return "সঠিক মোবাইল নম্বর দিন";
    // PIN only required for owner accounts
    if (role === "owner" && !/^\d{4}$/.test(pin)) return "৪ সংখ্যার PIN দিন";
    if (mode === "signup") {
      if (name.trim().length < 2) return "আপনার নাম দিন";
      if (role === "owner" && shopName.trim().length < 2) return "দোকানের নাম দিন";
    }
    return null;
  };

  const setSession = async (access_token: string, refresh_token: string) => {
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) throw error;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) return toast.error(err);
    setLoading(true);
    try {
      const ph = normalizePhone(phone);
      const digits = ph.replace(/\D/g, "");
      // Customer accounts use a separate email namespace ("c" prefix) so
      // the same phone number can have BOTH an owner and a customer account
      // without colliding in auth.users.
      const customerEmail = `c${digits}@tally.local`;
      const customerPassword = `tpc_${digits}_pw`;
      if (mode === "signup") {
        if (role === "owner") {
          const r = await callFn("signup-with-pin", {
            phone: ph,
            full_name: name.trim(),
            shop_name: shopName.trim(),
            pin,
          });
          if (!r.ok) {
            if (r.error === "phone_exists") return toast.error("এই নম্বরে account আছে — লগইন করুন");
            return toast.error(r.error || "সাইনআপ ব্যর্থ");
          }
          await setSession(r.access_token, r.refresh_token);
          toast.success("Account তৈরি হয়েছে");
          navigate({ to: "/app/dashboard", replace: true });
        } else {
          // Customer signup — separate email namespace so it never collides
          // with the same phone's owner account.
          const { error: signUpErr } = await supabase.auth.signUp({
            email: customerEmail,
            password: customerPassword,
            options: {
              emailRedirectTo: window.location.origin,
              data: { full_name: name.trim(), account_type: "consumer" },
            },
          });
          if (signUpErr) {
            const msg = signUpErr.message.toLowerCase();
            if (msg.includes("registered") || msg.includes("already")) {
              return toast.error("এই নম্বরে গ্রাহক account আগে থেকেই আছে — লগইন করুন");
            }
            return toast.error(signUpErr.message);
          }
          const { error: signInErr } = await supabase.auth.signInWithPassword({
            email: customerEmail,
            password: customerPassword,
          });
          if (signInErr) return toast.error("লগইন ব্যর্থ — আবার চেষ্টা করুন");
          // Save phone + name on consumer_profiles
          const { data: u } = await supabase.auth.getUser();
          if (u.user) {
            await supabase.from("consumer_profiles").upsert({
              id: u.user.id,
              name: name.trim(),
              phone: ph,
            });
          }
          toast.success("Customer account তৈরি");
          navigate({ to: "/customer/dashboard", replace: true });
        }
      } else {
        // Login — explicitly per the selected tab (owner or customer)
        if (role === "owner") {
          const r = await callFn("login-with-pin", { phone: ph, pin });
          if (!r.ok) {
            if (r.error === "wrong_pin") return toast.error("ভুল PIN");
            if (r.error === "no_account") return toast.error("এই নম্বরে দোকানদার account নেই — সাইনআপ করুন");
            return toast.error(r.error || "লগইন ব্যর্থ");
          }
          await setSession(r.access_token, r.refresh_token);
          toast.success("লগইন সফল");
          navigate({ to: "/app/dashboard", replace: true });
        } else {
          const { error: signInErr } = await supabase.auth.signInWithPassword({
            email: customerEmail,
            password: customerPassword,
          });
          if (signInErr) {
            return toast.error("এই নম্বরে গ্রাহক account নেই — সাইনআপ করুন");
          }
          toast.success("লগইন সফল");
          navigate({ to: "/customer/dashboard", replace: true });
        }
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const waUrl = () => {
    const text = encodeURIComponent(
      `আসসালামু আলাইকুম, আমার Tally Plus account সমস্যা — Phone: ${normalizePhone(phone) || "(আমার নম্বর)"}\nসাহায্য করুন।`
    );
    return `https://wa.me/${adminPhone}?text=${text}`;
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm space-y-5 rounded-2xl border bg-card p-6 shadow-sm">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Tally Plus</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "login" ? "Account-এ লগইন করুন" : "নতুন account তৈরি করুন"}
          </p>
        </div>

        {mode === "login" ? (
          <div className="space-y-3">
            <Tabs value={role} onValueChange={(v) => setRole(v as Role)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="owner">দোকানদার</TabsTrigger>
                <TabsTrigger value="customer">গ্রাহক</TabsTrigger>
              </TabsList>
            </Tabs>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="মোবাইল নম্বর"
              inputMode="tel"
            />
            {role === "owner" && (
              <Input
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="৪ সংখ্যার PIN"
                inputMode="numeric"
                maxLength={4}
                type="password"
              />
            )}
            <Button onClick={handleSubmit} disabled={loading} className="w-full">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              লগইন
            </Button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className="w-full text-center text-sm text-primary hover:underline"
            >
              Create account
            </button>
            <a
              href={waUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-md border border-green-600/30 bg-green-50 px-3 py-2 text-xs text-green-700 hover:bg-green-100 dark:bg-green-950/30 dark:text-green-400"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              PIN ভুলে গেছেন? WhatsApp করুন
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            <Tabs value={role} onValueChange={(v) => setRole(v as Role)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="owner">দোকান মালিক</TabsTrigger>
                <TabsTrigger value="customer">গ্রাহক</TabsTrigger>
              </TabsList>
            </Tabs>

            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="আপনার নাম"
            />
            {role === "owner" && (
              <Input
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="দোকানের নাম"
              />
            )}
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="মোবাইল নম্বর"
              inputMode="tel"
            />
            {role === "owner" && (
              <Input
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="৪ সংখ্যার PIN"
                inputMode="numeric"
                maxLength={4}
                type="password"
              />
            )}
            <Button onClick={handleSubmit} disabled={loading} className="w-full">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Account তৈরি করুন
            </Button>
            <button
              type="button"
              onClick={() => setMode("login")}
              className="w-full text-center text-sm text-primary hover:underline"
            >
              ← লগইনে ফিরুন
            </button>
          </div>
        )}

        <div className="text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:underline">হোমে ফিরুন</Link>
        </div>
      </div>
      </main>
      <SiteFooter />
    </div>
  );
}
