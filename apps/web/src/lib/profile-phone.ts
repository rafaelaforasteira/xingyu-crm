export type ProfilePhoneCountry = {
  dial: string;
  labelKey: "phoneCountryBr" | "phoneCountryUs" | "phoneCountryCn" | "phoneCountryHk";
};

export const PROFILE_PHONE_COUNTRIES: ProfilePhoneCountry[] = [
  { dial: "55", labelKey: "phoneCountryBr" },
  { dial: "1", labelKey: "phoneCountryUs" },
  { dial: "86", labelKey: "phoneCountryCn" },
  { dial: "852", labelKey: "phoneCountryHk" },
];

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function detectPhoneDialCode(value?: string | null): string {
  const digits = digitsOnly(value ?? "");
  if (!digits) return "55";
  const ordered = [...PROFILE_PHONE_COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
  for (const country of ordered) {
    if (!digits.startsWith(country.dial)) continue;
    if (country.dial === "55" && (digits.length === 12 || digits.length === 13)) return "55";
    if (country.dial === "1" && digits.length === 11) return "1";
    if (country.dial === "86" && digits.length >= 12 && digits.length <= 14) return "86";
    if (country.dial === "852" && digits.length >= 10 && digits.length <= 12) return "852";
  }
  if (digits.length === 10 || digits.length === 11) return "55";
  return ordered.find((c) => digits.startsWith(c.dial))?.dial ?? "55";
}

export function nationalPhoneDigits(value: string | null | undefined, dial: string): string {
  const digits = digitsOnly(value ?? "");
  if (!digits) return "";
  if (digits.startsWith(dial)) return digits.slice(dial.length);
  if (dial === "55" && (digits.length === 10 || digits.length === 11)) return digits;
  return digits;
}

export function composePhoneE164(dial: string, national: string): string {
  const nationalDigits = digitsOnly(national);
  const dialDigits = digitsOnly(dial);
  if (!nationalDigits) return "";
  return `+${dialDigits}${nationalDigits}`;
}

export function isValidProfilePhone(dial: string, national: string): boolean {
  const composed = composePhoneE164(dial, national);
  if (!composed) return true;
  const digits = digitsOnly(composed);
  if (dial === "55") return digits.length === 12 || digits.length === 13;
  if (dial === "1") return digits.length === 11;
  return digits.length >= 8 && digits.length <= 15;
}
