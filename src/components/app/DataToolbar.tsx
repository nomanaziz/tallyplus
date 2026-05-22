import { ScanLine } from "lucide-react";
import { icons, AppIcon } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import type { ReactNode } from "react";

export function DataToolbar({
  search,
  onSearch,
  onRefresh,
  rightExtra,
  middleExtra,
  placeholder,
}: {
  search: string;
  onSearch: (v: string) => void;
  onRefresh?: () => void;
  rightExtra?: ReactNode;
  middleExtra?: ReactNode;
  placeholder?: string;
}) {
  const { lang, t } = useI18n();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-0 flex-1">
        <AppIcon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-70" />
        <Input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={placeholder ?? (t("p7_Search"))}
          className="h-10 pl-9"
        />
      </div>
      <Button variant="outline" size="icon" className="h-10 w-10 flex-none" aria-label="Barcode">
        <ScanLine className="h-4 w-4" />
      </Button>
      {middleExtra}
      {onRefresh && (
        <Button variant="outline" onClick={onRefresh} className="h-10 gap-2">
          <AppIcon name="refresh" className="h-4 w-4" />
          {t("p7_Refresh")}
        </Button>
      )}
      {rightExtra}
    </div>
  );
}