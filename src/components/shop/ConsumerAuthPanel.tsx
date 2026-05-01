import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function ConsumerAuthPanel({ onAuthed }: { onAuthed: () => void }) {
  const [loading, setLoading] = useState(false);

  // Login state
  const [loginPhone, setLoginPhone] = useState("");
  const [loginPin, setLoginPin] = useState("");

  // Register state
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPin, setRegPin] = useState("");

  const setSession = async (access_token: string, refresh_token: string) => {
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) throw error;
  };

  const onLogin = async () => {
    if (!loginPhone || !/^\d{4}$/.test(loginPin)) {
      toast.error("ফোন এবং ৪-সংখ্যার PIN দিন");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("customer-login-with-pin", {
      body: { phone: loginPhone, pin: loginPin },
    });
    setLoading(false);
    if (error || !data || (data as { error?: string }).error) {
      const errCode = (data as { error?: string })?.error ?? error?.message;
      const msg = errCode === "no_account" ? "এই নম্বরে account নেই — Register tab ব্যবহার করুন"
        : errCode === "wrong_pin" ? "ভুল PIN"
        : errCode === "no_pin_set" ? "PIN set করা নেই"
        : "Login failed";
      toast.error(msg);
      return;
    }
    const d = data as { access_token: string; refresh_token: string };
    try {
      await setSession(d.access_token, d.refresh_token);
      toast.success("Login successful");
      onAuthed();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const onRegister = async () => {
    if (regName.trim().length < 2 || !regPhone || !/^\d{4}$/.test(regPin)) {
      toast.error("নাম, ফোন ও ৪-সংখ্যার PIN দিন");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("customer-signup-with-pin", {
      body: { full_name: regName, phone: regPhone, pin: regPin },
    });
    setLoading(false);
    if (error || !data || (data as { error?: string }).error) {
      const errCode = (data as { error?: string })?.error ?? error?.message;
      const msg = errCode === "phone_exists" ? "এই নম্বরে account রয়েছে — Login করুন"
        : "Registration failed";
      toast.error(msg);
      return;
    }
    const d = data as { access_token: string; refresh_token: string };
    try {
      await setSession(d.access_token, d.refresh_token);
      toast.success("Account তৈরি হয়েছে");
      onAuthed();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="rounded-xl border bg-card p-4">
      <h3 className="mb-3 text-base font-semibold">Order করতে Login করুন</h3>
      <Tabs defaultValue="login">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">Login</TabsTrigger>
          <TabsTrigger value="register">Register</TabsTrigger>
        </TabsList>
        <TabsContent value="login" className="space-y-3 pt-3">
          <div>
            <Label>ফোন নম্বর</Label>
            <Input value={loginPhone} onChange={(e) => setLoginPhone(e.target.value)} placeholder="01XXXXXXXXX" inputMode="tel" />
          </div>
          <div>
            <Label>৪-সংখ্যার PIN</Label>
            <Input value={loginPin} onChange={(e) => setLoginPin(e.target.value.replace(/\D/g, "").slice(0, 4))} type="password" inputMode="numeric" maxLength={4} />
          </div>
          <Button onClick={onLogin} disabled={loading} className="w-full">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Login
          </Button>
        </TabsContent>
        <TabsContent value="register" className="space-y-3 pt-3">
          <div>
            <Label>নাম</Label>
            <Input value={regName} onChange={(e) => setRegName(e.target.value)} placeholder="আপনার নাম" />
          </div>
          <div>
            <Label>ফোন নম্বর</Label>
            <Input value={regPhone} onChange={(e) => setRegPhone(e.target.value)} placeholder="01XXXXXXXXX" inputMode="tel" />
          </div>
          <div>
            <Label>৪-সংখ্যার PIN তৈরি করুন</Label>
            <Input value={regPin} onChange={(e) => setRegPin(e.target.value.replace(/\D/g, "").slice(0, 4))} type="password" inputMode="numeric" maxLength={4} />
          </div>
          <Button onClick={onRegister} disabled={loading} className="w-full">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Register & Continue
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}