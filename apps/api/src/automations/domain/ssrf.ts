import { AUTOMATION_LIMITS } from "./constants";

const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "169.254.169.254",
  "metadata.google.internal",
  "metadata.google.com",
]);

function isPrivateIpv4(hostname: string) {
  const parts = hostname.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return false;
  const [a, b] = parts;
  return a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a === 169;
}

export function assertSafeHttpUrl(raw: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("URL HTTP inválida.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Somente HTTP e HTTPS são permitidos.");
  }
  const host = url.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(host) || host.endsWith(".local") || isPrivateIpv4(host) || host.includes(":")) {
    throw new Error("Destino HTTP bloqueado por política de segurança.");
  }
  return url;
}

export async function safeFetch(url: string, init: RequestInit & { timeoutMs?: number; maxBytes?: number }) {
  const parsed = assertSafeHttpUrl(url);
  const timeoutMs = init.timeoutMs ?? AUTOMATION_LIMITS.maxHttpTimeoutMs;
  const maxBytes = init.maxBytes ?? AUTOMATION_LIMITS.maxHttpResponseBytes;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(parsed.toString(), {
      method: init.method,
      headers: init.headers,
      body: init.body,
      redirect: "error",
      signal: controller.signal,
    });
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > maxBytes) {
      throw new Error("Resposta HTTP excede o tamanho máximo permitido.");
    }
    const text = buffer.toString("utf8");
    let json: unknown = text;
    try {
      json = JSON.parse(text);
    } catch {
      json = text;
    }
    return { status: response.status, ok: response.ok, body: json };
  } finally {
    clearTimeout(timer);
  }
}
