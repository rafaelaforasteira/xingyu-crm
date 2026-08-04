import { chromium, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const authFile = path.join(process.cwd(), "e2e/.auth/user.json");
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

async function checkViewport(page, name, w, h) {
  await page.setViewportSize({ width: w, height: h });
  await page.waitForSelector('[data-testid="dashboard-page"]', { timeout: 30_000 });
  await page.waitForTimeout(700);
  const snapshot = await page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const search = document.querySelector('[aria-label="Buscar no CRM"]');
    const scopeDup = Array.from(document.querySelectorAll("p")).some((el) =>
      /^Escopo:\s/.test(el.textContent?.trim() ?? ""),
    );
    const subtitle = Array.from(document.querySelectorAll("p")).some((el) =>
      (el.textContent ?? "").includes("Veja o que está acontecendo"),
    );
    return {
      overflowX:
        doc.scrollWidth > doc.clientWidth + 2 ||
        body.scrollWidth > body.clientWidth + 2,
      hasHeading: Boolean(
        Array.from(document.querySelectorAll("h1")).some((el) =>
          el.textContent?.includes("Visão geral"),
        ),
      ),
      hasSearch: Boolean(search),
      hasNovo: Boolean(document.querySelector('[aria-label="Criar novo"]')),
      hasHoje: Boolean(document.querySelector('[aria-label="Tarefas de hoje"]')),
      hasScopeDup: scopeDup,
      hasSubtitle: subtitle,
      kpiCards: document.querySelectorAll('[data-testid="dashboard-page"] a .rounded-xl, [data-testid="dashboard-page"] .bg-\\[hsl\\(262_45\\%_97\\%\\)\\]').length,
    };
  });
  console.log(name, JSON.stringify(snapshot));
  return snapshot;
}

async function main() {
  if (!fs.existsSync(authFile)) {
    throw new Error("Missing e2e/.auth/user.json — run auth setup first");
  }
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: authFile });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto(`${baseURL}/dashboard`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-testid="dashboard-page"]', { timeout: 60_000 });
  await page.waitForTimeout(1500);

  // Autofocus of command palette
  await page.getByLabel("Buscar no CRM").click();
  const searchInput = page.locator('input[placeholder="Buscar em todo o CRM…"]');
  await expect(searchInput).toBeVisible({ timeout: 15_000 });
  await expect(searchInput).toBeFocused({ timeout: 5_000 });
  await searchInput.fill("ab");
  await expect(searchInput).toHaveValue("ab");
  console.log("commandAutofocus", true, "typed", "ab");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);

  for (const vp of [
    { name: "wide", w: 1440, h: 900 },
    { name: "hd", w: 1280, h: 800 },
    { name: "tablet", w: 768, h: 1024 },
    { name: "mobile", w: 390, h: 844 },
  ]) {
    await checkViewport(page, vp.name, vp.w, vp.h);
  }

  console.log("pageErrors", errors.length);
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
