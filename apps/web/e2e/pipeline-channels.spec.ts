import { expect, test } from "@playwright/test";

test("pipeline channels UI redirects to operação in beta mode", async ({ page }) => {
  await page.goto("/pipelines/pipe-novos/channels");
  await expect(page).toHaveURL(/\/operacao/, { timeout: 15_000 });
});
