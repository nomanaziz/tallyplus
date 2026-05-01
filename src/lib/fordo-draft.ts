// Tiny localStorage helper for the public /fordo draft (survives login redirect).
const KEY = "fordo-draft-v1";

export type FordoDraftItem = { name: string; qty: string; unit: string };
export type FordoDraft = {
  items: FordoDraftItem[];
  shopId: string | null;
  shopName: string | null;
  shopLogo: string | null;
  name: string;
  phone: string;
  note: string;
  savedAt: number;
};

export function saveFordoDraft(d: Omit<FordoDraft, "savedAt">): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...d, savedAt: Date.now() }));
  } catch {
    /* ignore */
  }
}

export function loadFordoDraft(): FordoDraft | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as FordoDraft;
    // expire after 24h
    if (!d.savedAt || Date.now() - d.savedAt > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(KEY);
      return null;
    }
    return d;
  } catch {
    return null;
  }
}

export function clearFordoDraft(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
