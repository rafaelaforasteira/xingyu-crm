import { BadRequestException } from "@nestjs/common";
import { parsePhoneNumberFromString } from "libphonenumber-js/max";

/**
 * Normalização tolerante: aceita qualquer número com 8 a 15 dígitos.
 * Usada por fluxos de integração (webhooks, importações) que recebem números
 * como vierem do provedor.
 */
export function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) return digits;
  if (digits.length >= 8 && digits.length <= 15) return digits;
  throw new BadRequestException("Informe um telefone válido");
}

/**
 * Normalização estrita para cadastro manual: além do formato, exige um número
 * real (código de país e de área existentes, tamanho e prefixo válidos).
 * Números sem código de país são tratados como brasileiros.
 */
export function normalizeRealPhone(value: string): string {
  const trimmed = value.trim();
  const candidate = trimmed.startsWith("+") ? trimmed : `+${normalizeDigitsAsBrazil(trimmed)}`;
  const parsed = parsePhoneNumberFromString(candidate);
  if (!parsed?.isValid()) {
    throw new BadRequestException("Informe um telefone real, com DDD/código de área válido");
  }
  return parsed.number.replace(/^\+/, "");
}

function normalizeDigitsAsBrazil(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}
