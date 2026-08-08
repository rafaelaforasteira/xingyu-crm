import { expect, test } from "@playwright/test";

test("pipeline stages UI redirects to operação in beta mode", async ({ page }) => {
  await page.goto("/pipelines/pipe-novos/settings/stages");
  await expect(page).toHaveURL(/\/operacao/, { timeout: 15_000 });
});
