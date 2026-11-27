/**
 * Campo de valor em reais no estilo "app de banco": a pessoa digita só números
 * e eles entram como centavos (1 → R$ 0,01; 150000 → R$ 1.500,00).
 */

/** Teto de R$ 99.999.999,99 para evitar valores irreais. */
export const MAX_CURRENCY_CENTS = 9_999_999_999;

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** Converte o texto digitado em centavos (null quando vazio). */
export function centsFromInput(input: string): number | null {
  const digits = input.replace(/\D/g, "").replace(/^0+/, "");
  if (!digits) return null;
  const cents = Number(digits.slice(0, String(MAX_CURRENCY_CENTS).length));
  return Math.min(cents, MAX_CURRENCY_CENTS);
}

export function formatCents(cents: number | null): string {
  if (cents == null) return "";
  return BRL.format(cents / 100).replace(/ /g, " ");
}

export function centsToReais(cents: number | null): number | undefined {
  return cents == null ? undefined : Math.round(cents) / 100;
}
