/**
 * Display-only phone formatting. Never mutates stored digits.
 * Does not add or remove Brazil's ninth digit.
 */

const FALLBACK_ABSENT = "Telefone não informado";

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function normalizePhoneForLookup(value: string): string | null {
  const digits = digitsOnly(value);
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) return digits;
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

function hasPlusPrefix(value: string): boolean {
  return value.trim().startsWith("+");
}

/**
 * Formats a Brazilian number that already includes country code 55.
 * localDigits: DDD (2) + subscriber (8 or 9). Does not invent digits.
 */
function formatBrazilLocal(local: string): string | null {
  if (local.length === 11) {
    const ddd = local.slice(0, 2);
    const rest = local.slice(2);
    return `+55 (${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
  }
  if (local.length === 10) {
    const ddd = local.slice(0, 2);
    const rest = local.slice(2);
    return `+55 (${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  }
  return null;
}

/**
 * Conservative international display when not unambiguously Brazilian.
 * Preserves all digits; keeps leading + when present in the source.
 */
function formatInternationalConservative(raw: string, digits: string): string {
  if (hasPlusPrefix(raw)) {
    return `+${digits}`;
  }
  return digits.length ? digits : raw.trim();
}

/**
 * Formats a phone number for UI display only.
 */
export function formatPhoneForDisplay(value: string | null | undefined): string {
  if (value == null) return FALLBACK_ABSENT;
  const raw = String(value).trim();
  if (!raw) return FALLBACK_ABSENT;

  const digits = digitsOnly(raw);
  if (!digits) return raw;

  // +55XXXXXXXXXXX or 55XXXXXXXXXXX with 10–11 national digits
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    const local = digits.slice(2);
    const formatted = formatBrazilLocal(local);
    if (formatted) return formatted;
  }

  // National BR without country code: 10 or 11 digits starting with valid-looking DDD
  if (
    !hasPlusPrefix(raw) &&
    (digits.length === 10 || digits.length === 11) &&
    !digits.startsWith("55")
  ) {
    const formatted = formatBrazilLocal(digits);
    if (formatted) return formatted;
  }

  return formatInternationalConservative(raw, digits);
}

/**
 * Resolves the primary phone for summary display.
 * Priority: contact.phone → contact.whatsapp.
 * Email is never used as a phone substitute.
 */
export function resolvePrimaryPhone(
  contact:
    | {
        phone?: string | null;
        whatsapp?: string | null;
      }
    | null
    | undefined,
): string | null {
  if (!contact) return null;
  const phone = typeof contact.phone === "string" ? contact.phone.trim() : "";
  if (phone) return phone;
  const whatsapp = typeof contact.whatsapp === "string" ? contact.whatsapp.trim() : "";
  if (whatsapp) return whatsapp;
  return null;
}

export function formatPrimaryPhoneForDisplay(
  contact:
    | {
        phone?: string | null;
        whatsapp?: string | null;
      }
    | null
    | undefined,
): string {
  return formatPhoneForDisplay(resolvePrimaryPhone(contact));
}
