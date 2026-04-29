import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/lib/shop";
import { useI18n } from "@/lib/i18n";
import { useNavigate } from "@/lib/router";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquareText, ShoppingCart, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

export default function BuySmsPage() {
  const { lang } = useI18n();
  const { current } = useShop();
  const nav = useNavigate();
  const [buying, setBuying] = useState<string | null>(null);

  const { data: pkgs = [] } = useQuery({
    queryKey: ["sms_packages"],
    queryFn: async () => {
      const { data } = await supabase.from("sms_packages").select("*").eq("is_active", true).order("sms_count");
      return data ?? [];
    },
  });
  const { data: bal } = useQuery({
    queryKey: ["sms_balance", current?.id],
    enabled: !!current?.id,
    queryFn: async () => {
      const { data } = await supabase.from("shop_sms_balance").select("*").eq("shop_id", current!.id).maybeSingle();
      return data;
    },
  });

  const buy = async (pkg: any) => {
    if (!current?.id) return;
    setBuying(pkg.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { error } = await supabase.from("sms_purchase_requests").insert({
        shop_id: current.id, user_id: session!.user.id, package_id: pkg.id,
        sms_count: pkg.sms_count, amount_bdt: pkg.price_bdt, payment_status: "pending",
      });
      if (error) throw error;
      toast.success(lang === "bn" ? "অনুরোধ পাঠানো হয়েছে। অ্যাডমিন approve করলে balance যোগ হবে।" : "Request submitted. Balance will be added once admin approves.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBuying(null);
    }
  };

  return (
    <div className="min-h-full bg-muted/30">
      <PageHeader
        breadcrumb={lang === "bn" ? "SMS কিনুন" : "Buy SMS"}
        title={
          <span className="flex items-center gap-2">
            <button onClick={() => nav({ to: "/app/marketing" })} className="-ml-1 flex h-7 w-7 items-center justify-center rounded hover:bg-accent" aria-label="Back"><ArrowLeft className="h-4 w-4" /></button>
            {lang === "bn" ? "SMS কিনুন" : "Buy SMS"}
          </span>
        }
      />
      <div className="container px-3 py-4 sm:px-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700"><MessageSquareText className="h-6 w-6" /></div>
            <div>
              <div className="text-xs text-muted-foreground">{lang === "bn" ? "বর্তমান SMS ব্যালেন্স" : "Current SMS Balance"}</div>
              <div className="text-2xl font-extrabold">{bal?.balance ?? 0}</div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            {lang === "bn" ? "মোট কেনা" : "Total purchased"}: {bal?.total_purchased ?? 0} • {lang === "bn" ? "ব্যবহৃত" : "Used"}: {bal?.total_used ?? 0}
          </div>
        </div>

        <h2 className="mb-3 text-lg font-bold">{lang === "bn" ? "প্যাকেজ নির্বাচন করুন" : "Choose a Package"}</h2>
        {pkgs.length === 0 ? (
          <div className="rounded-xl border bg-background p-8 text-center text-sm text-muted-foreground">
            {lang === "bn" ? "এখনো কোনো প্যাকেজ নেই। অ্যাডমিন শীঘ্রই যোগ করবে।" : "No packages yet. Admin will add them soon."}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pkgs.map((p: any) => {
              const perSms = (p.price_bdt / p.sms_count).toFixed(2);
              return (
                <div key={p.id} className="rounded-xl border bg-background p-4 transition hover:shadow-md">
                  <div className="text-sm font-semibold text-muted-foreground">{p.name_bn}</div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold">{p.sms_count.toLocaleString()}</span>
                    <span className="text-sm text-muted-foreground">SMS</span>
                  </div>
                  <div className="mt-1 text-2xl font-bold text-emerald-600">৳{p.price_bdt}</div>
                  <div className="mt-1 text-xs text-muted-foreground">৳{perSms}/SMS</div>
                  <Button
                    onClick={() => buy(p)}
                    disabled={buying === p.id}
                    className="mt-3 w-full gap-1"
                  >
                    {buying === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
                    {lang === "bn" ? "কিনুন" : "Buy Now"}
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 rounded-md border bg-blue-50 p-3 text-xs text-blue-900">
          <Check className="mr-1 inline h-3 w-3" />
          {lang === "bn"
            ? "Buy এ ক্লিক করলে আপনার অনুরোধ অ্যাডমিনের কাছে যাবে। পেমেন্ট confirm হলে SMS balance যোগ হবে।"
            : "Clicking Buy will send a request to the admin. Once payment is confirmed, your SMS balance will be credited."}
        </div>
      </div>
    </div>
  );
}