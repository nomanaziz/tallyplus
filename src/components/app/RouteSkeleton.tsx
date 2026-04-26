import { Skeleton } from "@/components/ui/skeleton";

/**
 * Generic route-level skeleton shown while a lazy chunk + loader resolve.
 * Plug into a route's `pendingComponent`. Keeps perceived latency low and
 * prevents the layout from looking frozen during navigation.
 */
export function RouteSkeleton() {
  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}