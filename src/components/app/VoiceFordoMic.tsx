import { useEffect, useState } from "react";
import { Mic, MicOff, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSpeechRecognition } from "@/lib/useSpeechRecognition";
import { useMicLevel } from "@/lib/useMicLevel";
import { toast } from "sonner";

export type VoiceItem = { name: string; qty?: string; unit?: string };

type Props = {
  /** Called once final transcript is captured. Receives parsed items with qty/unit. */
  onItems: (items: VoiceItem[]) => void;
  className?: string;
};

/** Bengali digit → ASCII digit map. */
const BN_DIGITS: Record<string, string> = {
  "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4",
  "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9",
};

/** Spoken Bengali/English number words → numeric value. */
const NUMBER_WORDS: Record<string, number> = {
  // Bengali
  "এক": 1, "দুই": 2, "দুটি": 2, "দুটো": 2, "তিন": 3, "তিনটি": 3,
  "চার": 4, "চারটি": 4, "পাঁচ": 5, "পাচ": 5, "ছয়": 6, "সাত": 7,
  "আট": 8, "নয়": 9, "দশ": 10, "এগারো": 11, "বারো": 12,
  "আধা": 0.5, "অর্ধ": 0.5, "আধ": 0.5,
  "দেড়": 1.5, "আড়াই": 2.5, "সাড়ে": 0.5, // "সাড়ে" is a modifier, handled below
  // English (in case of mixed transcripts)
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, half: 0.5,
};

/** Common unit words → canonical short label. */
const UNIT_WORDS: Array<{ re: RegExp; label: string }> = [
  { re: /^(কেজি|কিলো|কিলোগ্রাম|kg|kilo|kilogram)s?$/i, label: "কেজি" },
  { re: /^(গ্রাম|gm|gram)s?$/i, label: "গ্রাম" },
  { re: /^(লিটার|liter|litre|ltr|l)$/i, label: "লিটার" },
  { re: /^(মিলি|মিলিলিটার|ml)$/i, label: "মিলি" },
  { re: /^(পিস|পিছ|piece|pcs|pc)$/i, label: "পিস" },
  { re: /^(হালি)$/i, label: "হালি" },        // 4
  { re: /^(ডজন|dozen)$/i, label: "ডজন" },    // 12
  { re: /^(প্যাকেট|packet|pack|pkt)$/i, label: "প্যাকেট" },
  { re: /^(বোতল|bottle)$/i, label: "বোতল" },
  { re: /^(বস্তা|sack|bag)$/i, label: "বস্তা" },
  { re: /^(আঁটি|আটি|bunch)$/i, label: "আঁটি" },
  { re: /^(গজ|yard)$/i, label: "গজ" },
  { re: /^(ফুট|foot|feet|ft)$/i, label: "ফুট" },
];

function normalizeDigits(s: string): string {
  return s.replace(/[০-৯]/g, (c) => BN_DIGITS[c] ?? c);
}

function matchUnit(token: string): string | null {
  for (const { re, label } of UNIT_WORDS) if (re.test(token)) return label;
  return null;
}

function wordToNum(token: string): number | null {
  if (token in NUMBER_WORDS) return NUMBER_WORDS[token];
  const norm = normalizeDigits(token);
  if (/^\d+(\.\d+)?$/.test(norm)) return parseFloat(norm);
  return null;
}

/** Parse one phrase like "এক কেজি চাল" → { qty: "1", unit: "কেজি", name: "চাল" }. */
function parsePhrase(phrase: string): VoiceItem {
  const cleaned = normalizeDigits(phrase.trim()).replace(/\s+/g, " ");
  if (!cleaned) return { name: "" };
  const tokens = cleaned.split(" ");
  let qty: number | null = null;
  let unit: string | null = null;
  let i = 0;

  // Handle "সাড়ে <num>" prefix → 0.5 + num
  let halfBoost = 0;
  if (tokens[i] === "সাড়ে") {
    halfBoost = 0.5;
    i++;
  }

  // Read up to 2 leading number tokens (e.g. "এক" "কেজি", or "1.5" "kg", or "দেড়")
  if (i < tokens.length) {
    const n = wordToNum(tokens[i]);
    if (n !== null) {
      qty = n + halfBoost;
      i++;
    } else if (halfBoost > 0) {
      qty = halfBoost;
    }
  }

  // Optional unit token immediately after qty
  if (i < tokens.length && qty !== null) {
    const u = matchUnit(tokens[i]);
    if (u) {
      unit = u;
      i++;
    }
  }

  // Remaining tokens = product name
  const name = tokens.slice(i).join(" ").trim();

  // If we couldn't extract a name (qty-only utterance), fall back to whole phrase
  if (!name) return { name: cleaned };

  return {
    name,
    qty: qty !== null ? String(qty) : undefined,
    unit: unit ?? undefined,
  };
}

/** Parse a free-form spoken text into individual product items with qty/unit. */
function parseItems(raw: string): VoiceItem[] {
  if (!raw) return [];
  const parts = raw
    .split(/[,;।\n]+|\s+(?:ও|আর|এবং|and)\s+/gi)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length < 120);
  return parts.map(parsePhrase).filter((p) => p.name.length > 0);
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
