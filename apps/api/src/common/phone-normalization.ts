import { BadRequestException } from "@nestjs/common";

export function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) return digits;
  if (digits.length >= 8 && digits.length <= 15) return digits;
  throw new BadRequestException("Informe um telefone válido");
}
