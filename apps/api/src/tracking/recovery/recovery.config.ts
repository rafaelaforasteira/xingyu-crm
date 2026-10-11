export const RECOVERY_RULES = Object.freeze({
  attributionDays: 15,
  minimumSegmentCases: 20,
  minimumMatureCases: 500,
  minimumPositiveCases: 50,
  allowIdentityBasketMatch: false,
  minimumBasketSimilarity: 0.8,
  maximumAmountDifference: 0.1,
  maxRangeDays: 366,
  probabilityBands: [0.8, 0.6, 0.4, 0.2],
});
export const VALUE_BANDS = [
  { key: "small", label: "Até R$ 300", min: 0, max: 30_000 },
  { key: "medium", label: "R$ 300 a R$ 800", min: 30_001, max: 80_000 },
  { key: "large", label: "R$ 800 a R$ 1.500", min: 80_001, max: 150_000 },
  { key: "premium", label: "Acima de R$ 1.500", min: 150_001, max: Number.MAX_SAFE_INTEGER },
];
export const TIME_BUCKETS = [
  { key: "hour", label: "Até 1 hora", max: 1 },
  { key: "six", label: "1–6 horas", max: 6 },
  { key: "day", label: "6–24 horas", max: 24 },
  { key: "three", label: "1–3 dias", max: 72 },
  { key: "week", label: "3–7 dias", max: 168 },
  { key: "window", label: "7 dias até o fim da janela", max: Infinity },
];
export const RECOVERY_CHANNELS = [
  "META_ADS",
  "GOOGLE_ADS",
  "WHATSAPP",
  "INSTAGRAM",
  "EMAIL",
  "REFERRAL",
  "DIRECT",
  "OTHER",
  "UNIDENTIFIED",
] as const;
export const DAY_MS = 86_400_000;
export const HOUR_MS = 3_600_000;
