import { Mic } from "lucide-react";
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
  "এক": 1, "দুই": 2, "দুটি": 2, "দুটো": 2, "তিন": 3, "তিনটি": 3,
  "চার": 4, "চারটি": 4, "পাঁচ": 5, "পাচ": 5, "ছয়": 6, "সাত": 7,
  "আট": 8, "নয়": 9, "দশ": 10, "এগারো": 11, "বারো": 12,
  "আধা": 0.5, "অর্ধ": 0.5, "আধ": 0.5,
  "দেড়": 1.5, "আড়াই": 2.5, "সাড়ে": 0.5,
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, half: 0.5,
};

const UNIT_WORDS: Array<{ re: RegExp; label: string; multiplier?: number }> = [
  { re: /^(কেজি|কিলো|কিলোগ্রাম|kg|kilo|kilogram)s?$/i, label: "কেজি" },
  { re: /^(গ্রাম|gm|gram)s?$/i, label: "গ্রাম" },
  { re: /^(লিটার|liter|litre|ltr|l)$/i, label: "লিটার" },
  { re: /^(মিলি|মিলিলিটার|ml)$/i, label: "মিলি" },
  { re: /^(পিস|পিছ|piece|pcs|pc)$/i, label: "পিস" },
  { re: /^(হালি)$/i, label: "পিস", multiplier: 4 },
  { re: /^(ডজন|dozen)$/i, label: "পিস", multiplier: 12 },
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

function matchUnit(token: string): { label: string; multiplier: number } | null {
  for (const { re, label, multiplier } of UNIT_WORDS) {
    if (re.test(token)) return { label, multiplier: multiplier ?? 1 };
  }
  return null;
}

function wordToNum(token: string): number | null {
  if (token in NUMBER_WORDS) return NUMBER_WORDS[token];
  const norm = normalizeDigits(token);
  if (/^\d+(\.\d+)?$/.test(norm)) return parseFloat(norm);
  return null;
}

function parsePhrase(phrase: string): VoiceItem {
  const cleaned = normalizeDigits(phrase.trim()).replace(/\s+/g, " ");
  if (!cleaned) return { name: "" };
  const tokens = cleaned.split(" ");
  let qty: number | null = null;
  let unit: string | null = null;
  let i = 0;

  let halfBoost = 0;
  if (tokens[i] === "সাড়ে") {
    halfBoost = 0.5;
    i++;
  }

  if (i < tokens.length) {
    const n = wordToNum(tokens[i]);
    if (n !== null) {
      qty = n + halfBoost;
      i++;
    } else if (halfBoost > 0) {
      qty = halfBoost;
    }
  }

  if (i < tokens.length && qty !== null) {
    const u = matchUnit(tokens[i]);
    if (u) {
      unit = u.label;
      qty = qty * u.multiplier;
      i++;
    }
  }

  const name = tokens.slice(i).join(" ").trim();
  if (!name) return { name: cleaned };

  return {
    name,
    qty: qty !== null ? String(qty) : undefined,
    unit: unit ?? undefined,
  };
}

function parseItems(raw: string): VoiceItem[] {
  if (!raw) return [];
  const parts = raw
    .split(/[,;।\n]+|\s+(?:ও|আর|এবং|and)\s+/gi)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length < 120);
  return parts.map(parsePhrase).filter((p) => p.name.length > 0);
}

export function VoiceFordoMic({ onItems, className }: Props) {
  const { supported, listening, error, start, stop } = useSpeechRecognition({
    lang: "bn-BD",
    silenceTimeoutMs: 12000,
    noSpeechTimeoutMs: 15000,
    onFinal: (text) => {
      const items = parseItems(text);
      if (items.length > 0) {
        onItems(items);
        toast.success(`${items.length}টি পণ্য যোগ হয়েছে`);
      } else {
        toast.message("কিছু শোনা যায়নি — আবার চেষ্টা করুন");
      }
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
        title={listening ? "রেকর্ডিং বন্ধ করুন (চুপ থাকলেও স্বয়ংক্রিয় বন্ধ হবে)" : "কথা বলে পণ্য যোগ করুন"}
      >
        <Mic className="h-5 w-5" />
      </button>
    </div>
  );
}
