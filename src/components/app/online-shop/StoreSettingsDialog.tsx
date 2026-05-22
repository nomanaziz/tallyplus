import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const RESERVED = new Set([
  "app","admin","auth","shop","shops","api","pricing","affiliate","f","_",
  "login","signup","register","logout","dashboard","contact","about","help",
  "support","terms","privacy","blog","docs","pages","static","public","assets",
  "marketplace","store","stores",
]);

export function StoreSettingsDialog({
  open, onOpenChange, shop, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  shop: {
    id: string; name: string; username: string | null; tagline: string | null;
    address: string | null; phone: string | null; logo_url: string | null;
    cover_url: string | null; about: string | null; facebook_url: string | null;
    whatsapp_number: string | null; marketplace_enabled: boolean;
  };
  onSaved: () => void;
}) {
  const { lang, t } = useI18n();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [tagline, setTagline] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [about, setAbout] = useState("");
  const [facebook, setFacebook] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(shop.name ?? "");
    setUsername(shop.username ?? "");
    setTagline(shop.tagline ?? "");
    setAddress(shop.address ?? "");
    setPhone(shop.phone ?? "");
    setAbout(shop.about ?? "");
    setFacebook(shop.facebook_url ?? "");
    setWhatsapp(shop.whatsapp_number ?? "");
    setEnabled(shop.marketplace_enabled);
  }, [open, shop]);

  const validateUsername = (u: string): string | null => {
    if (!u) return t("p6_Username_required");
    if (!/^[a-z0-9][a-z0-9_-]{2,31}$/.test(u))
      return t("p6_3_32_chars_lowercase_letters_d");
    if (RESERVED.has(u))
      return t("p6_Reserved_username");
    return null;
  };

  const save = async () => {
    const err = validateUsername(username);
    if (err) { toast.error(err); return; }
    if (!name.trim()) { toast.error(t("p6_Shop_name_required")); return; }

    setSaving(true);
    const { error } = await supabase
      .from("shops")
      .update({
        name: name.trim(),
        username: username.trim().toLowerCase(),
        tagline: tagline.trim() || null,
        address: address.trim() || null,
        phone: phone.trim() || null,
        about: about.trim() || null,
        facebook_url: facebook.trim() || null,
        whatsapp_number: whatsapp.trim() || null,
        marketplace_enabled: enabled,
      })
      .eq("id", shop.id);
    setSaving(false);
    if (error) {
      if (error.code === "23505")
        toast.error(t("p6_Username_taken"));
      else
        toast.error(error.message);
      return;
    }
    toast.success(t("p6_Saved"));
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("p6_Store_Settings")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="text-sm font-semibold">
                {t("p6_Online_store_enabled")}
              </div>
              <div className="text-xs text-muted-foreground">
                {t("p6_Disable_to_hide_your_public_pa")}
              </div>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div>
            <Label>{t("p6_Shop_name")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div>
            <Label>Username *</Label>
            <div className="flex items-center gap-1">
              <span className="rounded-l-md border border-r-0 bg-muted px-2 py-2 text-xs text-muted-foreground">
                {typeof window !== "undefined" ? window.location.origin : ""}/
              </span>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                placeholder="my-shop"
                className="rounded-l-none"
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("p6_3_32_chars_lowercase_a_z_0_9")}
            </p>
          </div>

          <div>
            <Label>{t("p6_Tagline")}</Label>
            <Input value={tagline} onChange={(e) => setTagline(e.target.value)} maxLength={120} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t("p6_Phone")}</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <Label>WhatsApp</Label>
              <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+8801..." />
            </div>
          </div>

          <div>
            <Label>{t("p6_Address")}</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>

          <div>
            <Label>Facebook URL</Label>
            <Input value={facebook} onChange={(e) => setFacebook(e.target.value)} placeholder="https://facebook.com/..." />
          </div>

          <div>
            <Label>{t("p6_About")}</Label>
            <Textarea value={about} onChange={(e) => setAbout(e.target.value)} rows={3} />
          </div>
        </div>

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
