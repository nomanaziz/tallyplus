import { useEffect, useRef } from "react";

/**
 * Detects rapid keystrokes ending in Enter — typical of USB/Bluetooth
 * barcode scanners that emulate a keyboard.
 *
 * Triggers `onScan(code)` only when the burst is ≥ minLength chars and
 * inter-key gap is below `maxGapMs`. Ignores typing while focus is in an
 * editable field, unless `whileTypingInInput` is true.
 */
export function useHardwareScanner(
  onScan: (code: string) => void,
  opts: { minLength?: number; maxGapMs?: number; enabled?: boolean } = {},
) {
  const { minLength = 4, maxGapMs = 50, enabled = true } = opts;
  const bufRef = useRef("");
  const lastTimeRef = useRef(0);
  const cb = useRef(onScan);
  cb.current = onScan;

  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      // Skip when user is typing in editable controls
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName?.toLowerCase();
      const editable =
        tag === "input" || tag === "textarea" || tag === "select" || (t && (t as HTMLElement).isContentEditable);

      const now = Date.now();
      const gap = now - lastTimeRef.current;

      if (e.key === "Enter") {
        if (bufRef.current.length >= minLength && gap < maxGapMs * 4) {
          const code = bufRef.current;
          bufRef.current = "";
          lastTimeRef.current = 0;
          if (!editable) e.preventDefault();
          cb.current(code);
          return;
        }
        bufRef.current = "";
        lastTimeRef.current = 0;
        return;
      }

      if (e.key.length !== 1) return; // ignore Shift, Ctrl, F-keys etc.

      if (gap > 100) bufRef.current = ""; // new burst
      bufRef.current += e.key;
      lastTimeRef.current = now;

      // While editable focus, only treat as scan if speed is super fast
      if (editable && gap > maxGapMs) {
        // looks like human typing — discard
        bufRef.current = "";
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [enabled, minLength, maxGapMs]);
}