import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarDays } from "lucide-react";

export type DateRange = { start: string; end: string };

function fmt(d: string) {
  if (!d) return "";
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function monthStartIso() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

export function DateRangePicker({
  value,
  onChange,
  align = "end",
}: {
  value: DateRange;
  onChange: (v: DateRange) => void;
  align?: "start" | "end";
}) {
  const [open, setOpen] = useState(false);
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
      <PopoverContent align={align} className="w-72 p-3">
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Start</label>
            <input
              type="date"
              value={value.start}
              onChange={(e) => onChange({ ...value, start: e.target.value })}
              className="h-9 rounded-md border bg-background px-2 text-sm"
            />
          </div>
          <div className="grid gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground">End</label>
            <input
              type="date"
              value={value.end}
              onChange={(e) => onChange({ ...value, end: e.target.value })}
              className="h-9 rounded-md border bg-background px-2 text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              { l: "Today", fn: () => ({ start: todayIso(), end: todayIso() }) },
              {
                l: "7d",
                fn: () => {
                  const d = new Date();
                  d.setDate(d.getDate() - 6);
                  return { start: d.toISOString().slice(0, 10), end: todayIso() };
                },
              },
              {
                l: "30d",
                fn: () => {
                  const d = new Date();
                  d.setDate(d.getDate() - 29);
                  return { start: d.toISOString().slice(0, 10), end: todayIso() };
                },
              },
              { l: "Month", fn: () => ({ start: monthStartIso(), end: todayIso() }) },
            ].map((p) => (
              <Button key={p.l} size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onChange(p.fn())}>
                {p.l}
              </Button>
            ))}
          </div>
          <Button size="sm" className="h-8" onClick={() => setOpen(false)}>
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}