import { test, expect } from "@playwright/test";

test.describe("Xingyu CRM smoke", () => {
  test("authenticated shell loads the pipelines home", async ({ page }) => {
    await page.goto("/pipelines");
    await expect(page).toHaveURL(/\/pipelines/, { timeout: 30_000 });
    await expect(page.locator("[data-app-shell='true']")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId("beta-sidebar")).toBeVisible();
  });
});
