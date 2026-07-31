import type { PaginatedResponse, PaginationMeta } from "./types";

export type TypeGuard<T> = (value: unknown) => value is T;

type UnknownRecord = Record<string, unknown>;

const DEFAULT_PAGE_SIZE = 20;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function warnInvalid(context: string, detail: string) {
  if (process.env.NODE_ENV !== "development") return;
  console.warn(`[Xingyu CRM] ${context}: ${detail}`);
}

function isIntegerAtLeast(value: unknown, minimum: number): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= minimum
  );
}

export function isPaginationMeta(value: unknown): value is PaginationMeta {
  if (!isRecord(value)) return false;
  return (
    isIntegerAtLeast(value.total, 0) &&
    isIntegerAtLeast(value.page, 1) &&
    isIntegerAtLeast(value.pageSize, 1) &&
    isIntegerAtLeast(value.totalPages, 0)
  );
}

/**
 * Narrows an unknown value to a collection. When a guard is provided, invalid
 * entries are dropped instead of leaking malformed API data into components.
 */
export function safeArray<T = unknown>(
  value: unknown,
  isItem?: TypeGuard<T>,
  context = "collection",
): T[] {
  if (!Array.isArray(value)) {
    if (value !== null && value !== undefined) {
      warnInvalid(context, "expected an array");
    }
    return [];
  }

  const items: unknown[] = value;
  if (!isItem) return items.map((item) => item as T);

  const validItems = items.filter(isItem);
  if (validItems.length !== items.length) {
    warnInvalid(
      context,
      `discarded ${items.length - validItems.length} invalid item(s)`,
    );
  }
  return validItems;
}

/**
 * Accepts the collection shapes used by the CRM APIs: T[], { data: T[] } and
 * { items: T[] }. Nullish or malformed responses normalize to an empty array.
 */
export function normalizeCollectionResponse<T = unknown>(
  response: unknown,
  isItem?: TypeGuard<T>,
): T[] {
  if (Array.isArray(response)) {
    return safeArray(response, isItem, "collection response");
  }
  if (response === null || response === undefined) return [];

  if (isRecord(response)) {
    if (Array.isArray(response.data)) {
      return safeArray(response.data, isItem, "collection response.data");
    }
    if (Array.isArray(response.items)) {
      return safeArray(response.items, isItem, "collection response.items");
    }
    if (
      ("data" in response && response.data == null) ||
      ("items" in response && response.items == null)
    ) {
      return [];
    }
  }

  warnInvalid(
    "collection response",
    "expected an array, { data: [] }, or { items: [] }",
  );
  return [];
}

export function isPaginatedResponse<T = unknown>(
  value: unknown,
  isItem?: TypeGuard<T>,
): value is PaginatedResponse<T> {
  if (
    !isRecord(value) ||
    !Array.isArray(value.data) ||
    !isPaginationMeta(value.meta)
  ) {
    return false;
  }
  return !isItem || value.data.every(isItem);
}

function positiveInteger(value: number | undefined, fallback: number) {
  return Number.isInteger(value) && (value ?? 0) >= 1
    ? (value as number)
    : fallback;
}

function nonNegativeInteger(value: number | undefined, fallback: number) {
  return Number.isInteger(value) && (value ?? -1) >= 0
    ? (value as number)
    : fallback;
}

function fallbackPaginationMeta(
  itemCount: number,
  fallback?: Partial<PaginationMeta>,
): PaginationMeta {
  const page = positiveInteger(fallback?.page, 1);
  const pageSize = positiveInteger(
    fallback?.pageSize,
    itemCount > 0 ? itemCount : DEFAULT_PAGE_SIZE,
  );
  const total = nonNegativeInteger(fallback?.total, itemCount);
  const totalPages = nonNegativeInteger(
    fallback?.totalPages,
    Math.max(1, Math.ceil(total / pageSize)),
  );
  return { total, page, pageSize, totalPages };
}

/**
 * Normalizes both paginated and plain collection responses. A valid `meta`
 * object is returned unchanged, preserving the server pagination contract.
 */
export function normalizePaginatedResponse<T = unknown>(
  response: unknown,
  isItem?: TypeGuard<T>,
  fallbackMeta?: Partial<PaginationMeta>,
): PaginatedResponse<T> {
  const data = normalizeCollectionResponse(response, isItem);

  if (isRecord(response) && isPaginationMeta(response.meta)) {
    return { data, meta: response.meta };
  }
  if (
    isRecord(response) &&
    "meta" in response &&
    response.meta !== null &&
    response.meta !== undefined
  ) {
    warnInvalid("paginated response.meta", "expected numeric pagination fields");
  }

  return {
    data,
    meta: fallbackPaginationMeta(data.length, fallbackMeta),
  };
}

/**
 * Returns a relation only when it is present and structurally acceptable.
 * Without a guard, relations must at least be non-array objects.
 */
export function safeRelation<T extends object = UnknownRecord>(
  value: unknown,
  isRelation?: TypeGuard<T>,
  context = "relation",
): T | null {
  if (value === null || value === undefined) return null;
  if (isRelation) {
    if (isRelation(value)) return value;
    warnInvalid(context, "relation failed validation");
    return null;
  }
  if (isRecord(value)) return value as T;
  warnInvalid(context, "expected an object or null");
  return null;
}

/**
 * Converts supported date inputs to a valid, cloned Date instance.
 */
export function safeDate(value: unknown, context = "date"): Date | null {
  if (value === null || value === undefined) return null;

  let date: Date;
  if (value instanceof Date) {
    date = new Date(value.getTime());
  } else if (
    typeof value === "string" ||
    (typeof value === "number" && Number.isFinite(value))
  ) {
    if (typeof value === "string" && !value.trim()) {
      warnInvalid(context, "received an empty date");
      return null;
    }
    date = new Date(value);
  } else {
    warnInvalid(context, "unsupported date value");
    return null;
  }

  if (Number.isNaN(date.getTime())) {
    warnInvalid(context, "received an invalid date");
    return null;
  }
  return date;
}

/**
 * Converts supported numeric inputs to a finite number, or null when invalid.
 */
export function safeNumber(value: unknown, context = "number"): number | null {
  if (value === null || value === undefined) return null;

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      warnInvalid(context, "received a non-finite number");
      return null;
    }
    return value;
  }

  if (typeof value === "string") {
    if (!value.trim()) {
      warnInvalid(context, "received an empty number");
      return null;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      warnInvalid(context, "received an invalid number");
      return null;
    }
    return parsed;
  }

  warnInvalid(context, "unsupported number value");
  return null;
}
