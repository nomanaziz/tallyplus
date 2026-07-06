import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { bnNum } from "@/lib/i18n";

export type PeriodMode = "day" | "week" | "month" | "year";
export type PeriodRange = { start: string; end: string };
export type PeriodState = { mode: PeriodMode; anchor: string }; // anchor = ISO yyyy-mm-dd

function iso(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parse(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function todayAnchor(): string {
  return iso(new Date());
}

/** Compute the date range for a period state. */
export function rangeOf(state: PeriodState): PeriodRange {
  const a = parse(state.anchor);
  if (state.mode === "day") {
    return { start: iso(a), end: iso(a) };
  }
  if (state.mode === "week") {
    // Week = Mon..Sun containing anchor
    const day = a.getDay(); // 0=Sun..6=Sat
    const diffToMon = (day + 6) % 7;
    const s = new Date(a); s.setDate(a.getDate() - diffToMon);
    const e = new Date(s); e.setDate(s.getDate() + 6);
    return { start: iso(s), end: iso(e) };
  }
  if (state.mode === "month") {
    const s = new Date(a.getFullYear(), a.getMonth(), 1);
    const e = new Date(a.getFullYear(), a.getMonth() + 1, 0);
    return { start: iso(s), end: iso(e) };
  }
  // year
  const s = new Date(a.getFullYear(), 0, 1);
  const e = new Date(a.getFullYear(), 11, 31);
  return { start: iso(s), end: iso(e) };
}

/** Shift anchor by ±1 unit of the current mode. */
function shift(state: PeriodState, dir: -1 | 1): PeriodState {
  const a = parse(state.anchor);
  if (state.mode === "day") a.setDate(a.getDate() + dir);
  else if (state.mode === "week") a.setDate(a.getDate() + 7 * dir);
  else if (state.mode === "month") a.setMonth(a.getMonth() + dir);
  else a.setFullYear(a.getFullYear() + dir);
  return { ...state, anchor: iso(a) };
}

function label(state: PeriodState, lang: "bn" | "en"): string {
  const r = rangeOf(state);
  const s = parse(r.start);
  const e = parse(r.end);
  const bn = lang === "bn";
  const monthsBn = ["জানু", "ফেব্রু", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্ট", "অক্টো", "নভে", "ডিসে"];
  const monthsEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const M = (i: number) => (bn ? monthsBn[i] : monthsEn[i]);
  const N = (n: number) => (bn ? bnNum(n) : String(n));

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const y = new Date(today); y.setDate(y.getDate() - 1);
  const sameDay = (a: Date, b: Date) => iso(a) === iso(b);

  if (state.mode === "day") {
    if (sameDay(s, today)) return bn ? "আজ" : "Today";
    if (sameDay(s, y)) return bn ? "গতকাল" : "Yesterday";
    return `${N(s.getDate())} ${M(s.getMonth())} ${N(s.getFullYear())}`;
  }
  if (state.mode === "week") {
    return `${N(s.getDate())} ${M(s.getMonth())} – ${N(e.getDate())} ${M(e.getMonth())}`;
  }
  if (state.mode === "month") {
    return `${M(s.getMonth())} ${N(s.getFullYear())}`;
  }
  return N(s.getFullYear());
}

export function PeriodStepper({
  value,
  onChange,
  lang = "bn",
  className = "",
}: {
  value: PeriodState;
  onChange: (v: PeriodState) => void;
  lang?: "bn" | "en";
  className?: string;
}) {
  const t = (bn: string, en: string) => (lang === "bn" ? bn : en);
  const modes: { v: PeriodMode; bn: string; en: string }[] = [
    { v: "day", bn: "দৈনিক", en: "Daily" },
    { v: "week", bn: "সাপ্তাহিক", en: "Weekly" },
    { v: "month", bn: "মাসিক", en: "Monthly" },
    { v: "year", bn: "বার্ষিক", en: "Yearly" },
  ];
  const lbl = useMemo(() => label(value, lang), [value, lang]);

  return (
    <div className={`inline-flex items-center gap-1 rounded-md border bg-card p-1 ${className}`}>
      <Select
        value={value.mode}
        onValueChange={(v) => onChange({ mode: v as PeriodMode, anchor: todayAnchor() })}
      >
        <SelectTrigger className="h-8 w-[104px] border-0 shadow-none focus:ring-0 text-xs font-semibold">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {modes.map((m) => (
            <SelectItem key={m.v} value={m.v}>{lang === "bn" ? m.bn : m.en}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        aria-label={t("আগের", "Previous")}
        onClick={() => onChange(shift(value, -1))}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="min-w-[110px] px-1 text-center text-xs font-semibold sm:min-w-[140px]">
        {lbl}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        aria-label={t("পরের", "Next")}
        onClick={() => onChange(shift(value, 1))}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}