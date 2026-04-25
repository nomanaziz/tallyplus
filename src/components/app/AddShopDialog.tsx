import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShopTypePicker } from "@/components/app/ShopTypePicker";
import { useAuth } from "@/lib/auth";
import { useShop } from "@/lib/shop";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Camera, Store, Loader2 } from "lucide-react";
import { z } from "zod";

const BD_DIVISIONS = [
  "Dhaka", "Chattogram", "Rajshahi", "Khulna",
  "Barishal", "Sylhet", "Rangpur", "Mymensingh",
];

const DISTRICTS: Record<string, string[]> = {
  Dhaka: ["Dhaka", "Gazipur", "Narayanganj", "Tangail", "Manikganj", "Munshiganj", "Narsingdi", "Kishoreganj", "Faridpur", "Madaripur"],
  Chattogram: ["Chattogram", "Cox's Bazar", "Cumilla", "Feni", "Khagrachhari", "Bandarban", "Rangamati", "Noakhali", "Lakshmipur", "Brahmanbaria"],
  Rajshahi: ["Rajshahi", "Bogura", "Pabna", "Sirajganj", "Natore", "Naogaon", "Joypurhat", "Chapainawabganj"],
  Khulna: ["Khulna", "Jessore", "Satkhira", "Bagerhat", "Chuadanga", "Kushtia", "Magura", "Meherpur", "Narail", "Jhenaidah"],
  Barishal: ["Barishal", "Bhola", "Jhalokati", "Patuakhali", "Pirojpur", "Barguna"],
  Sylhet: ["Sylhet", "Habiganj", "Moulvibazar", "Sunamganj"],
  Rangpur: ["Rangpur", "Dinajpur", "Gaibandha", "Kurigram", "Lalmonirhat", "Nilphamari", "Panchagarh", "Thakurgaon"],
  Mymensingh: ["Mymensingh", "Jamalpur", "Netrokona", "Sherpur"],
};

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
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [typeCode, setTypeCode] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [division, setDivision] = useState<string>("");
  const [district, setDistrict] = useState<string>("");
  const [area, setArea] = useState<string>("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [sellOnline, setSellOnline] = useState<"yes" | "no">("no");
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setName(""); setTypeCode(null); setLogoFile(null); setLogoPreview(null);
    setDivision(""); setDistrict(""); setArea(""); setAddress(""); setPhone(""); setSellOnline("no");
  };

  const onLogoPick = (f: File | null) => {
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) {
      toast.error(lang === "bn" ? "লোগো 2MB-এর কম হতে হবে" : "Logo must be under 2MB");
      return;
    }
    setLogoFile(f);
    const r = new FileReader();
    r.onload = (e) => setLogoPreview(String(e.target?.result || ""));
    r.readAsDataURL(f);
  };

  const schema = z.object({
    name: z.string().trim().min(2, lang === "bn" ? "দোকানের নাম দিন" : "Enter shop name").max(80),
    typeCode: z.string().min(1, lang === "bn" ? "দোকানের ধরন বাছাই করুন" : "Choose shop type"),
    address: z.string().trim().min(3, lang === "bn" ? "ঠিকানা দিন" : "Enter address").max(200),
    phone: z.string().regex(/^01[3-9]\d{8}$/, lang === "bn" ? "সঠিক মোবাইল নম্বর দিন (11 digit)" : "Enter valid 11-digit BD mobile"),
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
          lang === "bn"
            ? "আপনার plan-এ অনুমোদিত দোকান সীমা শেষ। Upgrade করুন।"
            : "You have reached your plan's shop limit. Please upgrade."
        );
      } else {
        toast.error(error.message);
      }
      return;
    }

    // Save location
    if (shopRow?.id && (division || district || area)) {
      await supabase.from("seller_locations").insert({
        shop_id: shopRow.id,
        division: division || null,
        district: district || null,
        upazila: area || null,
      });
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
    reset();
    await refresh();
    toast.success(lang === "bn" ? "দোকান তৈরি হয়েছে" : "Shop created");
    onOpenChange(false);
    if (shopRow?.id) onCreated?.(shopRow.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lang === "bn" ? "নতুন দোকান যুক্ত করুন" : "Add New Shop"}</DialogTitle>
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
            {lang === "bn" ? "দোকানের লোগো যোগ করুন" : "Add a logo of your Shop"}
          </button>
        </div>

        <div className="space-y-3">
          {/* Shop name */}
          <div className="space-y-1.5">
            <Label htmlFor="shop-name">
              {lang === "bn" ? "দোকানের নাম" : "Shop Name"} <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="shop-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={lang === "bn" ? "Shop Name" : "Shop Name"}
              className="h-11"
              maxLength={80}
            />
          </div>

          {/* Shop type */}
          <div className="space-y-1.5">
            <Label>
              {lang === "bn" ? "দোকানের ধরন" : "Shop Type"} <span className="text-rose-500">*</span>
            </Label>
            <ShopTypePicker
              value={typeCode}
              onChange={(code) => setTypeCode(code)}
              lang={lang as "bn" | "en"}
              label=""
            />
          </div>

          {/* Location */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{lang === "bn" ? "বিভাগ" : "Division"}</Label>
              <Select value={division} onValueChange={(v) => { setDivision(v); setDistrict(""); }}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder={lang === "bn" ? "বিভাগ" : "division"} />
                </SelectTrigger>
                <SelectContent>
                  {BD_DIVISIONS.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{lang === "bn" ? "জেলা" : "District"}</Label>
              <Select value={district} onValueChange={setDistrict} disabled={!division}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder={lang === "bn" ? "জেলা" : "district"} />
                </SelectTrigger>
                <SelectContent>
                  {(DISTRICTS[division] ?? []).map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{lang === "bn" ? "এলাকা" : "Area"}</Label>
            <Input
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder={lang === "bn" ? "এলাকা" : "area"}
              className="h-11"
              maxLength={80}
            />
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <Label>
              {lang === "bn" ? "ঠিকানা" : "Address"} <span className="text-rose-500">*</span>
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
              {lang === "bn" ? "মোবাইল নম্বর" : "Input Mobile number"} <span className="text-rose-500">*</span>
            </Label>
            <div className="flex h-11 items-center overflow-hidden rounded-md border bg-background">
              <span className="flex h-full items-center gap-1 border-r bg-muted/40 px-3 text-sm font-medium">
                🇧🇩 +88
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
            <Label>{lang === "bn" ? "অনলাইনে বিক্রি করতে চান?" : "Do you want to sell Online?"}</Label>
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
                  <span className="font-medium">{v === "yes" ? (lang === "bn" ? "হ্যাঁ" : "Yes") : (lang === "bn" ? "না" : "No")}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            {lang === "bn" ? "বাতিল" : "Cancel"}
          </Button>
          <Button onClick={submit} disabled={busy} className="bg-foreground text-background hover:bg-foreground/90">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : (lang === "bn" ? "নতুন দোকান যুক্ত করুন" : "Add New Shop")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}