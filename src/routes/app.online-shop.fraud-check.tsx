import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useShop } from "@/lib/shop";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldAlert, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/online-shop/fraud-check")({
  head: () => ({ meta: [{ title: "Fraud Check — Tally Plus" }] }),
  component: FraudCheckPage,
});

type FraudResult = {
  phone: string; total_orders: number; success: number; cancelled: number; fraud_score: number;
  couriers?: Array<{ name: string; success: number; cancelled: number }>;
};

function FraudCheckPage() {
  const { lang } = useI18n();
  const { current } = useShop();
  const shopId = current?.id ?? null;
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FraudResult | null>(null);

  const search = async () => {
    const p = phone.trim().replace(/\s+/g, "");
    if (!/^\+?\d{10,14}$/.test(p)) {
      toast.error(lang === "bn" ? "সঠিক মোবাইল নম্বর দিন" : "Enter valid phone");
      return;
    }
    setLoading(true); setResult(null);
    // Stub: courier API integration is configured at admin level; cache result
    const mock: FraudResult = {
      phone: p, total_orders: 0, success: 0, cancelled: 0, fraud_score: 0, couriers: [],
    };
    if (shopId) {
      await supabase.from("fraud_check_logs").insert({ shop_id: shopId, phone: p, result: mock });
    }
    setResult(mock);
    setLoading(false);
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 pb-10">
      <PageHeader breadcrumb="Online-shop" title="" />
      <div className="mt-3 flex gap-2">
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={lang === "bn" ? "মোবাইল নম্বর" : "Phone number"} maxLength={14}
          onKeyDown={(e) => e.key === "Enter" && search()} />
        <Button onClick={search} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          <span className="ml-1.5">{lang === "bn" ? "খুঁজুন" : "Search"}</span>
        </Button>
      </div>

      {!result && !loading && (
        <div className="mt-20 grid place-items-center text-center">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h2 className="mt-3 text-lg font-bold">{lang === "bn" ? "কাস্টমার ফ্রড চেক করুন" : "Check customer fraud"}</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {lang === "bn" ? "ফ্রড ও ডেলিভারি ইতিহাস দেখতে উপরে মোবাইল নম্বর দিন।" : "Enter a phone number above to see fraud and delivery history."}
          </p>
        </div>
      )}

      {result && (
        <div className="mt-4 rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground">{lang === "bn" ? "মোবাইল" : "Phone"}</div>
              <div className="text-lg font-bold">{result.phone}</div>
            </div>
            <div className={`rounded-md px-3 py-1 text-sm font-bold ${result.fraud_score > 50 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
              {lang === "bn" ? "ঝুঁকি" : "Risk"} {result.fraud_score}%
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <Stat label={lang === "bn" ? "মোট অর্ডার" : "Total"} value={result.total_orders} />
            <Stat label={lang === "bn" ? "সফল" : "Success"} value={result.success} accent="text-emerald-600" />
            <Stat label={lang === "bn" ? "বাতিল" : "Cancelled"} value={result.cancelled} accent="text-red-600" />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            {lang === "bn"
              ? "কুরিয়ার API ইন্টিগ্রেশন (BDCourier/RedX/Pathao) admin সেটিংসে কনফিগার করতে হবে।"
              : "Courier API integration (BDCourier/RedX/Pathao) must be configured in admin settings."}
          </p>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-lg border p-3 text-center">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-extrabold ${accent ?? ""}`}>{value}</div>
    </div>
  );
}