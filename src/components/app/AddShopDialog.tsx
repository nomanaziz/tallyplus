import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ShopTypePicker } from "@/components/app/ShopTypePicker";
import { useAuth } from "@/lib/auth";
import { useShop } from "@/lib/shop";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function AddShopDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: (shopId: string) => void;
}) {
  const { lang } = useI18n();
  const { user } = useAuth();
  const { refresh } = useShop();
  const [name, setName] = useState("");
  const [typeCode, setTypeCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!user || name.trim().length < 2) {
      toast.error(lang === "bn" ? "দোকানের নাম দিন" : "Enter shop name");
      return;
    }
    if (!typeCode) {
      toast.error(lang === "bn" ? "দোকানের ধরন বাছাই করুন" : "Choose shop type");
      return;
    }
    setBusy(true);
    const { data: shopRow, error } = await supabase
      .from("shops")
      .insert({ owner_id: user.id, name: name.trim(), shop_type_code: typeCode })
      .select("id")
      .single();
    if (error) {
      setBusy(false);
      toast.error(error.message);
      return;
    }
    const { data: typeRow } = await supabase
      .from("shop_types")
      .select("default_categories")
      .eq("code", typeCode)
      .maybeSingle();
    const defaults = (typeRow?.default_categories as string[] | undefined) ?? [];
    if (shopRow?.id && defaults.length > 0) {
      await supabase.from("categories").insert(defaults.map((n) => ({ shop_id: shopRow.id, name: n })));
    }
    setBusy(false);
    setName("");
    setTypeCode(null);
    await refresh();
    toast.success(lang === "bn" ? "দোকান তৈরি হয়েছে" : "Shop created");
    onOpenChange(false);
    if (shopRow?.id) onCreated?.(shopRow.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{lang === "bn" ? "নতুন দোকান যুক্ত করুন" : "Add new shop"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="shop-name">{lang === "bn" ? "দোকানের নাম" : "Shop name"}</Label>
            <Input
              id="shop-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={lang === "bn" ? "যেমন: আল্লাহর দান স্টোর" : "e.g. My Shop"}
              className="h-11"
            />
          </div>
          <ShopTypePicker
            value={typeCode}
            onChange={(code) => setTypeCode(code)}
            lang={lang as "bn" | "en"}
            label={lang === "bn" ? "দোকানের ধরন" : "Shop type"}
          />
          <Button onClick={submit} disabled={busy} className="h-11 w-full">
            {busy ? "..." : lang === "bn" ? "তৈরি করুন" : "Create"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}