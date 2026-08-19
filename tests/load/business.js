import { baseUrl, thresholds } from "./config.js";
import { getJson, login } from "./helpers/auth.js";

/**
 * Mixed business traffic (documented mix):
 * 50% pipelines, 20% orders, 15% tasks, 10% dashboard, 5% search
 */
export const options = {
  vus: Number(__ENV.LOAD_VUS || 30),
  duration: __ENV.LOAD_DURATION || "5m",
  thresholds: thresholds.business,
};

export function setup() {
  const url = baseUrl();
  const email = __ENV.LOAD_TEST_EMAIL || __ENV.ADMIN_EMAIL || "admin@xingyu.local";
  const password = __ENV.LOAD_TEST_PASSWORD || __ENV.ADMIN_INITIAL_PASSWORD || "ChangeMeNow123!";
  return { url, cookies: login(url, email, password) };
}

export default function (data) {
  const roll = Math.random();
  if (roll < 0.5) {
    getJson(`${data.url}/pipelines?page=1&pageSize=20`, data.cookies);
  } else if (roll < 0.7) {
    getJson(`${data.url}/orders?page=1&pageSize=20`, data.cookies);
  } else if (roll < 0.85) {
    getJson(`${data.url}/tasks?page=1&pageSize=20`, data.cookies);
  } else if (roll < 0.95) {
    getJson(`${data.url}/dashboard/metrics`, data.cookies);
  } else {
    getJson(`${data.url}/search?q=luciana`, data.cookies);
  }
}
