import {
  AsYouType,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js/max";

/** Países oferecidos no seletor (Brasil primeiro, depois os mais comuns para a operação). */
export const PHONE_COUNTRIES: { code: CountryCode; name: string; flag: string }[] = [
  { code: "BR", name: "Brasil", flag: "🇧🇷" },
  { code: "PT", name: "Portugal", flag: "🇵🇹" },
  { code: "US", name: "Estados Unidos", flag: "🇺🇸" },
  { code: "AR", name: "Argentina", flag: "🇦🇷" },
  { code: "PY", name: "Paraguai", flag: "🇵🇾" },
  { code: "UY", name: "Uruguai", flag: "🇺🇾" },
  { code: "CL", name: "Chile", flag: "🇨🇱" },
  { code: "CO", name: "Colômbia", flag: "🇨🇴" },
  { code: "MX", name: "México", flag: "🇲🇽" },
  { code: "PE", name: "Peru", flag: "🇵🇪" },
  { code: "BO", name: "Bolívia", flag: "🇧🇴" },
  { code: "ES", name: "Espanha", flag: "🇪🇸" },
  { code: "IT", name: "Itália", flag: "🇮🇹" },
  { code: "FR", name: "França", flag: "🇫🇷" },
  { code: "DE", name: "Alemanha", flag: "🇩🇪" },
  { code: "GB", name: "Reino Unido", flag: "🇬🇧" },
  { code: "CA", name: "Canadá", flag: "🇨🇦" },
  { code: "AO", name: "Angola", flag: "🇦🇴" },
  { code: "MZ", name: "Moçambique", flag: "🇲🇿" },
  { code: "JP", name: "Japão", flag: "🇯🇵" },
  { code: "CN", name: "China", flag: "🇨🇳" },
];

export const DEFAULT_PHONE_COUNTRY: CountryCode = "BR";

export function dialCode(country: CountryCode): string {
  return `+${getCountryCallingCode(country)}`;
}

/** Formata enquanto digita, sem o código do país (ele fica no seletor). */
export function formatNationalAsYouType(input: string, country: CountryCode): string {
  const digits = input.replace(/\D/g, "").slice(0, 15);
  if (!digits) return "";
  return new AsYouType(country).input(digits);
}

export type PhoneCheck =
  | { valid: true; e164: string; international: string }
  | { valid: false; reason: "empty" | "incomplete" | "invalid" };

/**
 * Valida um número real para o país escolhido (DDD/código de área existente,
 * tamanho correto e prefixo de celular/fixo válido).
 */
export function checkPhone(national: string, country: CountryCode): PhoneCheck {
  const digits = national.replace(/\D/g, "");
  if (!digits) return { valid: false, reason: "empty" };
  const parsed = parsePhoneNumberFromString(digits, country);
  if (parsed?.isValid() && parsed.country === country) {
    return { valid: true, e164: parsed.number, international: parsed.formatInternational() };
  }
  const possible = parsed?.isPossible() ?? false;
  return { valid: false, reason: possible || digits.length >= 10 ? "invalid" : "incomplete" };
}

/** Número de exemplo do país, para usar como placeholder. */
export const PHONE_PLACEHOLDERS: Partial<Record<CountryCode, string>> = {
  BR: "(11) 91234-5678",
  PT: "912 345 678",
  US: "(201) 555-0123",
};
