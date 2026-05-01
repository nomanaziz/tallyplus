import { type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { DateRangePicker, type DateRange } from "@/components/app/DateRangePicker";
import { RefreshCw, Printer } from "lucide-react";

export function ReportShell({
  breadcrumb,
  titleBn,
  titleEn,
  range,
  onRangeChange,
  isFetching,
  onRefresh,
  onPrint,
  children,
}: {
  breadcrumb: string;
  titleBn: string;
  titleEn: string;
  range: DateRange;
  onRangeChange: (r: DateRange) => void;
  isFetching: boolean;
  onRefresh: () => void;
  onPrint: () => void;
  children: ReactNode;
}) {
  const { lang } = useI18n();
  return (
    <div className="min-h-full bg-muted/30">
      <PageHeader
        breadcrumb={breadcrumb}
        title={lang === "bn" ? titleBn : titleEn}
        actions={
          <>
            <DateRangePicker value={range} onChange={onRangeChange} />
            <Button variant="outline" className="h-10 gap-2" onClick={onRefresh} disabled={isFetching}>
              <RefreshCw className={"h-4 w-4 " + (isFetching ? "animate-spin" : "")} />
              {lang === "bn" ? "রিফ্রেশ" : "Refresh"}
            </Button>
            <Button className="h-10 gap-2" onClick={onPrint}>
              <Printer className="h-4 w-4" />
              {lang === "bn" ? "ডাউনলোড/প্রিন্ট" : "Download/Print"}
            </Button>
          </>
        }
      />
      <div className="container space-y-3 px-3 py-3 md:space-y-4 md:px-4 md:py-4">{children}</div>
    </div>
  );
}

export function StatTile({
  label,
  value,
  tone = "primary",
  sub,
}: {
  label: string;
  value: string;
  tone?: "primary" | "success" | "danger" | "muted";
  sub?: string;
}) {
  const color =
    tone === "success" ? "text-emerald-600" :
    tone === "danger" ? "text-rose-600" :
    tone === "muted" ? "text-muted-foreground" : "text-primary";
  return (
    <div className="rounded-xl border bg-background p-3">
      <div className="text-xs font-semibold text-muted-foreground">{label}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
      <div className={"mt-1 text-xl font-extrabold md:text-2xl " + color}>{value}</div>
    </div>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border bg-background p-8 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}