/**
 * Production-target protection for load tests.
 * Used by Node runner and unit tests. k6 scripts keep a mirrored check in config.js.
 */

const PRODUCTION_HOST_PATTERNS = [
  /xingyu\.com\.br/i,
  /(^|\.)xingyu\.com$/i,
  /api\.xingyu/i,
];

const LOCAL_HOST_PATTERNS = [
  /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/|$)/i,
];

function hostnameOf(rawUrl) {
  try {
    return new URL(rawUrl).hostname;
  } catch {
    return "";
  }
}

export function isProductionLoadTarget(baseUrl) {
  if (!baseUrl || typeof baseUrl !== "string") return true;
  const trimmed = baseUrl.trim();
  const host = hostnameOf(trimmed) || trimmed;
  return PRODUCTION_HOST_PATTERNS.some((pattern) => pattern.test(host) || pattern.test(trimmed));
}

export function isLocalLoadTarget(baseUrl) {
  if (!baseUrl || typeof baseUrl !== "string") return false;
  return LOCAL_HOST_PATTERNS.some((pattern) => pattern.test(baseUrl.trim()));
}

export function assertSafeLoadTarget(baseUrl, env = {}) {
  if (!baseUrl) {
    throw new Error("LOAD_BASE_URL is required (example: http://localhost:3333/api).");
  }
  if (isProductionLoadTarget(baseUrl)) {
    throw new Error(
      `Load testing production is forbidden. Refusing target: ${baseUrl}`,
    );
  }
  const allowRemote = String(env.ALLOW_REMOTE_LOAD_TEST || "").toLowerCase() === "true";
  if (!isLocalLoadTarget(baseUrl) && !allowRemote) {
    throw new Error(
      `Load tests only run against localhost unless ALLOW_REMOTE_LOAD_TEST=true. Got: ${baseUrl}`,
    );
  }
  return true;
}

export function assertStressAllowed(env = {}) {
  if (String(env.ALLOW_STRESS_TEST || "") !== "true") {
    throw new Error("Stress test aborted. Set ALLOW_STRESS_TEST=true to run explicitly.");
  }
}
