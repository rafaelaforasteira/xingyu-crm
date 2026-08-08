import { expect, test } from "@playwright/test";

test("Inbox route redirects to operação in beta mode", async ({ page }) => {
  await page.goto("/inbox");
  await expect(page).toHaveURL(/\/operacao/, { timeout: 15_000 });
  await expect(page.getByTestId("beta-operation-page")).toBeVisible({
    timeout: 20_000,
  });
});

test("Inbox remains reachable only via operação conversations", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/operacao?view=conversations");
  await expect(page.getByTestId("beta-conversation-workspace")).toBeVisible({
    timeout: 30_000,
  });
});
