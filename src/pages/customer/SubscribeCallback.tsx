import { useEffect, useState } from "react";
import { Link, useNavigate, useSearch } from "@/lib/router";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

type State = "loading" | "success" | "pending" | "failed";

export default function CustomerSubscribeCallback() {
  const params = useSearch() as Record<string, string>;
  const navigate = useNavigate();
  const [state, setState] = useState<State>("loading");
  const [msg, setMsg] = useState<string>("");

  const status = params.status;
  const transactionId = params.transactionId;
  const localId = params.local_id;
  const paidAmount = params.paymentAmount;
  const paymentMethod = params.paymentMethod;

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
          setMsg("সাবস্ক্রিপশন সক্রিয় হয়েছে!");
          return;
        }
        if (data?.status === "pending") {
          setState("pending");
          setMsg("পেমেন্ট প্রক্রিয়াধীন");
          return;
        }
        setState("failed");
        setMsg(status === "cancel" ? "পেমেন্ট বাতিল করা হয়েছে" : "পেমেন্ট সফল হয়নি");
        return;
      }

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
          ? "পেমেন্ট বাতিল হয়েছে"
          : status === "failed"
          ? "পেমেন্ট সফল হয়নি"
          : "Transaction ID পাওয়া যায়নি",
      );
    })();
  }, [transactionId, status, localId, paidAmount, paymentMethod]);

  useEffect(() => {
    if (state !== "success") return;
    const t = setTimeout(() => navigate("/customer/subscription", { replace: true }), 3000);
    return () => clearTimeout(t);
  }, [state, navigate]);

  return (
    <div className="container mx-auto max-w-md px-4 py-10">
      <div className="rounded-2xl border bg-card p-8 text-center shadow-sm">
        {state === "loading" && (
          <>
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            <h1 className="mt-4 text-xl font-bold">পেমেন্ট যাচাই হচ্ছে...</h1>
          </>
        )}
        {state === "success" && (
          <>
            <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
            <h1 className="mt-3 text-xl font-extrabold">{msg}</h1>
            {paidAmount && (
              <p className="mt-1 text-sm text-muted-foreground">৳{paidAmount} পরিশোধিত</p>
            )}
            {transactionId && (
              <p className="mt-1 text-xs text-muted-foreground">TxnID: <span className="font-mono">{transactionId}</span></p>
            )}
            <p className="mt-3 text-xs text-muted-foreground">৩ সেকেন্ডে ফিরে যাচ্ছি...</p>
            <Button asChild className="mt-6 w-full">
              <Link to="/customer/subscription">এখনই যান</Link>
            </Button>
          </>
        )}
        {state === "pending" && (
          <>
            <Clock className="mx-auto h-14 w-14 text-amber-500" />
            <h1 className="mt-3 text-xl font-bold">{msg}</h1>
            <p className="mt-2 text-sm text-muted-foreground">কিছুক্ষণ পর আবার দেখুন।</p>
            <Button asChild variant="outline" className="mt-6 w-full">
              <Link to="/customer/subscription">ফিরে যান</Link>
            </Button>
          </>
        )}
        {state === "failed" && (
          <>
            <XCircle className="mx-auto h-14 w-14 text-destructive" />
            <h1 className="mt-3 text-xl font-bold">{msg}</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              এই attempt টি admin-এর কাছে log হয়েছে। আবার চেষ্টা করুন বা manual payment বেছে নিন।
            </p>
            <div className="mt-6 grid gap-2">
              <Button className="w-full" onClick={() => navigate("/customer/subscription", { replace: true })}>
                আবার চেষ্টা করুন
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate("/customer/dashboard", { replace: true })}>
                ড্যাশবোর্ডে যান
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}