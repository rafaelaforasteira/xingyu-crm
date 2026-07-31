import { test, expect } from "@playwright/test";

test.describe("Xingyu CRM smoke", () => {
  test("dashboard loads", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /visão geral|dashboard/i })).toBeVisible({
      timeout: 30_000,
    });
  });
});
