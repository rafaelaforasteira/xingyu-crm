export const AUTH_COOKIE = {
  access: "xingyu_access_token",
  refresh: "xingyu_refresh_token",
} as const;

export const AUTH_HEADERS = {
  userAgent: "user-agent",
} as const;

export function isCookieSecure(): boolean {
  if (process.env.COOKIE_SECURE === "true") return true;
  if (process.env.COOKIE_SECURE === "false") return false;
  return process.env.NODE_ENV === "production";
}

export function cookieDomain(): string | undefined {
  const domain = process.env.COOKIE_DOMAIN?.trim();
  return domain ? domain : undefined;
}

export function parseDurationToMs(value: string, fallbackMs: number): number {
  const trimmed = value.trim();
  const match = /^(\d+)(ms|s|m|h|d)?$/i.exec(trimmed);
  if (!match) return fallbackMs;
  const amount = Number(match[1]);
  const unit = (match[2] ?? "s").toLowerCase();
  switch (unit) {
    case "ms":
      return amount;
    case "s":
      return amount * 1000;
    case "m":
      return amount * 60_000;
    case "h":
      return amount * 3_600_000;
    case "d":
      return amount * 86_400_000;
    default:
      return fallbackMs;
  }
}

export function accessTokenExpiresIn(): string {
  return process.env.JWT_ACCESS_EXPIRES_IN?.trim() || "15m";
}

export function refreshTokenExpiresIn(): string {
  return process.env.JWT_REFRESH_EXPIRES_IN?.trim() || "7d";
}

export function accessTokenMaxAgeMs(): number {
  return parseDurationToMs(accessTokenExpiresIn(), 15 * 60_000);
}

export function refreshTokenMaxAgeMs(): number {
  return parseDurationToMs(refreshTokenExpiresIn(), 7 * 86_400_000);
}
