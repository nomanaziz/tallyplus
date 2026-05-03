import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ActionTone = "success" | "danger" | "primary";

const TONE: Record<ActionTone, { icon: string; ring: string; text: string }> = {
  success: {
    icon: "bg-emerald-100 text-emerald-700",
    ring: "hover:border-emerald-300 hover:ring-2 hover:ring-emerald-100",
    text: "text-emerald-700",
  },
  danger: {
    icon: "bg-rose-100 text-rose-600",
    ring: "hover:border-rose-300 hover:ring-2 hover:ring-rose-100",
    text: "text-rose-600",
  },
  primary: {
    icon: "bg-primary/10 text-primary",
    ring: "hover:border-primary/40 hover:ring-2 hover:ring-primary/10",
    text: "text-primary",
  },
};

export type ActionTile = {
  label: ReactNode;
  icon: ReactNode;
  onClick?: () => void;
  tone: ActionTone;
  sub?: ReactNode;
};

/**
 * Unified row of large action tiles (e.g. "Cash In / Cash Out", "Invest / Withdraw").
 * Flat card surface, tone communicated via icon chip + label color, never a colored fill.
 */
export function ActionTilePair({ tiles, className }: { tiles: ActionTile[]; className?: string }) {
  return (
    <div className={cn("grid gap-3", tiles.length === 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-" + tiles.length, className)}>
      {tiles.map((t, i) => {
        const tone = TONE[t.tone];
        return (
          <button
            key={i}
            type="button"
            onClick={t.onClick}
            className={cn(
              "group flex items-center justify-center gap-3 rounded-xl border bg-card px-4 py-4 shadow-sm transition active:scale-[0.99]",
              tone.ring,
            )}
          >
            <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", tone.icon)}>
              {t.icon}
            </span>
            <span className="flex flex-col text-left">
              <span className={cn("text-sm font-extrabold sm:text-base", tone.text)}>{t.label}</span>
              {t.sub && <span className="text-[11px] text-muted-foreground">{t.sub}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}