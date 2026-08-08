import { test, expect } from "@playwright/test";

test.describe("Xingyu CRM smoke", () => {
  test("operacao beta shell loads", async ({ page }) => {
    await page.goto("/operacao");
    await expect(page.getByTestId("beta-operation-page")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId("beta-header")).toBeVisible();
  });
});
