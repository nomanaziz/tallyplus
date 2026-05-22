import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ShopTypePicker } from "@/components/app/ShopTypePicker";
import { BdLocationPicker, type BdLocation } from "@/components/shared/BdLocationPicker";
import { useAuth } from "@/lib/auth";
import { useShop } from "@/lib/shop";
import { useI18n, type Lang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Camera, Store, Loader2 } from "lucide-react";
import { z } from "zod";

export function AddShopDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: (shopId: string) => void;
}) {
  const { lang, t } = useI18n();
  const { user } = useAuth();
  const { refresh } = useShop();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [typeCode, setTypeCode] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [loc, setLoc] = useState<BdLocation>({ division: null, district: null, upazila: null, area: null });
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [sellOnline, setSellOnline] = useState<"yes" | "no">("no");
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setName(""); setTypeCode(null); setLogoFile(null); setLogoPreview(null);
    setLoc({ division: null, district: null, upazila: null, area: null });
    setAddress(""); setPhone(""); setSellOnline("no");
  };

  const onLogoPick = (f: File | null) => {
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) {
      toast.error(t("p7_Logo_must_be_under_2MB"));
      return;
    }
    setLogoFile(f);
    const r = new FileReader();
    r.onload = (e) => setLogoPreview(String(e.target?.result || ""));
    r.readAsDataURL(f);
  };

  const schema = z.object({
    name: z.string().trim().min(2, t("p7_Enter_shop_name")).max(80),
    typeCode: z.string().min(1, t("p7_Choose_shop_type")),
    address: z.string().trim().min(3, t("p7_Enter_address")).max(200),
    phone: z.string().regex(/^01[3-9]\d{8}$/, t("p7_Enter_valid_11_digit_BD_mobile")),
  });

  const submit = async () => {
    if (!user) return;
    const parsed = schema.safeParse({ name, typeCode: typeCode ?? "", address, phone });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setBusy(true);

    // Upload logo first if provided
    let logo_url: string | null = null;
    if (logoFile) {
      const path = `${user.id}/${Date.now()}-${logoFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("shop-logos").upload(path, logoFile, { upsert: false });
      if (upErr) {
        setBusy(false);
        toast.error(upErr.message);
        return;
      }
      const { data: pub } = supabase.storage.from("shop-logos").getPublicUrl(path);
      logo_url = pub.publicUrl;
    }

    const { data: shopRow, error } = await supabase
      .from("shops")
      .insert({
        owner_id: user.id,
        name: name.trim(),
        shop_type_code: typeCode,
        address: address.trim(),
        phone: `+88${phone}`,
        logo_url,
      })
      .select("id")
      .single();
    if (error) {
      setBusy(false);
      // Friendly message for shop limit trigger
      if (error.message.includes("shop_limit_exceeded")) {
        toast.error(
          t("p7_You_have_reached_your_plan_s_s")
        );
      } else {
        toast.error(error.message);
      }
      return;
    }

    // Save location
    if (shopRow?.id && (loc.division || loc.district || loc.upazila)) {
      await supabase.from("seller_locations").insert({
        shop_id: shopRow.id,
        division: loc.division,
        district: loc.district,
        upazila: loc.upazila,
      });
    }

    const { data: typeRow } = await supabase
      .from("shop_types")
      .select("default_categories")
      .eq("code", typeCode as string)
      .maybeSingle();
    const defaults = (typeRow?.default_categories as string[] | undefined) ?? [];
    if (shopRow?.id && defaults.length > 0) {
      await supabase.from("categories").insert(defaults.map((n) => ({ shop_id: shopRow.id, name: n })));
    }
    setBusy(false);
    reset();
    await refresh();
    toast.success(t("p7_Shop_created"));
    onOpenChange(false);
    if (shopRow?.id) onCreated?.(shopRow.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("p7_Add_New_Shop")}</DialogTitle>
        </DialogHeader>

        {/* Logo */}
        <div className="flex flex-col items-center pb-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="group relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-border bg-muted/40 hover:border-primary"
          >
            {logoPreview ? (
              <img src={logoPreview} alt="" className="h-full w-full object-cover" />
            ) : (
              <Store className="h-8 w-8 text-muted-foreground" />
            )}
            <span className="absolute inset-0 hidden items-center justify-center bg-black/40 group-hover:flex">
              <Camera className="h-5 w-5 text-white" />
            </span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onLogoPick(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="mt-2 text-xs font-semibold text-primary hover:underline"
          >
            {t("p7_Add_a_logo_of_your_Shop")}
          </button>
        </div>

        <div className="space-y-3">
          {/* Shop name */}
          <div className="space-y-1.5">
            <Label htmlFor="shop-name">
              {t("p7_Shop_Name")} <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="shop-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("p7_Shop_Name_2")}
              className="h-11"
              maxLength={80}
            />
          </div>

          {/* Shop type */}
          <div className="space-y-1.5">
            <Label>
              {t("p7_Shop_Type")} <span className="text-rose-500">*</span>
            </Label>
            <ShopTypePicker
              value={typeCode}
              onChange={(code) => setTypeCode(code)}
              lang={lang as Lang}
              label=""
            />
          </div>

          {/* Location */}
          <BdLocationPicker value={loc} onChange={setLoc} showArea={false} />

          {/* Address */}
          <div className="space-y-1.5">
            <Label>
              {t("p7_Address_2")} <span className="text-rose-500">*</span>
            </Label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="address"
              className="h-11"
              maxLength={200}
            />
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label>
              {t("p7_Input_Mobile_number")} <span className="text-rose-500">*</span>
            </Label>
            <div className="flex h-11 items-center overflow-hidden rounded-md border bg-background">
              <span className="flex h-full items-center gap-1.5 border-r bg-muted/40 px-3 text-sm font-medium">
                <span className="text-base leading-none">🇧🇩</span>
                <span>+88</span>
              </span>
              <Input
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                placeholder="XXXXXXXXXXX"
                className="h-full border-0 focus-visible:ring-0"
                maxLength={11}
              />
            </div>
          </div>

          {/* Sell online */}
          <div className="space-y-1.5">
            <Label>{t("p7_Do_you_want_to_sell_Online")}</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["yes", "no"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setSellOnline(v)}
                  className={
                    "flex items-center gap-2 rounded-md border px-3 py-2.5 text-sm transition " +
                    (sellOnline === v ? "border-primary bg-primary/5" : "border-border hover:bg-accent")
                  }
                >
                  <span
                    className={
                      "flex h-4 w-4 items-center justify-center rounded-full border-2 " +
                      (sellOnline === v ? "border-primary" : "border-muted-foreground/40")
                    }
                  >
                    {sellOnline === v && <span className="h-2 w-2 rounded-full bg-primary" />}
                  </span>
                  <span className="font-medium">{v === "yes" ? (t("p7_Yes")) : (t("p7_No_2"))}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            {t("p7_Cancel")}
          </Button>
          <Button onClick={submit} disabled={busy} className="bg-primary text-primary-foreground hover:bg-primary/90">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : (t("p7_Add_New_Shop"))}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}