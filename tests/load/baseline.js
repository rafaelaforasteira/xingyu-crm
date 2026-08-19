import { baseUrl, thresholds } from "./config.js";
import { getJson, login } from "./helpers/auth.js";

export const options = {
  vus: Number(__ENV.LOAD_VUS || 10),
  duration: __ENV.LOAD_DURATION || "2m",
  thresholds: thresholds.baseline,
};

export function setup() {
  const url = baseUrl();
  const email = __ENV.LOAD_TEST_EMAIL || __ENV.ADMIN_EMAIL || "admin@xingyu.local";
  const password = __ENV.LOAD_TEST_PASSWORD || __ENV.ADMIN_INITIAL_PASSWORD || "ChangeMeNow123!";
  const cookies = login(url, email, password);
  return { url, cookies };
}

export default function (data) {
  getJson(`${data.url}/health`, data.cookies);
  getJson(`${data.url}/auth/me`, data.cookies);
  getJson(`${data.url}/pipelines?page=1&pageSize=20`, data.cookies);
  getJson(`${data.url}/orders?page=1&pageSize=20`, data.cookies);
}
