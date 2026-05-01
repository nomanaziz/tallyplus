// Consumer monthly history access helper
// Free: current month + previous 2 months (3 months total)
// Locked: anything older — requires consumer_history_* subscription

export type ConsumerSub = {
  plan_code?: string | null;
  expires_at?: string | null;
} | null;

const PLAN_YEARS: Record<string, number> = {
  consumer_history_1y: 1,
  consumer_history_5y: 5,
  consumer_history_10y: 10,
};

export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

/**
 * Returns true if the user can see DETAILED transactions for the given month.
 * - Current month + previous 2 months: always free
 * - Older months: requires active consumer_history_* subscription that covers
 *   the months between (oldest free month) and (the requested month).
 */
export function canAccessMonthDetail(targetMonth: Date, sub: ConsumerSub): boolean {
  const now = new Date();
  const oldestFree = addMonths(startOfMonth(now), -2); // 3 months free window
  const target = startOfMonth(targetMonth);
  if (target >= oldestFree) return true;

  if (!sub?.plan_code || !sub.expires_at) return false;
  if (new Date(sub.expires_at) < now) return false;
  const years = PLAN_YEARS[sub.plan_code] ?? 0;
  if (years <= 0) return false;

  // Plan unlocks the previous N years from oldestFree backwards
  const earliestUnlocked = addMonths(oldestFree, -years * 12);
  return target >= earliestUnlocked;
}

export function freeMonthsLabel(): string {
  return "এই মাস ও পূর্বের ২ মাস ফ্রি";
}