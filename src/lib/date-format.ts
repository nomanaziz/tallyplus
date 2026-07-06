// Global date format: "July 7th, 2026"
// Applied by monkey-patching Date.prototype.toLocaleDateString so every
// existing call site picks up the new format without edits.

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function formatDate(input: Date | string | number | null | undefined): string {
  if (input == null || input === "") return "";
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return "";
  return `${MONTHS[d.getMonth()]} ${ordinal(d.getDate())}, ${d.getFullYear()}`;
}

let installed = false;
export function installGlobalDateFormat() {
  if (installed || typeof Date === "undefined") return;
  installed = true;
  const proto = Date.prototype as unknown as { toLocaleDateString: (...a: unknown[]) => string };
  proto.toLocaleDateString = function () {
    return formatDate(this as unknown as Date);
  };
}