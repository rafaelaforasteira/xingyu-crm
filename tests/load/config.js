const PRODUCTION_HOST_PATTERNS = [
  /xingyu\.com\.br/i,
  /(^|\.)xingyu\.com$/i,
  /api\.xingyu/i,
];

export function assertSafeLoadTarget(baseUrl) {
  if (!baseUrl) {
    throw new Error("LOAD_BASE_URL is required");
  }
  if (PRODUCTION_HOST_PATTERNS.some((pattern) => pattern.test(baseUrl))) {
    throw new Error(`Load testing production is forbidden: ${baseUrl}`);
  }
  if (!/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])/i.test(baseUrl)) {
    const allowRemote = String(__ENV.ALLOW_REMOTE_LOAD_TEST || "") === "true";
    if (!allowRemote) {
      throw new Error(`Refusing non-local load target: ${baseUrl}`);
    }
  }
}

export const thresholds = {
  smoke: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<1500", "p(99)<3000"],
  },
  baseline: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<800", "p(99)<1500"],
  },
  business: {
    http_req_failed: ["rate<0.02"],
    http_req_duration: ["p(95)<1200", "p(99)<2500"],
  },
};

export function baseUrl() {
  const url = __ENV.LOAD_BASE_URL || "http://localhost:3333/api";
  assertSafeLoadTarget(url);
  return url.replace(/\/$/, "");
}
