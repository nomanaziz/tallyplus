export function buildFordoShareUrl(token: string): string {
  if (typeof window === "undefined") return `/share/fordo/${token}`;
  return `${window.location.origin}/share/fordo/${token}`;
}

export async function copyFordoShareLink(token: string): Promise<boolean> {
  const url = buildFordoShareUrl(token);
  try {
    if (navigator.share) {
      await navigator.share({ title: "আমার ফর্দ", text: "আমার ফর্দ দেখুন", url });
      return true;
    }
  } catch {
    // user cancelled — fall through to copy
  }
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}

export function whatsappFordoShareUrl(token: string): string {
  const url = buildFordoShareUrl(token);
  return `https://wa.me/?text=${encodeURIComponent(`আমার ফর্দ দেখুন: ${url}`)}`;
}