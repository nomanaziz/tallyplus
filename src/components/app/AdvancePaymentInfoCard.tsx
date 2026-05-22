import { Copy, BadgeDollarSign } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

type Props = {
  amount: number;
  paid: boolean;
  method?: string | null;
  txnId?: string | null;
  payerPhone?: string | null;
  customerPhone: string;
};

export function AdvancePaymentInfoCard({ amount, paid, method, txnId, payerPhone, customerPhone }: Props) {
  const { lang, t } = useI18n();
  if (!amount || amount <= 0) return null;
  const sender = (payerPhone && payerPhone.trim()) || customerPhone;

  const copy = async (val: string, label: string) => {
    try {
      await navigator.clipboard.writeText(val);
      toast.success((t("p7_Copied")) + label);
    } catch {
      toast.error(t("p7_Copy_failed"));
    }
  };

  return (
    <div className={`mt-2 rounded-lg border p-2.5 text-xs ${paid ? "border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/30" : "border-amber-300 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/30"}`}>
      <div className="flex items-center justify-between gap-2 font-semibold">
        <span className="inline-flex items-center gap-1">
          <BadgeDollarSign className="h-3.5 w-3.5" />
          {t("p7_Advance_payment")}
          {method && <span className="ml-1 rounded-full bg-background/80 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">{method}</span>}
        </span>
        <span>৳{Number(amount).toLocaleString("bn-BD")} {paid ? (t("p7_paid")) : (t("p7_unpaid"))}</span>
      </div>
      <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
        <CopyRow label={t("p7_Sender_number")} value={sender} onCopy={() => copy(sender, t("p7_number"))} />
        <CopyRow label={t("p7_Transaction_ID")} value={txnId ?? "—"} disabled={!txnId} onCopy={() => txnId && copy(txnId, "TxnID")} />
      </div>
    </div>
  );
}

function CopyRow({ label, value, onCopy, disabled }: { label: string; value: string; onCopy: () => void; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border bg-background/60 px-2 py-1.5">
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="truncate font-mono text-xs">{value}</div>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={onCopy}
        className="inline-flex h-7 w-7 items-center justify-center rounded-md border bg-background hover:bg-accent disabled:opacity-40"
        aria-label="Copy"
      >
        <Copy className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}