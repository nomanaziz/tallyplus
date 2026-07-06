import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type AppColor = "indigo" | "green" | "blue" | "red" | "yellow" | "soft-dark";
export type AppShape = "rounded" | "square";

const KEY = "tp_theme_color";
const SHAPE_KEY = "tp_theme_shape";
const DEFAULT: AppColor = "indigo";
const DEFAULT_SHAPE: AppShape = "rounded";
const ALL: AppColor[] = ["indigo", "green", "blue", "red", "yellow", "soft-dark"];
const ALL_SHAPES: AppShape[] = ["rounded", "square"];

type Ctx = {
  color: AppColor;
  setColor: (c: AppColor) => void;
  shape: AppShape;
  setShape: (s: AppShape) => void;
};
const ThemeCtx = createContext<Ctx>({
  color: DEFAULT, setColor: () => {},
  shape: DEFAULT_SHAPE, setShape: () => {},
});

function apply(c: AppColor) {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  html.setAttribute("data-theme", c);
  html.classList.toggle("dark", c === "soft-dark");
}

function applyShape(s: AppShape) {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  html.setAttribute("data-shape", s);
  // Override the design-token base radius. Tailwind's --radius-sm/md/lg/xl
  // are all derived from --radius, so this cascades to every rounded-*
  // utility and shadcn component.
  html.style.setProperty("--radius", s === "square" ? "0rem" : "0.625rem");
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [color, setColorState] = useState<AppColor>(DEFAULT);
  const [shape, setShapeState] = useState<AppShape>(DEFAULT_SHAPE);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(KEY) as AppColor | null;
    const initial: AppColor = saved && ALL.includes(saved) ? saved : DEFAULT;
    setColorState(initial);
    apply(initial);
    const savedShape = localStorage.getItem(SHAPE_KEY) as AppShape | null;
    const initShape: AppShape = savedShape && ALL_SHAPES.includes(savedShape) ? savedShape : DEFAULT_SHAPE;
    setShapeState(initShape);
    applyShape(initShape);
  }, []);

  const setColor = (c: AppColor) => {
    setColorState(c);
    apply(c);
    try { localStorage.setItem(KEY, c); } catch (err) { void err; }
  };

  const setShape = (s: AppShape) => {
    setShapeState(s);
    applyShape(s);
    try { localStorage.setItem(SHAPE_KEY, s); } catch (err) { void err; }
  };

  return <ThemeCtx.Provider value={{ color, setColor, shape, setShape }}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => useContext(ThemeCtx);

export const COLOR_OPTIONS: { value: AppColor; bn: string; en: string; swatch: string }[] = [
  { value: "indigo",    bn: "ব্র্যান্ড",  en: "Brand (Indigo)", swatch: "oklch(0.62 0.16 275)" },
  { value: "green",     bn: "সবুজ",     en: "Green",     swatch: "oklch(0.62 0.18 145)" },
  { value: "blue",      bn: "নীল",      en: "Blue",      swatch: "oklch(0.55 0.20 255)" },
  { value: "red",       bn: "লাল",      en: "Red",       swatch: "oklch(0.58 0.22 25)" },
  { value: "yellow",    bn: "হলুদ",     en: "Yellow",    swatch: "oklch(0.78 0.17 90)" },
  { value: "soft-dark", bn: "ডার্ক",    en: "Soft Dark", swatch: "oklch(0.30 0.014 250)" },
];
