import { useState, useEffect } from "react";
import { Link, useNavigate } from "@/lib/router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function AuthPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session?.user) navigate({ to: "/app/dashboard", replace: true });
  }, [session, navigate]);

  const sendOtp = async () => {
    if (!phone.trim()) return toast.error("ফোন নম্বর দিন");
    setLoading(true);
    const fullPhone = phone.startsWith("+") ? phone : `+88${phone}`;
    const { error } = await supabase.auth.signInWithOtp({
      phone: fullPhone,
      options: { data: { full_name: name, account_type: "owner" } },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("OTP পাঠানো হয়েছে");
    setStep("otp");
  };

  const verifyOtp = async () => {
    setLoading(true);
    const fullPhone = phone.startsWith("+") ? phone : `+88${phone}`;
    const { error } = await supabase.auth.verifyOtp({
      phone: fullPhone,
      token: otp,
      type: "sms",
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("লগইন সফল");
    navigate({ to: "/app/dashboard", replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border bg-card p-6 shadow-sm">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Tally Plus</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {step === "phone" ? "ফোন নম্বর দিয়ে শুরু করুন" : "OTP লিখুন"}
          </p>
        </div>

        {step === "phone" ? (
          <div className="space-y-4">
            <div>
              <Label>আপনার নাম</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="আপনার নাম" />
            </div>
            <div>
              <Label>ফোন নম্বর</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01XXXXXXXXX"
                inputMode="tel"
              />
            </div>
            <Button onClick={sendOtp} disabled={loading} className="w-full">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              OTP পাঠান
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label>OTP কোড</Label>
              <Input
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="6-digit code"
                inputMode="numeric"
              />
            </div>
            <Button onClick={verifyOtp} disabled={loading} className="w-full">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              লগইন করুন
            </Button>
            <Button variant="ghost" onClick={() => setStep("phone")} className="w-full">
              ফিরে যান
            </Button>
          </div>
        )}

        <div className="text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:underline">হোমে ফিরুন</Link>
        </div>
      </div>
    </div>
  );
}
