import {
  AUTH_COOKIE,
  accessTokenMaxAgeMs,
  cookieDomain,
  isCookieSecure,
  parseDurationToMs,
} from "./cookie.config";

describe("auth cookie config", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it("names HttpOnly session cookies", () => {
    expect(AUTH_COOKIE.access).toBe("xingyu_access_token");
    expect(AUTH_COOKIE.refresh).toBe("xingyu_refresh_token");
  });

  it("keeps cookies insecure on localhost unless COOKIE_SECURE=true", () => {
    process.env.NODE_ENV = "development";
    delete process.env.COOKIE_SECURE;
    expect(isCookieSecure()).toBe(false);
    process.env.COOKIE_SECURE = "true";
    expect(isCookieSecure()).toBe(true);
  });

  it("enables Secure in production by default", () => {
    process.env.NODE_ENV = "production";
    delete process.env.COOKIE_SECURE;
    expect(isCookieSecure()).toBe(true);
  });

  it("parses JWT durations used for maxAge", () => {
    expect(parseDurationToMs("15m", 0)).toBe(15 * 60_000);
    expect(parseDurationToMs("7d", 0)).toBe(7 * 86_400_000);
    expect(accessTokenMaxAgeMs()).toBeGreaterThan(0);
  });

  it("omits cookie domain unless configured", () => {
    delete process.env.COOKIE_DOMAIN;
    expect(cookieDomain()).toBeUndefined();
  });
});
