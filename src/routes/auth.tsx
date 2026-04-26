import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useShop } from "@/lib/shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "লগইন — Tally Plus" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { t, lang, setLang } = useI18n();
  const { user, refresh } = useAuth();
  const { refresh: refreshShops } = useShop();
  const nav = useNavigate();
  const [mode, setMode] = useState<"signup" | "login">("login");

  // signup state
  const [name, setName] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [shopName, setShopName] = useState("");
  const [signupPin, setSignupPin] = useState("");

  // login state — uncontrolled refs so a transient re-render does not blank inputs
  const loginPhoneRef = useRef<HTMLInputElement>(null);
  const loginPinRef = useRef<HTMLInputElement>(null);

  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<string>("");

  useEffect(() => {
    if (user) nav({ to: "/app/dashboard" });
  }, [user, nav]);

  // Prefill phone (and switch to login mode) when arriving via shared link e.g. /auth?phone=01...
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const p = params.get("phone");
    if (p && loginPhoneRef.current) {
      loginPhoneRef.current.value = p.replace(/\D/g, "").slice(0, 11);
      setMode("login");
    }
  }, []);

  const validPhone = (p: string) => /^01\d{9}$/.test(p.replace(/\D/g, ""));

  const finishLogin = async (data: { access_token: string; refresh_token: string }) => {
    const t0 = performance.now();
    setStage(lang === "bn" ? "সেশন তৈরি হচ্ছে..." : "Creating session...");
    const { data: sessionData, error } = await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });
    if (error) throw error;
    if (!sessionData?.session?.user) throw new Error("Session not established");
    void Promise.all([refresh(), refreshShops()]).catch(() => {});
    if (typeof console !== "undefined") {
      console.log(`[login] setSession ok in ${Math.round(performance.now() - t0)}ms`);
    }
    setStage(lang === "bn" ? "ড্যাশবোর্ডে যাচ্ছি..." : "Opening dashboard...");
    nav({ to: "/app/dashboard" });
  };

  const handleSignup = async () => {
    if (name.trim().length < 2) return toast.error(lang === "bn" ? "নাম দিন" : "Enter your name");
    if (!validPhone(signupPhone)) return toast.error(lang === "bn" ? "১১ সংখ্যার ফোন নাম্বার দিন (01...)" : "Enter 11-digit phone (01...)");
    if (shopName.trim().length < 2) return toast.error(lang === "bn" ? "দোকানের নাম দিন" : "Enter shop name");
    if (!/^\d{4}$/.test(signupPin)) return toast.error(lang === "bn" ? "৪ সংখ্যার PIN দিন" : "Enter 4-digit PIN");

    setBusy(true);
    setStage(lang === "bn" ? "একাউন্ট তৈরি হচ্ছে..." : "Creating account...");
    try {
      const { data, error } = await supabase.functions.invoke("signup-with-pin", {
        body: { phone: signupPhone, full_name: name, shop_name: shopName, pin: signupPin },
      });
      if (error) {
        const msg = (error as { context?: { error?: string } })?.context?.error ?? error.message;
        if (msg === "phone_exists" || /phone_exists/.test(msg)) {
          toast.error(lang === "bn" ? "এই নাম্বারে আগে একাউন্ট আছে — লগইন করুন" : "Account already exists — please log in");
          setMode("login");
          if (loginPhoneRef.current) loginPhoneRef.current.value = signupPhone;
          return;
        }
        throw new Error(msg);
      }
      if (data?.error === "phone_exists") {
        toast.error(lang === "bn" ? "এই নাম্বারে আগে একাউন্ট আছে — লগইন করুন" : "Account already exists — please log in");
        setMode("login");
        if (loginPhoneRef.current) loginPhoneRef.current.value = signupPhone;
        return;
      }
      await finishLogin(data);
      toast.success(lang === "bn" ? "স্বাগতম!" : "Welcome!");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      setStage("");
    }
  };

  const handleLogin = async () => {
    const loginPhone = (loginPhoneRef.current?.value ?? "").replace(/\D/g, "");
    const loginPin = (loginPinRef.current?.value ?? "").replace(/\D/g, "");
    if (!validPhone(loginPhone)) return toast.error(lang === "bn" ? "১১ সংখ্যার ফোন নাম্বার দিন" : "Enter 11-digit phone");
    if (!/^\d{4}$/.test(loginPin)) return toast.error(lang === "bn" ? "৪ সংখ্যার PIN দিন" : "Enter 4-digit PIN");
    setBusy(true);
    setStage(lang === "bn" ? "যাচাই হচ্ছে..." : "Verifying...");
    try {
      // Fast path: direct password sign-in. PIN/phone map deterministically to
      // the synthetic email/password created by signup-with-pin. No edge cold
      // start, no bcrypt round-trip — typically ~300-500 ms vs 2-4s.
      const digits = loginPhone.startsWith("0") && loginPhone.length === 11
        ? "880" + loginPhone.slice(1)
        : loginPhone;
      const email = `${digits}@tally.local`;
      const password = `tp_${digits}_pw`;
      const t0 = performance.now();
      const direct = await supabase.auth.signInWithPassword({ email, password });
      if (typeof console !== "undefined") {
        console.log(`[login] direct signIn ${direct.error ? "failed" : "ok"} in ${Math.round(performance.now() - t0)}ms`);
      }
      if (direct.data?.session) {
        void Promise.all([refresh(), refreshShops()]).catch(() => {});
        setStage(lang === "bn" ? "ড্যাশবোর্ডে যাচ্ছি..." : "Opening dashboard...");
        nav({ to: "/app/dashboard" });
        toast.success(lang === "bn" ? "স্বাগতম!" : "Welcome back!");
        return;
      }
      // Slow path: PIN was set via edge function only (legacy) or wrong PIN.
      // Fall back to the verified PIN flow which returns a fresh session.
      setStage(lang === "bn" ? "PIN যাচাই হচ্ছে..." : "Checking PIN...");
      const { data, error } = await supabase.functions.invoke("login-with-pin", {
        body: { phone: loginPhone, pin: loginPin },
      });
      const errMsg = (error as { context?: { error?: string } } | null)?.context?.error ?? data?.error ?? error?.message;
      if (errMsg === "no_account") return toast.error(lang === "bn" ? "এই নাম্বারে কোনো একাউন্ট নেই — সাইন আপ করুন" : "No account — please sign up");
      if (errMsg === "wrong_pin") return toast.error(lang === "bn" ? "ভুল PIN" : "Wrong PIN");
      if (errMsg === "no_pin") return toast.error(lang === "bn" ? "এই একাউন্টে এখনো PIN সেট করা হয়নি" : "This account does not have a PIN yet");
      if (errMsg) throw new Error(errMsg);
      await finishLogin(data);
      toast.success(lang === "bn" ? "স্বাগতম!" : "Welcome back!");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      setStage("");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-primary/30 via-primary/10 to-background">
      <header className="sticky top-0 z-40 w-full border-b bg-background/85 backdrop-blur">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="" className="h-8 w-8" />
            <span className="font-extrabold">{t("appName")}</span>
          </Link>
          <nav className="hidden items-center gap-5 text-sm font-medium md:flex">
            <Link to="/" className="hover:text-primary">{t("home")}</Link>
            <a href="/#features" className="hover:text-primary">{t("features")}</a>
            <a href="/#pricing" className="hover:text-primary">{t("pricing")}</a>
            <a href="/#contact" className="hover:text-primary">{t("contact")}</a>
          </nav>
          <button onClick={() => setLang(lang === "bn" ? "en" : "bn")} className="rounded-md border bg-background px-2 py-1 text-xs font-semibold">
            {lang === "bn" ? "EN" : "বাং"}
          </button>
        </div>
      </header>
      <div className="flex flex-1 items-center justify-center px-4 pb-12">
        <div className="w-full max-w-md rounded-3xl border bg-card p-6 shadow-xl">
          <div className="space-y-6">
            <div className="space-y-1 text-center">
              <h1 className="text-2xl font-bold text-foreground">
                {mode === "login"
                  ? lang === "bn"
                    ? "লগইন করুন"
                    : "Log in"
                  : lang === "bn"
                    ? "নতুন একাউন্ট তৈরি করুন"
                    : "Create account"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {mode === "login"
                  ? lang === "bn"
                    ? "ফোন নাম্বার আর PIN দিয়ে ঢুকুন"
                    : "Sign in with your phone number and PIN"
                  : lang === "bn"
                    ? "নতুন দোকানের জন্য একাউন্ট খুলুন"
                    : "Create a new account for your shop"}
              </p>
            </div>

            {mode === "signup" ? (
              <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="su-name">{lang === "bn" ? "আপনার নাম" : "Your name"}</Label>
                <Input id="su-name" value={name} onChange={(e) => setName(e.target.value)} className="h-12 text-base" placeholder={lang === "bn" ? "যেমন: রহিম উদ্দিন" : "e.g. Rahim Uddin"} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="su-phone">{lang === "bn" ? "ফোন নাম্বার" : "Phone number"}</Label>
                <Input id="su-phone" inputMode="tel" maxLength={11} value={signupPhone} onChange={(e) => setSignupPhone(e.target.value.replace(/\D/g, ""))} className="h-12 text-base" placeholder="01XXXXXXXXX" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="su-shop">{lang === "bn" ? "দোকানের নাম" : "Shop name"}</Label>
                <Input id="su-shop" value={shopName} onChange={(e) => setShopName(e.target.value)} className="h-12 text-base" placeholder={lang === "bn" ? "যেমন: আল্লাহর দান স্টোর" : "e.g. My Shop"} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="su-pin">{lang === "bn" ? "৪ সংখ্যার PIN" : "4-digit PIN"}</Label>
                <Input id="su-pin" type="password" inputMode="numeric" maxLength={4} value={signupPin} onChange={(e) => setSignupPin(e.target.value.replace(/\D/g, ""))} className="h-12 text-center text-2xl tracking-[0.6em]" placeholder="● ● ● ●" />
              </div>
              <Button onClick={handleSignup} disabled={busy} className="h-12 w-full text-base font-bold">
                {busy ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {lang === "bn" ? "তৈরি হচ্ছে..." : "Creating..."}
                  </span>
                ) : (
                  lang === "bn" ? "একাউন্ট তৈরি করুন" : "Create account"
                )}
              </Button>
              {busy && stage && (
                <p className="text-center text-xs font-medium text-primary">{stage}</p>
              )}
              <p className="text-center text-xs text-muted-foreground">
                {lang === "bn" ? "একাউন্ট তৈরি করলে আপনি সরাসরি লগইন হয়ে যাবেন।" : "Creating an account will log you in instantly."}
              </p>
              <button
                type="button"
                onClick={() => setMode("login")}
                className="w-full text-center text-sm font-medium text-primary"
              >
                {lang === "bn" ? "আগের একাউন্টে লগইন করুন" : "Back to login"}
              </button>
            </div>
            ) : (
              <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="li-phone">{lang === "bn" ? "ফোন নাম্বার" : "Phone number"}</Label>
                <Input
                  id="li-phone"
                  ref={loginPhoneRef}
                  inputMode="tel"
                  maxLength={11}
                  defaultValue=""
                  onInput={(e) => {
                    const el = e.currentTarget;
                    el.value = el.value.replace(/\D/g, "").slice(0, 11);
                  }}
                  className="h-12 text-base"
                  placeholder="01XXXXXXXXX"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="li-pin">{lang === "bn" ? "৪ সংখ্যার PIN" : "4-digit PIN"}</Label>
                <Input
                  id="li-pin"
                  ref={loginPinRef}
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  defaultValue=""
                  onInput={(e) => {
                    const el = e.currentTarget;
                    el.value = el.value.replace(/\D/g, "").slice(0, 4);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !busy) void handleLogin();
                  }}
                  className="h-12 text-center text-2xl tracking-[0.6em]"
                  placeholder="● ● ● ●"
                />
              </div>
              <Button onClick={handleLogin} disabled={busy} className="h-12 w-full text-base font-bold">
                {busy ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {lang === "bn" ? "লগইন হচ্ছে..." : "Logging in..."}
                  </span>
                ) : (
                  lang === "bn" ? "লগইন করুন" : "Log in"
                )}
              </Button>
              {busy && (
                <p className="text-center text-xs font-medium text-primary">
                  {stage || (lang === "bn" ? "অপেক্ষা করুন..." : "Please wait...")}
                </p>
              )}
              <button
                type="button"
                onClick={() => setMode("signup")}
                className="w-full text-center text-sm font-medium text-primary"
              >
                {lang === "bn" ? "নতুন একাউন্ট তৈরি করুন" : "Create a new account"}
              </button>
            </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
