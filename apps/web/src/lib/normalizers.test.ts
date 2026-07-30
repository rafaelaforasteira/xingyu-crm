import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isPaginatedResponse,
  normalizeCollectionResponse,
  normalizePaginatedResponse,
  safeArray,
  safeDate,
  safeNumber,
  safeRelation,
  type TypeGuard,
} from "./normalizers";

interface ContactSummary {
  id: string;
  name: string;
}

const isContactSummary: TypeGuard<ContactSummary> = (
  value,
): value is ContactSummary =>
  typeof value === "object" &&
  value !== null &&
  "id" in value &&
  "name" in value &&
  typeof value.id === "string" &&
  typeof value.name === "string";

const contact: ContactSummary = { id: "contact-1", name: "Ana" };

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("collection response normalization", () => {
  it("accepts arrays, data envelopes and items envelopes", () => {
    expect(normalizeCollectionResponse([contact], isContactSummary)).toEqual([
      contact,
    ]);
    expect(
      normalizeCollectionResponse({ data: [contact] }, isContactSummary),
    ).toEqual([contact]);
    expect(
      normalizeCollectionResponse({ items: [contact] }, isContactSummary),
    ).toEqual([contact]);
  });

  it("returns empty arrays for nullish and malformed collections", () => {
    expect(normalizeCollectionResponse(null, isContactSummary)).toEqual([]);
    expect(normalizeCollectionResponse(undefined, isContactSummary)).toEqual([]);
    expect(
      normalizeCollectionResponse({ data: null }, isContactSummary),
    ).toEqual([]);
    expect(
      normalizeCollectionResponse({ data: "invalid" }, isContactSummary),
    ).toEqual([]);
    expect(safeArray("invalid", isContactSummary)).toEqual([]);
  });

  it("uses an optional type guard to discard invalid entries", () => {
    expect(
      normalizeCollectionResponse(
        [contact, { id: "missing-name" }, null],
        isContactSummary,
      ),
    ).toEqual([contact]);
  });

  it("warns for malformed data only in development", () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    vi.stubEnv("NODE_ENV", "test");
    normalizeCollectionResponse({ data: "invalid" }, isContactSummary);
    expect(warning).not.toHaveBeenCalled();

    vi.stubEnv("NODE_ENV", "development");
    normalizeCollectionResponse({ data: "invalid" }, isContactSummary);
    expect(warning).toHaveBeenCalledOnce();
  });
});

describe("paginated response normalization", () => {
  it("preserves valid server metadata", () => {
    const meta = { total: 42, page: 2, pageSize: 10, totalPages: 5 };
    const normalized = normalizePaginatedResponse(
      { data: [contact], meta },
      isContactSummary,
    );

    expect(normalized.data).toEqual([contact]);
    expect(normalized.meta).toBe(meta);
    expect(isPaginatedResponse(normalized, isContactSummary)).toBe(true);
  });

  it("creates deterministic metadata for arrays and items envelopes", () => {
    expect(
      normalizePaginatedResponse([contact], isContactSummary),
    ).toEqual({
      data: [contact],
      meta: { total: 1, page: 1, pageSize: 1, totalPages: 1 },
    });
    expect(
      normalizePaginatedResponse(
        { items: [contact] },
        isContactSummary,
        { page: 3, pageSize: 20, total: 41 },
      ),
    ).toEqual({
      data: [contact],
      meta: { total: 41, page: 3, pageSize: 20, totalPages: 3 },
    });
  });

  it("normalizes invalid paginated data without inventing records", () => {
    expect(
      normalizePaginatedResponse(
        { data: "invalid", meta: null },
        isContactSummary,
      ),
    ).toEqual({
      data: [],
      meta: { total: 0, page: 1, pageSize: 20, totalPages: 1 },
    });
    expect(
      isPaginatedResponse(
        {
          data: [contact],
          meta: { total: "1", page: 1, pageSize: 20, totalPages: 1 },
        },
        isContactSummary,
      ),
    ).toBe(false);
  });
});

describe("safe nullable values", () => {
  it("handles a null or malformed contact relation", () => {
    expect(safeRelation(null, isContactSummary, "contact")).toBeNull();
    expect(
      safeRelation({ id: "missing-name" }, isContactSummary, "contact"),
    ).toBeNull();
    expect(safeRelation(contact, isContactSummary, "contact")).toBe(contact);
  });

  it("accepts valid dates and rejects null or invalid dates", () => {
    const source = new Date("2026-07-30T12:00:00.000Z");
    const cloned = safeDate(source);

    expect(cloned?.toISOString()).toBe("2026-07-30T12:00:00.000Z");
    expect(cloned).not.toBe(source);
    expect(safeDate("2026-07-30T12:00:00.000Z")?.getTime()).toBe(
      source.getTime(),
    );
    expect(safeDate(null)).toBeNull();
    expect(safeDate("data-inválida")).toBeNull();
    expect(safeDate(Number.NaN)).toBeNull();
  });

  it("accepts valid numbers and rejects null or invalid numbers", () => {
    expect(safeNumber(42)).toBe(42);
    expect(safeNumber("12.5")).toBe(12.5);
    expect(safeNumber(null)).toBeNull();
    expect(safeNumber(undefined)).toBeNull();
    expect(safeNumber("")).toBeNull();
    expect(safeNumber("not-a-number")).toBeNull();
    expect(safeNumber(Number.NaN)).toBeNull();
    expect(safeNumber(Number.POSITIVE_INFINITY)).toBeNull();
    expect(safeNumber({})).toBeNull();
  });
});
