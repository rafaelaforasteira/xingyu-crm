import { AUTOMATION_LIMITS } from "./constants";

const SECRET_KEYS = /authorization|password|secret|token|apikey|api_key|access_token|refresh_token|cookie/i;

export function redactValue(key: string, value: unknown): unknown {
  if (SECRET_KEYS.test(key)) return "•••••••";
  if (Array.isArray(value)) return value.slice(0, 50).map((item, index) => redactValue(String(index), item));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([child, childValue]) => [child, redactValue(child, childValue)]),
    );
  }
  return value;
}

export function redact(value: unknown): unknown {
  return redactValue("root", value);
}

export function truncateJson(value: unknown): { value: unknown; truncated: boolean } {
  const redacted = redact(value);
  const serialized = JSON.stringify(redacted) ?? "null";
  if (Buffer.byteLength(serialized, "utf8") <= AUTOMATION_LIMITS.maxPayloadBytes) {
    return { value: redacted, truncated: false };
  }
  return {
    value: { truncated: true, preview: serialized.slice(0, 2_000), bytes: Buffer.byteLength(serialized, "utf8") },
    truncated: true,
  };
}
