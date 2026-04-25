import { useMemo } from "react";
import { Minus, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useI18n, fmtMoney } from "@/lib/i18n";

export const BDT_DENOMS = [1000, 500, 200, 100, 50, 20, 10, 5, 2, 1] as const;
export type DenomCounts = Record<string, number>;

export function denomTotal(counts: DenomCounts): number {
  let s = 0;
  for (const d of BDT_DENOMS) s += (counts[String(d)] || 0) * d;
  return s;
}

export function cleanDenoms(counts: DenomCounts): DenomCounts {
  const out: DenomCounts = {};
  for (const d of BDT_DENOMS) {
    const n = Math.max(0, Math.floor(counts[String(d)] || 0));
    if (n > 0) out[String(d)] = n;
  }
  return out;
}

export function DenominationPicker({
  counts,
  onChange,
  available,
}: {
  counts: DenomCounts;
  onChange: (next: DenomCounts) => void;
  available?: DenomCounts; // for cash-out hint
}) {
  const { lang } = useI18n();
  const total = useMemo(() => denomTotal(counts), [counts]);

  const setOne = (d: number, v: number) => {
    const n = Math.max(0, Math.floor(Number.isFinite(v) ? v : 0));
    onChange({ ...counts, [String(d)]: n });
  };

  return (
    <div className="rounded-lg border bg-card">
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b">
        <span>{lang === "bn" ? "নোট" : "Note"}</span>
        <span className="text-center">{lang === "bn" ? "সংখ্যা" : "Qty"}</span>
        <span className="text-right">{lang === "bn" ? "মোট" : "Total"}</span>
      </div>
      <div className="divide-y">
        {BDT_DENOMS.map((d) => {
          const n = counts[String(d)] || 0;
          const sub = n * d;
          const av = available?.[String(d)];
          const over = av !== undefined && n > av;
          return (
            <div key={d} className="grid grid-cols-[auto_1fr_auto] items-center gap-2 px-3 py-2">
              <div className="flex items-center gap-1 min-w-[72px]">
                <span className="text-base font-bold tabular-nums">৳{d}</span>
              </div>
              <div className="flex items-center justify-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setOne(d, n - 1)}
                  disabled={n <= 0}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  inputMode="numeric"
                  className="h-8 w-16 text-center"
                  value={n}
                  onChange={(e) => setOne(d, Number(e.target.value))}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setOne(d, n + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                {av !== undefined && (
                  <span className={`ml-2 text-[10px] ${over ? "text-rose-600 font-bold" : "text-muted-foreground"}`}>
                    {lang === "bn" ? `আছে: ${av}` : `Have: ${av}`}
                  </span>
                )}
              </div>
              <div className="text-right text-sm font-semibold tabular-nums min-w-[80px]">
                {sub > 0 ? fmtMoney(sub, lang) : "—"}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between border-t bg-muted/40 px-3 py-2">
        <span className="text-sm font-semibold">{lang === "bn" ? "মোট" : "Total"}</span>
        <span className="text-lg font-extrabold tabular-nums">{fmtMoney(total, lang)}</span>
      </div>
    </div>
  );
}