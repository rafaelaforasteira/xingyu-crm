import type { ConditionGroup, ConditionItem, ConditionOperator } from "./definition";
import { getPath } from "./expressions";

function asList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item));
  if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean);
  return value == null ? [] : [String(value)];
}

function asDate(value: unknown): number | null {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  if (typeof value === "string" && value) {
    const time = Date.parse(value);
    return Number.isNaN(time) ? null : time;
  }
  return null;
}

export function evaluateItem(item: ConditionItem, context: unknown): boolean {
  const actual = getPath(context, item.field);
  const expected = item.value;
  const operator = item.operator as ConditionOperator;
  switch (operator) {
    case "EQUALS":
      return String(actual ?? "") === String(expected ?? "");
    case "NOT_EQUALS":
      return String(actual ?? "") !== String(expected ?? "");
    case "CONTAINS":
      return String(actual ?? "").toLowerCase().includes(String(expected ?? "").toLowerCase());
    case "NOT_CONTAINS":
      return !String(actual ?? "").toLowerCase().includes(String(expected ?? "").toLowerCase());
    case "STARTS_WITH":
      return String(actual ?? "").toLowerCase().startsWith(String(expected ?? "").toLowerCase());
    case "ENDS_WITH":
      return String(actual ?? "").toLowerCase().endsWith(String(expected ?? "").toLowerCase());
    case "GREATER_THAN":
      return Number(actual) > Number(expected);
    case "LESS_THAN":
      return Number(actual) < Number(expected);
    case "GREATER_OR_EQUAL":
      return Number(actual) >= Number(expected);
    case "LESS_OR_EQUAL":
      return Number(actual) <= Number(expected);
    case "IS_EMPTY":
      return actual == null || actual === "" || (Array.isArray(actual) && actual.length === 0);
    case "IS_NOT_EMPTY":
      return !(actual == null || actual === "" || (Array.isArray(actual) && actual.length === 0));
    case "IS_ANY_OF":
      return asList(expected).includes(String(actual ?? ""));
    case "IS_NONE_OF":
      return !asList(expected).includes(String(actual ?? ""));
    case "BEFORE": {
      const left = asDate(actual);
      const right = asDate(expected);
      return left != null && right != null && left < right;
    }
    case "AFTER": {
      const left = asDate(actual);
      const right = asDate(expected);
      return left != null && right != null && left > right;
    }
    default:
      return false;
  }
}

export function asConditionGroup(value: unknown): ConditionGroup | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.items)) {
    return { logic: record.logic === "OR" ? "OR" : "AND", items: [] };
  }
  return {
    logic: record.logic === "OR" ? "OR" : "AND",
    items: record.items as ConditionItem[],
  };
}

export function evaluateGroup(group: ConditionGroup | undefined, context: unknown): boolean {
  if (!group?.items?.length) return true;
  const logic = group.logic === "OR" ? "OR" : "AND";
  return logic === "OR"
    ? group.items.some((item) => evaluateItem(item, context))
    : group.items.every((item) => evaluateItem(item, context));
}
