import { useEffect, useState } from "react";
import { Link, useNavigate, useSearch } from "@/lib/router";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

type State = "loading" | "success" | "pending" | "failed";

export default function SubscribeCallback() {
  const { lang } = useI18n();
  const params = useSearch() as Record<string, string>;
  const navigate = useNavigate();
  const [state, setState] = useState<State>("loading");
  const [msg, setMsg] = useState<string>("");
  const [autoRedirect, setAutoRedirect] = useState(true);
  const [countdown, setCountdown] = useState(4);

  const status = params.status;
  const transactionId = params.transactionId;
  const localId = params.local_id;
  const paidAmount = params.paymentAmount;
  const paymentMethod = params.paymentMethod;
  const paymentFee = params.paymentFee;

  useEffect(() => {
    void (async () => {
      // Outcome 1: gateway provided a transactionId → verify with backend.
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
          setMsg(lang === "bn" ? "সাবস্ক্রিপশন সক্রিয় হয়েছে!" : "Subscription activated!");
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
            : (lang === "bn" ? "পেমেন্ট সফল হয়নি" : "Payment was not successful")
        );
        return;
      }

      // Outcome 2: no transactionId — log the failed attempt for admin.
      if (localId) {
        await supabase.functions.invoke("recharge-mark-failed", {
          body: {
            local_id: localId,
            reason: status === "cancel" ? "user_cancelled" : status === "failed" ? "gateway_failed" : "no_transaction_id",
            payment_method: paymentMethod,
            payment_amount: paidAmount,
          },
        });
      }
      setState("failed");
      setMsg(
        status === "cancel"
          ? (lang === "bn" ? "পেমেন্ট বাতিল হয়েছে" : "Payment was cancelled")
          : status === "failed"
            ? (lang === "bn" ? "পেমেন্ট সফল হয়নি" : "Payment was not successful")
            : (lang === "bn" ? "Transaction ID পাওয়া যায়নি" : "Transaction ID missing")
      );
    })();
  }, [transactionId, status, localId, lang, paidAmount, paymentMethod]);

  // Auto-redirect to dashboard 3s after success
  useEffect(() => {
    if (state !== "success") return;
    const t = setTimeout(() => navigate("/app/dashboard", { replace: true }), 3000);
    return () => clearTimeout(t);
  }, [state, navigate]);

  // Auto-redirect to subscribe page 4s after failed/cancelled
  useEffect(() => {
    if (state !== "failed" || !autoRedirect) return;
    setCountdown(4);
    const tick = setInterval(() => setCountdown((c) => (c > 0 ? c - 1 : 0)), 1000);
    const t = setTimeout(() => navigate("/app/subscribe", { replace: true }), 4000);
    return () => {
      clearTimeout(t);
      clearInterval(tick);
    };
  }, [state, autoRedirect, navigate]);

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
                {paymentMethod && paymentMethod !== "undetected" ? ` • ${paymentMethod}` : ""}
              </p>
            )}
            {transactionId && (
              <p className="mt-1 text-xs text-muted-foreground">TxnID: <span className="font-mono">{transactionId}</span></p>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              {lang === "bn" ? "৩ সেকেন্ডে ড্যাশবোর্ডে যাচ্ছি..." : "Redirecting to dashboard in 3s..."}
            </p>
            <Button asChild className="mt-6 w-full">
              <Link to="/app/dashboard">{lang === "bn" ? "এখনই যান" : "Go now"}</Link>
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
            {transactionId && (
              <p className="mt-2 text-xs text-muted-foreground">
                TxnID: <span className="font-mono">{transactionId}</span>
                {paidAmount ? ` • ৳${paidAmount}` : ""}
                {paymentFee && paymentFee !== "0" ? ` (fee ৳${paymentFee})` : ""}
              </p>
            )}
            <p className="mt-3 text-sm text-muted-foreground">
              {lang === "bn"
                ? "এই attempt টি admin-এর কাছে log হয়েছে — প্রয়োজনে admin আপনার সাথে যোগাযোগ করবেন। আপনি চাইলে আবার চেষ্টা করুন বা manual payment বেছে নিন।"
                : "This attempt has been logged for admin — they may contact you. You can try again or choose manual payment."}
            </p>
            {autoRedirect && (
              <p className="mt-3 text-xs font-medium text-primary">
                {lang === "bn"
                  ? `${countdown} সেকেন্ডে Subscribe page-এ ফিরে যাচ্ছি...`
                  : `Redirecting to Subscribe page in ${countdown}s...`}
              </p>
            )}
            <div className="mt-6 grid gap-2">
              <Button
                className="w-full"
                onClick={() => navigate("/app/subscribe", { replace: true })}
              >
                {lang === "bn" ? "এখনই আবার চেষ্টা করুন" : "Try again now"}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setAutoRedirect(false);
                  navigate("/app/dashboard", { replace: true });
                }}
              >
                {lang === "bn" ? "ড্যাশবোর্ডে যান" : "Go to Dashboard"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}