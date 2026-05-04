// International country directory with dial codes, flags, default currencies.
export type Country = {
  code: string; // ISO-2
  name: string;
  flag: string;
  dial: string;
  currency: string;
};

export const COUNTRIES: Country[] = [
  { code: "BD", name: "Bangladesh", flag: "🇧🇩", dial: "880", currency: "BDT" },
  { code: "IN", name: "India", flag: "🇮🇳", dial: "91", currency: "INR" },
  { code: "PK", name: "Pakistan", flag: "🇵🇰", dial: "92", currency: "PKR" },
  { code: "LK", name: "Sri Lanka", flag: "🇱🇰", dial: "94", currency: "LKR" },
  { code: "NP", name: "Nepal", flag: "🇳🇵", dial: "977", currency: "NPR" },
  { code: "BT", name: "Bhutan", flag: "🇧🇹", dial: "975", currency: "BTN" },
  { code: "MV", name: "Maldives", flag: "🇲🇻", dial: "960", currency: "MVR" },
  { code: "AF", name: "Afghanistan", flag: "🇦🇫", dial: "93", currency: "AFN" },
  { code: "AE", name: "UAE", flag: "🇦🇪", dial: "971", currency: "AED" },
  { code: "SA", name: "Saudi Arabia", flag: "🇸🇦", dial: "966", currency: "SAR" },
  { code: "QA", name: "Qatar", flag: "🇶🇦", dial: "974", currency: "QAR" },
  { code: "KW", name: "Kuwait", flag: "🇰🇼", dial: "965", currency: "KWD" },
  { code: "BH", name: "Bahrain", flag: "🇧🇭", dial: "973", currency: "BHD" },
  { code: "OM", name: "Oman", flag: "🇴🇲", dial: "968", currency: "OMR" },
  { code: "JO", name: "Jordan", flag: "🇯🇴", dial: "962", currency: "JOD" },
  { code: "EG", name: "Egypt", flag: "🇪🇬", dial: "20", currency: "EGP" },
  { code: "TR", name: "Turkey", flag: "🇹🇷", dial: "90", currency: "TRY" },
  { code: "IR", name: "Iran", flag: "🇮🇷", dial: "98", currency: "IRR" },
  { code: "IQ", name: "Iraq", flag: "🇮🇶", dial: "964", currency: "IQD" },
  { code: "MY", name: "Malaysia", flag: "🇲🇾", dial: "60", currency: "MYR" },
  { code: "SG", name: "Singapore", flag: "🇸🇬", dial: "65", currency: "SGD" },
  { code: "ID", name: "Indonesia", flag: "🇮🇩", dial: "62", currency: "IDR" },
  { code: "TH", name: "Thailand", flag: "🇹🇭", dial: "66", currency: "THB" },
  { code: "VN", name: "Vietnam", flag: "🇻🇳", dial: "84", currency: "VND" },
  { code: "PH", name: "Philippines", flag: "🇵🇭", dial: "63", currency: "PHP" },
  { code: "CN", name: "China", flag: "🇨🇳", dial: "86", currency: "CNY" },
  { code: "JP", name: "Japan", flag: "🇯🇵", dial: "81", currency: "JPY" },
  { code: "KR", name: "South Korea", flag: "🇰🇷", dial: "82", currency: "KRW" },
  { code: "HK", name: "Hong Kong", flag: "🇭🇰", dial: "852", currency: "HKD" },
  { code: "AU", name: "Australia", flag: "🇦🇺", dial: "61", currency: "AUD" },
  { code: "NZ", name: "New Zealand", flag: "🇳🇿", dial: "64", currency: "NZD" },
  { code: "US", name: "United States", flag: "🇺🇸", dial: "1", currency: "USD" },
  { code: "CA", name: "Canada", flag: "🇨🇦", dial: "1", currency: "CAD" },
  { code: "MX", name: "Mexico", flag: "🇲🇽", dial: "52", currency: "MXN" },
  { code: "BR", name: "Brazil", flag: "🇧🇷", dial: "55", currency: "BRL" },
  { code: "AR", name: "Argentina", flag: "🇦🇷", dial: "54", currency: "ARS" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", dial: "44", currency: "GBP" },
  { code: "IE", name: "Ireland", flag: "🇮🇪", dial: "353", currency: "EUR" },
  { code: "DE", name: "Germany", flag: "🇩🇪", dial: "49", currency: "EUR" },
  { code: "FR", name: "France", flag: "🇫🇷", dial: "33", currency: "EUR" },
  { code: "IT", name: "Italy", flag: "🇮🇹", dial: "39", currency: "EUR" },
  { code: "ES", name: "Spain", flag: "🇪🇸", dial: "34", currency: "EUR" },
  { code: "PT", name: "Portugal", flag: "🇵🇹", dial: "351", currency: "EUR" },
  { code: "NL", name: "Netherlands", flag: "🇳🇱", dial: "31", currency: "EUR" },
  { code: "BE", name: "Belgium", flag: "🇧🇪", dial: "32", currency: "EUR" },
  { code: "CH", name: "Switzerland", flag: "🇨🇭", dial: "41", currency: "CHF" },
  { code: "SE", name: "Sweden", flag: "🇸🇪", dial: "46", currency: "SEK" },
  { code: "NO", name: "Norway", flag: "🇳🇴", dial: "47", currency: "NOK" },
  { code: "DK", name: "Denmark", flag: "🇩🇰", dial: "45", currency: "DKK" },
  { code: "FI", name: "Finland", flag: "🇫🇮", dial: "358", currency: "EUR" },
  { code: "PL", name: "Poland", flag: "🇵🇱", dial: "48", currency: "PLN" },
  { code: "RU", name: "Russia", flag: "🇷🇺", dial: "7", currency: "RUB" },
  { code: "UA", name: "Ukraine", flag: "🇺🇦", dial: "380", currency: "UAH" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦", dial: "27", currency: "ZAR" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬", dial: "234", currency: "NGN" },
  { code: "KE", name: "Kenya", flag: "🇰🇪", dial: "254", currency: "KES" },
  { code: "ET", name: "Ethiopia", flag: "🇪🇹", dial: "251", currency: "ETB" },
  { code: "MA", name: "Morocco", flag: "🇲🇦", dial: "212", currency: "MAD" },
];

export const CURRENCY_SYMBOLS: Record<string, string> = {
  BDT: "৳", USD: "$", INR: "₹", PKR: "₨", LKR: "Rs", NPR: "₨", BTN: "Nu",
  MVR: "Rf", AFN: "؋", AED: "د.إ", SAR: "﷼", QAR: "﷼", KWD: "د.ك",
  BHD: ".د.ب", OMR: "﷼", JOD: "د.ا", EGP: "£", TRY: "₺", IRR: "﷼", IQD: "ع.د",
  MYR: "RM", SGD: "S$", IDR: "Rp", THB: "฿", VND: "₫", PHP: "₱",
  CNY: "¥", JPY: "¥", KRW: "₩", HKD: "HK$", AUD: "A$", NZD: "NZ$",
  CAD: "C$", MXN: "$", BRL: "R$", ARS: "$", GBP: "£", EUR: "€",
  CHF: "CHF", SEK: "kr", NOK: "kr", DKK: "kr", PLN: "zł", RUB: "₽",
  UAH: "₴", ZAR: "R", NGN: "₦", KES: "KSh", ETB: "Br", MAD: "د.م",
};

export function getCountry(code?: string | null): Country | undefined {
  if (!code) return undefined;
  return COUNTRIES.find((c) => c.code === code.toUpperCase());
}

export function guessCountryCode(): string {
  if (typeof navigator === "undefined") return "BD";
  const lang = navigator.language || "en-BD";
  const region = lang.split("-")[1]?.toUpperCase();
  if (region && COUNTRIES.find((c) => c.code === region)) return region;
  return "BD";
}
