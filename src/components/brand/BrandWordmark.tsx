import { useI18n } from "@/lib/i18n";

/**
 * Branded "Tally Plus" wordmark with logo color split:
 *   - First word ("Tally" / "টালি" / "टैली")  → brand-deep (deep indigo)
 *   - Remaining word(s) ("Plus" / "প্লাস" / "प्लस") → brand-primary (periwinkle)
 *   - Trailing superscript "+" → brand-accent (coral)
 *
 * The component reads the localized app name from i18n so it works
 * across English, Bengali and Hindi without per-locale branching.
 */
export function BrandWordmark({ className }: { className?: string }) {
  const { t } = useI18n();
  const full = t("appName");
  const parts = full.split(/\s+/);
  const first = parts[0] ?? full;
  const rest = parts.slice(1).join(" ");
  return (
    <span className={className}>
      <span className="text-brand-deep">{first}</span>
      {rest && (
        <>
          {" "}
          <span className="text-brand-primary">{rest}</span>
        </>
      )}
      <sup className="text-brand-accent font-bold ml-0.5">+</sup>
    </span>
  );
}