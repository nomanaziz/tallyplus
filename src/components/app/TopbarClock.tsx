import { useEffect, useState } from "react";

// Lightweight ticking clock — one setInterval, no re-render churn beyond
// the small clock <span>. Format: HH:MM:SS (24h) with weekday.
export function TopbarClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return (
    <div
      className="hidden items-center rounded-md px-2 py-1 text-sm font-semibold tabular-nums text-muted-foreground sm:flex"
      title={now.toLocaleString()}
      data-no-bn-digits
    >
      <span className="font-mono">{hh}:{mm}:{ss}</span>
    </div>
  );
}