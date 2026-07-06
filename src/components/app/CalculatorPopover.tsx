import { useState, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calculator as CalcIcon } from "lucide-react";

export function CalculatorPopover() {
  const [open, setOpen] = useState(false);
  const [display, setDisplay] = useState("0");
  const [expr, setExpr] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const k = e.key;
      if (/^[0-9.+\-*/%]$/.test(k)) { press(k); e.preventDefault(); }
      else if (k === "Enter" || k === "=") { equals(); e.preventDefault(); }
      else if (k === "Backspace") { back(); e.preventDefault(); }
      else if (k === "Escape") { clear(); e.preventDefault(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, expr]);

  const press = (v: string) => {
    const next = (expr === "0" || expr === "") && /[0-9.]/.test(v) ? v : expr + v;
    setExpr(next);
    setDisplay(next);
  };
  const clear = () => { setExpr(""); setDisplay("0"); };
  const back = () => {
    const n = expr.slice(0, -1);
    setExpr(n);
    setDisplay(n || "0");
  };
  const equals = () => {
    if (!expr) return;
    try {
      // Only digits and math operators allowed — safe eval
      if (!/^[-+/*%().\d\s]+$/.test(expr)) throw new Error("bad");
      // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
      const r = Function(`"use strict";return (${expr})`)();
      const s = String(Math.round(Number(r) * 1e8) / 1e8);
      setDisplay(s);
      setExpr(s);
    } catch {
      setDisplay("Error");
      setExpr("");
    }
  };

  const btn = "h-10 rounded-md border bg-background text-sm font-semibold hover:bg-accent active:scale-95 transition";
  const op = btn + " bg-primary/10 text-primary";
  const eq = btn + " bg-primary text-primary-foreground hover:bg-primary/90";

  const keys: { label: string; cls?: string; onClick: () => void }[] = [
    { label: "C", cls: op, onClick: clear },
    { label: "⌫", cls: op, onClick: back },
    { label: "%", cls: op, onClick: () => press("%") },
    { label: "÷", cls: op, onClick: () => press("/") },
    { label: "7", onClick: () => press("7") },
    { label: "8", onClick: () => press("8") },
    { label: "9", onClick: () => press("9") },
    { label: "×", cls: op, onClick: () => press("*") },
    { label: "4", onClick: () => press("4") },
    { label: "5", onClick: () => press("5") },
    { label: "6", onClick: () => press("6") },
    { label: "−", cls: op, onClick: () => press("-") },
    { label: "1", onClick: () => press("1") },
    { label: "2", onClick: () => press("2") },
    { label: "3", onClick: () => press("3") },
    { label: "+", cls: op, onClick: () => press("+") },
    { label: "0", onClick: () => press("0") },
    { label: ".", onClick: () => press(".") },
    { label: "=", cls: eq + " col-span-2", onClick: equals },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          title="Calculator"
          className="hidden md:flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
        >
          <CalcIcon className="h-4 w-4" />
          <span className="sr-only">Calculator</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-3">
        <div className="mb-2 h-14 overflow-hidden rounded-md border bg-muted/40 px-3 py-2 text-right font-mono text-2xl tabular-nums leading-tight">
          {display}
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {keys.map((k, i) => (
            <button key={i} type="button" onClick={k.onClick} className={k.cls ?? btn}>
              {k.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}