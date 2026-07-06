import { useI18n } from "@/lib/i18n";
import { useTheme, COLOR_OPTIONS, type AppColor, type AppShape } from "@/lib/theme";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Palette, Check } from "lucide-react";

function Swatches({ color, onPick }: { color: AppColor; onPick: (c: AppColor) => void }) {
  const { lang, t } = useI18n();
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {COLOR_OPTIONS.map((opt) => {
        const active = color === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onPick(opt.value)}
            title={lang === "bn" ? opt.bn : opt.en}
            className={`relative flex h-6 w-6 items-center justify-center rounded-full border-2 transition ${
              active ? "border-foreground scale-110 shadow-md" : "border-transparent hover:scale-105"
            }`}
            style={{ background: opt.swatch }}
            aria-label={opt.en}
            aria-pressed={active}
          >
            {active && <Check className="h-3 w-3 text-white drop-shadow" />}
          </button>
        );
      })}
    </div>
  );
}

function ShapePicker({ shape, onPick }: { shape: AppShape; onPick: (s: AppShape) => void }) {
  const { lang } = useI18n();
  const opts: { value: AppShape; bn: string; en: string; radius: string }[] = [
    { value: "rounded", bn: "গোলাকার", en: "Rounded", radius: "0.625rem" },
    { value: "square",  bn: "চারকোণা", en: "Square",  radius: "0rem" },
  ];
  return (
    <div className="flex items-center gap-2">
      {opts.map((o) => {
        const active = shape === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onPick(o.value)}
            aria-pressed={active}
            className={`flex items-center gap-2 border-2 px-2.5 py-1.5 text-xs font-semibold transition ${
              active ? "border-foreground bg-accent" : "border-transparent hover:bg-accent/60"
            }`}
            style={{ borderRadius: o.radius }}
          >
            <span
              className="h-4 w-4 border border-foreground/50 bg-primary"
              style={{ borderRadius: o.radius }}
            />
            {lang === "bn" ? o.bn : o.en}
          </button>
        );
      })}
    </div>
  );
}

/** Inline grid (for SettingsSheet rows). */
export function ColorThemeInline() {
  const { color, setColor, shape, setShape } = useTheme();
  const { lang, t } = useI18n();
  const current = COLOR_OPTIONS.find((o) => o.value === color);
  return (
    <div className="space-y-2">
      <Swatches color={color} onPick={setColor} />
      <div className="text-xs text-muted-foreground">
        {t("p7_Current")} {current ? (lang === "bn" ? current.bn : current.en) : ""}
      </div>
      <div className="pt-2">
        <ShapePicker shape={shape} onPick={setShape} />
      </div>
    </div>
  );
}

/** Compact popover trigger (for Topbar / SiteHeader). */
export function ColorThemeButton({ className }: { className?: string }) {
  const { color, setColor, shape, setShape } = useTheme();
  const { lang, t } = useI18n();
  const current = COLOR_OPTIONS.find((o) => o.value === color);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          aria-label={t("p7_Theme_color")}
          className={
            className ??
            "flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
          }
        >
          <Palette className="h-5 w-5" style={{ color: current?.swatch }} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-3">
        <div className="mb-2 text-xs font-semibold">
          {t("p7_App_color")}
        </div>
        <Swatches color={color} onPick={setColor} />
        <div className="mt-3 border-t pt-3">
          <div className="mb-2 text-xs font-semibold">
            {lang === "bn" ? "আকৃতি" : "Shape"}
          </div>
          <ShapePicker shape={shape} onPick={setShape} />
        </div>
      </PopoverContent>
    </Popover>
  );
}
