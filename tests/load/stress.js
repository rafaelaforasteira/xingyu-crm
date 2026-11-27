import http from "k6/http";
import { check, sleep } from "k6";
import { baseUrl } from "./config.js";

if (__ENV.ALLOW_STRESS_TEST !== "true") {
  throw new Error("Stress test aborted. Set ALLOW_STRESS_TEST=true to run explicitly.");
}

export const options = {
  stages: [
    { duration: "1m", target: 50 },
    { duration: "2m", target: 80 },
    { duration: "1m", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<2500"],
  },
};

export default function () {
  const res = http.get(`${baseUrl()}/health`);
  check(res, { "status < 500": (r) => r.status < 500 });
  sleep(0.05);
}
