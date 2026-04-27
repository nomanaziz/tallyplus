import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

type State = "loading" | "success" | "pending" | "failed";

export default function SubscribeCallback() {
  const { lang } = useI18n();
  const [params] = useSearchParams();
  const [state, setState] = useState<State>("loading");
  const [msg, setMsg] = useState<string>("");

  const status = params.get("status");
  const transactionId = params.get("transactionId");
  const localId = params.get("local_id");
  const paidAmount = params.get("paymentAmount");

  useEffect(() => {
    void (async () => {
      if (status === "cancel" || status === "failed") {
        setState("failed");
        setMsg(lang === "bn" ? "পেমেন্ট বাতিল হয়েছে" : "Payment was cancelled");
        return;
      }
      if (!transactionId) {
        setState("failed");
        setMsg(lang === "bn" ? "Transaction ID পাওয়া যায়নি" : "Transaction ID missing");
        return;
      }
      const { data, error } = await supabase.functions.invoke("recharge-verify-payment", {
        body: { transaction_id: transactionId, local_id: localId },
      });
      if (error) {
        setState("failed");
        setMsg(error.message);
        return;
      }
      if (data?.paid) {
        setState("success");
        setMsg(lang === "bn" ? "সাবস্ক্রিপশন সক্রিয় হয়েছে!" : "Subscription activated!");
      } else if (data?.status === "pending") {
        setState("pending");
        setMsg(lang === "bn" ? "পেমেন্ট প্রক্রিয়াধীন" : "Payment is being processed");
      } else {
        setState("failed");
        setMsg(lang === "bn" ? "পেমেন্ট সফল হয়নি" : "Payment was not successful");
      }
    })();
  }, [transactionId, status, localId, lang]);

  return (
    <div className="container mx-auto max-w-md px-4 py-10">
      <div className="rounded-2xl border bg-card p-8 text-center shadow-sm">
        {state === "loading" && (
          <>
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            <h1 className="mt-4 text-xl font-bold">
              {lang === "bn" ? "পেমেন্ট যাচাই হচ্ছে..." : "Verifying payment..."}
            </h1>
          </>
        )}
        {state === "success" && (
          <>
            <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
            <h1 className="mt-3 text-xl font-extrabold">{msg}</h1>
            {paidAmount && (
              <p className="mt-1 text-sm text-muted-foreground">
                ৳{paidAmount} {lang === "bn" ? "পরিশোধিত" : "paid"}
              </p>
            )}
            <Button asChild className="mt-6 w-full">
              <Link to="/app/dashboard">{lang === "bn" ? "ড্যাশবোর্ডে যান" : "Go to Dashboard"}</Link>
            </Button>
          </>
        )}
        {state === "pending" && (
          <>
            <Clock className="mx-auto h-14 w-14 text-amber-500" />
            <h1 className="mt-3 text-xl font-bold">{msg}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {lang === "bn" ? "কিছুক্ষণ পর আবার দেখুন।" : "Please check back shortly."}
            </p>
            <Button asChild variant="outline" className="mt-6 w-full">
              <Link to="/app/subscribe">{lang === "bn" ? "ফিরে যান" : "Go back"}</Link>
            </Button>
          </>
        )}
        {state === "failed" && (
          <>
            <XCircle className="mx-auto h-14 w-14 text-destructive" />
            <h1 className="mt-3 text-xl font-bold">{msg}</h1>
            <Button asChild className="mt-6 w-full">
              <Link to="/app/subscribe">{lang === "bn" ? "আবার চেষ্টা করুন" : "Try again"}</Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}