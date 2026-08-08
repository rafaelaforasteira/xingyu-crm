import { expect, test } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

/** Beta sidebar only exposes Operação — measure self-navigation stability. */
const SIDEBAR_STEPS = [
  { from: "/operacao", to: "/operacao?view=kanban", label: "operacao→kanban" },
  {
    from: "/operacao?view=kanban",
    to: "/operacao?view=conversations",
    label: "kanban→conversations",
  },
];

test.setTimeout(180_000);

test.describe.configure({ mode: "serial" });

test("measure CRM sidebar route transitions", async ({ page }) => {
  const mode = process.env.NAV_PERF_MODE ?? "dev";
  const results: Array<Record<string, unknown>> = [];

  for (const step of SIDEBAR_STEPS) {
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];
    const apiUrls: string[] = [];

    page.removeAllListeners("pageerror");
    page.removeAllListeners("console");
    page.removeAllListeners("request");
    page.on("pageerror", (e) => pageErrors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") consoleErrors.push(m.text());
    });
    page.on("request", (req) => {
      if (req.url().includes("/api/")) apiUrls.push(req.method() + " " + req.url());
    });

    await page.goto(step.from, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("beta-operation-page")).toBeVisible({
      timeout: 30_000,
    });

    const started = Date.now();
    await page.goto(step.to, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("beta-operation-page")).toBeVisible({
      timeout: 30_000,
    });
    const elapsed = Date.now() - started;

    results.push({
      label: step.label,
      elapsedMs: elapsed,
      pageErrors,
      consoleErrors,
      apiSample: apiUrls.slice(0, 8),
    });

    expect(pageErrors, JSON.stringify(pageErrors)).toEqual([]);
  }

  const outDir = path.resolve(__dirname, "../.nav-perf");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `sidebar-${mode}-${Date.now()}.json`);
  fs.writeFileSync(outFile, JSON.stringify({ mode, results }, null, 2));
  console.log(`Wrote ${outFile}`);
});
