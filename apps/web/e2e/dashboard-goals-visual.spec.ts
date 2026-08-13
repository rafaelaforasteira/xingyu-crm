import { expect, test } from "@playwright/test";

test.describe("Dashboard goals visual analytics", () => {
  for (const viewport of [
    { name: "1920", width: 1920, height: 1080 },
    { name: "1440", width: 1440, height: 900 },
    { name: "1366", width: 1366, height: 768 },
    { name: "1024", width: 1024, height: 768 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    test(`renders goals and charts at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto("/dashboard?tab=goals&period=month");
      await expect(page.getByTestId("dashboard-intelligence-center")).toBeVisible();
      await expect(page.getByTestId("dashboard-goals")).toBeVisible();
      await expect(page).toHaveURL(/tab=goals/);
      await expect(
        page.getByText("Estamos chegando onde planejamos?", { exact: true }),
      ).toBeVisible();
      await expect(page.getByRole("button", { name: "Nova meta" })).toBeVisible();
      await page.screenshot({
        path: `test-results/dashboard-goals-${viewport.name}.png`,
        fullPage: true,
      });
    });
  }

  test("renders the dimension explorer and honors reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/dashboard");
    await expect(page.getByTestId("dimension-explorer")).toBeVisible();
    await expect(page.locator("svg.recharts-surface").first()).toBeVisible();
  });
});
