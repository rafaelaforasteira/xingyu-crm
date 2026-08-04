import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

/**
 * Hydration diagnostics for the CRM AppShell.
 *
 * Important context (investigated 2026-07-30):
 * - Pre-JS HTML for /dashboard includes Next.js Suspense markers inside <main>:
 *   <template id="B:0"> + the (app)/loading.tsx skeleton ("Carregando").
 * - After the client hydrates, Suspense resolves and those nodes are replaced by
 *   DashboardPage (a single content <div>). That is legitimate streaming/Suspense
 *   behavior, not a React hydration mismatch.
 * - There are no console/page errors mentioning hydration when this happens.
 *
 * Therefore this test asserts shell stability + real hydration errors, and does
 * NOT require byte-for-byte equality of the full AppShell DOM tree (which changes
 * after Suspense, dynamic imports, and React Query).
 *
 * Auth: uses the Playwright storageState produced by auth.setup.ts so the
 * server layout can render AppShell (cookie-gated) even with JS disabled.
 */

const APP_SHELL = '[data-app-shell="true"]';
const SIDEBAR = `${APP_SHELL} aside`;
const HEADER = `${APP_SHELL} header`;
const MAIN = `${APP_SHELL} main`;
const authFile = path.join(__dirname, ".auth/user.json");

function readStorageState() {
  if (!fs.existsSync(authFile)) {
    throw new Error(
      `Missing ${authFile}. Run the Playwright setup project before this diagnostic.`,
    );
  }
  return JSON.parse(fs.readFileSync(authFile, "utf8")) as {
    cookies: unknown[];
    origins: unknown[];
  };
}

function collectErrors(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  return { consoleErrors, pageErrors };
}

function hydrationRelated(messages: string[]) {
  return messages.filter((message) =>
    /hydration|hydrated|did not match|server rendered html/i.test(message),
  );
}

async function attrs(page: Page, selector: string) {
  return page.locator(selector).evaluate((element) =>
    Object.fromEntries(Array.from(element.attributes).map(({ name, value }) => [name, value])),
  );
}

async function waitForHydratedShell(page: Page) {
  await page.locator(APP_SHELL).waitFor({ state: "attached" });
  await page.waitForFunction((selector) => {
    const element = document.querySelector(selector);
    return Boolean(
      element && Object.keys(element).some((key) => key.startsWith("__reactFiber$")),
    );
  }, APP_SHELL);
}

test("AppShell hydrates without hydration errors and keeps stable shell structure", async ({
  browser,
}) => {
  const storageState = readStorageState();

  // --- Pre-hydration document (JS off): shell landmarks must already exist ---
  const preContext = await browser.newContext({
    javaScriptEnabled: false,
    storageState,
  });
  const prePage = await preContext.newPage();
  const preResponse = await prePage.goto("/dashboard", { waitUntil: "domcontentloaded" });
  expect(preResponse?.ok()).toBe(true);

  await expect(prePage.locator(APP_SHELL)).toBeAttached();
  await expect(prePage.locator(SIDEBAR).first()).toBeAttached();
  await expect(prePage.locator(HEADER)).toBeAttached();
  await expect(prePage.locator(MAIN)).toBeAttached();

  const preHtmlAttributes = await attrs(prePage, "html");
  const preBodyAttributes = await attrs(prePage, "body");
  const preMainChildCount = await prePage.locator(MAIN).evaluate((main) => main.children.length);
  const preHasSuspenseFallback = await prePage
    .locator(`${MAIN} [aria-label="Carregando"]`)
    .count();
  const preHasSuspenseTemplate = await prePage.locator(`${MAIN} template[id^="B:"]`).count();

  console.log(
    JSON.stringify(
      {
        phase: "pre-hydration",
        preMainChildCount,
        preHasSuspenseFallback,
        preHasSuspenseTemplate,
        preHtmlAttributes,
        preBodyAttributes,
      },
      null,
      2,
    ),
  );

  expect(preMainChildCount).toBeGreaterThanOrEqual(1);
  expect(preHasSuspenseFallback + preHasSuspenseTemplate).toBeGreaterThan(0);
  await preContext.close();

  // --- Hydrated document: deterministic API stubs (no infinite hang) ---
  const context = await browser.newContext({ storageState });
  const page = await context.newPage();
  const { consoleErrors, pageErrors } = collectErrors(page);

  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/auth/me")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "demo-admin",
          name: "Administradora Xingyu",
          email: "admin@xingyu.local",
          role: "ADMIN",
          status: "ACTIVE",
        }),
      });
      return;
    }
    if (url.includes("/dashboard/")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({}),
      });
      return;
    }
    if (url.includes("/pipelines/navigation")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [], meta: { total: 0, page: 1, pageSize: 20 } }),
    });
  });

  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await waitForHydratedShell(page);

  const atHydration = {
    shell: await page.locator(APP_SHELL).count(),
    sidebar: await page.locator(SIDEBAR).count(),
    header: await page.locator(HEADER).count(),
    main: await page.locator(MAIN).count(),
    mainChildCount: await page.locator(MAIN).evaluate((main) => main.children.length),
    htmlAttributes: await attrs(page, "html"),
    bodyAttributes: await attrs(page, "body"),
  };

  await expect(page.locator(`${MAIN} [aria-label="Carregando"]`)).toHaveCount(0, {
    timeout: 10_000,
  });
  await expect(
    page.getByRole("heading", { name: /Visão geral|Dashboard/i }).first(),
  ).toBeVisible({
    timeout: 10_000,
  });
  const afterSuspense = {
    shell: await page.locator(APP_SHELL).count(),
    sidebar: await page.locator(SIDEBAR).count(),
    header: await page.locator(HEADER).count(),
    main: await page.locator(MAIN).count(),
    mainChildCount: await page.locator(MAIN).evaluate((main) => main.children.length),
    htmlAttributes: await attrs(page, "html"),
    bodyAttributes: await attrs(page, "body"),
  };

  const hydrationErrors = hydrationRelated([...consoleErrors, ...pageErrors]);

  console.log(
    JSON.stringify(
      {
        phase: "hydrated",
        atHydration,
        afterSuspense,
        hydrationErrors,
        consoleErrors,
        pageErrors,
      },
      null,
      2,
    ),
  );

  expect(atHydration.htmlAttributes).toEqual(preHtmlAttributes);
  expect(atHydration.bodyAttributes).toEqual(preBodyAttributes);
  expect(afterSuspense.htmlAttributes).toEqual(preHtmlAttributes);
  expect(afterSuspense.bodyAttributes).toEqual(preBodyAttributes);

  expect(atHydration.shell).toBe(1);
  expect(atHydration.sidebar).toBeGreaterThanOrEqual(1);
  expect(atHydration.header).toBe(1);
  expect(atHydration.main).toBe(1);
  expect(afterSuspense.shell).toBe(1);
  expect(afterSuspense.sidebar).toBeGreaterThanOrEqual(1);
  expect(afterSuspense.header).toBe(1);
  expect(afterSuspense.main).toBe(1);
  expect(afterSuspense.mainChildCount).toBeGreaterThanOrEqual(1);

  expect(hydrationErrors).toEqual([]);
  expect(pageErrors).toEqual([]);

  await context.close();
});
