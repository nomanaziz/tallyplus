import { getSpeechLocale } from "@/lib/i18n";
import { Mic } from "lucide-react";
import { useRef } from "react";
import { useSpeechRecognition } from "@/lib/useSpeechRecognition";
import { useMicLevel } from "@/lib/useMicLevel";
import { toast } from "sonner";
import { parseFordoText } from "@/lib/fordoTextParser";

export type VoiceItem = { name: string; qty?: string; unit?: string };

type Props = {
  /** Called once final transcript is captured. Receives parsed items with qty/unit. */
  onItems: (items: VoiceItem[]) => void;
  className?: string;
};

export function VoiceFordoMic({ onItems, className }: Props) {
  // Track which segments have already been emitted incrementally,
  // so the final flush doesn't re-emit them.
  const emittedRef = useRef<string>("");

  const { supported, listening, error, start, stop } = useSpeechRecognition({
    lang: getSpeechLocale(),
    silenceTimeoutMs: 0,
    noSpeechTimeoutMs: 0,
    keepAlive: true,
    continuous: true,
    onSegment: (seg) => {
      const items = parseFordoText(seg);
      if (items.length > 0) {
        onItems(items);
      }
      emittedRef.current += (emittedRef.current ? " " : "") + seg;
    },
    onFinal: (text) => {
      // Flush whatever wasn't emitted as a segment yet (interim leftovers).
      const already = emittedRef.current.trim();
      const remainder = text.startsWith(already)
        ? text.slice(already.length).trim()
        : text.trim();
      if (remainder) {
        const items = parseFordoText(remainder);
        if (items.length > 0) onItems(items);
      }
      if (!emittedRef.current && !remainder) {
        toast.message("কিছু শোনা যায়নি — আবার চেষ্টা করুন");
      }
      emittedRef.current = "";
    },
  });

  const level = useMicLevel(listening);

  const handleClick = () => {
    if (!supported) {
      toast.error("আপনার browser এ voice support নেই — Chrome ব্যবহার করুন");
      return;
    }
    if (error) toast.error(error);
    if (listening) {
      stop();
    } else {
      start();
    }
  };

  return (
    <div className={`relative inline-flex items-center justify-center ${className ?? ""}`}>
      {listening && (
        <>
          <span
            className="pointer-events-none absolute inset-0 rounded-full bg-destructive/30"
            style={{
              transform: `scale(${1.2 + level * 0.8})`,
              transition: "transform 80ms linear",
            }}
            aria-hidden
          />
          <span
            className="pointer-events-none absolute inset-0 animate-ping rounded-full bg-destructive/40"
            aria-hidden
          />
        </>
      )}
      <button
        type="button"
        onClick={handleClick}
        className={`relative inline-flex h-11 w-11 flex-none items-center justify-center rounded-full shadow-md transition active:scale-95 ${
          listening
            ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        }`}
        aria-label={listening ? "রেকর্ডিং বন্ধ করুন" : "কথা বলে পণ্য যোগ করুন"}
        title={listening ? "রেকর্ডিং বন্ধ করুন" : "কথা বলে পণ্য যোগ করুন"}
      >
        <Mic className="h-5 w-5" />
      </button>
    </div>
  );
}
