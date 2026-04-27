let loaded = false;
let loadedFor: string | null = null;

/**
 * Inject the Google AdSense bootstrap script exactly once per session.
 * Safe to call from any component on every render.
 */
export function ensureAdsenseLoaded(publisherId: string | null | undefined): void {
  if (typeof window === "undefined") return;
  if (!publisherId) return;
  // Normalize: allow either "ca-pub-XXX" or just "pub-XXX" / "XXX"
  const client = publisherId.startsWith("ca-pub-")
    ? publisherId
    : publisherId.startsWith("pub-")
      ? `ca-${publisherId}`
      : `ca-pub-${publisherId.replace(/^ca-pub-?/, "").replace(/^pub-?/, "")}`;
  if (loaded && loadedFor === client) return;
  if (document.querySelector(`script[data-adsense-client="${client}"]`)) {
    loaded = true;
    loadedFor = client;
    return;
  }
  const s = document.createElement("script");
  s.async = true;
  s.crossOrigin = "anonymous";
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
  s.setAttribute("data-adsense-client", client);
  document.head.appendChild(s);
  loaded = true;
  loadedFor = client;
}

export function pushAdsbyGoogle(): void {
  if (typeof window === "undefined") return;
  try {
    const w = window as unknown as { adsbygoogle?: unknown[] };
    w.adsbygoogle = w.adsbygoogle || [];
    (w.adsbygoogle as unknown[]).push({});
  } catch {
    /* no-op */
  }
}

export function normalizePublisherId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const t = raw.trim();
  if (!t) return null;
  if (t.startsWith("ca-pub-")) return t;
  if (t.startsWith("pub-")) return `ca-${t}`;
  return `ca-pub-${t.replace(/^ca-?/, "").replace(/^pub-?/, "")}`;
}