import { expect, test } from "@playwright/test";

test("pipelines remain redirected while Operação is the primary nav entry", async ({
  page,
}) => {
  await page.goto("/pipelines");
  await expect(page).toHaveURL(/\/operacao/, { timeout: 15_000 });
  await expect(page.getByTestId("beta-nav-operation")).toBeVisible();
});
