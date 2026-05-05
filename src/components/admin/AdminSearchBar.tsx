import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

export function AdminSearchBar({
  value,
  onChange,
  placeholder,
  count,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  count?: number;
  className?: string;
}) {
  const { lang } = useI18n();
  const ph = placeholder ?? (lang === "bn" ? "খুঁজুন..." : "Search...");
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative w-full sm:w-72">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-60" />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={ph}
          className="h-9 pl-9 pr-8"
        />
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
            onClick={() => onChange("")}
            aria-label="Clear"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      {typeof count === "number" && value && (
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {count} {lang === "bn" ? "ফলাফল" : "results"}
        </span>
      )}
    </div>
  );
}

export function matches(query: string, ...fields: Array<string | number | null | undefined>) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some((f) => (f ?? "").toString().toLowerCase().includes(q));
}