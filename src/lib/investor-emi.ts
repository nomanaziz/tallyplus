// Client-side mirror of the DB `investor_generate_schedule` function.
// Used for live EMI preview in the "নতুন বিনিয়োগ" dialog.

export type InterestType = "none" | "flat" | "reducing_monthly";

export interface EmiInput {
  principal: number;
  interestRate: number; // annual %
  interestType: InterestType;
  tenureMonths: number;
  firstDueDate: string; // YYYY-MM-DD
}

export interface EmiRow {
  seq: number;
  dueDate: string;
  principalPart: number;
  interestPart: number;
  totalDue: number;
}

export interface EmiResult {
  rows: EmiRow[];
  totalInterest: number;
  totalPayable: number;
  emi: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

function addMonths(iso: string, m: number): string {
  const [y, mo, d] = iso.split("-").map(Number);
  const nd = new Date(y, (mo - 1) + m, d);
  const yy = nd.getFullYear();
  const mm = String(nd.getMonth() + 1).padStart(2, "0");
  const dd = String(nd.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function computeSchedule(inp: EmiInput): EmiResult {
  const { principal, interestRate, interestType, tenureMonths, firstDueDate } = inp;
  if (!principal || !tenureMonths || tenureMonths < 1) {
    return { rows: [], totalInterest: 0, totalPayable: 0, emi: 0 };
  }

  const rows: EmiRow[] = [];
  let totalInterest = 0;
  let emi = 0;

  if (interestType === "none" || interestRate === 0) {
    emi = r2(principal / tenureMonths);
    let sumP = 0;
    for (let i = 1; i <= tenureMonths; i++) {
      let pp = i === tenureMonths ? r2(principal - sumP) : emi;
      sumP += pp;
      rows.push({ seq: i, dueDate: addMonths(firstDueDate, i - 1), principalPart: pp, interestPart: 0, totalDue: pp });
    }
  } else if (interestType === "flat") {
    totalInterest = r2((principal * interestRate * tenureMonths) / (100 * 12));
    const pFlat = r2(principal / tenureMonths);
    const iFlat = r2(totalInterest / tenureMonths);
    let sumP = 0, sumI = 0;
    for (let i = 1; i <= tenureMonths; i++) {
      let pp = pFlat, ip = iFlat;
      if (i === tenureMonths) {
        pp = r2(principal - sumP);
        ip = r2(totalInterest - sumI);
      }
      sumP += pp; sumI += ip;
      rows.push({ seq: i, dueDate: addMonths(firstDueDate, i - 1), principalPart: pp, interestPart: ip, totalDue: r2(pp + ip) });
    }
    emi = r2((principal + totalInterest) / tenureMonths);
  } else {
    // reducing_monthly
    const mr = interestRate / 100 / 12;
    if (mr === 0) {
      emi = r2(principal / tenureMonths);
    } else {
      emi = r2((principal * mr * Math.pow(1 + mr, tenureMonths)) / (Math.pow(1 + mr, tenureMonths) - 1));
    }
    let remaining = principal;
    for (let i = 1; i <= tenureMonths; i++) {
      let ip = r2(remaining * mr);
      let pp = r2(emi - ip);
      if (i === tenureMonths) pp = r2(remaining);
      remaining = r2(remaining - pp);
      totalInterest += ip;
      rows.push({ seq: i, dueDate: addMonths(firstDueDate, i - 1), principalPart: pp, interestPart: ip, totalDue: r2(pp + ip) });
    }
    totalInterest = r2(totalInterest);
  }

  return { rows, totalInterest, totalPayable: r2(principal + totalInterest), emi };
}

export const SOURCE_TYPES: Array<{ value: "bank" | "somiti" | "personal" | "other"; label: string }> = [
  { value: "bank", label: "ব্যাংক" },
  { value: "somiti", label: "সমিতি" },
  { value: "personal", label: "ব্যক্তিগত" },
  { value: "other", label: "অন্য" },
];

export const INTEREST_TYPES: Array<{ value: InterestType; label: string }> = [
  { value: "none", label: "সুদ নেই" },
  { value: "flat", label: "Flat (মাসিক সমান)" },
  { value: "reducing_monthly", label: "Reducing (কমতির উপর)" },
];

export const SOURCE_TYPE_LABEL: Record<string, string> = {
  bank: "ব্যাংক",
  somiti: "সমিতি",
  personal: "ব্যক্তিগত",
  other: "অন্য",
};