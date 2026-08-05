import { expect, test } from "@playwright/test";

test.describe("Dashboard decision center", () => {
  test("dashboard route redirects to operação in beta mode", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/operacao/, { timeout: 15_000 });
    await expect(page.getByTestId("beta-operation-page")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId("beta-nav-operation")).toBeVisible();
  });
});
