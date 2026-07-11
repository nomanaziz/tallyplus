import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";

export type DatePreset = "today" | "week" | "month" | "3m" | "6m" | "year" | "custom";

const iso = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export function rangeForPreset(preset: DatePreset): { from: string; to: string } | null {
  const today = new Date();
  const to = iso(today);
  if (preset === "custom") return null;
  const from = new Date(today);
  switch (preset) {
    case "today": break;
    case "week": from.setDate(from.getDate() - 6); break;
    case "month": from.setDate(from.getDate() - 29); break;
    case "3m": from.setMonth(from.getMonth() - 3); break;
    case "6m": from.setMonth(from.getMonth() - 6); break;
    case "year": from.setFullYear(from.getFullYear() - 1); break;
  }
  return { from: iso(from), to };
}

export function todayIso() { return iso(new Date()); }

export function DateRangePresets({
  preset,
  from,
  to,
  onChange,
}: {
  preset: DatePreset;
  from: string;
  to: string;
  onChange: (v: { preset: DatePreset; from: string; to: string }) => void;
}) {
  const { lang } = useI18n();
  const labels = useMemo(() => (lang === "bn"
    ? { today: "আজ", week: "৭ দিন", month: "৩০ দিন", "3m": "৩ মাস", "6m": "৬ মাস", year: "১ বছর", custom: "কাস্টম" }
    : { today: "Today", week: "7 days", month: "30 days", "3m": "3 mo", "6m": "6 mo", year: "1 yr", custom: "Custom" }
  ), [lang]);
  const opts: DatePreset[] = ["today", "week", "month", "3m", "6m", "year", "custom"];
  const pick = (p: DatePreset) => {
    if (p === "custom") { onChange({ preset: p, from, to }); return; }
    const r = rangeForPreset(p)!;
    onChange({ preset: p, from: r.from, to: r.to });
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {opts.map((p) => (
        <Button
          key={p}
          type="button"
          size="sm"
          variant={preset === p ? "default" : "outline"}
          onClick={() => pick(p)}
          className="h-8 px-2 text-xs"
        >
          {labels[p]}
        </Button>
      ))}
      {preset === "custom" && (
        <>
          <Input
            type="date"
            value={from}
            onChange={(e) => onChange({ preset: "custom", from: e.target.value, to })}
            className="h-8 w-[135px] text-xs"
          />
          <span className="text-xs text-muted-foreground">→</span>
          <Input
            type="date"
            value={to}
            onChange={(e) => onChange({ preset: "custom", from, to: e.target.value })}
            className="h-8 w-[135px] text-xs"
          />
        </>
      )}
    </div>
  );
}