import { Link } from "@/lib/router";
import { useI18n } from "@/lib/i18n";
import { Sparkles, AlertCircle } from "lucide-react";
import type { UsageLimit } from "@/lib/usage-limits";

/**
 * Shows a subtle inline banner when the current shop is approaching or has
 * reached its free-plan limit for a feature (products, services, etc.).
 * Hidden entirely on paid plans (limit = -1) or when usage is below 80%.
 */
export function UsageLimitBanner({ data, label_bn, label_en }: {
  data: UsageLimit | null;
  label_bn: string;
  label_en: string;
}) {
  const { lang, t } = useI18n();
  if (!data) return null;
  if (data.limit === -1) return null;
  const ratio = data.limit > 0 ? data.used / data.limit : 1;
  if (ratio < 0.8) return null;
  const reached = data.used >= data.limit;
  const tone = reached
    ? "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300"
    : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  return (
    <div className={`mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${tone}`}>
      <div className="flex items-center gap-2">
        {reached ? <AlertCircle className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
        <span>
          {lang === "bn"
            ? `ফ্রি প্ল্যানে ${data.used}/${data.limit} ${label_bn} ব্যবহৃত — আনলিমিটেড পেতে আপগ্রেড করুন`
            : `${data.used}/${data.limit} ${label_en} used on free plan — upgrade for unlimited`}
        </span>
      </div>
      <Link to="/app/subscribe" className="rounded-full bg-primary px-3 py-1 text-[11px] font-bold text-primary-foreground hover:opacity-90">
        {t("p7_Upgrade")}
      </Link>
    </div>
  );
}