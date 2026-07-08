import { getSpeechLocale } from "@/lib/i18n";
import { Mic } from "lucide-react";
import { useSpeechRecognition } from "@/lib/useSpeechRecognition";
import { useMicLevel } from "@/lib/useMicLevel";
import { toast } from "sonner";

type Props = {
  onText: (text: string) => void;
  className?: string;
  lang?: string;
  title?: string;
  size?: "sm" | "md";
};

/**
 * Generic voice-to-text mic. Appends final transcript via `onText`.
 * Use anywhere a free-text input needs voice dictation (e.g., expense reason).
 */
export function VoiceTextMic({ onText, className, lang = getSpeechLocale(), title, size = "md" }: Props) {
  const { supported, listening, error, start, stop } = useSpeechRecognition({
    lang,
    silenceTimeoutMs: 8000,
    noSpeechTimeoutMs: 10000,
    onFinal: (t) => {
      const trimmed = t.trim();
      if (trimmed) onText(trimmed);
      else toast.message("কিছু শোনা যায়নি — আবার চেষ্টা করুন");
    },
  });
  const level = useMicLevel(listening);

  const click = () => {
    if (!supported) {
      toast.error("এই device-এ voice support নেই — Chrome (Android) ব্যবহার করুন");
      return;
    }
    if (error) toast.error(error);
    if (listening) stop();
    else start();
  };

  const dim = size === "sm" ? "h-9 w-9" : "h-11 w-11";
  const icon = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <div className={`relative inline-flex items-center justify-center ${className ?? ""}`}>
      {listening && (
        <>
          <span
            className="pointer-events-none absolute inset-0 rounded-full bg-destructive/30"
            style={{ transform: `scale(${1.2 + level * 0.8})`, transition: "transform 80ms linear" }}
            aria-hidden
          />
          <span className="pointer-events-none absolute inset-0 animate-ping rounded-full bg-destructive/40" aria-hidden />
        </>
      )}
      <button
        type="button"
        onClick={click}
        title={title ?? (listening ? "রেকর্ডিং বন্ধ করুন" : "কথা বলে লিখুন")}
        aria-label={listening ? "Stop voice" : "Start voice"}
        className={`relative inline-flex flex-none items-center justify-center rounded-full shadow-md transition active:scale-95 ${dim} ${
          listening
            ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        }`}
      >
        <Mic className={icon} />
      </button>
    </div>
  );
}