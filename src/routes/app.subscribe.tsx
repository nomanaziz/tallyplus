import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, fmtMoney } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useReferral } from "@/lib/referral";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Crown, ShieldCheck, HardDrive, Cloud, Headphones, Check, Tag, X } from "lucide-react";

export const Route = createFileRoute("/app/subscribe")({
  head: () => ({ meta: [{ title: "সাবস্ক্রিপশন কিনুন — Tally Plus" }] }),
  component: Subscribe,
});

function Subscribe() {
  const { lang } = useI18n();
  const { user } = useAuth();
  const { code, setCode, validate } = useReferral();
  const [refInfo, setRefInfo] = useState<{ ok: boolean; affiliate_id?: string; full_name?: string } | null>(null);
  const [discountPct, setDiscountPct] = useState<number>(0);
  const [defaultPct, setDefaultPct] = useState<number>(15);
  const [manualCode, setManualCode] = useState<string>("");

  useEffect(() => {
    void (async () => {
      const { data: s } = await supabase
        .from("affiliate_settings").select("referee_discount_pct,default_commission_pct").eq("id", true).maybeSingle();
      if (s) {
        setDiscountPct(Number(s.referee_discount_pct ?? 0));
        setDefaultPct(Number(s.default_commission_pct ?? 15));
      }
    })();
  }, []);

  useEffect(() => {
    if (!code) { setRefInfo(null); return; }
    void (async () => {
      const r = await validate(code);
      setRefInfo(r);
      if (!r.ok) setCode(null);
    })();
  }, [code]);

  const applyManual = async () => {
    const r = await validate(manualCode);
    if (!r.ok) { toast.error(lang === "bn" ? "ভুল রেফারেল কোড" : "Invalid code"); return; }
    setCode(manualCode);
    setRefInfo(r);
    toast.success(lang === "bn" ? "কোড অ্যাপ্লাই হয়েছে" : "Code applied");
  };

  const buy = async (price: number, planLabel: string) => {
    if (!user) { toast.error(lang === "bn" ? "আগে লগইন করুন" : "Please log in"); return; }
    const finalPrice = refInfo?.ok ? Math.round(price * (1 - discountPct / 100)) : price;
    // Record a pending commission so the affiliate sees it; admin can approve/pay.
    if (refInfo?.ok && refInfo.affiliate_id) {
      const commissionAmount = Math.round((finalPrice * defaultPct) / 100);
      const { data: refRow } = await supabase
        .from("affiliate_referrals")
        .insert({
          affiliate_id: refInfo.affiliate_id,
          referred_user_id: user.id,
          referral_code: code ?? "",
          status: "converted",
          converted_at: new Date().toISOString(),
        })
        .select("id")
        .maybeSingle();
      await supabase.from("affiliate_commissions").insert({
        affiliate_id: refInfo.affiliate_id,
        referral_id: refRow?.id ?? null,
        subscription_amount: finalPrice,
        commission_pct: defaultPct,
        commission_amount: commissionAmount,
        status: "pending",
      });
    }
    toast.success(
      (lang === "bn" ? "অর্ডার পেয়েছি — " : "Order placed — ") +
      planLabel + ` (৳${finalPrice})`,
    );
  };

  const showPrice = (p: number) => refInfo?.ok ? Math.round(p * (1 - discountPct / 100)) : p;

  const advancedPerks = lang === "bn"
    ? [
        "অনলাইনে শপ ও পণ্য বাছাইয়ের সুযোগ",
        "বাড়তি টপ আপ ব্যবসার সুযোগ",
        "অ্যাপ থেকেই কাস্টমারকে মেসেজ করা",
      ]
    : [
        "Online shop and product selection",
        "Extra top-up business opportunity",
        "Message customers directly from app",
      ];

  const assurances = [
    { Icon: ShieldCheck, bn: "১০০% ডাটা সিকিউরিটি", en: "100% data security" },
    { Icon: Cloud, bn: "১০০% ডাটা ব্যাকআপ", en: "100% data backup" },
    { Icon: HardDrive, bn: "আনলিমিটেড ডাটা স্টোরেজ", en: "Unlimited data storage" },
    { Icon: Headphones, bn: "২৪ ঘণ্টা কাস্টমার সাপোর্ট", en: "24/7 customer support" },
  ];

  return (
    <div className="container px-4 py-4">
      <div className="mb-2 text-xs text-muted-foreground">Settings</div>
      <h1 className="text-xl font-extrabold">{lang === "bn" ? "সাবস্ক্রিপশন কিনুন" : "Buy Subscription"}</h1>

      {/* Referral banner */}
      {refInfo?.ok ? (
        <div className="mt-3 flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm">
          <div className="flex items-center gap-2 text-emerald-900">
            <Tag className="h-4 w-4" />
            <span>
              {lang === "bn" ? "রেফারেল কোড অ্যাপ্লাইড: " : "Referral applied: "}
              <strong>{code}</strong> — {discountPct}% {lang === "bn" ? "ছাড়" : "off"}
            </span>
          </div>
          <button onClick={() => { setCode(null); setRefInfo(null); }} className="text-emerald-900 hover:opacity-70"><X className="h-4 w-4" /></button>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border bg-card px-3 py-2 text-sm">
          <Tag className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">{lang === "bn" ? "রেফারেল কোড আছে?" : "Have a referral code?"}</span>
          <Input
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value.toUpperCase())}
            placeholder="CODE"
            className="h-8 w-28 uppercase"
            maxLength={20}
          />
          <Button size="sm" variant="outline" onClick={applyManual}>{lang === "bn" ? "অ্যাপ্লাই" : "Apply"}</Button>
        </div>
      )}

      {/* Advanced banner */}
      <div className="mt-4 grid items-stretch gap-3 rounded-2xl border bg-card p-4 shadow-sm md:grid-cols-[200px_1fr_auto]">
        <div className="flex flex-col items-center justify-center rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 p-4 text-center">
          <Crown className="h-8 w-8 text-primary" />
          <div className="mt-2 text-base font-extrabold">{lang === "bn" ? "অ্যাডভান্সড" : "Advanced"}</div>
        </div>
        <ul className="flex flex-col justify-center gap-2 text-sm">
          {advancedPerks.map((p) => (
            <li key={p} className="flex items-start gap-2">
              <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-success/20"><Check className="h-3 w-3 text-success" /></span>
              {p}
            </li>
          ))}
        </ul>
        <div className="flex flex-col items-center justify-center rounded-xl bg-secondary/40 p-4 text-center">
          <Crown className="h-7 w-7 text-primary" />
          <div className="mt-1 text-sm font-bold">{lang === "bn" ? "Tally Plus স্টোর" : "Tally Store"}</div>
        </div>
      </div>

      {/* Assurance row */}
      <div className="mt-3 grid grid-cols-1 gap-3 rounded-2xl border border-success/40 bg-success/5 p-4 md:grid-cols-2">
        {assurances.map((a) => (
          <div key={a.bn} className="flex items-center gap-2 text-sm">
            <a.Icon className="h-5 w-5 text-success" />
            <span>{lang === "bn" ? a.bn : a.en}</span>
          </div>
        ))}
        <p className="md:col-span-2 mt-1 text-center text-xs text-muted-foreground md:text-right">
          {lang === "bn" ? "সাবস্ক্রিপশন কিনুন, ইন্টারনেট ছাড়া অ্যাপ ব্যবহার করুন" : "Subscribe and use the app even without internet"}
        </p>
      </div>

      {/* Special offer */}
      <h2 className="mt-6 text-sm font-bold text-muted-foreground">{lang === "bn" ? "স্পেশাল অফার" : "Special Offer"}</h2>
      <div className="mt-2 grid items-center gap-4 rounded-2xl border bg-card p-4 shadow-sm md:grid-cols-[260px_1fr]">
          <div className="relative rounded-xl border-2 border-dashed border-success/50 bg-success/5 p-5 text-center">
          <span className="absolute right-2 top-2 rounded-md bg-success/20 px-2 py-0.5 text-[10px] font-bold text-success">
            35% {lang === "bn" ? "ছাড়" : "discount"}
          </span>
          <div className="text-xs text-muted-foreground">{lang === "bn" ? "আজীবন subscription" : "Lifetime subscription"}</div>
            <div className="mt-2 text-2xl font-extrabold">{fmtMoney(showPrice(5000), lang)}</div>
            <div className="text-sm text-destructive line-through">{fmtMoney(10000, lang)}</div>
        </div>
        <div>
          <div className="text-base font-bold">{lang === "bn" ? "স্পেশাল গিফট!" : "Special Gift!"}</div>
          <ul className="mt-2 space-y-1.5 text-sm">
            {(lang === "bn"
              ? ["টালি প্লাসের মেগা অফার!", "ব্যবসার পাশাপাশি বাড়তি আয়ের সুযোগ", "১০০% ক্লাউড ব্যাকআপ", "২৪/৭ ভিআইপি গ্রাহক সেবা"]
              : ["Mega offer from Tally Plus!", "Extra income opportunity", "100% cloud backup", "24/7 VIP customer service"]
            ).map((p) => (
              <li key={p} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 flex-none text-success" />{p}</li>
            ))}
          </ul>
            <Button onClick={() => buy(5000, "Lifetime")} className="mt-4 h-11 w-full rounded-md bg-success font-bold text-success-foreground hover:bg-success/90">
            {lang === "bn" ? "অফারটি বুঝে নিন" : "Claim this offer"}
          </Button>
        </div>
      </div>

      {/* Regular packages */}
      <h2 className="mt-6 text-sm font-bold text-muted-foreground">{lang === "bn" ? "রেগুলার প্যাকেজ" : "Regular packages"}</h2>
      <div className="mt-2 grid gap-4 md:grid-cols-2">
        {[
          {
            price: 2499, oldPrice: 3500,
            bnTitle: "১ বছর + ১ বছর ফ্রি (মোবাইল এবং কম্পিউটার) সাবস্ক্রিপশন",
            enTitle: "1 year + 1 year free (Mobile & PC) subscription",
            bn: ["দিনে মাত্র ৭ টাকা খরচে!", "১০০% সিকিউরড, সঙ্গে ডাটা ব্যাকআপ", "আপনার ব্যবসা ২ গুণ বাড়ান", "অফলাইনেও ব্যবহার করতে পারবেন", "মোবাইল এবং কম্পিউটার থেকেই অ্যাক্সেস"],
            en: ["Just ৳7/day!", "100% secure with data backup", "Grow your business 2x", "Works offline too", "Access from mobile & computer"],
          },
          {
            price: 5000, oldPrice: 10000,
            bnTitle: "এক সাবস্ক্রিপশনেই আজীবনের হিসাব! লাইফটাইম সাবস্ক্রিপশন",
            enTitle: "One subscription, lifetime accounts! Lifetime subscription",
            bn: ["এক সাবস্ক্রিপশনেই আজীবনের হিসাব!", "৫০% ছাড়ে পাচ্ছেন লাইফ টাইম সাবস্ক্রিপশন — সাথে নিশ্চিত উপহার!", "২৪/৭ ভিআইপি গ্রাহক সেবা", "নিজস্ব বিজনেস ওয়েবসাইট"],
            en: ["One-time payment, lifetime accounts!", "50% off on lifetime — guaranteed gift!", "24/7 VIP customer service", "Your own business website"],
          },
        ].map((p) => (
          <div key={p.price} className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-extrabold">{fmtMoney(showPrice(p.price), lang)}</div>
              {p.oldPrice && <div className="text-sm text-muted-foreground line-through">{fmtMoney(p.oldPrice, lang)}</div>}
            </div>
            <div className="mt-2 text-sm font-semibold">{lang === "bn" ? p.bnTitle : p.enTitle}</div>
            <div className="mt-3 text-xs font-bold text-muted-foreground">{lang === "bn" ? "স্পেশাল গিফট" : "Special gift"}</div>
            <ul className="mt-1.5 space-y-1.5 text-sm">
              {(lang === "bn" ? p.bn : p.en).map((x) => (
                <li key={x} className="flex items-start gap-2"><span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-sm bg-success/20"><Check className="h-3 w-3 text-success" /></span>{x}</li>
              ))}
            </ul>
            <Button onClick={() => buy(p.price, lang === "bn" ? p.bnTitle : p.enTitle)} className="mt-5 h-11 w-full rounded-md font-bold">{lang === "bn" ? "এখনই কিনুন" : "Buy now"}</Button>
          </div>
        ))}
      </div>
    </div>
  );
}