import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ImagePlus } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function TransferShopDialog({
  open, onOpenChange, shop,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  shop: { id: string; name: string } | null;
}) {
  const { lang } = useI18n();
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [charge, setCharge] = useState<number>(200);
  const [instructions, setInstructions] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setPhone(""); setReason(""); setProofUrl(null);
    void (async () => {
      const { data } = await supabase.from("transfer_settings").select("charge_amount,payment_instructions").eq("id", true).maybeSingle();
      if (data) {
        setCharge(Number((data as { charge_amount: number }).charge_amount) || 200);
        setInstructions((data as { payment_instructions: string | null }).payment_instructions ?? "");
      }
    })();
  }, [open]);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const { data: ud } = await supabase.auth.getUser();
      const uid = ud?.user?.id;
      if (!uid) { toast.error(lang === "bn" ? "লগইন প্রয়োজন" : "Login required"); return; }
      const path = `${uid}/transfer-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error } = await supabase.storage.from("payment-proofs").upload(path, file, { upsert: true, contentType: file.type });
      if (error) { toast.error(error.message); return; }
      const { data } = supabase.storage.from("payment-proofs").createSignedUrl
        ? await supabase.storage.from("payment-proofs").createSignedUrl(path, 60 * 60 * 24 * 30)
        : { data: null };
      setProofUrl((data?.signedUrl) ?? path);
    } finally { setUploading(false); }
  };

  const submit = async () => {
    if (!shop) return;
    if (!phone.trim()) { toast.error(lang === "bn" ? "নতুন owner-এর ফোন দিন" : "Enter recipient phone"); return; }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("request_shop_transfer", {
        _shop_id: shop.id,
        _to_phone: phone.trim(),
        _reason: reason.trim() || null,
        _payment_proof_url: proofUrl,
      });
      if (error) { toast.error(error.message); return; }
      const res = data as { ok: boolean; error?: string } | null;
      if (!res?.ok) {
        const map: Record<string, string> = {
          not_owner: lang === "bn" ? "আপনি এই দোকানের owner নন" : "You are not the owner",
          recipient_not_registered: lang === "bn" ? "এই ফোনে registered user নেই" : "No registered user with this phone",
          cannot_transfer_to_self: lang === "bn" ? "নিজের কাছে transfer করা যাবে না" : "Cannot transfer to yourself",
          transfer_already_pending: lang === "bn" ? "এই দোকানের জন্য একটি request চলমান" : "A transfer is already pending for this shop",
          invalid_phone: lang === "bn" ? "সঠিক ফোন দিন" : "Invalid phone",
        };
        toast.error(map[res?.error ?? ""] ?? res?.error ?? "Failed");
        return;
      }
      toast.success(lang === "bn" ? "Transfer request পাঠানো হয়েছে — admin verify করবে" : "Transfer request sent — admin will verify");
      onOpenChange(false);
    } finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{lang === "bn" ? "দোকান হস্তান্তর" : "Transfer Shop"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {shop && (
            <div className="rounded-md bg-muted/40 px-3 py-2 text-sm">
              <span className="text-muted-foreground">{lang === "bn" ? "দোকান: " : "Shop: "}</span>
              <span className="font-semibold">{shop.name}</span>
            </div>
          )}
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {lang === "bn"
              ? `এই হস্তান্তরের জন্য চার্জ ৳${charge}। পেমেন্ট proof আপলোড করুন। Admin verify ও recipient accept-এর পর owner change হবে।`
              : `Transfer charge: ৳${charge}. Upload payment proof. Owner changes after admin verifies and recipient accepts.`}
            {instructions && <div className="mt-1 font-semibold">{instructions}</div>}
          </div>

          <div>
            <Label className="text-xs">{lang === "bn" ? "নতুন owner-এর ফোন" : "New owner phone"}</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" />
          </div>
          <div>
            <Label className="text-xs">{lang === "bn" ? "কারণ (ঐচ্ছিক)" : "Reason (optional)"}</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
          </div>
          <div>
            <Label className="text-xs">{lang === "bn" ? "পেমেন্ট proof (screenshot)" : "Payment proof (screenshot)"}</Label>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="mt-1 flex h-24 w-full items-center justify-center gap-2 rounded-md border-2 border-dashed bg-muted/30 hover:border-primary hover:bg-primary/5"
            >
              {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5 text-muted-foreground" />}
              <span className="text-xs">{proofUrl ? (lang === "bn" ? "আপলোড হয়েছে — পরিবর্তন করতে ক্লিক করুন" : "Uploaded — click to change") : (lang === "bn" ? "ছবি আপলোড করুন" : "Upload image")}</span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ""; }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {lang === "bn" ? "বাতিল" : "Cancel"}
          </Button>
          <Button onClick={submit} disabled={submitting || uploading}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {lang === "bn" ? "Request পাঠান" : "Submit Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}