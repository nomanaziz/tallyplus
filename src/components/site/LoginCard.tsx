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
import { detectCountryFromPhone, normalizePhoneSimple } from "@/lib/countries";
import { BrandWordmark } from "@/components/brand/BrandWordmark";
import { useI18n } from "@/lib/i18n";

type Mode = "login" | "signup";
type Role = "owner" | "customer";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const ADMIN_WA = "8801XXXXXXXXX";

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

export function LoginCard() {
  const { t, lang } = useI18n();
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
  const [adminPhone, setAdminPhone] = useState(ADMIN_WA);
  const [postSignup, setPostSignup] = useState<null | "owner">(null);
  const [showForgotPin, setShowForgotPin] = useState(false);

  useEffect(() => { setShowForgotPin(false); }, [phone, pin, mode, role]);

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
        const row = data as { support_phone: string | null; password_reset_whatsapp: string | null } | null;
        const p = row?.password_reset_whatsapp || row?.support_phone;
        if (p) setAdminPhone(p.replace(/\D/g, ""));
      });
  }, []);

  const validate = (): string | null => {
    const ph = normalizePhoneSimple(phone);
    if (!ph || ph.replace(/\D/g, "").length < 8) return "সঠিক মোবাইল নম্বর দিন";
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
      const ph = normalizePhoneSimple(phone);
      const country = detectCountryFromPhone(phone) ?? null;
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
            if (r.error === "rate_limit") return toast.error("একটু পরে আবার চেষ্টা করুন");
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
            if (r.error === "rate_limit") return toast.error("একটু পরে আবার চেষ্টা করুন");
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
              navigate({ to: "/xbd-login" }); return;
            }
            if (r.error === "employee_must_use_email") return toast.error("Employee হিসেবে email + password দিয়ে login করুন");
            if (r.error === "wrong_pin") { setShowForgotPin(true); return toast.error("ভুল PIN"); }
            if (r.error === "no_account") { setShowForgotPin(false); return toast.error("এই নম্বরে দোকানদার account নেই — সাইনআপ করুন"); }
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
            if (r.error === "wrong_pin") { setShowForgotPin(true); return toast.error("ভুল PIN"); }
            if (r.error === "no_account") { setShowForgotPin(false); return toast.error("এই নম্বরে গ্রাহক account নেই — সাইনআপ করুন"); }
            if (r.error === "no_pin_set") { setShowForgotPin(true); return toast.error("PIN সেট নেই — WhatsApp এ সাহায্য নিন"); }
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
    const ph = normalizePhoneSimple(phone);
    const text = encodeURIComponent(
      `আসসালামু আলাইকুম, আমার Tally Plus account এর PIN ভুলে গেছি।\nPhone: ${ph}\nদয়া করে PIN reset/সাহায্য করুন।`,
    );
    return `https://wa.me/${adminPhone}?text=${text}`;
  };

  const phoneIsValid = normalizePhoneSimple(phone).replace(/\D/g, "").length >= 8;
  const canShowForgotPin = mode === "login" && showForgotPin && phoneIsValid;

  if (postSignup === "owner") {
    return (
      <div className="w-full max-w-sm space-y-5 rounded-2xl border bg-card p-6 shadow-xl">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-xl font-bold">{t("lc_successTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("lc_sampleQ")}</p>
        </div>
        <div className="space-y-2">
          <Button className="h-12 w-full text-base font-semibold" onClick={() => {
            try { localStorage.setItem("pending_sample_import", "1"); } catch { /* ignore */ }
            navigate({ to: "/app/dashboard", replace: true });
          }}>{t("lc_yesImport")}</Button>
          <Button variant="outline" className="h-12 w-full text-base" onClick={() => navigate({ to: "/app/dashboard", replace: true })}>
            {t("lc_noManual")}
          </Button>
        </div>
      </div>
    );
  }

  const PhoneField = (
    <Input
      value={phone}
      onChange={(e) => setPhone(e.target.value)}
      onKeyDown={(e) => { if (e.key === "Enter" && !loading) { e.preventDefault(); void handleSubmit(); } }}
      placeholder={t("lc_phonePh")}
      inputMode="tel"
    />
  );

  return (
    <div className="w-full max-w-sm space-y-5 rounded-2xl border bg-card p-6 shadow-sm">
      <div className="text-center">
        <BrandWordmark className="text-2xl font-bold block" />
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "login" ? t("lc_loginTitle") : t("lc_signupTitle")}
        </p>
      </div>

      {mode === "login" ? (
        <div className="space-y-3">
          <Tabs value={role} onValueChange={(v) => setRole(v as Role)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="owner">{t("lc_tabOwner")}</TabsTrigger>
              <TabsTrigger value="customer">{t("lc_tabCustomer")}</TabsTrigger>
            </TabsList>
          </Tabs>
          {PhoneField}
          <Input
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            onKeyDown={(e) => { if (e.key === "Enter" && !loading) { e.preventDefault(); void handleSubmit(); } }}
            placeholder={t("lc_pinPh")}
            inputMode="numeric"
            maxLength={4}
            type="password"
          />
          <Button onClick={handleSubmit} disabled={loading} className="w-full">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("lc_loginBtn")}
          </Button>
          <button type="button" onClick={() => setMode("signup")} className="w-full text-center text-sm text-primary hover:underline">
            {t("lc_createLink")}
          </button>
          {canShowForgotPin && (
            <div className="space-y-1.5">
              <p className="text-center text-[11px] text-muted-foreground">{t("lc_forgotHint")}</p>
              <a href={waUrl()} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-md border border-green-600/30 bg-green-50 px-3 py-2 text-xs text-green-700 hover:bg-green-100 dark:bg-green-950/30 dark:text-green-400">
                <MessageCircle className="h-3.5 w-3.5" />
                {t("lc_forgotBtn")}
              </a>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <Tabs value={role} onValueChange={(v) => setRole(v as Role)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="owner">{t("lc_tabOwner")}</TabsTrigger>
              <TabsTrigger value="customer">{t("lc_tabCustomer")}</TabsTrigger>
            </TabsList>
          </Tabs>

          <Input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !loading) { e.preventDefault(); void handleSubmit(); } }} placeholder={t("lc_namePh")} />
          {role === "owner" && (
            <Input value={shopName} onChange={(e) => setShopName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !loading) { e.preventDefault(); void handleSubmit(); } }} placeholder={t("lc_shopNamePh")} />
          )}
          {PhoneField}
          <Input
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            onKeyDown={(e) => { if (e.key === "Enter" && !loading) { e.preventDefault(); void handleSubmit(); } }}
            placeholder={t("lc_pinPh")}
            inputMode="numeric"
            maxLength={4}
            type="password"
          />
          {role === "owner" && (
            <ShopTypePicker value={shopTypeCode} onChange={(code) => setShopTypeCode(code)} lang={lang === "bn" ? "bn" : "en"} label={t("lc_shopTypeLbl")} />
          )}
          <Button onClick={handleSubmit} disabled={loading} className="w-full">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("lc_createBtn")}
          </Button>
          <button type="button" onClick={() => setMode("login")} className="w-full text-center text-sm text-primary hover:underline">
            {t("lc_backToLogin")}
          </button>
        </div>
      )}
    </div>
  );
}
