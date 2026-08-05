import { expect, test } from "@playwright/test";

test("pipelines remain reachable while Operação is the primary nav entry", async ({
  page,
}) => {
  await page.goto("/operacao");
  const sidebar = page.locator("div.hidden.lg\\:block aside").first();
  await expect(sidebar.getByRole("link", { name: "Operação", exact: true })).toBeVisible();
  await expect(sidebar.getByRole("link", { name: "Pipelines", exact: true })).toHaveCount(0);

  await page.goto("/pipelines");
  await expect(page).toHaveURL(/\/pipelines/);
  await expect(page.getByRole("heading", { name: /pipeline/i })).toBeVisible({
    timeout: 20_000,
  });
});
