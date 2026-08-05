import { expect, test } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

/** Transitions along the simplified CORE_OPERATION_MODE sidebar. */
const SIDEBAR_STEPS = [
  { from: "/operacao", to: "/settings", label: "operacao→settings" },
  { from: "/settings", to: "/operacao", label: "settings→operacao" },
];

function navLabel(href: string) {
  const map: Record<string, RegExp> = {
    "/operacao": /Operação/i,
    "/settings": /Configurações/i,
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
    // Allow client data to settle so soft navigations don't trip Skeleton→Card hydration noise.
    await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 20_000 });
    pageErrors.length = 0;
    consoleErrors.length = 0;
    await page.waitForTimeout(400);

    const navBefore = await page.evaluate(
      () => performance.getEntriesByType("navigation").length,
    );
    const sidebar = page.locator("div.hidden.lg\\:block aside").first();
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
      // Settings may nest under /settings/*
    }

    await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 20_000 });
    const clickToContentMs = Date.now() - t0;
    const navAfter = await page.evaluate(
      () => performance.getEntriesByType("navigation").length,
    );

    results.push({
      label: step.label,
      mode,
      clickToUrlMs,
      clickToActiveMs,
      clickToContentMs,
      softNav: navAfter === navBefore,
      pageErrors,
      consoleErrors: consoleErrors.slice(0, 5),
      apiSample: apiUrls.slice(0, 8),
    });
  }

  const outDir = path.join(__dirname, "../../.nav-perf");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `sidebar-${mode}-${Date.now()}.json`);
  fs.writeFileSync(outFile, JSON.stringify(results, null, 2));
  console.log(`Wrote ${outFile}`);
  for (const row of results) {
    expect(row.pageErrors, JSON.stringify(row.pageErrors)).toEqual([]);
  }
});
