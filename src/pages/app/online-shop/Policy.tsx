import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useShop } from "@/lib/shop";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";



type Row = {
  id: string;
  terms_and_conditions: string | null;
  return_policy: string | null;
  shipping_policy: string | null;
  privacy_policy: string | null;
};

const TEMPLATES = {
  terms: `১. এই ওয়েবসাইটে অর্ডার করার পূর্বে শর্তাবলী ভালোভাবে পড়ুন।\n২. মূল্য ও স্টক পরিবর্তনশীল।\n৩. অর্ডার নিশ্চিত হওয়ার পরই ডেলিভারির জন্য পাঠানো হবে।`,
  return: `১. পণ্য বুঝে নেওয়ার ৭ দিনের মধ্যে রিটার্ন করতে হবে।\n২. ব্যবহৃত বা ক্ষতিগ্রস্ত পণ্য রিটার্ন গ্রহণযোগ্য নয়।\n৩. রিটার্নের জন্য মূল প্যাকেজিং ও রসিদ আবশ্যক।`,
  shipping: `১. ঢাকার ভিতরে ১-২ দিনে ডেলিভারি হবে।\n২. ঢাকার বাইরে ৩-৫ দিন সময় লাগতে পারে।\n৩. ক্যাশ অন ডেলিভারি ও অগ্রিম পেমেন্ট দু'টি অপশন রয়েছে।`,
  privacy: `১. আপনার ব্যক্তিগত তথ্য সম্পূর্ণ গোপন রাখা হবে।\n২. শুধুমাত্র অর্ডার প্রক্রিয়াকরণের জন্য আপনার তথ্য ব্যবহার করা হবে।\n৩. কোনো তৃতীয় পক্ষের সাথে আপনার তথ্য শেয়ার করা হবে না।`,
};

function PolicyPage() {
  const { lang, t } = useI18n();
  const { current } = useShop();
  const shopId = current?.id ?? null;

  const { data: shop, refetch } = useQuery<Row | null>({
    queryKey: ["shop-policies", shopId],
    enabled: !!shopId,
    queryFn: async () => {
      const { data } = await supabase.from("shops")
        .select("id,terms_and_conditions,return_policy,shipping_policy,privacy_policy")
        .eq("id", shopId!).maybeSingle();
      return (data as Row | null) ?? null;
    },
  });

  const [terms, setTerms] = useState("");
  const [ret, setRet] = useState("");
  const [ship, setShip] = useState("");
  const [priv, setPriv] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!shop) return;
    setTerms(shop.terms_and_conditions ?? "");
    setRet(shop.return_policy ?? "");
    setShip(shop.shipping_policy ?? "");
    setPriv(shop.privacy_policy ?? "");
  }, [shop?.id]);

  const save = async () => {
    if (!shopId) return;
    setSaving(true);
    const { error } = await supabase.from("shops").update({
      terms_and_conditions: terms.trim() || null,
      return_policy: ret.trim() || null,
      shipping_policy: ship.trim() || null,
      privacy_policy: priv.trim() || null,
    }).eq("id", shopId);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t("p6_Saved"));
    void refetch();
  };

  const editor = (
    label: string, value: string, setValue: (v: string) => void, template: string,
  ) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        {!value && (
          <Button size="sm" variant="outline" onClick={() => setValue(template)}>
            {t("p6_Use_template")}
          </Button>
        )}
      </div>
      <Textarea value={value} onChange={(e) => setValue(e.target.value)} rows={12}
        placeholder={t("p6_Write_here")} />
      <p className="text-xs text-muted-foreground">
        {t("p6_This_policy_will_appear_on_you")}
      </p>
    </div>
  );

  return (
    <div className="container mx-auto max-w-3xl px-4 pb-24">
      <PageHeader breadcrumb={`Online-shop / ${t("p6_Shop_Policy")}`} title="" />

      <Tabs defaultValue="terms" className="mt-3">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="terms">{t("p6_Terms")}</TabsTrigger>
          <TabsTrigger value="return">{t("p6_Return")}</TabsTrigger>
          <TabsTrigger value="shipping">{t("p6_Shipping")}</TabsTrigger>
          <TabsTrigger value="privacy">{t("p6_Privacy")}</TabsTrigger>
        </TabsList>
        <TabsContent value="terms" className="rounded-xl border bg-card p-4">
          {editor(t("p6_Terms_Conditions_2"), terms, setTerms, TEMPLATES.terms)}
        </TabsContent>
        <TabsContent value="return" className="rounded-xl border bg-card p-4">
          {editor(t("p6_Return_Policy"), ret, setRet, TEMPLATES.return)}
        </TabsContent>
        <TabsContent value="shipping" className="rounded-xl border bg-card p-4">
          {editor(t("p6_Shipping_Policy"), ship, setShip, TEMPLATES.shipping)}
        </TabsContent>
        <TabsContent value="privacy" className="rounded-xl border bg-card p-4">
          {editor(t("p6_Privacy_Policy"), priv, setPriv, TEMPLATES.privacy)}
        </TabsContent>
      </Tabs>

      <div className="fixed inset-x-0 bottom-0 border-t bg-background p-3">
        <div className="mx-auto max-w-3xl">
          <Button onClick={save} disabled={saving} className="w-full" size="lg">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("p6_Save_All_Policies")}
          </Button>
        </div>
      </div>
    </div>
  );
}
export default PolicyPage;
