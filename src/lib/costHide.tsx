import { useSyncExternalStore } from "react";

const KEY = "cost-hide";
const EVENT = "cost-hide-change";

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

function subscribe(cb: () => void) {
  const handler = () => cb();
  window.addEventListener("storage", handler);
  window.addEventListener(EVENT, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(EVENT, handler);
  };
}

export function useCostHide() {
  const hidden = useSyncExternalStore(
    subscribe,
    () => read(),
    () => false,
  );
  return {
    hidden,
    toggle: () => {
      try {
        const next = !read();
        localStorage.setItem(KEY, next ? "1" : "0");
        window.dispatchEvent(new Event(EVENT));
      } catch {
        /* ignore */
      }
    },
    mask: <T,>(value: T, placeholder: string | T = "••••" as unknown as T) =>
      (hidden ? placeholder : value) as T | string,
  };
}

/** Standalone mask helper for non-hook callers. */
export function maskValue<T>(hidden: boolean, value: T, placeholder = "••••"): T | string {
  return hidden ? placeholder : value;
}