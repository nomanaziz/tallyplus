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
  const { lang } = useI18n();
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
    toast.success(lang === "bn" ? "পলিসি সংরক্ষিত" : "Policies saved");
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{lang === "bn" ? "শপ পলিসি" : "Shop Policy"}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="terms">
          <TabsList className="w-full">
            <TabsTrigger value="terms" className="flex-1">{lang === "bn" ? "শর্তাবলী" : "Terms"}</TabsTrigger>
            <TabsTrigger value="return" className="flex-1">{lang === "bn" ? "রিটার্ন" : "Return"}</TabsTrigger>
            <TabsTrigger value="shipping" className="flex-1">{lang === "bn" ? "ডেলিভারি" : "Shipping"}</TabsTrigger>
          </TabsList>
          <TabsContent value="terms">
            <Label>{lang === "bn" ? "শর্ত ও নিয়মাবলী" : "Terms & Conditions"}</Label>
            <Textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows={10} placeholder={lang === "bn" ? "আপনার দোকানের শর্ত লিখুন…" : "Write your shop terms…"} />
          </TabsContent>
          <TabsContent value="return">
            <Label>{lang === "bn" ? "রিটার্ন/রিফান্ড পলিসি" : "Return / Refund Policy"}</Label>
            <Textarea value={returnP} onChange={(e) => setReturnP(e.target.value)} rows={10} placeholder={lang === "bn" ? "কিভাবে পণ্য ফেরত নেবেন…" : "How returns/refunds work…"} />
          </TabsContent>
          <TabsContent value="shipping">
            <Label>{lang === "bn" ? "ডেলিভারি পলিসি" : "Shipping Policy"}</Label>
            <Textarea value={shipping} onChange={(e) => setShipping(e.target.value)} rows={10} placeholder={lang === "bn" ? "ডেলিভারি চার্জ ও সময়…" : "Delivery fees & timeline…"} />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {lang === "bn" ? "বাতিল" : "Cancel"}
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {lang === "bn" ? "সংরক্ষণ" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
