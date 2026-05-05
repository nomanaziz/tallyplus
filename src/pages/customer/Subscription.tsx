import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Crown, Check } from "lucide-react";
import { toast } from "sonner";
import type { ConsumerSub } from "@/lib/consumer-history-access";

type Plan = {
  id: string;
  code: string;
  name_bn: string;
  description_bn: string | null;
  price_bdt: number;
  duration_days: number;
};

function bdt(n: number) {
  return new Intl.NumberFormat("bn-BD", { maximumFractionDigits: 0 }).format(n) + " ৳";
}

export default function CustomerSubscription() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [sub, setSub] = useState<ConsumerSub>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const [{ data: pl }, { data: s }] = await Promise.all([
        supabase
          .from("subscription_plans")
          .select("id, code, name_bn, description_bn, price_bdt, duration_days")
          .like("code", "consumer_history_%")
          .eq("is_active", true)
          .order("price_bdt"),
        supabase
          .from("subscriptions")
          .select("expires_at, plan:subscription_plans(code)")
          .eq("user_id", user.id)
          .eq("status", "active")
          .gt("expires_at", new Date().toISOString())
          .like("plan.code", "consumer_history_%")
          .order("expires_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      setPlans((pl ?? []) as Plan[]);
      if (s) {
        const planCode = (s.plan as { code?: string } | null)?.code ?? null;
        setSub({ plan_code: planCode, expires_at: s.expires_at });
      }
      setLoading(false);
    })();
  }, [user]);

  const requestPlan = async (plan: Plan) => {
    if (!user) return;
    setBusyId(plan.id);
    const { error } = await supabase.from("subscription_requests").insert({
      user_id: user.id,
      plan_id: plan.id,
      status: "pending",
    });
    setBusyId(null);
    if (error) return toast.error(error.message);
    toast.success("আবেদন পাঠানো হয়েছে — Admin approve করলে চালু হবে");
  };

  const planLabel = (code: string) =>
    code === "consumer_history_1y" ? "১ বছর" : code === "consumer_history_5y" ? "৫ বছর" : "১০ বছর";

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">সাবস্ক্রিপশন</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          পুরোনো মাসের আয়-ব্যয়ের বিস্তারিত ইতিহাস দেখতে subscription নিন।
        </p>
      </div>

      {sub?.plan_code && (
        <Card className="border-primary/30 bg-primary/5 p-4 text-sm">
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-primary" />
            <span className="font-semibold">সক্রিয় প্ল্যান:</span>
            <span>{planLabel(sub.plan_code)}</span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            শেষ তারিখ: {sub.expires_at?.slice(0, 10)}
          </div>
        </Card>
      )}

      {plans.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          এই মুহূর্তে কোনো plan পাওয়া যায়নি।
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => {
            const isCurrent = sub?.plan_code === p.code;
            return (
              <Card key={p.id} className={"flex flex-col p-4 " + (isCurrent ? "ring-2 ring-primary" : "")}>
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-primary" />
                  <div className="text-lg font-bold">{p.name_bn}</div>
                </div>
                <div className="mt-3 text-2xl font-extrabold">{bdt(p.price_bdt)}</div>
                <div className="text-xs text-muted-foreground">{planLabel(p.code)}</div>
                {p.description_bn && (
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{p.description_bn}</p>
                )}
                <ul className="mt-3 space-y-1 text-xs">
                  <li className="flex items-start gap-1.5">
                    <Check className="mt-0.5 h-3.5 w-3.5 flex-none text-emerald-600" />
                    আগের মাসের পূর্ণ আয়-ব্যয় ইতিহাস
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check className="mt-0.5 h-3.5 w-3.5 flex-none text-emerald-600" />
                    মাসিক রিপোর্ট সংরক্ষণ
                  </li>
                </ul>
                <Button
                  onClick={() => requestPlan(p)}
                  disabled={busyId === p.id || isCurrent}
                  className="mt-4 w-full"
                  variant={isCurrent ? "outline" : "default"}
                >
                  {busyId === p.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isCurrent ? (
                    "চলমান"
                  ) : (
                    "আবেদন করুন"
                  )}
                </Button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}