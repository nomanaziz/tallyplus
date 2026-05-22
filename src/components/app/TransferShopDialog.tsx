import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ImagePlus, CreditCard, Wallet } from "lucide-react";
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
  const { lang, t } = useI18n();
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [txnId, setTxnId] = useState("");
  const [method, setMethod] = useState<"online" | "manual">("online");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [charge, setCharge] = useState<number>(200);
  const [instructions, setInstructions] = useState<string>("");
  const [payNumber, setPayNumber] = useState<string>("");
  const [payAcct, setPayAcct] = useState<string>("");
  const [payProvider, setPayProvider] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setPhone(""); setReason(""); setProofUrl(null); setTxnId(""); setMethod("online");
    void (async () => {
      const { data } = await supabase.from("transfer_settings")
        .select("charge_amount,payment_instructions,payment_number,payment_account_type,payment_provider_label")
        .eq("id", true).maybeSingle();
      if (data) {
        const d = data as {
          charge_amount: number;
          payment_instructions: string | null;
          payment_number: string | null;
          payment_account_type: string | null;
          payment_provider_label: string | null;
        };
        setCharge(Number(d.charge_amount) || 200);
        setInstructions(d.payment_instructions ?? "");
        setPayNumber(d.payment_number ?? "");
        setPayAcct(d.payment_account_type ?? "");
        setPayProvider(d.payment_provider_label ?? "");
      }
    })();
  }, [open]);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const { data: ud } = await supabase.auth.getUser();
      const uid = ud?.user?.id;
      if (!uid) { toast.error(t("p7_Login_required")); return; }
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
    if (!phone.trim()) { toast.error(t("p7_Enter_recipient_phone")); return; }
    if (method === "manual") {
      if (!proofUrl) { toast.error(t("p7_Upload_payment_screenshot")); return; }
      if (!txnId.trim()) { toast.error(t("p7_Enter_Transaction_ID")); return; }
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("request_shop_transfer", {
        _shop_id: shop.id,
        _to_phone: phone.trim(),
        _reason: (reason.trim() || null) as unknown as string,
        _payment_proof_url: (method === "manual" ? proofUrl : null) as unknown as string,
        _payment_method: method,
        _payment_txn_id: (method === "manual" ? txnId.trim() : null) as unknown as string,
      });
      if (error) { toast.error(error.message); return; }
      const res = data as { ok: boolean; error?: string; id?: string } | null;
      if (!res?.ok) {
        const map: Record<string, string> = {
          not_owner: t("p7_You_are_not_the_owner"),
          recipient_not_registered: t("p7_No_registered_user_with_this_p"),
          cannot_transfer_to_self: t("p7_Cannot_transfer_to_yourself"),
          transfer_already_pending: t("p7_A_transfer_is_already_pending_"),
          invalid_phone: t("p7_Invalid_phone"),
        };
        toast.error(map[res?.error ?? ""] ?? res?.error ?? "Failed");
        return;
      }
      if (method === "online" && res.id) {
        // Kick off Recharge Server payment
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const { data: pd, error: perr } = await supabase.functions.invoke("transfer-create-payment", {
          body: { transfer_id: res.id, origin },
        });
        if (perr || !pd?.payment_url) {
          toast.error(perr?.message ?? pd?.error ?? "Payment session failed");
          return;
        }
        window.location.href = pd.payment_url as string;
        return;
      }
      toast.success(t("p7_Request_sent_admin_will_verify_2"));
      onOpenChange(false);
    } finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("p7_Transfer_Shop")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {shop && (
            <div className="rounded-md bg-muted/40 px-3 py-2 text-sm">
              <span className="text-muted-foreground">{t("p7_Shop")}</span>
              <span className="font-semibold">{shop.name}</span>
            </div>
          )}
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {lang === "bn"
              ? `এই হস্তান্তরের জন্য চার্জ ৳${charge}। Recipient accept করার পর owner change হবে।`
              : `Transfer charge: ৳${charge}. Owner changes after recipient accepts.`}
          </div>

          <div>
            <Label className="text-xs">{t("p7_New_owner_phone")}</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" />
          </div>
          <div>
            <Label className="text-xs">{t("p7_Reason_optional")}</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
          </div>

          {/* Payment method selector */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMethod("online")}
              className={`flex flex-col items-center gap-1 rounded-md border-2 p-3 text-xs transition ${method === "online" ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/50"}`}
            >
              <CreditCard className="h-5 w-5" />
              <span className="font-semibold">{t("p7_Online_Payment")}</span>
              <span className="text-[10px] text-muted-foreground">{t("p7_Instant")}</span>
            </button>
            <button
              type="button"
              onClick={() => setMethod("manual")}
              className={`flex flex-col items-center gap-1 rounded-md border-2 p-3 text-xs transition ${method === "manual" ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/50"}`}
            >
              <Wallet className="h-5 w-5" />
              <span className="font-semibold">{t("p7_Manual_Payment")}</span>
              <span className="text-[10px] text-muted-foreground">bKash/Nagad</span>
            </button>
          </div>

          {method === "manual" && (
            <div className="space-y-3 rounded-md border border-blue-200 bg-blue-50/50 p-3">
              <div className="text-xs text-blue-900">
                <div className="font-bold text-sm">
                  {t("p7_Send_to_this_number")}
                </div>
                {payNumber ? (
                  <div className="mt-1 text-base font-extrabold tracking-wider">{payNumber}</div>
                ) : (
                  <div className="mt-1 italic text-muted-foreground">{t("p7_Admin_has_not_set_a_number_yet")}</div>
                )}
                <div className="mt-1 flex flex-wrap gap-2 text-[11px]">
                  {payProvider && <span className="rounded bg-blue-100 px-1.5 py-0.5 font-semibold">{payProvider}</span>}
                  {payAcct && <span className="rounded bg-blue-100 px-1.5 py-0.5 font-semibold capitalize">{payAcct}</span>}
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 font-bold">৳{charge}</span>
                </div>
                {instructions && <div className="mt-2 whitespace-pre-wrap">{instructions}</div>}
              </div>

              <div>
                <Label className="text-xs">{t("p7_Transaction_ID_3")}</Label>
                <Input value={txnId} onChange={(e) => setTxnId(e.target.value)} placeholder="TXN123456" />
              </div>
              <div>
                <Label className="text-xs">{t("p7_Payment_screenshot")}</Label>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="mt-1 flex h-24 w-full items-center justify-center gap-2 rounded-md border-2 border-dashed bg-muted/30 hover:border-primary hover:bg-primary/5"
                >
                  {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5 text-muted-foreground" />}
                  <span className="text-xs">{proofUrl ? (t("p7_Uploaded_click_to_change")) : (t("p7_Upload_image"))}</span>
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
          )}

          {method === "online" && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-emerald-900">
              {lang === "bn"
                ? `Submit করলে Recharge Server-এ ৳${charge} পেমেন্ট করতে যাবে। সফল হলে recipient-এর কাছে অনুরোধ চলে যাবে।`
                : `On submit, you will be redirected to Recharge Server to pay ৳${charge}. On success, the recipient will be notified.`}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("p7_Cancel")}
          </Button>
          <Button onClick={submit} disabled={submitting || uploading}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {method === "online"
              ? (lang === "bn" ? `৳${charge} পেমেন্ট করুন` : `Pay ৳${charge}`)
              : (t("p7_Submit_Request_2"))}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}