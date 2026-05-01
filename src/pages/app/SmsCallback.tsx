import { useEffect, useState } from "react";
import { Link, useNavigate, useSearch } from "@/lib/router";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

type State = "loading" | "success" | "pending" | "failed";

export default function SmsCallback() {
  const { lang } = useI18n();
  const params = useSearch() as Record<string, string>;
  const navigate = useNavigate();
  const [state, setState] = useState<State>("loading");
  const [msg, setMsg] = useState<string>("");

  const status = params.status;
  const transactionId = params.transactionId;
  const localId = params.local_id;
  const paidAmount = params.paymentAmount;

  useEffect(() => {
    void (async () => {
      if (transactionId) {
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
          setMsg(lang === "bn" ? "SMS ব্যালেন্স যোগ হয়েছে!" : "SMS balance credited!");
          return;
        }
        if (data?.status === "pending") {
          setState("pending");
          setMsg(lang === "bn" ? "পেমেন্ট প্রক্রিয়াধীন" : "Payment is being processed");
          return;
        }
        setState("failed");
        setMsg(
          status === "cancel"
            ? (lang === "bn" ? "পেমেন্ট বাতিল করা হয়েছে" : "Payment was cancelled")
            : (lang === "bn" ? "পেমেন্ট সফল হয়নি" : "Payment was not successful"),
        );
        return;
      }
      if (localId) {
        await supabase.functions.invoke("recharge-mark-failed", {
          body: {
            local_id: localId,
            reason: status === "cancel" ? "user_cancelled" : status === "failed" ? "gateway_failed" : "no_transaction_id",
          },
        });
      }
      setState("failed");
      setMsg(
        status === "cancel"
          ? (lang === "bn" ? "পেমেন্ট বাতিল হয়েছে" : "Payment was cancelled")
          : (lang === "bn" ? "Transaction ID পাওয়া যায়নি" : "Transaction ID missing"),
      );
    })();
  }, [transactionId, status, localId, lang]);

  useEffect(() => {
    if (state !== "success") return;
    const t = setTimeout(() => navigate("/app/buy-sms", { replace: true }), 3000);
    return () => clearTimeout(t);
  }, [state, navigate]);

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
              <p className="mt-1 text-sm text-muted-foreground">৳{paidAmount} {lang === "bn" ? "পরিশোধিত" : "paid"}</p>
            )}
            <Button asChild className="mt-6 w-full">
              <Link to="/app/buy-sms">{lang === "bn" ? "এখনই যান" : "Go now"}</Link>
            </Button>
          </>
        )}
        {state === "pending" && (
          <>
            <Clock className="mx-auto h-14 w-14 text-amber-500" />
            <h1 className="mt-3 text-xl font-bold">{msg}</h1>
            <Button asChild variant="outline" className="mt-6 w-full">
              <Link to="/app/buy-sms">{lang === "bn" ? "ফিরে যান" : "Go back"}</Link>
            </Button>
          </>
        )}
        {state === "failed" && (
          <>
            <XCircle className="mx-auto h-14 w-14 text-destructive" />
            <h1 className="mt-3 text-xl font-bold">{msg}</h1>
            <Button className="mt-6 w-full" onClick={() => navigate("/app/buy-sms", { replace: true })}>
              {lang === "bn" ? "আবার চেষ্টা করুন" : "Try again"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}