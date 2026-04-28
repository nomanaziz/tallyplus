import { useEffect, useMemo, useState } from "react";

export function usePagination<T>(items: T[], defaultPageSize = 25) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  // Reset to page 1 when filter shrinks list below current page
  useEffect(() => {
    if (page > pageCount) setPage(1);
  }, [page, pageCount]);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return { paged, page, setPage, pageSize, setPageSize, pageCount, total, from, to };
}