import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const authFile = path.join(process.cwd(), "e2e/.auth/user.json");
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

async function main() {
  if (!fs.existsSync(authFile)) {
    throw new Error("Missing e2e/.auth/user.json — run dashboard e2e setup first");
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: authFile,
    viewport: { width: 768, height: 1024 },
  });
  const page = await context.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e)));

  await page.goto(`${baseURL}/dashboard`);
  await page.waitForSelector('[data-testid="dashboard-page"]', { timeout: 45_000 });

  for (const vp of [
    { name: "768", w: 768, h: 1024 },
    { name: "390", w: 390, h: 844 },
  ]) {
    await page.setViewportSize({ width: vp.w, height: vp.h });
    await page.waitForTimeout(600);
    const snapshot = await page.evaluate(() => {
      const doc = document.documentElement;
      const body = document.body;
      return {
        overflowX: doc.scrollWidth > doc.clientWidth + 2 || body.scrollWidth > body.clientWidth + 2,
        hasHeading: Boolean(
          Array.from(document.querySelectorAll("h1")).some((el) =>
            el.textContent?.includes("Visão geral"),
          ),
        ),
        hasFilters: Boolean(document.querySelector('[aria-label="Filtrar por período"]')),
        hasAttention: Boolean(
          Array.from(document.querySelectorAll("p")).some((el) =>
            el.textContent?.includes("Precisa da sua atenção"),
          ),
        ),
        kpiCount: document.querySelectorAll('[data-testid="dashboard-page"] a, [data-testid="dashboard-page"] .rounded-xl').length,
      };
    });
    console.log(vp.name, JSON.stringify({ ...snapshot, pageErrors: errs.length }));
  }

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
