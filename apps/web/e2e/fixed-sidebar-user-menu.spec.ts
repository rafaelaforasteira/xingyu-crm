import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const screenshots = path.join(__dirname, ".beta-screenshots/fixed-sidebar-user-menu");
fs.mkdirSync(screenshots, { recursive: true });

test("desktop sidebar stays in the viewport while the document scrolls", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/pipelines");
  const sidebar = page.getByTestId("beta-sidebar");
  const footer = page.getByTestId("sidebar-user-footer");
  await expect(sidebar).toBeVisible();
  await page.screenshot({ path: path.join(screenshots, "08-page-top-sidebar.png"), fullPage: false });
  await page.getByTestId("app-main").evaluate((main) => {
    const spacer = document.createElement("div");
    spacer.dataset.testid = "long-page-spacer";
    spacer.style.height = "4000px";
    main.appendChild(spacer);
  });

  const before = await sidebar.boundingBox();
  const footerBefore = await footer.boundingBox();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight / 2));
  await page.waitForTimeout(100);
  await page.screenshot({ path: path.join(screenshots, "09-page-mid-scroll-sidebar.png"), fullPage: false });
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(100);
  await page.screenshot({ path: path.join(screenshots, "10-page-bottom-sidebar.png"), fullPage: false });
  const after = await sidebar.boundingBox();
  const footerAfter = await footer.boundingBox();

  expect(before?.y).toBeCloseTo(0, 0);
  expect(after?.y).toBeCloseTo(0, 0);
  expect(after?.height).toBeCloseTo(768, 0);
  expect((after?.y ?? 0) + (after?.height ?? 0)).toBeCloseTo(768, 0);
  expect(footerAfter?.y).toBeCloseTo(footerBefore?.y ?? 0, 0);
});

test("sidebar footer shows identity only without account menu", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/pipelines");
  const footer = page.getByTestId("sidebar-user-footer");
  await expect(footer).toBeVisible();
  await footer.screenshot({ path: path.join(screenshots, "03-user-footer.png") });

  await expect(page.getByRole("button", { name: "Abrir menu da conta" })).toHaveCount(0);
  await expect(page.getByRole("dialog", { name: "Menu da conta" })).toHaveCount(0);
  await expect(footer.getByText(/@/)).toHaveCount(0);
  await expect(footer.getByText("Equipe", { exact: true })).toHaveCount(0);
  await expect(footer.getByText("Meu perfil")).toHaveCount(0);
  await expect(footer.getByText(/^Sair$/)).toHaveCount(0);
  await expect(footer.locator("svg.lucide-more-vertical")).toHaveCount(0);
  // Role labels must not appear as a secondary line under the name.
  await expect(footer.locator("p")).toHaveCount(1);

  const identity = page.getByTestId("sidebar-user-identity");
  await expect(identity).toBeVisible();
  await expect(identity.locator("p")).toBeVisible();
  const firstName = (await identity.locator("p").innerText()).trim();
  expect(firstName.length).toBeGreaterThan(0);
  expect(firstName.includes(" ")).toBeFalsy();

  const settingsLink = page.getByTestId("beta-nav-settings");
  await expect(settingsLink).toHaveAttribute("href", "/settings");
  await settingsLink.click();
  await expect(page).toHaveURL(/\/settings/);
  await page.screenshot({ path: path.join(screenshots, "04-settings-from-sidebar.png"), fullPage: false });
});

for (const [name, width, height] of [
  ["18-sidebar-1920.png", 1920, 1080],
  ["19-sidebar-1440.png", 1440, 900],
  ["20-sidebar-1366.png", 1366, 768],
  ["21-sidebar-1024.png", 1024, 768],
] as const) {
  test(`sidebar remains usable at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/pipelines");
    const sidebar = page.getByTestId("beta-sidebar");
    await expect(sidebar).toBeVisible();
    await expect(page.getByTestId("sidebar-user-footer")).toBeVisible();
    await page.screenshot({ path: path.join(screenshots, name), fullPage: false });
  });
}
