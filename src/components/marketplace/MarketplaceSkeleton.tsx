import { Store, ShoppingBag } from "lucide-react";

export function VendorGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <>
      <div className="mb-3 h-4 w-24 animate-pulse rounded bg-muted" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex flex-col rounded-2xl border bg-card p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-muted">
                <Store className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-3.5 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                <div className="h-4 w-20 animate-pulse rounded-full bg-muted" />
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <div className="h-8 flex-1 animate-pulse rounded-lg bg-muted" />
              <div className="h-8 w-14 animate-pulse rounded-lg bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function ProductGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <>
      <div className="mb-3 h-4 w-20 animate-pulse rounded bg-muted" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-2.5">
            <div className="flex aspect-square items-center justify-center rounded-lg bg-muted">
              <ShoppingBag className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <div className="mt-2 space-y-1.5">
              <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
              <div className="h-3 w-full animate-pulse rounded bg-muted" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}