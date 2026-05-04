import { useState, useEffect } from "react";
import { useNavigate, useSearch } from "@/lib/router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, MessageCircle, Sparkles } from "lucide-react";
import { ShopTypePicker } from "@/components/app/ShopTypePicker";
import { COUNTRIES, guessCountryCode, getCountry } from "@/lib/countries";

type Mode = "login" | "signup";
type Role = "owner" | "customer";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const ADMIN_WA = "8801XXXXXXXXX";

function normalizePhone(raw: string, countryCode?: string): string {
  const d = raw.replace(/\D/g, "");
  if (!d) return "";
  const country = getCountry(countryCode);
  // BD legacy convenience
  if (country?.code === "BD") {
    if (d.startsWith("880")) return "+" + d;
    if (d.startsWith("01") && d.length === 11) return "+880" + d.slice(1);
    if (d.length === 10) return "+880" + d;
    return "+" + d;
  }
  if (country) {
    if (d.startsWith(country.dial)) return "+" + d;
    return "+" + country.dial + d.replace(/^0+/, "");
  }
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

/**
 * Compact login + signup card.
 * Used on the home page (no separate /auth route anymore).
 * Reads optional ?phone= and ?mode= / ?role= query params.
 */
export function LoginCard() {
  const { ensureProfile } = useAuth();
  const navigate = useNavigate();
  const search = useSearch<{ role?: string; mode?: string; phone?: string; redirect?: string }>();

  const [mode, setMode] = useState<Mode>("login");
  const [role, setRole] = useState<Role>("owner");
  const [name, setName] = useState("");
  const [shopName, setShopName] = useState("");
  const [shopTypeCode, setShopTypeCode] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [country, setCountry] = useState<string>(() => guessCountryCode());
  const [adminPhone, setAdminPhone] = useState(ADMIN_WA);
  const [postSignup, setPostSignup] = useState<null | "owner">(null);
  const [showForgotPin, setShowForgotPin] = useState(false);

  // Reset forgot-pin hint whenever the user changes phone/pin/mode/role
  useEffect(() => {
    setShowForgotPin(false);
  }, [phone, pin, mode, role]);

  useEffect(() => {
    if (search.role === "customer" || search.role === "owner") setRole(search.role);
    if (search.mode === "signup" || search.mode === "login") setMode(search.mode);
    if (search.phone && !phone) setPhone(search.phone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.role, search.mode, search.phone]);

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

  const validate = (): string | null => {
    const ph = normalizePhone(phone, country);
    if (!ph || ph.length < 8) return "সঠিক মোবাইল নম্বর দিন";
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
      const ph = normalizePhone(phone, country);
      if (mode === "signup") {
        if (role === "owner") {
          const r = await callFn("signup-with-pin", {
            phone: ph,
            full_name: name.trim(),
            shop_name: shopName.trim(),
            shop_type_code: shopTypeCode,
            pin,
            country_code: country,
          });
          if (!r.ok) {
            if (r.error === "phone_exists") return toast.error("এই নম্বরে account আছে — লগইন করুন");
            if (r.error === "rate_limit") return toast.error("একটু পরে আবার চেষ্টা করুন (সার্ভার ব্যস্ত)");
            return toast.error(r.error || "সাইনআপ ব্যর্থ");
          }
          await setSession(r.access_token, r.refresh_token);
          await ensureProfile();
          toast.success("Account তৈরি হয়েছে");
          setPostSignup("owner");
        } else {
          const r = await callFn("customer-signup-with-pin", {
            phone: ph,
            full_name: name.trim(),
            pin,
            country_code: country,
          });
          if (!r.ok) {
            if (r.error === "phone_exists") return toast.error("এই নম্বরে গ্রাহক account আছে — লগইন করুন");
            if (r.error === "rate_limit") return toast.error("একটু পরে আবার চেষ্টা করুন (সার্ভার ব্যস্ত)");
            return toast.error(r.error || "সাইনআপ ব্যর্থ");
          }
          await setSession(r.access_token, r.refresh_token);
          await ensureProfile();
          toast.success("Customer account তৈরি");
          if (search.redirect && search.redirect.startsWith("/")) {
            navigate({ to: search.redirect, replace: true });
          } else {
            navigate({ to: "/customer/dashboard", replace: true });
          }
        }
      } else {
        if (role === "owner") {
          const r = await callFn("login-with-pin", { phone: ph, pin });
          if (!r.ok) {
            if (r.error === "admin_must_use_email") {
              toast.error("Admin হিসেবে email + password দিয়ে login করুন");
              navigate({ to: "/xbd-login" });
              return;
            }
            if (r.error === "employee_must_use_email") {
              toast.error("Employee হিসেবে email + password দিয়ে login করুন");
              return;
            }
            if (r.error === "wrong_pin") {
              setShowForgotPin(true);
              return toast.error("ভুল PIN");
            }
            if (r.error === "no_account") {
              setShowForgotPin(false);
              return toast.error("এই নম্বরে দোকানদার account নেই — সাইনআপ করুন");
            }
            return toast.error(r.error || "লগইন ব্যর্থ");
          }
          await setSession(r.access_token, r.refresh_token);
          await ensureProfile();
          setShowForgotPin(false);
          toast.success("লগইন সফল");
          navigate({ to: "/app/dashboard", replace: true });
        } else {
          const r = await callFn("customer-login-with-pin", { phone: ph, pin });
          if (!r.ok) {
            if (r.error === "wrong_pin") {
              setShowForgotPin(true);
              return toast.error("ভুল PIN");
            }
            if (r.error === "no_account") {
              setShowForgotPin(false);
              return toast.error("এই নম্বরে গ্রাহক account নেই — সাইনআপ করুন");
            }
            if (r.error === "no_pin_set") {
              setShowForgotPin(true);
              return toast.error("PIN সেট নেই — WhatsApp এ সাহায্য নিন");
            }
            return toast.error(r.error || "লগইন ব্যর্থ");
          }
          await setSession(r.access_token, r.refresh_token);
          await ensureProfile();
          setShowForgotPin(false);
          toast.success("লগইন সফল");
          if (search.redirect && search.redirect.startsWith("/")) {
            navigate({ to: search.redirect, replace: true });
          } else {
            navigate({ to: "/customer/dashboard", replace: true });
          }
        }
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const waUrl = () => {
    const ph = normalizePhone(phone, country);
    const text = encodeURIComponent(
      `আসসালামু আলাইকুম, আমার Tally Plus account এর PIN ভুলে গেছি।\nPhone: ${ph}\nদয়া করে PIN reset/সাহায্য করুন।`,
    );
    return `https://wa.me/${adminPhone}?text=${text}`;
  };

  const phoneIsValid = normalizePhone(phone, country).length >= 8;
  const canShowForgotPin = mode === "login" && showForgotPin && phoneIsValid;

  if (postSignup === "owner") {
    return (
      <div className="w-full max-w-sm space-y-5 rounded-2xl border bg-card p-6 shadow-xl">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-xl font-bold">Account তৈরি হয়েছে! 🎉</h2>
          <p className="text-sm text-muted-foreground">
            আপনার দোকানের জন্য কিছু sample product import করব?
          </p>
        </div>
        <div className="space-y-2">
          <Button
            className="h-12 w-full text-base font-semibold"
            onClick={() => {
              try {
                localStorage.setItem("pending_sample_import", "1");
              } catch {
                /* ignore */
              }
              navigate({ to: "/app/dashboard", replace: true });
            }}
          >
            হ্যাঁ, import করুন
          </Button>
          <Button
            variant="outline"
            className="h-12 w-full text-base"
            onClick={() => navigate({ to: "/app/dashboard", replace: true })}
          >
            না, আমি নিজে যোগ করব
          </Button>
        </div>
      </div>
    );
  }

  return (
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
              <TabsTrigger value="owner">ব্যবসায়িক হিসাব</TabsTrigger>
              <TabsTrigger value="customer">ব্যক্তিগত হিসাব</TabsTrigger>
            </TabsList>
          </Tabs>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="মোবাইল নম্বর"
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
          {canShowForgotPin && (
            <div className="space-y-1.5">
              <p className="text-center text-[11px] text-muted-foreground">
                PIN মনে নেই? নিচের button থেকে WhatsApp এ admin কে জানান।
              </p>
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
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <Tabs value={role} onValueChange={(v) => setRole(v as Role)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="owner">ব্যবসায়িক হিসাব</TabsTrigger>
              <TabsTrigger value="customer">ব্যক্তিগত হিসাব</TabsTrigger>
            </TabsList>
          </Tabs>

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
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="মোবাইল নম্বর"
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
    </div>
  );
}