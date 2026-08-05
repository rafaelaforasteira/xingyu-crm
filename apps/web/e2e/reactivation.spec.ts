import { expect, test } from "@playwright/test";

test("reactivation route redirects to operação in beta mode", async ({ page }) => {
  await page.goto("/reactivation");
  await expect(page).toHaveURL(/\/operacao/, { timeout: 15_000 });
  await expect(page.getByTestId("beta-operation-page")).toBeVisible({
    timeout: 20_000,
  });
});

test("reactivation API remains available for future reactivation", async ({
  request,
}) => {
  const response = await request.get("/api/reactivation?page=1&pageSize=5");
  // Endpoint may return 200 with data or an auth/business status — must not 404.
  expect(response.status()).not.toBe(404);
});
