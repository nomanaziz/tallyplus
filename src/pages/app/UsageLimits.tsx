import { useEffect, useMemo, useState } from "react";
import { Link } from "@/lib/router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useShop } from "@/lib/shop";
import { useI18n, fmtMoney } from "@/lib/i18n";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Loader2, Check, ArrowRight } from "lucide-react";

type LimitRow = { plan_code: string; feature_key: string; limit_count: number };
type Plan = {
  id: string; code: string; name_bn: string; name_en: string;
  price_bdt: number; old_price_bdt: number | null; duration_days: number;
  max_shops: number; is_lifetime: boolean; perks: string[];
  description_bn: string | null; description_en: string | null;
};

const FEATURES: { key: string; bn: string; en: string }[] = [
  { key: "purchase",          bn: "ক্রয়",                    en: "Purchase" },
  { key: "sale",              bn: "বিক্রয়",                  en: "Sale" },
  { key: "expense",           bn: "খরচ",                     en: "Expense" },
  { key: "products",          bn: "পণ্যের তালিকা",          en: "Products" },
  { key: "services",          bn: "সার্ভিসের তালিকা",       en: "Services" },
  { key: "due",               bn: "বাকি",                    en: "Due" },
  { key: "contacts_customer", bn: "যোগাযোগ তালিকা - গ্রাহক", en: "Contacts - Customer" },
  { key: "contacts_supplier", bn: "যোগাযোগ তালিকা - সাপ্লায়ার", en: "Contacts - Supplier" },
  { key: "contacts_employee", bn: "যোগাযোগ তালিকা - কর্মচারী", en: "Contacts - Employee" },
  { key: "stock",             bn: "স্টক তালিকা",             en: "Stock" },
];

export default function UsageLimitsPage() {
  const { lang } = useI18n();
  const { user } = useAuth();
  const { current } = useShop();
  const [planCode, setPlanCode] = useState<string>("free");
  const [limits, setLimits] = useState<LimitRow[]>([]);
  const [usage, setUsage] = useState<Record<string, number>>({});
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      if (!user || !current) { setLoading(false); return; }
      setLoading(true);
      // Determine active plan
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("plan_id, expires_at, status, subscription_plans!inner(code)")
        .eq("user_id", user.id)
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString())
        .order("expires_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const code = (sub?.subscription_plans as any)?.code ?? "free";
      setPlanCode(code);

      const { data: lim } = await supabase
        .from("usage_limits").select("plan_code,feature_key,limit_count").eq("plan_code", code);
      setLimits((lim as LimitRow[]) ?? []);

      const { data: pl } = await supabase
        .from("subscription_plans")
        .select("id,code,name_bn,name_en,price_bdt,old_price_bdt,duration_days,max_shops,is_lifetime,perks,description_bn,description_en")
        .eq("is_active", true)
        .order("price_bdt");
      setPlans((pl as Plan[]) ?? []);

      // Counts per feature for current shop
      const sid = current.id;
      const cnt = async (table: string, extra?: any) => {
        let q = supabase.from(table as any).select("id", { count: "exact", head: true }).eq("shop_id", sid);
        if (extra?.deleted) q = q.is("deleted_at", null);
        const { count } = await q;
        return count ?? 0;
      };
      const [purchase, sale, expense, products, customers, suppliers, employees] = await Promise.all([
        cnt("purchases", { deleted: true }),
        cnt("sales", { deleted: true }),
        cnt("expenses", { deleted: true }),
        cnt("products", { deleted: true }),
        cnt("customers", { deleted: true }),
        cnt("suppliers", { deleted: true }),
        supabase.from("shop_members").select("id", { count: "exact", head: true }).eq("shop_id", sid).then(r => r.count ?? 0),
      ]);
      const services = await cnt("services", { deleted: true });
      // Due count: customers with positive due
      const { count: dueCnt } = await supabase
        .from("customers").select("id", { count: "exact", head: true })
        .eq("shop_id", sid).is("deleted_at", null).gt("due_balance", 0);
      setUsage({
        purchase, sale, expense, products, services,
        contacts_customer: customers, contacts_supplier: suppliers, contacts_employee: employees,
        due: dueCnt ?? 0, stock: products,
      });
      setLoading(false);
    })();
  }, [user?.id, current?.id]);

  const limitMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of limits) m.set(l.feature_key, l.limit_count);
    return m;
  }, [limits]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-muted/30">
      <PageHeader breadcrumb={lang === "bn" ? "সেটিংস" : "Settings"} title={lang === "bn" ? "ব্যবহারের সীমা" : "Usage Limits"} />
      <div className="container space-y-4 px-3 py-3 md:px-4 md:py-4">
        <div className="rounded-xl border bg-background p-4">
          <h2 className="text-base font-extrabold">{lang === "bn" ? "ব্যবহারের সীমা" : "Usage Limits"}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {lang === "bn" ? "সাবস্ক্রিপশন সীমার বিপরীতে আপনার বর্তমান ব্যবহার ট্র্যাক করুন" : "Track your current usage against subscription limits"}
          </p>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="px-2 py-2 text-left font-semibold">{lang === "bn" ? "ফিচার" : "Feature"}</th>
                  <th className="px-2 py-2 text-right font-semibold">{lang === "bn" ? "সীমা" : "Limit"}</th>
                  <th className="px-2 py-2 text-left font-semibold">{lang === "bn" ? "বর্তমান ব্যবহার" : "Current Usage"}</th>
                  <th className="px-2 py-2 text-right font-semibold">{lang === "bn" ? "অবশিষ্ট" : "Remaining"}</th>
                </tr>
              </thead>
              <tbody>
                {FEATURES.map((f) => {
                  const limit = limitMap.get(f.key) ?? 0;
                  const used = usage[f.key] ?? 0;
                  const unlimited = limit === -1;
                  const remaining = unlimited ? "∞" : Math.max(0, limit - used);
                  const ratio = unlimited ? 0 : limit > 0 ? Math.min(1, used / limit) : 0;
                  const tone = ratio >= 0.9 ? "rose" : ratio >= 0.75 ? "amber" : "emerald";
                  const barColor = tone === "rose" ? "bg-rose-500" : tone === "amber" ? "bg-amber-400" : "bg-emerald-500";
                  const txtColor = tone === "rose" ? "text-rose-600" : tone === "amber" ? "text-amber-600" : "text-emerald-600";
                  return (
                    <tr key={f.key} className="border-b last:border-b-0">
                      <td className="px-2 py-2.5">{lang === "bn" ? f.bn : f.en}</td>
                      <td className={"px-2 py-2.5 text-right font-semibold " + (unlimited ? "text-emerald-600" : "")}>
                        {unlimited ? "∞" : limit}
                      </td>
                      <td className="px-2 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className={"w-8 text-right text-xs font-semibold " + txtColor}>{used}</span>
                          <div className="h-1.5 w-32 overflow-hidden rounded-full bg-muted">
                            <div className={"h-full " + barColor} style={{ width: unlimited ? "0%" : `${ratio * 100}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className={"px-2 py-2.5 text-right font-semibold " + txtColor}>{remaining}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />{lang === "bn" ? "কম ব্যবহার (০-৭৪%)" : "Low (0-74%)"}</span>
            <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-amber-400" />{lang === "bn" ? "মাঝারি ব্যবহার (৭৫-৮৯%)" : "Medium (75-89%)"}</span>
            <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-rose-500" />{lang === "bn" ? "উচ্চ ব্যবহার (৯০%+)" : "High (90%+)"}</span>
          </div>
        </div>

        {/* Regular packages */}
        <div className="rounded-xl border bg-background p-4">
          <h3 className="mb-3 text-sm font-bold">{lang === "bn" ? "রেগুলার প্যাকেজ" : "Regular Packages"}</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {plans.filter(p => p.code !== "monthly").map((p) => (
              <div key={p.id} className="rounded-xl border bg-card p-5">
                <div className="text-2xl font-extrabold">৳ {p.price_bdt}</div>
                <div className="mt-1 text-sm font-semibold">{lang === "bn" ? p.description_bn : p.description_en}</div>
                <ul className="mt-3 space-y-1.5 text-sm">
                  {(Array.isArray(p.perks) ? p.perks : []).map((perk: string) => (
                    <li key={perk} className="flex items-start gap-2">
                      <span className="mt-0.5 flex h-4 w-4 flex-none items-center justify-center rounded bg-emerald-500"><Check className="h-3 w-3 text-white" /></span>
                      {perk}
                    </li>
                  ))}
                </ul>
                <Button asChild variant="outline" className="mt-4 h-11 w-full">
                  <Link to="/app/subscribe">{lang === "bn" ? "এখনই কিনুন" : "Buy now"}</Link>
                </Button>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-center">
            <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Link to="/app/subscribe">{lang === "bn" ? "সকল সাবস্ক্রিপশন প্যাকেজ দেখুন" : "View all subscription packages"} <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
