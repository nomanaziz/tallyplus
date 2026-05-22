import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n, bnNum } from "@/lib/i18n";

export function DataPagination({
  page,
  pageCount,
  pageSize,
  total,
  from,
  to,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
}: {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
  from: number;
  to: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  pageSizeOptions?: number[];
}) {
  const { lang, t } = useI18n();
  const fmt = (n: number) => (lang === "bn" ? bnNum(n) : String(n));

  // Build compact page list: 1 ... p-1 p p+1 ... last
  const pages: (number | "…")[] = [];
  const add = (x: number | "…") => pages.push(x);
  if (pageCount <= 7) {
    for (let i = 1; i <= pageCount; i++) add(i);
  } else {
    add(1);
    if (page > 3) add("…");
    for (let i = Math.max(2, page - 1); i <= Math.min(pageCount - 1, page + 1); i++) add(i);
    if (page < pageCount - 2) add("…");
    add(pageCount);
  }

  if (total === 0) return null;

  return (
    <div className="sticky bottom-0 z-10 flex flex-nowrap items-center justify-between gap-1.5 border-t bg-card/95 px-2 py-1.5 text-xs backdrop-blur sm:gap-3 sm:px-3 sm:py-2 sm:text-sm">
      {/* Left: showing X–Y / total — compact on mobile */}
      <div className="min-w-0 flex-shrink truncate text-muted-foreground tabular-nums">
        <span className="sm:hidden">{`${fmt(from)}–${fmt(to)}/${fmt(total)}`}</span>
        <span className="hidden sm:inline">
          {lang === "bn"
            ? `দেখাচ্ছে ${fmt(from)}–${fmt(to)} / মোট ${fmt(total)}`
            : `Showing ${fmt(from)}–${fmt(to)} of ${fmt(total)}`}
        </span>
      </div>

      {/* Right: per-page + nav, all in one line */}
      <div className="flex flex-none items-center gap-1 sm:gap-2">
        <span className="hidden text-xs text-muted-foreground sm:inline">
          {t("p7_Per_page")}
        </span>
        <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
          <SelectTrigger className="h-7 w-[60px] px-2 text-xs sm:h-8 sm:w-[72px] sm:text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((n) => (
              <SelectItem key={n} value={String(n)}>{fmt(n)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Mobile compact nav: ‹‹ ‹ p/total › ›› */}
        <div className="flex items-center gap-0.5 sm:hidden">
          <Button variant="outline" size="icon" className="h-7 w-7" disabled={page <= 1} onClick={() => onPageChange(1)} aria-label="First">
            <ChevronsLeft className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="icon" className="h-7 w-7" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Prev">
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="px-1 text-xs font-medium tabular-nums">
            {fmt(page)}/{fmt(pageCount)}
          </span>
          <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)} aria-label="Next">
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= pageCount} onClick={() => onPageChange(pageCount)} aria-label="Last">
            <ChevronsRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Desktop full nav */}
        <div className="hidden items-center gap-1 sm:flex">
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => onPageChange(1)} aria-label="First">
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Prev">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {pages.map((p, i) =>
            p === "…" ? (
              <span key={`e-${i}`} className="px-1 text-muted-foreground">…</span>
            ) : (
              <Button
                key={p}
                variant={p === page ? "default" : "outline"}
                size="sm"
                className="h-8 min-w-8 px-2 tabular-nums"
                onClick={() => onPageChange(p)}
              >
                {fmt(p)}
              </Button>
            ),
          )}
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)} aria-label="Next">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= pageCount} onClick={() => onPageChange(pageCount)} aria-label="Last">
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}