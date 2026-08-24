import { describe, expect, it } from "vitest";
import {
  daysUntilArchive,
  daysUntilInviteExpiry,
  formatTimezoneLabel,
  formatTimezoneOffset,
  localeLabel,
} from "./settings-format";
import { settingsText } from "./settings-i18n";

describe("settings timezone/locale helpers", () => {
  it("formats Sao Paulo with offset", () => {
    const label = formatTimezoneLabel("America/Sao_Paulo", new Date("2026-01-15T12:00:00Z"));
    expect(label.startsWith("São Paulo · UTC")).toBe(true);
    expect(formatTimezoneOffset("America/Sao_Paulo", new Date("2026-01-15T12:00:00Z"))).toMatch(
      /UTC[+-]\d{2}:\d{2}/,
    );
  });

  it("maps locale labels", () => {
    const copy = settingsText("pt-BR");
    expect(localeLabel("pt-BR", copy)).toBe(copy.localePt);
    expect(localeLabel("en", copy)).toBe(copy.localeEn);
  });
});

describe("archive countdown", () => {
  it("returns remaining days from deactivatedAt", () => {
    const now = new Date("2026-08-22T12:00:00.000Z");
    // 67 days elapsed → 23 remaining under a 90-day policy
    const deactivatedAt = new Date("2026-06-16T12:00:00.000Z");
    expect(daysUntilArchive(deactivatedAt.toISOString(), 90, now)).toBe(23);
  });

  it("returns null without deactivatedAt", () => {
    expect(daysUntilArchive(null)).toBeNull();
  });

  it("detects expired invites", () => {
    const now = new Date("2026-08-22T12:00:00.000Z");
    expect(daysUntilInviteExpiry("2026-08-20T12:00:00.000Z", now)).toBe(0);
  });
});
