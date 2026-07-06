import { useEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

export type DateRange = { start: string; end: string };

function fmt(d: string) {
  if (!d) return "";
  const dt = new Date(d + "T00:00:00");
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${dt.getFullYear()}`;
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function monthStartIso() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function iso(d: Date) { return d.toISOString().slice(0, 10); }

function parse(s: string) { return new Date(s + "T00:00:00"); }

type Mode = "day" | "week" | "month" | "year" | "range30" | "range" | "all";

function modeOfKey(k: string): Mode {
  if (k === "today") return "day";
  if (k === "week") return "week";
  if (k === "lastMonth" || k === "month") return "month";
  if (k === "year") return "year";
  if (k === "30d") return "range30";
  if (k === "all") return "all";
  return "range";
}

/** Shift the current range by one unit based on the active mode. */
function shiftRange(value: DateRange, mode: Mode, dir: -1 | 1): DateRange {
  const s = parse(value.start);
  const e = parse(value.end);
  const stepDays = (n: number) => {
    const ns = new Date(s); ns.setDate(ns.getDate() + n * dir);
    const ne = new Date(e); ne.setDate(ne.getDate() + n * dir);
    return { start: iso(ns), end: iso(ne) };
  };
  if (mode === "day") { const nd = new Date(s); nd.setDate(nd.getDate() + dir); return { start: iso(nd), end: iso(nd) }; }
  if (mode === "week") return stepDays(7);
  if (mode === "range30") return stepDays(30);
  if (mode === "month") {
    const ns = new Date(s.getFullYear(), s.getMonth() + dir, 1);
    const ne = new Date(s.getFullYear(), s.getMonth() + dir + 1, 0);
    return { start: iso(ns), end: iso(ne) };
  }
  if (mode === "year") {
    const ns = new Date(s.getFullYear() + dir, 0, 1);
    const ne = new Date(s.getFullYear() + dir, 11, 31);
    return { start: iso(ns), end: iso(ne) };
  }
  if (mode === "all") return value;
  // range — slide by current length
  const days = Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400_000) + 1);
  return stepDays(days);
}

function bnDigits(s: string | number) {
  const map = ["০","১","২","৩","৪","৫","৬","৭","৮","৯"];
  return String(s).replace(/\d/g, (d) => map[Number(d)]);
}

function prettyLabel(value: DateRange, mode: Mode, lang: "bn" | "en"): string {
  const s = parse(value.start);
  const e = parse(value.end);
  const bn = lang === "bn";
  const monthsBn = ["জানুয়ারি","ফেব্রুয়ারি","মার্চ","এপ্রিল","মে","জুন","জুলাই","আগস্ট","সেপ্টেম্বর","অক্টোবর","নভেম্বর","ডিসেম্বর"];
  const monthsEn = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const M = (i: number) => (bn ? monthsBn[i] : monthsEn[i]);
  const N = (n: number) => (bn ? bnDigits(n) : String(n));

  if (mode === "day") {
    const today = new Date(); today.setHours(0,0,0,0);
    const y = new Date(today); y.setDate(y.getDate() - 1);
    if (iso(s) === iso(today)) return bn ? "আজ" : "Today";
    if (iso(s) === iso(y)) return bn ? "গতকাল" : "Yesterday";
    return `${N(s.getDate())} ${M(s.getMonth())} ${N(s.getFullYear())}`;
  }
  if (mode === "month") return `${M(s.getMonth())} ${N(s.getFullYear())}`;
  if (mode === "year") return N(s.getFullYear());
  if (mode === "week") return `${N(s.getDate())} ${M(s.getMonth())} – ${N(e.getDate())} ${M(e.getMonth())}`;
  if (mode === "all") return bn ? "অল টাইম" : "All time";
  return `${fmt(value.start)} — ${fmt(value.end)}`;
}

type Preset = { key: string; bn: string; en: string; fn: () => DateRange };
const PRESETS: Preset[] = [
  { key: "today", bn: "আজ", en: "Today", fn: () => ({ start: todayIso(), end: todayIso() }) },
  { key: "30d", bn: "গত ৩০ দিন", en: "Last 30 days", fn: () => { const d = new Date(); d.setDate(d.getDate() - 29); return { start: iso(d), end: todayIso() }; } },
  { key: "week", bn: "এই সপ্তাহ", en: "This week", fn: () => { const d = new Date(); const day = d.getDay(); const diff = (day + 6) % 7; d.setDate(d.getDate() - diff); return { start: iso(d), end: todayIso() }; } },
  { key: "lastMonth", bn: "গত মাস", en: "Last month", fn: () => { const d = new Date(); const s = new Date(d.getFullYear(), d.getMonth() - 1, 1); const e = new Date(d.getFullYear(), d.getMonth(), 0); return { start: iso(s), end: iso(e) }; } },
  { key: "month", bn: "এই মাস", en: "This month", fn: () => ({ start: monthStartIso(), end: todayIso() }) },
  { key: "year", bn: "এই বছর", en: "This year", fn: () => { const d = new Date(); return { start: iso(new Date(d.getFullYear(), 0, 1)), end: todayIso() }; } },
  { key: "all", bn: "অল টাইম", en: "All time", fn: () => ({ start: "2000-01-01", end: todayIso() }) },
];

export function DateRangePicker({
  value,
  onChange,
  align = "end",
  lang = "bn",
}: {
  value: DateRange;
  onChange: (v: DateRange) => void;
  align?: "start" | "end";
  lang?: "bn" | "en";
}) {
  const [open, setOpen] = useState(false);
  const matchedKey = PRESETS.find((p) => {
    const r = p.fn();
    return r.start === value.start && r.end === value.end;
  })?.key ?? null;
  const [mode, setMode] = useState<Mode>(matchedKey ? modeOfKey(matchedKey) : "range");
  // If parent replaces the value with something matching a preset, follow it.
  useEffect(() => { if (matchedKey) setMode(modeOfKey(matchedKey)); }, [matchedKey]);
  const activeKey = matchedKey ?? "custom";

  // Local draft for custom date fields — applied on "প্রয়োগ"
  const [draft, setDraft] = useState<DateRange>(value);

  const t = (bn: string, en: string) => (lang === "bn" ? bn : en);
  const label = prettyLabel(value, mode, lang);

  return (
    <div className="inline-flex items-center gap-0.5 rounded-md border bg-card">
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-8 shrink-0"
        aria-label={t("আগের", "Previous")}
        onClick={() => onChange(shiftRange(value, mode, -1))}
        disabled={mode === "all"}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setDraft(value);
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-9 min-w-[140px] gap-2 rounded-none border-x px-2 font-medium">
          <CalendarDays className="h-4 w-4" />
          <span className="text-xs">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-[440px] max-w-[95vw] p-0 overflow-hidden">
        <div className="grid grid-cols-[160px_1fr]">
          {/* Left: preset list */}
          <div className="flex flex-col gap-0.5 border-r bg-muted/30 p-2">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => { setMode(modeOfKey(p.key)); onChange(p.fn()); setOpen(false); }}
                className={
                  "h-9 rounded-md px-3 text-left text-sm font-medium transition " +
                  (activeKey === p.key
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent")
                }
              >
                {lang === "bn" ? p.bn : p.en}
              </button>
            ))}
            <button
              className={
                "h-9 rounded-md px-3 text-left text-sm font-medium transition " +
                (activeKey === "custom"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent")
              }
              onClick={() => setDraft(value)}
            >
              {t("কাস্টম", "Custom")}
            </button>
          </div>

          {/* Right: custom range editor */}
          <div className="flex flex-col p-3">
            <div className="mb-2 text-sm font-semibold">
              {t("তারিখ পরিবর্তন করুন", "Change dates")}
            </div>
            <label className="mb-2 text-xs font-medium text-muted-foreground">
              {t("শুরুর তারিখ", "Start date")}
              <input
                type="date"
                value={draft.start}
                onChange={(e) => setDraft({ ...draft, start: e.target.value })}
                className="mt-1 block h-9 w-full rounded-md border bg-background px-2 text-sm text-foreground"
              />
            </label>
            <label className="mb-3 text-xs font-medium text-muted-foreground">
              {t("শেষের তারিখ", "End date")}
              <input
                type="date"
                value={draft.end}
                onChange={(e) => setDraft({ ...draft, end: e.target.value })}
                className="mt-1 block h-9 w-full rounded-md border bg-background px-2 text-sm text-foreground"
              />
            </label>
            <div className="mt-auto flex items-center justify-end gap-2">
              <Button size="sm" variant="outline" className="h-8" onClick={() => setOpen(false)}>
                {t("বাতিল", "Cancel")}
              </Button>
              <Button size="sm" className="h-8" onClick={() => { setMode("range"); onChange(draft); setOpen(false); }}>
                {t("প্রয়োগ", "Apply")}
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-8 shrink-0"
        aria-label={t("পরের", "Next")}
        onClick={() => onChange(shiftRange(value, mode, 1))}
        disabled={mode === "all"}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}