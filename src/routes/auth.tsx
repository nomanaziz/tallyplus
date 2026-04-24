import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "লগইন — Tally Plus" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { t, lang, setLang } = useI18n();
  const { user, refresh } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);

  useEffect(() => {
    if (user) nav({ to: "/app" });
  }, [user, nav]);

  const sendOtp = async () => {
    if (!/^\+?\d{10,15}$/.test(phone.replace(/\s|-/g, ""))) {
      toast.error(lang === "bn" ? "সঠিক মোবাইল নাম্বার দিন" : "Enter a valid mobile number");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-otp", { body: { phone } });
      if (error) throw error;
      setDevOtp(data?.devOtp ?? "123456");
      setStep("otp");
      toast.success(lang === "bn" ? "OTP পাঠানো হয়েছে" : "OTP sent");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async () => {
    if (!/^\d{6}$/.test(otp)) {
      toast.error(lang === "bn" ? "৬ সংখ্যার OTP দিন" : "Enter 6-digit OTP");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-otp", { body: { phone, otp } });
      if (error) throw error;
      const { error: setErr } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
      if (setErr) throw setErr;
      await refresh();
      toast.success(t("welcome"));
      nav({ to: "/app" });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-primary/30 via-primary/10 to-background">
      <div className="container mx-auto flex items-center justify-between px-4 py-4">
        <a href="/" className="flex items-center gap-2"><img src={logo} alt="" className="h-8 w-8" /><span className="font-extrabold">{t("appName")}</span></a>
        <button onClick={() => setLang(lang === "bn" ? "en" : "bn")} className="rounded-md border bg-background px-2 py-1 text-xs font-semibold">{lang === "bn" ? "EN" : "বাং"}</button>
      </div>
      <div className="flex flex-1 items-center justify-center px-4 pb-12">
        <div className="w-full max-w-sm rounded-3xl border bg-card p-6 shadow-xl">
          <h1 className="text-2xl font-bold">{step === "phone" ? t("login") : t("verify")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {step === "phone"
              ? (lang === "bn" ? "আপনার মোবাইল নাম্বার দিয়ে শুরু করুন" : "Start with your mobile number")
              : `${lang === "bn" ? "OTP পাঠানো হয়েছে" : "OTP sent to"} ${phone}`}
          </p>
          {step === "phone" ? (
            <div className="mt-6 space-y-3">
              <Label htmlFor="phone">{t("phone")}</Label>
              <Input id="phone" inputMode="tel" placeholder="01XXXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-12 text-base" />
              <Button onClick={sendOtp} disabled={busy} className="h-12 w-full text-base font-semibold">{busy ? "..." : t("sendOtp")}</Button>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              <Label htmlFor="otp">{t("enterOtp")}</Label>
              <Input id="otp" inputMode="numeric" maxLength={6} placeholder="● ● ● ● ● ●" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} className="h-12 text-center text-2xl tracking-[0.5em]" />
              {devOtp && (
                <p className="rounded-md bg-warning/10 p-2 text-xs text-foreground">
                  {t("devOtpHint")} — <span className="font-mono font-bold">{devOtp}</span>
                </p>
              )}
              <Button onClick={verifyOtp} disabled={busy} className="h-12 w-full text-base font-semibold">{busy ? "..." : t("verify")}</Button>
              <button onClick={() => setStep("phone")} className="w-full text-sm text-muted-foreground hover:text-foreground">{lang === "bn" ? "নাম্বার বদলান" : "Change number"}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}