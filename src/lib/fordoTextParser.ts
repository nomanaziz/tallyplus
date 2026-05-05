export type ParsedItem = { name: string; qty?: string; unit?: string };

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
  { re: /^(পিস|পিছ|piece|pcs|pc|টা|টি|খানা|খানি)$/i, label: "পিস" },
  { re: /^(হালি)$/i, label: "পিস", multiplier: 4 },
  { re: /^(ডজন|dozen)$/i, label: "পিস", multiplier: 12 },
  { re: /^(প্যাকেট|packet|pack|pkt)$/i, label: "প্যাকেট" },
  { re: /^(বোতল|bottle)$/i, label: "বোতল" },
  { re: /^(বস্তা|sack|bag)$/i, label: "বস্তা" },
  { re: /^(আঁটি|আটি|bunch)$/i, label: "আঁটি" },
  { re: /^(গজ|yard)$/i, label: "গজ" },
  { re: /^(ফুট|foot|feet|ft)$/i, label: "ফুট" },
];

const TRAILING_ONE_PIECE = /^(একটি|একটা|একখানা|একটিও)$/;

function normalizeDigits(s: string): string {
  return s.replace(/[০-৯]/g, (c) => BN_DIGITS[c] ?? c);
}

/** Replace bracketed groups with placeholders so qty/unit parser ignores them. */
function extractBrackets(s: string): { masked: string; brackets: string[] } {
  const brackets: string[] = [];
  const masked = s.replace(/\([^)]*\)|\[[^\]]*\]/g, (m) => {
    brackets.push(m);
    return `\u0001${brackets.length - 1}\u0001`;
  });
  return { masked, brackets };
}

function restoreBrackets(s: string, brackets: string[]): string {
  return s.replace(/\u0001(\d+)\u0001/g, (_m, i) => brackets[Number(i)] ?? "");
}

function matchUnit(token: string): { label: string; multiplier: number } | null {
  for (const { re, label, multiplier } of UNIT_WORDS) {
    if (re.test(token)) return { label, multiplier: multiplier ?? 1 };
  }
  return null;
}

/** Parse a single token as a number — supports words, integers, decimals, fractions like "1/2". */
function wordToNum(token: string): number | null {
  if (token in NUMBER_WORDS) return NUMBER_WORDS[token];
  const norm = normalizeDigits(token);
  if (/^\d+(\.\d+)?$/.test(norm)) return parseFloat(norm);
  const frac = norm.match(/^(\d+)\/(\d+)$/);
  if (frac) {
    const a = parseFloat(frac[1]);
    const b = parseFloat(frac[2]);
    if (b !== 0) return a / b;
  }
  // Mixed: "1+1/2"
  const mixed = norm.match(/^(\d+(?:\.\d+)?)\+(\d+)\/(\d+)$/);
  if (mixed) {
    const w = parseFloat(mixed[1]);
    const a = parseFloat(mixed[2]);
    const b = parseFloat(mixed[3]);
    if (b !== 0) return w + a / b;
  }
  return null;
}

/** Tokenize a chunk: split on whitespace, but pad punctuation/operators as own tokens. */
function tokenize(s: string): string[] {
  // Pad +, /, around numbers handled by wordToNum directly. Just split on spaces.
  // But "১ কেজি+১/২ কেজি" → split + as a separator that means "plus same item"
  return s
    .replace(/\s+/g, " ")
    .split(" ")
    .filter((t) => t.length > 0);
}

function splitChunkIntoItems(rawChunk: string): ParsedItem[] {
  const { masked, brackets } = extractBrackets(rawChunk);
  const cleaned = normalizeDigits(masked.trim());
  if (!cleaned) return [];

  // Split on "+" only when it's between qty/unit groups for SAME item — simpler:
  // we instead expand "+" into a token so we can detect "qty unit + qty unit" within
  // an item and sum them.
  const padded = cleaned.replace(/\+/g, " + ");
  const tokens = tokenize(padded);
  const items: ParsedItem[] = [];

  let nameBuf: string[] = [];
  let qty: number | null = null;
  let unit: string | null = null;
  let pendingHalf = 0;

  const flush = () => {
    let name = nameBuf.join(" ").trim();
    name = restoreBrackets(name, brackets).replace(/\s+/g, " ").trim();
    if (name || qty !== null) {
      items.push({
        name,
        qty: qty !== null ? formatQty(qty) : undefined,
        unit: unit ?? undefined,
      });
    }
    nameBuf = [];
    qty = null;
    unit = null;
    pendingHalf = 0;
  };

  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];

    // "+" between qty/unit groups inside same item → keep accumulating
    if (t === "+") {
      i++;
      // expect: number [unit]
      if (i < tokens.length) {
        const n = wordToNum(tokens[i]);
        if (n !== null) {
          let add = n;
          i++;
          if (i < tokens.length) {
            const u = matchUnit(tokens[i]);
            if (u) {
              add = add * u.multiplier;
              if (!unit) unit = u.label;
              i++;
            }
          }
          qty = (qty ?? 0) + add;
        }
      }
      continue;
    }

    if (t === "সাড়ে") {
      pendingHalf = 0.5;
      i++;
      continue;
    }

    if (TRAILING_ONE_PIECE.test(t) && nameBuf.length > 0 && qty === null) {
      qty = 1;
      unit = "পিস";
      i++;
      flush();
      continue;
    }

    const n = wordToNum(t);
    if (n !== null) {
      qty = n + pendingHalf;
      pendingHalf = 0;
      i++;
      if (i < tokens.length) {
        const u = matchUnit(tokens[i]);
        if (u) {
          unit = u.label;
          qty = qty * u.multiplier;
          i++;
        }
      }
      // peek for "+" to keep summing this item
      if (tokens[i] === "+") continue;

      if (nameBuf.length > 0) {
        flush();
      }
      continue;
    }

    nameBuf.push(t);
    i++;

    if (qty !== null && nameBuf.length >= 1) {
      const next = tokens[i];
      if (next !== undefined) {
        if (next === "সাড়ে" || wordToNum(next) !== null) {
          flush();
        }
      }
    }
  }

  if (qty === null && pendingHalf > 0) qty = pendingHalf;
  flush();

  // Post-process: an item that is ONLY a bracketed annotation (e.g. "(নরম দেখে)")
  // should be appended to the previous item's name rather than standing alone.
  for (let j = items.length - 1; j > 0; j--) {
    const it = items[j];
    const onlyBracket = !!it.name && /^[(\[].*[)\]]$/.test(it.name) && !it.qty && !it.unit;
    if (onlyBracket) {
      items[j - 1].name = `${items[j - 1].name} ${it.name}`.trim();
      items.splice(j, 1);
    }
  }

  return items;
}

function formatQty(n: number): string {
  // Trim trailing zeros: 1.5 → "1.5", 4 → "4", 1.25 → "1.25"
  return Number.isInteger(n) ? String(n) : String(parseFloat(n.toFixed(3)));
}

/** Public: parse free-form Bangla shopping list text into items. */
export function parseFordoText(raw: string): ParsedItem[] {
  if (!raw) return [];
  // Strip leading bullets/markers
  const cleaned = raw.replace(/^[\s\u200b•\-_*–—]+/gm, "");
  // Split on sentence/list separators
  const parts = cleaned
    .split(/[,;।\n]+|\s+(?:ও|আর|এবং|and)\s+/gi)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length < 240);
  const out: ParsedItem[] = [];
  for (const p of parts) {
    for (const it of splitChunkIntoItems(p)) {
      if (it.name.trim() || it.qty) out.push(it);
    }
  }
  return out;
}

// Backward-compat alias used by VoiceFordoMic
export const parseItems = parseFordoText;