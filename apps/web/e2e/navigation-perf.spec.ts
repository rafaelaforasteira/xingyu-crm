import { expect, test } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

/** Transitions along the simplified main sidebar (feature/crm-v1-complete). */
const SIDEBAR_STEPS = [
  { from: "/dashboard", to: "/inbox", label: "dashboard→inbox" },
  { from: "/inbox", to: "/tasks", label: "inbox→tasks" },
  { from: "/tasks", to: "/pipelines", label: "tasks→pipelines" },
  { from: "/pipelines", to: "/automations", label: "pipelines→automations" },
  { from: "/automations", to: "/marketing", label: "automations→marketing" },
  { from: "/marketing", to: "/reports", label: "marketing→reports" },
  { from: "/reports", to: "/settings", label: "reports→settings" },
];

function navLabel(href: string) {
  const map: Record<string, RegExp> = {
    "/dashboard": /visão geral|dashboard/i,
    "/inbox": /^Inbox$/i,
    "/tasks": /^Tarefas$/i,
    "/pipelines": /^Pipelines$/i,
    "/automations": /^Automação$/i,
    "/marketing": /^Marketing$/i,
    "/reports": /^Relatórios$/i,
    "/settings": /^Configurações$/i,
  };
  return map[href] ?? new RegExp(href);
}

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

    await page.goto(step.from, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);

    const navBefore = await page.evaluate(
      () => performance.getEntriesByType("navigation").length,
    );
    const sidebar = page.locator("div.hidden.lg\\:block aside").first();
    // Prefer href so pipeline submenu labels cannot shadow main-nav text matches.
    const link = sidebar.locator(`a[href="${step.to}"]`).first();
    await expect(link).toBeVisible({ timeout: 10_000 });
    await expect(link).toHaveAccessibleName(navLabel(step.to));

    apiUrls.length = 0;
    const t0 = Date.now();
    await Promise.all([
      page.waitForURL((url) => url.pathname === step.to || url.pathname.startsWith(`${step.to}/`), {
        timeout: 20_000,
      }),
      link.click(),
    ]);
    const clickToUrlMs = Date.now() - t0;

    let clickToActiveMs: number | null = clickToUrlMs;
    try {
      await expect(link).toHaveAttribute("aria-current", "page", { timeout: 2_000 });
      clickToActiveMs = Date.now() - t0;
    } catch {
      /* pending state may use aria-current already */
    }

    await page.locator("main").first().waitFor({ state: "visible", timeout: 10_000 });
    const clickToMainMs = Date.now() - t0;
    await page.waitForTimeout(800);
    const settledMs = Date.now() - t0;

    const navAfter = await page.evaluate(
      () => performance.getEntriesByType("navigation").length,
    );
    const counts = new Map<string, number>();
    for (const u of apiUrls) {
      const key = u.split("?")[0]!;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const duplicates = [...counts.entries()]
      .filter(([, n]) => n > 1)
      .map(([u, n]) => `${n}× ${u}`);

    results.push({
      label: step.label,
      clickToActiveMs,
      clickToUrlMs,
      clickToMainMs,
      settledMs,
      apiRequestCount: apiUrls.length,
      duplicates,
      fullReload: navAfter > navBefore,
      pageErrors,
      consoleErrors,
    });
  }

  // Board open via central list
  await page.goto("/pipelines", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const boardLink = page.locator('a[href*="/pipelines/"]').filter({ hasNotText: "Ver" }).first();
  const apiUrls: string[] = [];
  page.on("request", (req) => {
    if (req.url().includes("/api/")) apiUrls.push(req.url());
  });
  const t0 = Date.now();
  if (await boardLink.count()) {
    await boardLink.click();
    await page.waitForURL(/\/pipelines\/[^/]+/, { timeout: 15_000 });
  } else {
    await page.goto("/pipelines/pipe-novos", { waitUntil: "domcontentloaded" });
  }
  await page.waitForTimeout(1000);
  results.push({
    label: "pipelines→board",
    clickToUrlMs: Date.now() - t0,
    settledMs: Date.now() - t0,
    apiRequestCount: apiUrls.length,
    fullReload: false,
  });

  const outDir = path.resolve(process.cwd(), "../../docs");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `_nav-perf-${mode}.json`);
  fs.writeFileSync(
    outFile,
    JSON.stringify({ mode, measuredAt: new Date().toISOString(), results }, null, 2),
  );
  // eslint-disable-next-line no-console
  console.log(`Wrote ${outFile}`);
  for (const r of results) {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(r));
  }
});
