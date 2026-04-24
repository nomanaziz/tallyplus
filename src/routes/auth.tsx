import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useShop } from "@/lib/shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "লগইন — Tally Plus" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { t, lang, setLang } = useI18n();
  const { user, refresh } = useAuth();
  const { refresh: refreshShops } = useShop();
  const nav = useNavigate();
  const [tab, setTab] = useState<"signup" | "login">("signup");

  // signup state
  const [name, setName] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [shopName, setShopName] = useState("");
  const [signupPin, setSignupPin] = useState("");

  // login state
  const [loginPhone, setLoginPhone] = useState("");
  const [loginPin, setLoginPin] = useState("");

  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) nav({ to: "/app/dashboard" });
  }, [user, nav]);

  const validPhone = (p: string) => /^01\d{9}$/.test(p.replace(/\D/g, ""));

  const finishLogin = async (data: { access_token: string; refresh_token: string }) => {
    const { error } = await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });
    if (error) throw error;
    // Navigate immediately; refresh providers in background.
    nav({ to: "/app/dashboard" });
    void Promise.all([refresh(), refreshShops()]).catch(() => {});
  };

  const handleSignup = async () => {
    if (name.trim().length < 2) return toast.error(lang === "bn" ? "নাম দিন" : "Enter your name");
    if (!validPhone(signupPhone)) return toast.error(lang === "bn" ? "১১ সংখ্যার ফোন নাম্বার দিন (01...)" : "Enter 11-digit phone (01...)");
    if (shopName.trim().length < 2) return toast.error(lang === "bn" ? "দোকানের নাম দিন" : "Enter shop name");
    if (!/^\d{4}$/.test(signupPin)) return toast.error(lang === "bn" ? "৪ সংখ্যার PIN দিন" : "Enter 4-digit PIN");

    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("signup-with-pin", {
        body: { phone: signupPhone, full_name: name, shop_name: shopName, pin: signupPin },
      });
      if (error) {
        // Surface phone_exists to user
        const msg = (error as { context?: { error?: string } })?.context?.error ?? error.message;
        if (msg === "phone_exists" || /phone_exists/.test(msg)) {
          toast.error(lang === "bn" ? "এই নাম্বারে আগে একাউন্ট আছে — লগইন করুন" : "Account already exists — please log in");
          setTab("login");
          setLoginPhone(signupPhone);
          return;
        }
        throw new Error(msg);
      }
      if (data?.error === "phone_exists") {
        toast.error(lang === "bn" ? "এই নাম্বারে আগে একাউন্ট আছে — লগইন করুন" : "Account already exists — please log in");
        setTab("login");
        setLoginPhone(signupPhone);
        return;
      }
      await finishLogin(data);
      toast.success(lang === "bn" ? "স্বাগতম!" : "Welcome!");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleLogin = async () => {
    if (!validPhone(loginPhone)) return toast.error(lang === "bn" ? "১১ সংখ্যার ফোন নাম্বার দিন" : "Enter 11-digit phone");
    if (!/^\d{4}$/.test(loginPin)) return toast.error(lang === "bn" ? "৪ সংখ্যার PIN দিন" : "Enter 4-digit PIN");
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("login-with-pin", {
        body: { phone: loginPhone, pin: loginPin },
      });
      const errMsg = (error as { context?: { error?: string } } | null)?.context?.error ?? data?.error ?? error?.message;
      if (errMsg === "no_account") return toast.error(lang === "bn" ? "এই নাম্বারে কোনো একাউন্ট নেই — সাইন আপ করুন" : "No account — please sign up");
      if (errMsg === "wrong_pin") return toast.error(lang === "bn" ? "ভুল PIN" : "Wrong PIN");
      if (errMsg) throw new Error(errMsg);
      await finishLogin(data);
      toast.success(lang === "bn" ? "স্বাগতম!" : "Welcome back!");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
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
          <Tabs value={tab} onValueChange={(v) => setTab(v as "signup" | "login")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signup">{lang === "bn" ? "নতুন একাউন্ট" : "Sign Up"}</TabsTrigger>
              <TabsTrigger value="login">{lang === "bn" ? "লগইন" : "Log In"}</TabsTrigger>
            </TabsList>

            <TabsContent value="signup" className="mt-6 space-y-4">
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
                {busy ? "..." : lang === "bn" ? "একাউন্ট তৈরি করুন" : "Create account"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                {lang === "bn" ? "একাউন্ট তৈরি করলে আপনি সরাসরি লগইন হয়ে যাবেন।" : "Creating an account will log you in instantly."}
              </p>
            </TabsContent>

            <TabsContent value="login" className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="li-phone">{lang === "bn" ? "ফোন নাম্বার" : "Phone number"}</Label>
                <Input id="li-phone" inputMode="tel" maxLength={11} value={loginPhone} onChange={(e) => setLoginPhone(e.target.value.replace(/\D/g, ""))} className="h-12 text-base" placeholder="01XXXXXXXXX" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="li-pin">{lang === "bn" ? "৪ সংখ্যার PIN" : "4-digit PIN"}</Label>
                <Input id="li-pin" type="password" inputMode="numeric" maxLength={4} value={loginPin} onChange={(e) => setLoginPin(e.target.value.replace(/\D/g, ""))} className="h-12 text-center text-2xl tracking-[0.6em]" placeholder="● ● ● ●" />
              </div>
              <Button onClick={handleLogin} disabled={busy} className="h-12 w-full text-base font-bold">
                {busy ? "..." : lang === "bn" ? "লগইন করুন" : "Log in"}
              </Button>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}