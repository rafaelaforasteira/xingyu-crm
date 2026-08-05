import { expect, test } from "@playwright/test";

/**
 * Pipeline CRUD UI is hidden in beta single-pipeline mode.
 * This suite verifies the guard and preserves API reachability for future reactivation.
 */
test("pipelines CRUD UI redirects to operação in beta mode", async ({ page, request }) => {
  await page.goto("/pipelines");
  await expect(page).toHaveURL(/\/operacao/, { timeout: 15_000 });

  const list = await request.get("/api/pipelines?pageSize=5");
  expect(list.ok(), await list.text()).toBeTruthy();
});
