import http from "k6/http";
import { check, sleep } from "k6";
import { Counter } from "k6/metrics";

export const status2xx = new Counter("status_2xx");
export const status4xx = new Counter("status_4xx");
export const status429 = new Counter("status_429");
export const status5xx = new Counter("status_5xx");

export function login(baseUrl, email, password) {
  const res = http.post(
    `${baseUrl}/auth/login`,
    JSON.stringify({ email, password }),
    { headers: { "Content-Type": "application/json" } },
  );
  check(res, { "login status 200": (r) => r.status === 200 });
  return res.cookies;
}

export function cookieHeader(cookies) {
  const jar = cookies || {};
  return Object.entries(jar)
    .map(([name, values]) => {
      const value = Array.isArray(values) ? values[0]?.value : values?.value;
      return value ? `${name}=${value}` : "";
    })
    .filter(Boolean)
    .join("; ");
}

export function authHeaders(cookies) {
  return {
    headers: {
      Cookie: cookieHeader(cookies),
      Accept: "application/json",
    },
  };
}

export function getJson(url, cookies) {
  const res = http.get(url, authHeaders(cookies));
  if (res.status >= 200 && res.status < 300) status2xx.add(1);
  if (res.status >= 400 && res.status < 500) status4xx.add(1);
  if (res.status === 429) status429.add(1);
  if (res.status >= 500) status5xx.add(1);
  check(res, { "status is not 5xx": (r) => r.status < 500 });
  sleep(0.1);
  return res;
}
