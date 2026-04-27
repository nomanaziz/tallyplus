import { useEffect, useState } from "react";
import { Mic, MicOff, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSpeechRecognition } from "@/lib/useSpeechRecognition";
import { useMicLevel } from "@/lib/useMicLevel";
import { toast } from "sonner";

type Props = {
  /** Called once final transcript is captured. Receives parsed item names. */
  onItems: (items: string[]) => void;
  className?: string;
};

/** Parse a free-form spoken text into individual product/item names. */
function parseItems(raw: string): string[] {
  if (!raw) return [];
  // Split on common separators: comma, period, semicolon, "and"/"ও"/"আর", newline.
  const parts = raw
    .split(/[,;।\n]+|\s+(?:ও|আর|এবং|and)\s+/gi)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length < 120);
  return parts;
}

export function VoiceFordoMic({ onItems, className }: Props) {
  const [open, setOpen] = useState(false);
  const level = useMicLevel(open);

  const { supported, listening, transcript, error, start, stop } =
    useSpeechRecognition({
      lang: "bn-BD",
      silenceTimeoutMs: 12000,
      noSpeechTimeoutMs: 15000,
      onFinal: (text) => {
        const items = parseItems(text);
        if (items.length > 0) {
          onItems(items);
          toast.success(`${items.length}টি পণ্য যোগ হয়েছে`);
        }
      },
      onClose: () => {
        setOpen(false);
      },
    });

  // Start recognition automatically when modal opens
  useEffect(() => {
    if (open) {
      // delay slightly so AudioContext can also init
      const t = window.setTimeout(() => start(), 150);
      return () => window.clearTimeout(t);
    }
    return;
  }, [open, start]);

  const handleClick = () => {
    if (!supported) {
      toast.error("আপনার browser এ voice support নেই — Chrome ব্যবহার করুন");
      return;
    }
    setOpen(true);
  };

  const handleClose = () => {
    stop();
    setOpen(false);
  };

  // 14 animated bars
  const bars = Array.from({ length: 14 }, (_, i) => {
    // create a wave-like distribution centred in the middle
    const center = 6.5;
    const dist = Math.abs(i - center) / center; // 0 in middle, 1 at edges
    const factor = 0.4 + (1 - dist) * 0.6;
    const h = Math.max(0.08, level * factor);
    return h;
  });

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex h-11 w-11 flex-none items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition hover:bg-primary/90 active:scale-95 ${className ?? ""}`}
        aria-label="কথা বলে পণ্য যোগ করুন"
        title="কথা বলে পণ্য যোগ করুন"
      >
        <Mic className="h-5 w-5" />
      </button>

      <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : handleClose())}>
        <DialogContent className="max-w-sm rounded-3xl p-0 sm:rounded-3xl">
          <div className="relative flex flex-col items-center gap-4 p-6 pt-8">
            <button
              type="button"
              onClick={handleClose}
              className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground hover:bg-accent"
              aria-label="বন্ধ করুন"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative flex h-24 w-24 items-center justify-center">
              <span
                className="absolute inset-0 rounded-full bg-primary/20"
                style={{
                  transform: `scale(${1 + level * 0.6})`,
                  transition: "transform 80ms linear",
                }}
              />
              <span
                className="absolute inset-2 rounded-full bg-primary/30"
                style={{
                  transform: `scale(${1 + level * 0.3})`,
                  transition: "transform 80ms linear",
                }}
              />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                {listening ? <Mic className="h-7 w-7" /> : <MicOff className="h-7 w-7" />}
              </div>
            </div>

            <div className="flex h-10 items-end gap-1">
              {bars.map((h, i) => (
                <span
                  key={i}
                  className="w-1.5 rounded-full bg-primary"
                  style={{
                    height: `${Math.max(8, h * 100)}%`,
                    transition: "height 80ms linear",
                    opacity: listening ? 1 : 0.3,
                  }}
                />
              ))}
            </div>

            <div className="text-center">
              <div className="text-sm font-semibold text-foreground">
                {error
                  ? error
                  : listening
                  ? transcript
                    ? "শুনছি…"
                    : "কিছু বলুন"
                  : "শুরু হচ্ছে…"}
              </div>
              {transcript && (
                <div className="mt-2 max-h-24 overflow-y-auto rounded-lg bg-muted/40 p-2 text-xs leading-relaxed text-muted-foreground">
                  {transcript}
                </div>
              )}
              <p className="mt-3 text-[11px] text-muted-foreground">
                পণ্যগুলো comma বা "ও" দিয়ে আলাদা করে বলুন। প্রায় ১২ সেকেন্ড নীরব থাকলে স্বয়ংক্রিয়ভাবে বন্ধ হবে — অথবা নিচের বোতামে চাপুন।
              </p>
            </div>

            <Button variant="outline" size="sm" onClick={handleClose} className="w-full">
              বন্ধ করুন
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
