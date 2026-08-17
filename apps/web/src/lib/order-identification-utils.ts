import type { OrderLocale } from "@/lib/orders-i18n";
import type { OrderStageDefinition } from "@/lib/types";

const COUNTRY_ALIASES: Record<string, string> = {
  brasil: "BR",
  brazil: "BR",
  china: "CN",
  "republica popular da china": "CN",
  "people's republic of china": "CN",
  "estados unidos": "US",
  "estados unidos da america": "US",
  "united states": "US",
  "united states of america": "US",
  usa: "US",
};

const normalizeCountry = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

export function inferCountryCode(country: string | null | undefined): string {
  return country ? COUNTRY_ALIASES[normalizeCountry(country)] || "" : "";
}

export function countryCodeToFlag(code: string | null | undefined): string {
  const normalized = code?.trim().toUpperCase();
  if (!normalized || !/^[A-Z]{2}$/.test(normalized)) return "";
  return String.fromCodePoint(...[...normalized].map((letter) => 127397 + letter.charCodeAt(0)));
}

export function resolveCountryCode(
  country: string | null | undefined,
  countryCode: string | null | undefined,
): string {
  const explicit = countryCode?.trim().toUpperCase();
  return explicit && /^[A-Z]{2}$/.test(explicit) ? explicit : inferCountryCode(country);
}

export function localizedCountryName(
  country: string | null | undefined,
  countryCode: string | null | undefined,
  locale: OrderLocale,
): string {
  const code = resolveCountryCode(country, countryCode);
  if (!code) return country?.trim() || "";
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) || country?.trim() || code;
  } catch {
    return country?.trim() || code;
  }
}

export function displayOrderNumber(externalName: string | null | undefined, number: string): string {
  const value = (externalName || number).trim();
  return value.startsWith("#") ? value : `#${value}`;
}

export function getOperationalStageProgress(
  stages: OrderStageDefinition[],
  currentStageId: string | null | undefined,
) {
  const activeStages = [...stages]
    .filter((stage) => stage.active && !stage.archived)
    .sort((left, right) => left.position - right.position);
  const currentStage = activeStages.find((stage) => stage.id === currentStageId);
  const index = currentStage ? activeStages.indexOf(currentStage) : -1;
  const nextStage = index >= 0 ? activeStages[index + 1] : undefined;
  return {
    currentStage,
    nextStage,
    complete: Boolean(currentStage?.isFinal || (currentStage && !nextStage)),
  };
}
