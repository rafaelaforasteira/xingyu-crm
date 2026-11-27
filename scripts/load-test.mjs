#!/usr/bin/env node
/**
 * Cross-platform load-test runner.
 * Prefers k6 when installed; otherwise runs a Node smoke/baseline against localhost.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertSafeLoadTarget,
  assertStressAllowed,
} from "../tests/load/helpers/environment.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadRootEnv() {
  const envPath = path.join(root, ".env");
  if (!existsSync(envPath)) return;
  for (const raw of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index < 1) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if (/^(['"]).*\1$/.test(value)) value = value.slice(1, -1);
    process.env[key] ??= value;
  }
}

loadRootEnv();

const scenario = process.argv[2] || "smoke";
const baseUrl = (process.env.LOAD_BASE_URL || "http://localhost:3333/api").replace(/\/$/, "");

assertSafeLoadTarget(baseUrl, process.env);
if (scenario === "stress") {
  assertStressAllowed(process.env);
}

const profiles = {
  smoke: { vus: 2, durationMs: 30_000, script: "tests/load/smoke.js" },
  baseline: { vus: 10, durationMs: 120_000, script: "tests/load/baseline.js" },
  business: { vus: 30, durationMs: 300_000, script: "tests/load/business.js" },
  stress: { vus: 50, durationMs: 240_000, script: "tests/load/stress.js" },
};

const profile = profiles[scenario];
if (!profile) {
  console.error(`Unknown scenario: ${scenario}`);
  process.exit(1);
}

function hasK6() {
  const result = spawnSync("k6", ["version"], { encoding: "utf8", shell: true });
  return result.status === 0;
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[idx];
}

async function nodeFallback() {
  const started = Date.now();
  const durations = [];
  const byPath = {};
  let ok = 0;
  let fail = 0;
  const statusCounts = {};
  const workers = Math.min(profile.vus, 5);
  const deadline = Date.now() + Math.min(profile.durationMs, scenario === "smoke" ? 30_000 : 60_000);

  let cookie = "";
  if (scenario !== "smoke") {
    const email = process.env.LOAD_TEST_EMAIL || process.env.ADMIN_EMAIL;
    const password = process.env.LOAD_TEST_PASSWORD || process.env.ADMIN_INITIAL_PASSWORD;
    if (email && password) {
      const login = await fetch(`${baseUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const setCookie = login.headers.getSetCookie?.() ?? [];
      cookie = setCookie.map((part) => part.split(";")[0]).filter(Boolean).join("; ");
      if (!login.ok) {
        console.warn(`Node fallback login HTTP ${login.status}; authenticated paths will fail.`);
      } else {
        console.warn(`Node fallback authenticated session established (${cookie ? "cookie present" : "no cookie"}).`);
      }
    }
  }

  const paths =
    scenario === "smoke"
      ? ["/health"]
      : ["/health", "/auth/me", "/pipelines?page=1&pageSize=20", "/orders?page=1&pageSize=20"];

  async function worker() {
    let i = 0;
    while (Date.now() < deadline) {
      const route = paths[i % paths.length];
      i += 1;
      const t0 = Date.now();
      try {
        const res = await fetch(`${baseUrl}${route}`, {
          headers: cookie ? { Cookie: cookie, Accept: "application/json" } : { Accept: "application/json" },
        });
        const ms = Date.now() - t0;
        durations.push(ms);
        if (!byPath[route]) byPath[route] = [];
        byPath[route].push(ms);
        statusCounts[res.status] = (statusCounts[res.status] || 0) + 1;
        if (res.ok) ok += 1;
        else fail += 1;
      } catch {
        durations.push(Date.now() - t0);
        fail += 1;
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  await Promise.all(Array.from({ length: workers }, () => worker()));
  durations.sort((a, b) => a - b);
  const elapsed = (Date.now() - started) / 1000;
  const total = ok + fail;
  const slowest = Object.entries(byPath)
    .map(([route, samples]) => {
      const sorted = [...samples].sort((a, b) => a - b);
      return { route, p95: percentile(sorted, 95), count: samples.length };
    })
    .sort((a, b) => b.p95 - a.p95);
  const throttled = statusCounts[429] || 0;
  const serverErrors = Object.entries(statusCounts)
    .filter(([code]) => Number(code) >= 500)
    .reduce((sum, [, n]) => sum + n, 0);
  const appFails = fail - throttled;
  const metrics = {
    tool: "node-fallback",
    scenario,
    baseUrl,
    vus: workers,
    durationSec: Number(elapsed.toFixed(1)),
    requests: total,
    rps: Number((total / elapsed).toFixed(2)),
    p50: percentile(durations, 50),
    p90: percentile(durations, 90),
    p95: percentile(durations, 95),
    p99: percentile(durations, 99),
    errorRate: total ? Number(((fail / total) * 100).toFixed(2)) : 100,
    throttleRate: total ? Number(((throttled / total) * 100).toFixed(2)) : 0,
    appErrorRate: total ? Number(((appFails / total) * 100).toFixed(2)) : 100,
    statusCounts,
    slowest,
  };

  const outDir = path.join(root, "load-results");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    path.join(outDir, `${scenario}-node.json`),
    JSON.stringify(metrics, null, 2),
  );
  console.log(JSON.stringify(metrics, null, 2));
  if (metrics.throttleRate > 0) {
    console.warn(
      `Rate limit observed (${metrics.throttleRate}% HTTP 429). Local RATE_LIMIT_MAX is typically 200/min per IP.`,
    );
  }
  if (serverErrors > 0 || metrics.appErrorRate > 5) process.exit(1);
}

function runK6() {
  const args = [
    "run",
    profile.script,
    "--summary-export",
    path.join("load-results", `${scenario}-k6.json`),
  ];
  mkdirSync(path.join(root, "load-results"), { recursive: true });
  const env = {
    ...process.env,
    LOAD_BASE_URL: baseUrl,
    LOAD_VUS: String(profile.vus),
  };
  const result = spawnSync("k6", args, {
    cwd: root,
    env,
    stdio: "inherit",
    shell: true,
  });
  process.exit(result.status ?? 1);
}

if (hasK6()) {
  runK6();
} else {
  console.warn("k6 not found on PATH — using Node fallback (localhost only).");
  if (scenario === "stress") {
    console.error("Node fallback does not run stress. Install k6 or skip.");
    process.exit(1);
  }
  await nodeFallback();
}
