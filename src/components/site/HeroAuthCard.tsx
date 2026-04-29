import { useState, useEffect } from "react";
import { Link, useNavigate } from "@/lib/router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, MessageCircle, ArrowRight, Sparkles } from "lucide-react";
import { ShopTypePicker } from "@/components/app/ShopTypePicker";

type Mode = "login" | "signup";
type Role = "owner" | "customer";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const ADMIN_WA_FALLBACK = "8801XXXXXXXXX";

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
    headers: {
      "content-type": "application/json",
      apikey: SUPABASE_ANON,
      authorization: `Bearer ${SUPABASE_ANON}`,
    },
    body: JSON.stringify(body),
  });
  return await res.json();
}

export function HeroAuthCard() {
  const { session, user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signup");
  const [role, setRole] = useState<Role>("owner");
  const [name, setName] = useState("");
  const [shopName, setShopName] = useState("");
  const [shopTypeCode, setShopTypeCode] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [adminPhone, setAdminPhone] = useState(ADMIN_WA_FALLBACK);

  useEffect(() => {
    void supabase
      .from("affiliate_settings")
      .select("support_phone, password_reset_whatsapp")
      .maybeSingle()
      .then(({ data }) => {
        const row = data as {
          support_phone: string | null;
          password_reset_whatsapp: string | null;
        } | null;
        const p = row?.password_reset_whatsapp || row?.support_phone;
        if (p) setAdminPhone(p.replace(/\D/g, ""));
      });
  }, []);

  // Already-logged-in welcome card
  if (session?.user) {
    const displayName =
      (user?.user_metadata?.full_name as string | undefined) ||
      (user?.email as string | undefined) ||
      "";
    return (
      <div className="mx-auto w-full max-w-md rounded-3xl border bg-card p-8 shadow-2xl ring-1 ring-border">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>
          <h3 className="text-xl font-bold">স্বাগতম{displayName ? `, ${displayName}` : ""} 👋</h3>
          <p className="text-sm text-muted-foreground">
            আপনি ইতিমধ্যে লগইন করা আছেন। সরাসরি Dashboard-এ চলে যান।
          </p>
          <Button
            className="mt-2 h-12 w-full text-base font-semibold"
            onClick={() => navigate({ to: "/app/dashboard" })}
          >
            Dashboard-এ যান <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-11 w-full"
            onClick={() => navigate({ to: "/customer/dashboard" })}
          >
            গ্রাহক Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const validate = (): string | null => {
    const ph = normalizePhone(phone);
    if (!ph || ph.length < 10) return "সঠিক মোবাইল নম্বর দিন";
    if (!/^\d{4}$/.test(pin)) return "৪ সংখ্যার PIN দিন";
    if (mode === "signup") {
      if (name.trim().length < 2) return "আপনার নাম দিন";
      if (role === "owner") {
        if (shopName.trim().length < 2) return "দোকানের নাম দিন";
        if (!shopTypeCode) return "দোকানের ধরন বাছাই করুন";
      }
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
      if (mode === "signup") {
        if (role === "owner") {
          const r = await callFn("signup-with-pin", {
            phone: ph,
            full_name: name.trim(),
            shop_name: shopName.trim(),
            shop_type_code: shopTypeCode,
            pin,
          });
          if (!r.ok) {
            if (r.error === "phone_exists") return toast.error("এই নম্বরে account আছে — লগইন করুন");
            if (r.error === "rate_limit") return toast.error("একটু পরে আবার চেষ্টা করুন (সার্ভার ব্যস্ত)");
            return toast.error(r.error || "সাইনআপ ব্যর্থ");
          }
          await setSession(r.access_token, r.refresh_token);
          try {
            localStorage.setItem("pending_sample_import", "1");
          } catch {
            /* ignore */
          }
          toast.success("Account তৈরি হয়েছে 🎉");
          navigate({ to: "/app/dashboard", replace: true });
        } else {
          const r = await callFn("customer-signup-with-pin", {
            phone: ph,
            full_name: name.trim(),
            pin,
          });
          if (!r.ok) {
            if (r.error === "phone_exists") return toast.error("এই নম্বরে গ্রাহক account আছে — লগইন করুন");
            if (r.error === "rate_limit") return toast.error("একটু পরে আবার চেষ্টা করুন (সার্ভার ব্যস্ত)");
            return toast.error(r.error || "সাইনআপ ব্যর্থ");
          }
          await setSession(r.access_token, r.refresh_token);
          toast.success("Customer account তৈরি");
          navigate({ to: "/customer/dashboard", replace: true });
        }
      } else {
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
          const r = await callFn("customer-login-with-pin", { phone: ph, pin });
          if (!r.ok) {
            if (r.error === "wrong_pin") return toast.error("ভুল PIN");
            if (r.error === "no_account") return toast.error("এই নম্বরে গ্রাহক account নেই — সাইনআপ করুন");
            if (r.error === "no_pin_set") return toast.error("PIN সেট নেই — WhatsApp এ সাহায্য নিন");
            return toast.error(r.error || "লগইন ব্যর্থ");
          }
          await setSession(r.access_token, r.refresh_token);
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
    <div className="mx-auto w-full max-w-md rounded-3xl border bg-card p-6 shadow-2xl ring-1 ring-border md:p-7">
      <div className="mb-4 text-center">
        <h3 className="text-xl font-bold">
          {mode === "login" ? "Account-এ লগইন করুন" : "ফ্রি Account খুলুন"}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          মাত্র ৩০ সেকেন্ডে শুরু করুন — কোনো খরচ নেই
        </p>
      </div>

      <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)} className="mb-3">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="signup">নতুন Account</TabsTrigger>
          <TabsTrigger value="login">লগইন</TabsTrigger>
        </TabsList>
      </Tabs>

      <Tabs value={role} onValueChange={(v) => setRole(v as Role)} className="mb-3">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="owner">দোকানদার</TabsTrigger>
          <TabsTrigger value="customer">গ্রাহক</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-3">
        {mode === "signup" && (
          <>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="আপনার নাম"
            />
            {role === "owner" && (
              <>
                <Input
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="দোকানের নাম"
                />
                <ShopTypePicker
                  value={shopTypeCode}
                  onChange={(code) => setShopTypeCode(code)}
                  lang="bn"
                  label="দোকানের ধরন"
                />
              </>
            )}
          </>
        )}
        <Input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="মোবাইল নম্বর (01XXXXXXXXX)"
          inputMode="tel"
        />
        <Input
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
          placeholder="৪ সংখ্যার PIN"
          inputMode="numeric"
          maxLength={4}
          type="password"
        />
        <Button
          onClick={handleSubmit}
          disabled={loading}
          className="h-12 w-full text-base font-semibold"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === "login" ? "লগইন করুন" : "Account তৈরি করুন"}
          {!loading && <ArrowRight className="ml-1 h-4 w-4" />}
        </Button>

        <a
          href={waUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-md border border-green-600/30 bg-green-50 px-3 py-2 text-xs text-green-700 hover:bg-green-100 dark:bg-green-950/30 dark:text-green-400"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          PIN ভুলে গেছেন? WhatsApp করুন
        </a>

        <div className="text-center">
          <Link to="/auth" className="text-xs text-muted-foreground hover:text-primary hover:underline">
            পুরো Login পেজে যান →
          </Link>
        </div>
      </div>
    </div>
  );
}