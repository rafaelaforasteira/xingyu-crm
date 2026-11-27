import http from "k6/http";
import { check, sleep } from "k6";
import { baseUrl, thresholds } from "./config.js";

export const options = {
  vus: Number(__ENV.LOAD_VUS || 2),
  duration: __ENV.LOAD_DURATION || "30s",
  thresholds: thresholds.smoke,
};

export default function () {
  const res = http.get(`${baseUrl()}/health`);
  check(res, {
    "health is 200": (r) => r.status === 200,
    "database up": (r) => String(r.body).includes('"database":"up"') || String(r.body).includes('"status":"ok"'),
  });
  sleep(0.2);
}
