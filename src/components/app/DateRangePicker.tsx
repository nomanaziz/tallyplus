import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarDays, X } from "lucide-react";

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
  const activeKey = PRESETS.find((p) => {
    const r = p.fn();
    return r.start === value.start && r.end === value.end;
  })?.key;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-2 font-medium">
          <CalendarDays className="h-4 w-4" />
          <span className="text-xs">
            {fmt(value.start)} - {fmt(value.end)}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-80 p-3">
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => { onChange(p.fn()); setOpen(false); }}
                className={
                  "h-9 rounded-md border px-2 text-xs font-semibold transition " +
                  (activeKey === p.key
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background hover:bg-accent")
                }
              >
                {lang === "bn" ? p.bn : p.en}
              </button>
            ))}
          </div>

          <div className="border-t pt-2">
            <div className="mb-1.5 text-xs font-semibold text-muted-foreground">
              {lang === "bn" ? "কাস্টম" : "Custom"}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={value.start}
                onChange={(e) => onChange({ ...value, start: e.target.value })}
                className="h-9 rounded-md border bg-background px-2 text-sm"
              />
              <input
                type="date"
                value={value.end}
                onChange={(e) => onChange({ ...value, end: e.target.value })}
                className="h-9 rounded-md border bg-background px-2 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs"
              onClick={() => onChange({ start: todayIso(), end: todayIso() })}
            >
              <X className="mr-1 h-3.5 w-3.5" />
              {lang === "bn" ? "ক্লিয়ার" : "Clear"}
            </Button>
            <Button size="sm" className="h-8" onClick={() => setOpen(false)}>
              {lang === "bn" ? "ঠিক আছে" : "Done"}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}