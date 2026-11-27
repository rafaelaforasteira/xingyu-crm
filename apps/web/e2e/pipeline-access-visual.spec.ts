import { expect, test } from "@playwright/test";

const viewports = [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1366, height: 768 },
  { width: 1024, height: 768 },
];

for (const viewport of viewports) {
  test(`pipelines and access center remain styled at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    for (const route of ["/pipelines", "/pipelines/access?tab=teams", "/pipelines/access?tab=people"]) {
      await page.goto(route);
      await expect(page.locator("body")).not.toHaveCSS("font-family", "Times New Roman");
      await expect(page.locator("body")).toHaveCSS("background-color", /rgb\(/);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBeTruthy();
      await expect(page.getByRole("heading", { name: route === "/pipelines" ? "Pipelines" : "Equipes e acessos", exact: true })).toBeVisible();
    }
  });
}
