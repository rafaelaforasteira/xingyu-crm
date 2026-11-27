import { AUTOMATION_LIMITS } from "./constants";

const PATH = /^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z0-9_]+)*$/;
const TOKEN = /\{\{\s*([^}]+?)\s*\}\}/g;
const FN = /^(lowercase|uppercase|coalesce|contains|formatDate)\((.*)\)$/i;

export class ExpressionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExpressionError";
  }
}

export function getPath(source: unknown, path: string): unknown {
  if (!path) return undefined;
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[key];
  }, source);
}

function parseArgs(raw: string): string[] {
  const args: string[] = [];
  let current = "";
  let depth = 0;
  let quote: string | null = null;
  for (const char of raw) {
    if (quote) {
      if (char === quote) quote = null;
      current += char;
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      current += char;
      continue;
    }
    if (char === "(") depth += 1;
    if (char === ")") depth -= 1;
    if (char === "," && depth === 0) {
      args.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  if (current.trim()) args.push(current.trim());
  return args;
}

function unquote(value: string): unknown {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  return value;
}

function evalExpr(expr: string, context: unknown): unknown {
  const trimmed = expr.trim();
  if (!trimmed) return "";
  const fn = trimmed.match(FN);
  if (fn) {
    const name = fn[1].toLowerCase();
    const args = parseArgs(fn[2]).map((arg) => evalExpr(arg, context));
    if (name === "lowercase") return String(args[0] ?? "").toLowerCase();
    if (name === "uppercase") return String(args[0] ?? "").toUpperCase();
    if (name === "coalesce") return args.find((item) => item != null && item !== "") ?? "";
    if (name === "contains") return String(args[0] ?? "").includes(String(args[1] ?? ""));
    if (name === "formatDate") {
      const date = args[0] instanceof Date ? args[0] : new Date(String(args[0] ?? ""));
      if (Number.isNaN(date.getTime())) return "";
      return date.toISOString();
    }
  }
  if (PATH.test(trimmed)) return getPath(context, trimmed);
  return unquote(trimmed);
}

export function interpolate(input: unknown, context: unknown): unknown {
  if (typeof input !== "string") return input;
  if (input.length > AUTOMATION_LIMITS.expressionMaxLength) {
    throw new ExpressionError("Expressão excede o tamanho permitido.");
  }
  if (!input.includes("{{")) return input;
  const exact = input.match(/^\{\{\s*([^}]+?)\s*\}\}$/);
  if (exact) return evalExpr(exact[1], context);
  return input.replace(TOKEN, (_, inner: string) => {
    const value = evalExpr(inner, context);
    return value == null ? "" : String(value);
  });
}

export function interpolateRecord(config: Record<string, unknown> | undefined, context: unknown): Record<string, unknown> {
  const source = config ?? {};
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    next[key] = typeof value === "string" ? interpolate(value, context) : value;
  }
  return next;
}
