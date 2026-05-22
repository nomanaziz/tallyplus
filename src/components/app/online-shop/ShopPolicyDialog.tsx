import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function ShopPolicyDialog({
  open, onOpenChange, shop, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  shop: {
    id: string;
    terms_and_conditions: string | null;
    return_policy: string | null;
    shipping_policy: string | null;
  };
  onSaved: () => void;
}) {
  const { lang, t } = useI18n();
  const [terms, setTerms] = useState("");
  const [returnP, setReturnP] = useState("");
  const [shipping, setShipping] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTerms(shop.terms_and_conditions ?? "");
    setReturnP(shop.return_policy ?? "");
    setShipping(shop.shipping_policy ?? "");
  }, [open, shop]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("shops")
      .update({
        terms_and_conditions: terms.trim() || null,
        return_policy: returnP.trim() || null,
        shipping_policy: shipping.trim() || null,
      })
      .eq("id", shop.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t("p6_Policies_saved"));
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("p6_Shop_Policy")}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="terms">
          <TabsList className="w-full">
            <TabsTrigger value="terms" className="flex-1">{t("p6_Terms")}</TabsTrigger>
            <TabsTrigger value="return" className="flex-1">{t("p6_Return")}</TabsTrigger>
            <TabsTrigger value="shipping" className="flex-1">{t("p6_Shipping")}</TabsTrigger>
          </TabsList>
          <TabsContent value="terms">
            <Label>{t("p6_Terms_Conditions")}</Label>
            <Textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows={10} placeholder={t("p6_Write_your_shop_terms")} />
          </TabsContent>
          <TabsContent value="return">
            <Label>{t("p6_Return_Refund_Policy")}</Label>
            <Textarea value={returnP} onChange={(e) => setReturnP(e.target.value)} rows={10} placeholder={t("p6_How_returns_refunds_work")} />
          </TabsContent>
          <TabsContent value="shipping">
            <Label>{t("p6_Shipping_Policy")}</Label>
            <Textarea value={shipping} onChange={(e) => setShipping(e.target.value)} rows={10} placeholder={t("p6_Delivery_fees_timeline")} />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("p6_Cancel")}
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("p6_Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
