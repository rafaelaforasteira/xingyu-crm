/**
 * Pure helpers for conversation list CRM cards.
 */

export function formatLeadCode(sequence: number | null | undefined): string | null {
  if (typeof sequence !== "number" || !Number.isFinite(sequence) || sequence < 1) {
    return null;
  }
  return `Lead #${String(Math.trunc(sequence)).padStart(4, "0")}`;
}

export function stripDiacritics(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "");
}

function isPhoneLike(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 8 && /^[\d\s+().-]+$/.test(value.trim());
}

/**
 * Initials for contact avatar. Never derive from phone, "Contato sem nome", or Lead #.
 */
export function contactInitials(displayName: string | null | undefined): string | null {
  const name = displayName?.trim();
  if (!name) return null;
  if (name === "Contato sem nome") return null;
  if (isPhoneLike(name)) return null;
  if (/^Lead\s*#/i.test(name)) return null;

  const parts = stripDiacritics(name)
    .split(/\s+/)
    .map((part) => part.replace(/[^A-Za-z]/g, ""))
    .filter(Boolean);

  if (!parts.length) return null;
  if (parts.length === 1) {
    const word = parts[0]!;
    if (word.length === 1) return word.toUpperCase();
    return word.slice(0, 2).toUpperCase();
  }

  const first = parts[0]![0];
  const last = parts[parts.length - 1]![0];
  if (!first || !last) return null;
  return `${first}${last}`.toUpperCase();
}

/**
 * Seller short code: first + last initial, or first two letters of a single name.
 */
export function assigneeShortCode(name: string | null | undefined): string | null {
  const trimmed = name?.trim();
  if (!trimmed) return null;

  const parts = stripDiacritics(trimmed)
    .split(/\s+/)
    .map((part) => part.replace(/[^A-Za-z]/g, ""))
    .filter(Boolean);

  if (!parts.length) return null;
  if (parts.length === 1) {
    const word = parts[0]!;
    return word.slice(0, 2).toUpperCase();
  }

  const first = parts[0]![0];
  const last = parts[parts.length - 1]![0];
  if (!first || !last) return null;
  return `${first}${last}`.toUpperCase();
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 13 && digits.startsWith("55")) {
    const ddd = digits.slice(2, 4);
    const rest = digits.slice(4);
    if (rest.length === 9) {
      return `+55 ${ddd} ${rest.slice(0, 5)}-${rest.slice(5)}`;
    }
  }
  if (digits.length === 11) {
    return `+55 ${digits.slice(0, 2)} ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `+55 ${digits.slice(0, 2)} ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return value.trim();
}

type ContactLike = {
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  pushName?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
} | null | undefined;

/**
 * Display name hierarchy for conversation list cards.
 */
export function conversationContactDisplayName(contact: ContactLike): string {
  if (!contact) return "Contato sem nome";

  const manual = [contact.firstName, contact.lastName]
    .filter((part) => typeof part === "string" && part.trim())
    .join(" ")
    .trim();
  // firstName is required in CRM; treat composed name / name as primary CRM name
  const crmName =
    (typeof contact.name === "string" && contact.name.trim()) ||
    manual ||
    (typeof contact.displayName === "string" && contact.displayName.trim()) ||
    "";

  if (crmName && crmName.toLowerCase() !== "undefined" && crmName.toLowerCase() !== "null") {
    return crmName;
  }

  const push =
    typeof contact.pushName === "string" ? contact.pushName.trim() : "";
  if (push) return push;

  const phone =
    (typeof contact.whatsapp === "string" && contact.whatsapp.trim()) ||
    (typeof contact.phone === "string" && contact.phone.trim()) ||
    "";
  if (phone) return formatPhone(phone);

  return "Contato sem nome";
}

export function formatUnreadCount(count: number): string {
  if (count > 99) return "99+";
  return String(count);
}

export function conversationPreviewText(
  preview: string | null | undefined,
): string {
  const text = preview?.trim();
  if (!text) return "Sem mensagens ainda";
  return text;
}

export function channelDisplayLabel(
  channel:
    | string
    | {
        displayName?: string | null;
        name?: string | null;
        type?: string | null;
      }
    | null
    | undefined,
): string {
  if (typeof channel === "string" && channel.trim()) return channel.trim();
  if (!channel || typeof channel !== "object") return "Canal não informado";
  if (channel.displayName?.trim()) return channel.displayName.trim();
  if (channel.name?.trim()) return channel.name.trim();
  if (channel.type?.trim()) return channel.type.trim();
  return "Canal não informado";
}
