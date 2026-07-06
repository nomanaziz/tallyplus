// Globally converts Latin digits (0-9) in visible text to Bengali digits (০-৯).
// Skips form controls, editable content, and <code>/<pre>/<script>/<style>.
// Uses a MutationObserver so dynamically-rendered content is also converted.

const MAP: Record<string, string> = {
  "0": "০", "1": "১", "2": "২", "3": "৩", "4": "৪",
  "5": "৫", "6": "৬", "7": "৭", "8": "৮", "9": "৯",
};
const RE = /[0-9]/g;
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "CODE", "PRE", "KBD", "SAMP", "INPUT", "TEXTAREA", "SELECT", "OPTION"]);
// Class-name substrings that indicate product identifiers (barcode/serial/IMEI/SKU),
// or monospaced text where digits should stay Latin for scanning/copy-paste.
const SKIP_CLASS_HINTS = ["barcode", "serial", "imei", "sku", "font-mono"];

function hasSkipClass(el: HTMLElement): boolean {
  const c = el.className;
  const s = typeof c === "string" ? c : (c as unknown as { baseVal?: string })?.baseVal ?? "";
  if (!s) return false;
  const lower = s.toLowerCase();
  return SKIP_CLASS_HINTS.some((h) => lower.includes(h));
}

function shouldSkip(node: Node | null): boolean {
  let el: Node | null = node;
  while (el) {
    if (el.nodeType === 1) {
      const e = el as HTMLElement;
      if (SKIP_TAGS.has(e.tagName)) return true;
      if (e.isContentEditable) return true;
      if (e.getAttribute("data-no-bn-digits") !== null) return true;
      if (hasSkipClass(e)) return true;
    }
    el = el.parentNode;
  }
  return false;
}

function convertTextNode(node: Text) {
  const v = node.nodeValue;
  if (!v || !RE.test(v)) return;
  node.nodeValue = v.replace(RE, (d) => MAP[d] ?? d);
}

function walk(root: Node) {
  if (root.nodeType === 3) {
    if (!shouldSkip(root.parentNode)) convertTextNode(root as Text);
    return;
  }
  if (root.nodeType !== 1) return;
  if (shouldSkip(root)) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n: Node | null;
  while ((n = walker.nextNode())) {
    if (!shouldSkip(n.parentNode)) convertTextNode(n as Text);
  }
}

export function startBengaliDigits() {
  if (typeof document === "undefined") return;
  const run = () => {
    walk(document.body);
    const obs = new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type === "characterData" && m.target.nodeType === 3) {
          if (!shouldSkip(m.target.parentNode)) convertTextNode(m.target as Text);
        } else if (m.type === "childList") {
          m.addedNodes.forEach((n) => walk(n));
        }
      }
    });
    obs.observe(document.body, { childList: true, subtree: true, characterData: true });
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }
}