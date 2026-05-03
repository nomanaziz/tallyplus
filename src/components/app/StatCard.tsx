import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type StatTone = "neutral" | "primary" | "success" | "danger" | "warn" | "muted";

const TONE_TEXT: Record<StatTone, string> = {
  neutral: "text-foreground",
  primary: "text-primary",
  success: "text-emerald-600",
  danger: "text-rose-600",
  warn: "text-amber-600",
  muted: "text-muted-foreground",
};

const TONE_ICON: Record<StatTone, string> = {
  neutral: "bg-muted text-foreground",
  primary: "bg-primary/10 text-primary",
  success: "bg-emerald-100 text-emerald-700",
  danger: "bg-rose-100 text-rose-600",
  warn: "bg-amber-100 text-amber-700",
  muted: "bg-muted text-muted-foreground",
};

/**
 * Unified summary/KPI card used across the app.
 * Always: white surface, 1px border, rounded-xl, tone via value color + icon chip.
 */
export function StatCard({
  label,
  value,
  sub,
  icon,
  tone = "neutral",
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  tone?: StatTone;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border bg-card p-3 sm:p-4 shadow-sm", className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs">
          {label}
        </div>
        {icon && (
          <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg", TONE_ICON[tone])}>
            {icon}
          </div>
        )}
      </div>
      <div className={cn("mt-1 text-lg font-extrabold tabular-nums sm:text-2xl", TONE_TEXT[tone])}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

/**
 * Auto-flow KPI grid. 2 cols on mobile, scales up on desktop so cards
 * naturally wrap to the next line instead of getting squashed.
 */
export function StatGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6",
        className,
      )}
    >
      {children}
    </div>
  );
}